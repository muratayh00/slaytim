'use strict';

/**
 * preview.worker.js
 *
 * BullMQ worker for the "preview-generation" queue.
 * Runs as a separate process: node src/workers/preview.worker.js
 *
 * Processes two job types:
 *
 *   preview-first-page  (priority 1, 3 attempts)
 *     1. Resolves PDF to local path
 *     2. Reads total page count
 *     3. Generates page 1 asset
 *     4. Updates slide.previewPageCount = totalPages, keeps previewStatus='processing'
 *     5. Enqueues preview-remaining-pages job (if totalPages > 1)
 *        OR marks slide as 'ready' immediately (single-page document)
 *
 *   preview-remaining-pages  (priority 10, 2 attempts)
 *     1. Resolves PDF to local path
 *     2. Generates pages 2..totalPages
 *     3. Marks slide as 'ready' (or 'failed' if no assets were created)
 *
 * State machine transitions:
 *   none / failed  → processing  (first-page job starts)
 *   processing     → ready       (all pages done) | failed (permanent failure)
 *
 * On final failure of preview-first-page, previewStatus is set to 'failed'.
 * PDF.js viewer is always available as a fallback on the frontend.
 */

require('dotenv').config();

const REDIS_ENABLED = String(process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true';
if (!REDIS_ENABLED) {
  console.log('[preview-worker] Redis disabled (REDIS_ENABLED=false). Worker not started.');
  process.exit(0);
}

const PREVIEW_ENABLED = String(process.env.PREVIEW_ENABLED ? 'true').toLowerCase() !== 'false';
if (!PREVIEW_ENABLED) {
  console.log('[preview-worker] PREVIEW_ENABLED=false. Worker not started.');
  process.exit(0);
}

const fs   = require('fs');
const path = require('path');

// ── Heartbeat (same pattern as conversion worker) ─────────────────────────────
const HEARTBEAT_PATH        = process.env.PREVIEW_WORKER_HEARTBEAT_PATH ||
  path.join(require('os').tmpdir(), 'preview-worker-heartbeat');
const HEARTBEAT_INTERVAL_MS = Math.max(5000, Number(process.env.WORKER_HEARTBEAT_INTERVAL_MS || 30000));

function writeHeartbeat() {
  try { fs.writeFileSync(HEARTBEAT_PATH, String(Date.now()), 'utf8'); }
  catch (err) { console.warn('[preview-worker] Heartbeat write failed:', err.message); }
}
writeHeartbeat();
const _heartbeatTimer = setInterval(writeHeartbeat, HEARTBEAT_INTERVAL_MS);
_heartbeatTimer.unref();

// ── Dependencies ──────────────────────────────────────────────────────────────
const { Worker, UnrecoverableError } = require('bullmq');
const {
  PREVIEW_QUEUE_NAME,
  getPreviewConnectionOptions,
  enqueueRemainingPagesPreview,
} = require('../queues/preview.queue');
const {
  generatePageAsset,
  getPdfPageCount,
  resolveLocalPdf,
} = require('../services/preview-generator.service');
const prisma  = require('../lib/prisma');
const logger  = require('../lib/logger');

const PREVIEW_PAGE_CONCURRENCY = Math.max(1, Number(process.env.PREVIEW_PAGE_CONCURRENCY || 2));
const WORKER_CONCURRENCY       = Math.max(1, Number(process.env.PREVIEW_WORKER_CONCURRENCY || 2));
const LOCK_DURATION_MS         = Math.max(30000, Number(process.env.PREVIEW_LOCK_DURATION_MS || 180000));
const MAX_PAGES                = Math.max(1, Number(process.env.PREVIEW_MAX_PAGES || 60));

// ── Job handlers ──────────────────────────────────────────────────────────────

async function handleFirstPage(job) {
  const { slideId, pdfUrl } = job.data;
  const id = Number(slideId);
  if (!Number.isInteger(id) || id <= 0 || !pdfUrl) {
    throw new UnrecoverableError(`Invalid preview-first-page payload: slideId=${slideId}`);
  }

  logger.info('[preview-worker] First-page job started', { slideId: id, jobId: job.id });

  // Transition: none | failed → processing
  await prisma.slide.updateMany({
    where: { id, previewStatus: { in: ['none', 'failed'] } },
    data:  { previewStatus: 'processing' },
  }).catch(() => {});

  let localPdfPath = null;
  let isTempFile   = false;

  try {
    ({ localPath: localPdfPath, isTempFile } = await resolveLocalPdf(pdfUrl));

    const totalPages    = await getPdfPageCount(localPdfPath);
    const cappedPages   = Math.min(totalPages, MAX_PAGES);

    logger.info('[preview-worker] PDF info read', { slideId: id, totalPages, cappedPages });

    // Generate page 1 — throw on error so BullMQ retries
    await generatePageAsset(id, localPdfPath, 1);

    // Store total page count so frontend can show "page 1 of N" even while
    // remaining pages are still generating.
    await prisma.slide.updateMany({
      where: { id },
      data:  { previewPageCount: cappedPages },
    }).catch(() => {});

    if (cappedPages === 1) {
      // Single-page document: done!
      await prisma.slide.update({
        where: { id },
        data:  { previewStatus: 'ready', previewGeneratedAt: new Date() },
      });
      logger.info('[preview-worker] Single-page doc — marked ready', { slideId: id });
    } else {
      // Enqueue remaining pages at lower priority.
      // Job survives a worker restart because it lives in Redis.
      await enqueueRemainingPagesPreview(id, pdfUrl, cappedPages);
      logger.info('[preview-worker] First page done, remaining pages enqueued', {
        slideId: id, totalPages, cappedPages,
      });
    }

    return { slideId: id, pageNumber: 1, totalPages };
  } finally {
    if (isTempFile && localPdfPath && fs.existsSync(localPdfPath)) {
      fs.unlink(localPdfPath, () => {});
    }
  }
}

async function handleRemainingPages(job) {
  const { slideId, pdfUrl, totalPages } = job.data;
  const id    = Number(slideId);
  const total = Number(totalPages);

  if (!Number.isInteger(id) || id <= 0 || !pdfUrl || !total) {
    throw new UnrecoverableError(`Invalid preview-remaining-pages payload: slideId=${slideId}`);
  }

  logger.info('[preview-worker] Remaining-pages job started', { slideId: id, totalPages: total });

  let localPdfPath = null;
  let isTempFile   = false;

  try {
    ({ localPath: localPdfPath, isTempFile } = await resolveLocalPdf(pdfUrl));

    // Pages 2..total (page 1 is already done by the first-page job)
    const pageNumbers = Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 2);

    for (let i = 0; i < pageNumbers.length; i += PREVIEW_PAGE_CONCURRENCY) {
      const batch = pageNumbers.slice(i, i + PREVIEW_PAGE_CONCURRENCY);
      await Promise.all(
        batch.map(async (pageNumber) => {
          try {
            await generatePageAsset(id, localPdfPath, pageNumber);
          } catch (err) {
            // Partial failure is acceptable — log and continue with other pages
            logger.error('[preview-worker] Page generation failed (non-fatal)', {
              slideId: id, pageNumber, error: err?.message,
            });
          }
        })
      );
    }

    const assetCount = await prisma.slidePreviewAsset.count({ where: { slideId: id } });

    await prisma.slide.update({
      where: { id },
      data: {
        previewStatus:      assetCount > 0 ? 'ready' : 'failed',
        previewPageCount:   assetCount,
        previewGeneratedAt: assetCount > 0 ? new Date() : null,
      },
    });

    logger.info('[preview-worker] Remaining-pages job done', { slideId: id, assetCount });
    return { slideId: id, assetCount };
  } finally {
    if (isTempFile && localPdfPath && fs.existsSync(localPdfPath)) {
      fs.unlink(localPdfPath, () => {});
    }
  }
}

// ── Worker setup ──────────────────────────────────────────────────────────────
let worker;

function shutdown(signal) {
  console.log(`[preview-worker] ${signal} received — shutting down gracefully…`);
  (worker ? worker.close() : Promise.resolve())
    .catch((err) => console.error('[preview-worker] shutdown error:', err?.message))
    .finally(() => process.exit(0));
}
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function startWorker() {
  // ── Preflight: verify Redis is reachable ───────────────────────────────────
  {
    const IORedis = require('ioredis');
    const connOpts = getPreviewConnectionOptions();
    const safeOpts = {
      maxRetriesPerRequest: 0,
      connectTimeout:       5000,
      lazyConnect:          true,
      enableOfflineQueue:   false,
      retryStrategy:        () => null,
    };
    const client = typeof connOpts === 'string'
      ? new IORedis(connOpts, safeOpts)
      : new IORedis({ ...connOpts, ...safeOpts });
    try {
      await client.connect();
      const pong = await client.ping();
      if (pong !== 'PONG') throw new Error(`Unexpected PING response: ${pong}`);
      logger.info('[preview-worker:preflight] ✓ Redis reachable');
    } catch (err) {
      logger.error('[preview-worker:preflight] FATAL: Redis not reachable — worker cannot start', {
        error: err.message,
      });
      process.exit(1);
    } finally {
      try { await client.disconnect(); } catch {}
    }
  }

  // ── Create BullMQ Worker ───────────────────────────────────────────────────
  worker = new Worker(
    PREVIEW_QUEUE_NAME,
    async (job) => {
      switch (job.name) {
        case 'preview-first-page':      return handleFirstPage(job);
        case 'preview-remaining-pages': return handleRemainingPages(job);
        default:
          throw new UnrecoverableError(`Unknown job type: ${job.name}`);
      }
    },
    {
      connection:   getPreviewConnectionOptions(),
      concurrency:  WORKER_CONCURRENCY,
      lockDuration: LOCK_DURATION_MS,
    }
  );

  worker.on('completed', (job) => {
    logger.info('[preview-worker] Job completed', {
      jobId:   job.id,
      name:    job.name,
      slideId: job.data?.slideId,
    });
  });

  worker.on('failed', async (job, err) => {
    const slideId      = Number(job?.data?.slideId || 0);
    const attemptsMade = Number(job?.attemptsMade || 0);
    const maxAttempts  = Number(job?.opts?.attempts || 1);
    const isFinal      = attemptsMade >= maxAttempts;

    logger.error('[preview-worker] Job failed', {
      jobId:   job?.id,
      name:    job?.name,
      slideId,
      attempt: attemptsMade,
      isFinal,
      error:   err?.message,
    });

    // On permanent first-page failure: mark previewStatus=failed so the
    // frontend stops polling and falls back to PDF.js permanently.
    if (isFinal && job?.name === 'preview-first-page' && slideId > 0) {
      await prisma.slide.updateMany({
        where: { id: slideId },
        data:  { previewStatus: 'failed' },
      }).catch(() => {});
    }
  });

  worker.on('stalled', (jobId) => {
    logger.warn('[preview-worker] Job stalled (worker may have crashed/hung)', { jobId });
  });

  logger.info('[preview-worker] Preview worker started', {
    queue:        PREVIEW_QUEUE_NAME,
    concurrency:  WORKER_CONCURRENCY,
    lockDuration: LOCK_DURATION_MS,
  });
}

startWorker().catch((err) => {
  logger.error('[preview-worker] Unhandled startup error', { error: err.message, stack: err.stack });
  process.exit(1);
});
