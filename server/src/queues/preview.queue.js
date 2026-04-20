'use strict';

/**
 * preview.queue.js
 *
 * BullMQ queue for async per-page image preview generation.
 * Queue name: preview-generation (configurable via PREVIEW_QUEUE_NAME)
 *
 * Two job types:
 *   preview-first-page      priority=1  attempts=3  — generates page 1, enqueues remaining
 *   preview-remaining-pages priority=10 attempts=2  — generates pages 2..N
 *
 * Both jobs carry {slideId, pdfUrl} so they are fully self-contained after a
 * crash/restart — the worker never needs to re-query for the PDF URL.
 *
 * Dedup: jobId = `preview-first-${slideId}` / `preview-remaining-${slideId}`.
 * Adding a job when one with the same id is already waiting/active is silently
 * ignored (not an error).
 *
 * When Redis is disabled (REDIS_ENABLED=false), all enqueue functions return
 * null and the caller is responsible for a local fallback.
 */

const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const logger = require('../lib/logger');

// Re-use the same connection options as the conversion queue so both workers
// can share a single Redis instance without extra config.
const { REDIS_ENABLED, getRedisConnectionOptions } = require('./conversion.queue');

const PREVIEW_QUEUE_NAME = String(process.env.PREVIEW_QUEUE_NAME || 'preview-generation');

// Per-job retry budgets
const FIRST_PAGE_ATTEMPTS = Math.max(1, Number(process.env.PREVIEW_FIRST_PAGE_ATTEMPTS || 3));
const REMAINING_ATTEMPTS  = Math.max(1, Number(process.env.PREVIEW_REMAINING_ATTEMPTS  || 2));
const PREVIEW_BACKOFF_MS  = Math.max(500, Number(process.env.PREVIEW_BACKOFF_MS || 1000));

// ── Lazy Redis connection ────────────────────────────────────────────────────
let _connection = null;
let _queue      = null;

function getPreviewConnection() {
  if (_connection) return _connection;
  const opts = getRedisConnectionOptions();
  _connection = new IORedis(opts);
  let _errCount = 0;
  let _lastLog   = 0;
  _connection.on('error', (err) => {
    _errCount++;
    const now = Date.now();
    if (_errCount === 1 || now - _lastLog >= 60_000) {
      logger.warn('[preview-queue] Redis connection error', { count: _errCount, error: err?.message });
      _lastLog = now;
    }
  });
  return _connection;
}

function getPreviewQueue() {
  if (_queue) return _queue;
  _queue = new Queue(PREVIEW_QUEUE_NAME, {
    connection: getPreviewConnection(),
    defaultJobOptions: {
      removeOnComplete: 500,   // keep last 500 completed jobs for inspection
      removeOnFail:    2000,   // keep last 2000 failed jobs
    },
  });
  return _queue;
}

// ── Dedup-safe add ───────────────────────────────────────────────────────────
/**
 * Add a job to the preview queue.
 * Returns the Job object, null if deduplicated, or null on non-fatal error.
 */
async function safeAdd(jobName, data, opts) {
  try {
    const q = getPreviewQueue();
    try {
      return await q.add(jobName, data, opts);
    } catch (addErr) {
      const msg = String(addErr?.message || '').toLowerCase();
      // BullMQ throws when a job with the same jobId already exists
      if (msg.includes('jobid') && msg.includes('already exists')) {
        logger.debug('[preview-queue] Job already in queue (dedup)', {
          jobName,
          jobId: opts?.jobId,
          slideId: data?.slideId,
        });
        return null; // already queued — that's fine
      }
      throw addErr;
    }
  } catch (err) {
    // Queue errors are non-fatal — slide still has PDF.js fallback
    logger.warn('[preview-queue] Failed to enqueue preview job (non-fatal, PDF.js will serve)', {
      jobName,
      slideId: data?.slideId,
      error: err?.message,
    });
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Enqueue a high-priority job to generate page 1 of a slide's preview.
 * Called immediately after conversion marks the slide as "done".
 *
 * @param {number} slideId
 * @param {string} pdfUrl  — canonical storage path (e.g. /uploads/pdfs/xxx.pdf)
 */
async function enqueueFirstPagePreview(slideId, pdfUrl) {
  if (!REDIS_ENABLED) return null;
  const id = Number(slideId);
  if (!Number.isInteger(id) || id <= 0 || !pdfUrl) return null;

  return safeAdd(
    'preview-first-page',
    { slideId: id, pdfUrl },
    {
      jobId:   `preview-first-${id}`,
      priority: 1,
      attempts: FIRST_PAGE_ATTEMPTS,
      backoff:  { type: 'exponential', delay: PREVIEW_BACKOFF_MS },
    }
  );
}

/**
 * Enqueue a lower-priority job to generate the remaining pages (2..N).
 * Typically called by the preview worker after page 1 is complete.
 *
 * @param {number} slideId
 * @param {string} pdfUrl
 * @param {number} totalPages
 */
async function enqueueRemainingPagesPreview(slideId, pdfUrl, totalPages) {
  if (!REDIS_ENABLED) return null;
  const id    = Number(slideId);
  const total = Number(totalPages);
  if (!Number.isInteger(id) || id <= 0 || !pdfUrl || total <= 1) return null;

  return safeAdd(
    'preview-remaining-pages',
    { slideId: id, pdfUrl, totalPages: total },
    {
      jobId:    `preview-remaining-${id}`,
      priority: 10, // lower than first-page
      attempts: REMAINING_ATTEMPTS,
      backoff:  { type: 'exponential', delay: PREVIEW_BACKOFF_MS * 2 },
    }
  );
}

async function closePreviewQueueConnections() {
  if (_queue)      { try { await _queue.close();           } catch {} _queue      = null; }
  if (_connection) { try { await _connection.quit();       } catch {} _connection = null; }
}

module.exports = {
  PREVIEW_QUEUE_NAME,
  REDIS_ENABLED,
  getPreviewQueue,
  getPreviewConnectionOptions: getRedisConnectionOptions,
  enqueueFirstPagePreview,
  enqueueRemainingPagesPreview,
  closePreviewQueueConnections,
};
