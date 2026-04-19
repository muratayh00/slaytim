'use strict';
/**
 * monitor-preview-worker.js
 *
 * Çalıştır: node scripts/monitor-preview-worker.js
 * PM2 cron olarak her 2 dakikada çalışır.
 *
 * Kontroller:
 *   1. Preview worker heartbeat
 *   2. Queue depth (bekleme + gecikme)
 *   3. Stuck processing (30+ dk)
 *   4. Failed birikmesi (>10)
 *   5. Redis bağlantısı
 */
require('dotenv').config();

const fs     = require('fs');
const path   = require('path');
const logger = require('../src/lib/logger');
const prisma = require('../src/lib/prisma');

const WEBHOOK_URL         = String(process.env.ALERT_WEBHOOK_URL || '').trim();
const HEARTBEAT_PATH      = process.env.PREVIEW_WORKER_HEARTBEAT_PATH ||
  require('os').tmpdir() + '/preview-worker-heartbeat';
const HEARTBEAT_MAX_AGE_S = Number(process.env.HEARTBEAT_MAX_AGE_S  || 90);
const QUEUE_DEPTH_WARN    = Number(process.env.PREVIEW_QUEUE_DEPTH_WARN || 50);
const STUCK_MINUTES       = Number(process.env.PREVIEW_STUCK_MINUTES    || 30);
const FAILED_WARN         = Number(process.env.PREVIEW_FAILED_WARN      || 10);
const REDIS_ENABLED       = String(process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true';

async function sendAlert(text) {
  logger.warn('[monitor-preview] ALARM: ' + text);
  if (!WEBHOOK_URL) return;
  try {
    const { default: fetch } = await import('node-fetch').catch(() => ({ default: global.fetch }));
    const fn = fetch || global.fetch;
    if (!fn) return;
    await fn(WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text: `🚨 [slaytim/preview] ${text}` }),
    });
  } catch (err) {
    logger.warn('[monitor-preview] Webhook gönderilemedi', { error: err?.message });
  }
}

async function run() {
  const alerts = [];

  // ── 1. Heartbeat ──────────────────────────────────────────────────────────
  try {
    const stat   = fs.statSync(HEARTBEAT_PATH);
    const ageSec = (Date.now() - stat.mtimeMs) / 1000;
    if (ageSec > HEARTBEAT_MAX_AGE_S) {
      alerts.push(`Preview worker heartbeat ${Math.round(ageSec)}s önce güncellendi — worker çalışmıyor olabilir (pm2 restart worker-preview)`);
    }
  } catch {
    alerts.push('Preview worker heartbeat dosyası yok — worker hiç başlatılmamış veya çökmüş (npm run worker:preview)');
  }

  // ── 2. Redis / Queue depth ────────────────────────────────────────────────
  if (REDIS_ENABLED) {
    try {
      const { getPreviewQueue } = require('../src/queues/preview.queue');
      const q      = getPreviewQueue();
      const counts = await q.getJobCounts('waiting', 'active', 'delayed', 'failed');
      const depth  = (counts.waiting || 0) + (counts.delayed || 0);
      logger.info('[monitor-preview] Queue durumu', counts);

      if (depth > QUEUE_DEPTH_WARN) {
        alerts.push(`Preview queue derinliği ${depth} (eşik: ${QUEUE_DEPTH_WARN}) — worker yetişemiyor olabilir`);
      }
      if ((counts.failed || 0) > 20) {
        alerts.push(`Preview queue'da ${counts.failed} failed job birikti — Admin > Preview Ops > retry`);
      }
      await q.close();
    } catch (err) {
      alerts.push(`Redis bağlantısı kurulamadı: ${err.message} — Redis ayakta mı? (redis-cli ping)`);
    }
  }

  // ── 3. Stuck processing (DB) ──────────────────────────────────────────────
  try {
    const stuckCount = await prisma.slide.count({
      where: {
        previewStatus: 'processing',
        updatedAt:     { lt: new Date(Date.now() - STUCK_MINUTES * 60 * 1000) },
        deletedAt:     null,
      },
    });
    if (stuckCount > 0) {
      alerts.push(`${stuckCount} slide ${STUCK_MINUTES}+ dakikadır previewStatus=processing — Admin > Preview Ops > Stuck Retry`);
    }
    logger.info(`[monitor-preview] Stuck processing sayısı: ${stuckCount}`);
  } catch (err) {
    alerts.push(`DB sorgusunda hata: ${err.message}`);
  }

  // ── 4. Failed birikmesi ───────────────────────────────────────────────────
  try {
    const failedCount = await prisma.slide.count({
      where: { previewStatus: 'failed', deletedAt: null },
    });
    logger.info(`[monitor-preview] Failed preview sayısı: ${failedCount}`);
    if (failedCount > FAILED_WARN) {
      alerts.push(`${failedCount} slide previewStatus=failed — node scripts/backfill-preview-assets.js`);
    }
  } catch {}

  // ── Sonuç ─────────────────────────────────────────────────────────────────
  if (alerts.length === 0) {
    logger.info('[monitor-preview] Tüm kontroller geçti ✓');
  } else {
    for (const alert of alerts) await sendAlert(alert);
  }

  await prisma.$disconnect();
  process.exit(0);
}

run().catch(err => {
  logger.error('[monitor-preview] Beklenmeyen hata', { error: err.message });
  process.exit(1);
});
