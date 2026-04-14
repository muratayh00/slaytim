/**
 * Stuck Job Monitor
 *
 * Polls the BullMQ queue every POLL_INTERVAL_MS to find jobs that:
 *   - Are in "active" state
 *   - Have been active longer than STUCK_THRESHOLD_MS
 *   - Were not already alerted
 *
 * When a stuck job is found:
 *   1. Logs a structured error
 *   2. Sends an alert (webhook / console / email — configurable)
 *   3. Optionally moves the job to failed state so it can retry
 */

require('dotenv').config();

const REDIS_ENABLED = String(process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true';
if (!REDIS_ENABLED) {
  console.log('[stuck-monitor] Redis disabled — monitor not started');
  process.exit(0);
}

const { Queue } = require('bullmq');
const logger = require('../lib/logger');
const {
  getRedisConnectionOptions,
  QUEUE_NAME,
} = require('../queues/conversion.queue');

const POLL_INTERVAL_MS = Number(process.env.STUCK_JOB_POLL_MS || 60_000);      // 1 min
const STUCK_THRESHOLD_MS = Number(process.env.STUCK_JOB_THRESHOLD_MS || 600_000); // 10 min
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || '';
const alreadyAlerted = new Set();

const queue = new Queue(QUEUE_NAME, {
  connection: getRedisConnectionOptions(),
});

async function sendAlert(payload) {
  const message = `🚨 [Slaytim] Stuck conversion job detected\n`
    + `Job ID: ${payload.jobId} | Slide: ${payload.slideId}\n`
    + `Active for: ${Math.round(payload.activeForMs / 1000 / 60)} minutes\n`
    + `Attempts: ${payload.attemptsMade}`;

  logger.error('[stuck-monitor] Stuck job alert', payload);

  if (ALERT_WEBHOOK_URL) {
    try {
      const body = JSON.stringify({
        text: message,
        // Slack-compatible format
        attachments: [{ color: 'danger', fields: Object.entries(payload).map(([k, v]) => ({ title: k, value: String(v), short: true })) }],
      });
      const url = new URL(ALERT_WEBHOOK_URL);
      const lib = url.protocol === 'https:' ? require('https') : require('http');
      await new Promise((resolve, reject) => {
        const req = lib.request(
          { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
          (res) => { res.resume(); resolve(res.statusCode); }
        );
        req.on('error', reject);
        req.setTimeout(5000, () => { req.destroy(); reject(new Error('alert webhook timeout')); });
        req.write(body);
        req.end();
      });
      logger.info('[stuck-monitor] Alert webhook sent', { status: 'ok', jobId: payload.jobId });
    } catch (err) {
      logger.warn('[stuck-monitor] Alert webhook failed', { error: err.message });
    }
  }
}

async function checkForStuckJobs() {
  try {
    const activeJobs = await queue.getActive();
    const now = Date.now();

    for (const job of activeJobs) {
      const processedOn = job.processedOn || job.timestamp;
      if (!processedOn) continue;

      const activeForMs = now - processedOn;
      if (activeForMs < STUCK_THRESHOLD_MS) continue;

      const jobKey = `${job.id}:${job.attemptsMade}`;
      if (alreadyAlerted.has(jobKey)) continue;

      alreadyAlerted.add(jobKey);

      const payload = {
        jobId: job.id,
        slideId: job.data?.slideId,
        attemptsMade: job.attemptsMade,
        activeForMs,
        activeForMin: Math.round(activeForMs / 60_000),
        timestamp: new Date().toISOString(),
      };

      await sendAlert(payload);

      // If job has been stuck for more than 3x the threshold, force-fail it to trigger retry
      if (activeForMs > STUCK_THRESHOLD_MS * 3) {
        try {
          await job.moveToFailed(
            new Error(`Job stuck for ${payload.activeForMin} minutes — force-failed by monitor`),
            'stuck-job-monitor'
          );
          logger.warn('[stuck-monitor] Force-failed stuck job', { jobId: job.id, slideId: payload.slideId });
          alreadyAlerted.delete(jobKey); // allow re-alert if it gets stuck again
        } catch (moveErr) {
          logger.warn('[stuck-monitor] Could not force-fail job', { jobId: job.id, error: moveErr.message });
        }
      }
    }
  } catch (err) {
    logger.error('[stuck-monitor] Poll error', { error: err.message });
  }
}

// Cleanup old alert keys every hour
setInterval(() => {
  alreadyAlerted.clear();
}, 3_600_000);

logger.info('[stuck-monitor] Starting', {
  queueName: QUEUE_NAME,
  pollIntervalMs: POLL_INTERVAL_MS,
  stuckThresholdMs: STUCK_THRESHOLD_MS,
  webhookConfigured: Boolean(ALERT_WEBHOOK_URL),
});

// Run immediately then on interval
checkForStuckJobs();
setInterval(checkForStuckJobs, POLL_INTERVAL_MS);
