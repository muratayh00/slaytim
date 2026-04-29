require('dotenv').config();
const logger = require('../lib/logger');

const REDIS_ENABLED = String(process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true';

if (!REDIS_ENABLED) {
  logger.info('[worker] Redis disabled (REDIS_ENABLED=false). Worker not started.');
  process.exit(0);
}

// ── Heartbeat: write a sentinel file every 30s so docker/k8s healthchecks can
// verify the worker process is alive and not hung.
const fs = require('fs');
const os = require('os');
// Use WORKER_HEARTBEAT_PATH if set; otherwise fall back to os.tmpdir() so it
// works on both Linux (/tmp) and Windows (C:\Users\...\AppData\Local\Temp).
const HEARTBEAT_PATH = process.env.WORKER_HEARTBEAT_PATH ||
  require('path').join(os.tmpdir(), 'worker-heartbeat');
const HEARTBEAT_INTERVAL_MS = Math.max(5000, Number(process.env.WORKER_HEARTBEAT_INTERVAL_MS || 30000));

function writeHeartbeat() {
  try {
    fs.writeFileSync(HEARTBEAT_PATH, String(Date.now()), 'utf8');
  } catch (err) {
    // Non-fatal: log but don't crash
    logger.warn('[worker] Failed to write heartbeat file', { error: err.message });
  }
}

// Write immediately on startup so the healthcheck window starts right away
writeHeartbeat();
const _heartbeatTimer = setInterval(writeHeartbeat, HEARTBEAT_INTERVAL_MS);
_heartbeatTimer.unref(); // don't keep the event loop alive just for heartbeats

const { Worker, QueueEvents, UnrecoverableError } = require('bullmq');
const {
  getRedisConnectionOptions,
  getQueueDefaultJobOptions,
  markJobActive,
  markJobCompleted,
  markJobFailed,
  QUEUE_NAME,
} = require('../queues/conversion.queue');
const { convertSlide, getLibreOfficeBinary } = require('../services/conversion.service');

// ── Worker preflight: fail hard if required components are missing ─────────────
async function workerPreflight() {
  // 1. Verify Redis is reachable before creating the BullMQ Worker
  {
    const IORedis = require('ioredis');
    const url = String(process.env.REDIS_URL || '').trim();
    const opts = { maxRetriesPerRequest: 0, connectTimeout: 5000, lazyConnect: true, enableOfflineQueue: false, retryStrategy: () => null };
    const client = url ? new IORedis(url, opts) : new IORedis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      db: Number(process.env.REDIS_DB || 0),
      ...opts,
    });
    try {
      await client.connect();
      const pong = await client.ping();
      if (pong !== 'PONG') throw new Error(`Unexpected PING: ${pong}`);
      logger.info('[worker:preflight] ✓ Redis reachable');
    } catch (err) {
      logger.error('[worker:preflight] FATAL: Redis not reachable — worker cannot start', { error: err.message });
      process.exit(1);
    } finally {
      try { await client.disconnect(); } catch {}
    }
  }

  // 2. Verify LibreOffice is present (conversion will fail without it)
  {
    const envVal = process.env.LIBREOFFICE_REQUIRED;
    const IS_PROD = (process.env.NODE_ENV || 'development') === 'production';
    const required = envVal !== undefined ? String(envVal).toLowerCase() === 'true' : IS_PROD;
    const binary = getLibreOfficeBinary();
    if (binary) {
      logger.info(`[worker:preflight] ✓ LibreOffice found at: ${binary}`);
    } else if (required) {
      logger.error('[worker:preflight] FATAL: LibreOffice not found. Worker cannot convert PPTX files.', {
        hint: 'Install LibreOffice, set LIBREOFFICE_PATH, or set LIBREOFFICE_REQUIRED=false.',
      });
      process.exit(1);
    } else {
      logger.warn('[worker:preflight] WARNING: LibreOffice not found — PPTX conversion jobs will fail at runtime.');
    }
  }
}

const connection = getRedisConnectionOptions();
const defaultOpts = getQueueDefaultJobOptions();
const concurrency = Math.max(1, Number(process.env.CONVERSION_WORKER_CONCURRENCY || 2));

// Log the Redis target at startup so connection failures are easy to diagnose
{
  const target = process.env.REDIS_URL
    ? process.env.REDIS_URL.replace(/(:\/\/[^:@]*):([^@]+)@/, '$1:***@') // redact password
    : `${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;
  logger.info(`[worker] Redis hedefi: ${target} (REDIS_ENABLED=true)`);
}

function isUnrecoverable(err) {
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('unsupported')
    || msg.includes('malicious')
    || msg.includes('scan failed')
    || msg.includes('input file missing')
    || msg.includes('slide file not found');
}

// ── Start: preflight → then launch Worker ─────────────────────────────────────
let worker;
let queueEvents;

function shutdown(signal) {
  logger.info(`[worker] received ${signal}, shutting down gracefully...`);
  Promise.all([
    worker ? worker.close() : Promise.resolve(),
    queueEvents ? queueEvents.close() : Promise.resolve(),
  ]).catch((err) => {
    logger.error('[worker] shutdown error', { error: err?.message || String(err) });
  }).finally(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function startWorker() {
  await workerPreflight(); // exits if Redis or LibreOffice missing

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const slideId = Number(job?.data?.slideId);
      if (!Number.isInteger(slideId) || slideId <= 0) {
        throw new UnrecoverableError('Invalid slideId payload');
      }

      await markJobActive(slideId, Number(job.attemptsMade || 0) + 1);

      try {
        await convertSlide(slideId);
        await markJobCompleted(slideId);
        return { ok: true, slideId };
      } catch (err) {
        if (isUnrecoverable(err)) {
          throw new UnrecoverableError(err.message || 'Unrecoverable conversion error');
        }
        throw err;
      }
    },
    {
      connection,
      concurrency,
      lockDuration: Math.max(30000, Number(process.env.CONVERSION_LOCK_DURATION_MS || 120000)),
    }
  );

  queueEvents = new QueueEvents(QUEUE_NAME, { connection });

  worker.on('completed', (job) => {
    logger.info(`[worker] completed`, { slideId: job?.data?.slideId, jobId: job?.id });
  });

  worker.on('failed', async (job, err) => {
    const slideId = Number(job?.data?.slideId || 0);
    const attemptsLeft = (job?.opts?.attempts || 1) - (job?.attemptsMade || 0);
    const isFinalFailure = attemptsLeft <= 0;

    if (slideId > 0) {
      await markJobFailed(slideId, job, err).catch(() => {});
    }

    logger.error('[worker] Job failed', {
      jobId: job?.id,
      slideId,
      attempt: job?.attemptsMade,
      attemptsLeft,
      isFinalFailure,
      error: err?.message,
    });

    if (isFinalFailure && process.env.ALERT_WEBHOOK_URL) {
      try {
        const body = JSON.stringify({
          text: `💀 [Slaytim] Conversion PERMANENTLY FAILED\nSlide: ${slideId} | Job: ${job?.id}\nError: ${err?.message}`,
        });
        const url = new URL(process.env.ALERT_WEBHOOK_URL);
        const lib = url.protocol === 'https:' ? require('https') : require('http');
        await new Promise((resolve) => {
          const req = lib.request(
            { hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname + url.search, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
            (res) => { res.resume(); resolve(res.statusCode); }
          );
          req.on('error', () => resolve(0));
          req.setTimeout(5000, () => { req.destroy(); resolve(0); });
          req.write(body);
          req.end();
        });
      } catch {}
    }
  });

  worker.on('stalled', (jobId) => {
    logger.warn('[worker] Job stalled (worker may have crashed)', { jobId });
  });

  queueEvents.on('stalled', ({ jobId }) => {
    logger.warn('[worker] QueueEvents: stalled job detected', { jobId });
  });

  logger.info('[worker] Conversion worker started', {
    queue: QUEUE_NAME,
    concurrency,
    attempts: defaultOpts.attempts,
  });
}

startWorker().catch((err) => {
  logger.error('[worker] Unhandled startup error', { error: err.message, stack: err.stack });
  process.exit(1);
});

