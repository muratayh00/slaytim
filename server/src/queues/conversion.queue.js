const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

const QUEUE_NAME = process.env.CONVERSION_QUEUE_NAME || 'slide-conversion';
const ATTEMPTS = Math.max(1, Number(process.env.CONVERSION_ATTEMPTS || 5));
const BACKOFF_DELAY_MS = Math.max(1000, Number(process.env.CONVERSION_BACKOFF_MS || 5000));
const REDIS_ENABLED = String(process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true';

class QueueUnavailableError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'QueueUnavailableError';
    this.cause = cause;
  }
}

let connection;
let queue;

function getRedisConnectionOptions() {
  if (!REDIS_ENABLED) {
    throw new QueueUnavailableError('Redis is disabled (REDIS_ENABLED=false)');
  }
  const redisUrl = String(process.env.REDIS_URL || '').trim();
  if (redisUrl) return redisUrl;

  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB || 0),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

function getRedisConnection() {
  if (!REDIS_ENABLED) {
    throw new QueueUnavailableError('Redis is disabled (REDIS_ENABLED=false)');
  }
  if (!connection) {
    connection = new IORedis(getRedisConnectionOptions());
    let _lastErrLog = 0;
    let _errCount = 0;
    connection.on('error', (err) => {
      _errCount += 1;
      const now = Date.now();
      // Log immediately on first error (with actionable guidance), then throttle to once per 60s
      if (_errCount === 1 || now - _lastErrLog >= 60_000) {
        if (_errCount === 1) {
          const target = process.env.REDIS_URL
            ? '(REDIS_URL)'
            : `${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;
          console.error(`[queue] ⚠️  REDIS_ENABLED=true fakat Redis'e bağlanılamıyor (${target}).`);
          console.error(`[queue] Hata: ${err?.message || err}`);
          console.error('[queue] .env dosyasında REDIS_URL veya REDIS_HOST/REDIS_PORT değerlerini kontrol edin.');
          console.error('[queue] Redis olmadan çalışmak için REDIS_ENABLED=false yapın.');
        } else {
          console.error(`[queue] Redis bağlantı hatası (×${_errCount}):`, err?.message || err);
        }
        _lastErrLog = now;
      }
    });
  }
  return connection;
}

function getQueueDefaultJobOptions() {
  return {
    attempts: ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: BACKOFF_DELAY_MS,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  };
}

function getConversionQueue() {
  if (!REDIS_ENABLED) {
    throw new QueueUnavailableError('Redis is disabled (REDIS_ENABLED=false)');
  }
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: getQueueDefaultJobOptions(),
    });
  }
  return queue;
}

function computeBackoffFromJob(job) {
  const attemptsMade = Number(job?.attemptsMade || 0);
  const backoff = job?.opts?.backoff;
  if (!backoff) return 0;

  if (typeof backoff === 'number') return Math.max(0, backoff);

  const delay = Math.max(0, Number(backoff.delay || BACKOFF_DELAY_MS));
  if (String(backoff.type || '').toLowerCase() === 'exponential') {
    return delay * Math.pow(2, Math.max(0, attemptsMade));
  }
  return delay;
}

function isQueueConnectionError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return (
    msg.includes('econnrefused')
    || msg.includes('redis')
    || msg.includes('connection is closed')
    || msg.includes('socket closed unexpectedly')
    || msg.includes('connect etimedout')
    || msg.includes('ready check failed')
  );
}

function isDuplicateJobError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('jobid') && msg.includes('already exists');
}

async function enqueueSlideConversion(slideId) {
  const id = Number(slideId);
  if (!Number.isInteger(id) || id <= 0) return false;
  const jobId = `slide-${id}`;
  let enqueueConfirmed = false;

  try {
    const q = getConversionQueue();
    // BullMQ forbids ":" in custom ids on some versions/adapters.
    // Keep deterministic dedupe id but use a safe delimiter.
    try {
      await q.add('convert-slide', { slideId: id }, { jobId });
      enqueueConfirmed = true;
    } catch (err) {
      if (!isDuplicateJobError(err)) throw err;

      const existing = await q.getJob(jobId);
      if (!existing) {
        // Race condition: job disappeared between duplicate error and lookup.
        await q.add('convert-slide', { slideId: id }, { jobId });
        enqueueConfirmed = true;
      } else {
        const state = await existing.getState();
        if (state === 'failed') {
          await existing.retry();
          enqueueConfirmed = true;
        } else if (state === 'completed') {
          await existing.remove();
          await q.add('convert-slide', { slideId: id }, { jobId });
          enqueueConfirmed = true;
        } else if (['waiting', 'active', 'delayed', 'prioritized', 'waiting-children'].includes(state)) {
          enqueueConfirmed = true;
        } else {
          // Unknown terminal/invalid state: force re-enqueue.
          try { await existing.remove(); } catch {}
          await q.add('convert-slide', { slideId: id }, { jobId });
          enqueueConfirmed = true;
        }
      }
    }
  } catch (err) {
    if (isQueueConnectionError(err)) {
      throw new QueueUnavailableError('Redis/BullMQ unavailable during enqueue', err);
    }
    throw err;
  }

  if (!enqueueConfirmed) {
    throw new QueueUnavailableError(`Failed to confirm enqueue for slide ${id}`);
  }

  await prisma.conversionJob.upsert({
    where: { slideId: id },
    create: { slideId: id, status: 'queued' },
    update: {
      status: 'queued',
      lockedAt: null,
      finishedAt: null,
      lastError: null,
      nextAttemptAt: null,
    },
  });

  try {
    await prisma.slide.update({ where: { id }, data: { conversionStatus: 'pending' } });
  } catch (err) {
    logger.warn('[conversion] Failed to mark slide pending after enqueue', {
      slideId: id,
      error: err?.message || String(err),
    });
  }

  return true;
}

async function getConversionQueueState() {
  try {
    const q = getConversionQueue();
    const counts = await q.getJobCounts('waiting', 'active', 'failed', 'completed', 'delayed', 'paused');
    const waitingJobs = await q.getJobs(['waiting'], 0, 0, false);

    let oldestWaitingAgeSec = 0;
    if (waitingJobs.length > 0) {
      const ts = waitingJobs[0]?.timestamp || Date.now();
      oldestWaitingAgeSec = Math.max(0, Math.round((Date.now() - ts) / 1000));
    }

    return {
      mode: 'redis',
      available: true,
      queueName: QUEUE_NAME,
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      failed: counts.failed || 0,
      completed: counts.completed || 0,
      delayed: counts.delayed || 0,
      paused: counts.paused || 0,
      oldestWaitingAgeSec,
    };
  } catch (err) {
    return {
      mode: 'redis_unavailable',
      available: false,
      queueName: QUEUE_NAME,
      waiting: 0,
      active: 0,
      failed: 0,
      completed: 0,
      delayed: 0,
      paused: 0,
      oldestWaitingAgeSec: 0,
      error: String(err?.message || err),
    };
  }
}

async function reconcileMissingConversionJobs(options = {}) {
  const limit = Math.max(1, Number(options.limit || 500));

  if (!REDIS_ENABLED) {
    return {
      mode: 'redis_disabled',
      candidateCount: 0,
      missingCount: 0,
      reEnqueued: 0,
      failed: 0,
    };
  }

  const q = getConversionQueue();
  const [waiting, delayed, active] = await Promise.all([
    q.getJobs(['waiting'], 0, Math.max(0, limit - 1), false),
    q.getJobs(['delayed'], 0, Math.max(0, limit - 1), false),
    q.getJobs(['active'], 0, Math.max(0, limit - 1), false),
  ]);

  const queuedInBull = new Set(
    [...waiting, ...delayed, ...active]
      .map((job) => Number(job?.data?.slideId))
      .filter((n) => Number.isInteger(n) && n > 0),
  );

  const [dbJobs, pendingSlides] = await Promise.all([
    prisma.conversionJob.findMany({
      where: { status: { in: ['queued', 'processing'] } },
      select: { slideId: true, attempts: true, status: true, lastError: true },
      take: limit,
      orderBy: { updatedAt: 'asc' },
    }),
    prisma.slide.findMany({
      where: {
        conversionStatus: { in: ['pending', 'processing'] },
        pdfUrl: null,
        isHidden: false,
        deletedAt: null,
      },
      select: { id: true },
      take: limit,
      orderBy: { updatedAt: 'asc' },
    }),
  ]);

  const candidates = new Set();
  const jobMetaBySlideId = new Map();
  for (const job of dbJobs) {
    const slideId = Number(job.slideId);
    jobMetaBySlideId.set(slideId, job);
    const attempts = Number(job?.attempts || 0);
    const status = String(job?.status || '');
    // Do not keep re-enqueueing jobs that already exhausted retry budget.
    if (status === 'queued' && attempts >= ATTEMPTS) continue;
    candidates.add(slideId);
  }
  for (const slide of pendingSlides) candidates.add(Number(slide.id));

  const missing = [...candidates]
    .filter((id) => Number.isInteger(id) && id > 0 && !queuedInBull.has(id))
    .slice(0, limit);

  let reEnqueued = 0;
  let failed = 0;
  for (const slideId of missing) {
    const jobMeta = jobMetaBySlideId.get(slideId);
    if (jobMeta && String(jobMeta.status) === 'queued' && Number(jobMeta.attempts || 0) >= ATTEMPTS) {
      await prisma.conversionJob.updateMany({
        where: { slideId },
        data: {
          status: 'failed',
          lockedAt: null,
          nextAttemptAt: null,
          finishedAt: new Date(),
          lastError: String(jobMeta.lastError || 'Retry budget exhausted (reconciler)'),
        },
      }).catch(() => {});
      await prisma.slide.updateMany({
        where: { id: slideId, conversionStatus: { in: ['pending', 'processing'] } },
        data: { conversionStatus: 'failed' },
      }).catch(() => {});
      failed += 1;
      continue;
    }
    try {
      await enqueueSlideConversion(slideId);
      reEnqueued += 1;
    } catch (err) {
      failed += 1;
      logger.error('[conversion] Failed to re-enqueue missing conversion job', {
        slideId,
        error: err?.message || String(err),
      });
    }
  }

  return {
    mode: 'redis',
    candidateCount: candidates.size,
    missingCount: missing.length,
    reEnqueued,
    failed,
  };
}

async function markJobActive(slideId, attemptsMade) {
  await prisma.conversionJob.upsert({
    where: { slideId },
    create: {
      slideId,
      status: 'processing',
      attempts: attemptsMade,
      lockedAt: new Date(),
      nextAttemptAt: null,
      lastError: null,
    },
    update: {
      status: 'processing',
      attempts: attemptsMade,
      lockedAt: new Date(),
      nextAttemptAt: null,
      lastError: null,
    },
  });
}

async function markJobCompleted(slideId) {
  await prisma.conversionJob.updateMany({
    where: { slideId },
    data: {
      status: 'done',
      lockedAt: null,
      finishedAt: new Date(),
      nextAttemptAt: null,
      lastError: null,
    },
  });
}

async function markJobFailed(slideId, job, err) {
  const attemptsMade = Number(job?.attemptsMade || 0);
  const maxAttempts = Number(job?.opts?.attempts || ATTEMPTS);
  const unrecoverable = String(err?.name || '') === 'UnrecoverableError';
  const exhausted = unrecoverable || attemptsMade >= maxAttempts;
  const retryDelay = exhausted ? 0 : computeBackoffFromJob(job);
  const nextAttemptAt = exhausted ? null : new Date(Date.now() + retryDelay);

  await prisma.conversionJob.updateMany({
    where: { slideId },
    data: {
      status: exhausted ? 'failed' : 'queued',
      lockedAt: null,
      finishedAt: exhausted ? new Date() : null,
      nextAttemptAt,
      lastError: String(err?.message || 'Conversion failed').slice(0, 500),
    },
  });

  await prisma.slide.updateMany({
    where: { id: slideId },
    data: { conversionStatus: exhausted ? 'failed' : 'pending' },
  }).catch(() => {});
}

async function closeQueueConnections() {
  if (queue) {
    await queue.close();
    queue = null;
  }
  if (connection) {
    await connection.quit();
    connection = null;
  }
}

module.exports = {
  QueueUnavailableError,
  getRedisConnectionOptions,
  getRedisConnection,
  getQueueDefaultJobOptions,
  getConversionQueue,
  getConversionQueueState,
  enqueueSlideConversion,
  reconcileMissingConversionJobs,
  markJobActive,
  markJobCompleted,
  markJobFailed,
  closeQueueConnections,
  REDIS_ENABLED,
  QUEUE_NAME,
};
