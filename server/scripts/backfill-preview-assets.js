'use strict';
/**
 * backfill-preview-assets.js
 *
 * Finds slides with conversionStatus=done but previewStatus=none|failed,
 * orders by viewsCount DESC, and enqueues them into the preview-generation queue.
 *
 * Usage:
 *   node scripts/backfill-preview-assets.js --dry-run   # shows what would be queued
 *   node scripts/backfill-preview-assets.js             # actually enqueues
 *
 * Env overrides:
 *   BACKFILL_LIMIT  (default 500)  — max slides to process per run
 *   BACKFILL_BATCH  (default 20)   — parallel enqueue batch size
 *   BACKFILL_DELAY  (default 200)  — ms between batches (Redis backpressure)
 */
require('dotenv').config();

const prisma  = require('../src/lib/prisma');
const logger  = require('../src/lib/logger');

const DRY_RUN  = process.argv.includes('--dry-run');
const LIMIT    = Math.max(1, Number(process.env.BACKFILL_LIMIT  || 500));
const BATCH_SZ = Math.max(1, Number(process.env.BACKFILL_BATCH  || 20));
const DELAY_MS = Math.max(0, Number(process.env.BACKFILL_DELAY  || 200));

async function run() {
  const slides = await prisma.slide.findMany({
    where: {
      conversionStatus: 'done',
      pdfUrl:           { not: null },
      previewStatus:    { in: ['none', 'failed'] },
      deletedAt:        null,
    },
    select:  { id: true, pdfUrl: true, viewsCount: true, title: true },
    orderBy: { viewsCount: 'desc' },
    take:    LIMIT,
  });

  console.log(`[backfill] ${slides.length} slide bulundu — DRY_RUN=${DRY_RUN}, LIMIT=${LIMIT}`);
  if (slides.length === 0) {
    console.log('[backfill] İşlenecek slide yok. Çıkılıyor.');
    await prisma.$disconnect();
    return;
  }

  const REDIS_ENABLED = String(process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true';

  let enqueueFirstPage;
  if (!DRY_RUN) {
    if (REDIS_ENABLED) {
      ({ enqueueFirstPagePreview: enqueueFirstPage } = require('../src/queues/preview.queue'));
    } else {
      // Redis kapalı: previewStatus'u none'a sıfırla, API sunucusu local fallback'i halleder
      console.log('[backfill] Redis kapalı — previewStatus sıfırlanıyor (local fallback modu)');
    }
  }

  let queued = 0, skipped = 0, failed = 0;

  for (let i = 0; i < slides.length; i += BATCH_SZ) {
    const batch = slides.slice(i, i + BATCH_SZ);

    await Promise.all(batch.map(async (s) => {
      if (DRY_RUN) {
        console.log(`  [dry-run] slideId=${s.id} views=${s.viewsCount} title="${s.title?.slice(0, 40)}"`);
        queued++;
        return;
      }

      try {
        if (REDIS_ENABLED && enqueueFirstPage) {
          await enqueueFirstPage(s.id, s.pdfUrl);
        } else {
          // Redis yok: sadece status'u sıfırla
          await prisma.slide.update({
            where: { id: s.id },
            data:  { previewStatus: 'none' },
          });
        }
        queued++;
        logger.info(`[backfill] queued slideId=${s.id} views=${s.viewsCount}`);
      } catch (err) {
        failed++;
        logger.error(`[backfill] FAILED slideId=${s.id}`, { error: err.message });
      }
    }));

    if (!DRY_RUN && DELAY_MS > 0 && i + BATCH_SZ < slides.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }

    const progress = Math.min(i + BATCH_SZ, slides.length);
    console.log(`[backfill] ${progress}/${slides.length} işlendi...`);
  }

  console.log(`\n[backfill] TAMAMLANDI — queued=${queued} failed=${failed}`);
  if (DRY_RUN) console.log('[backfill] DRY RUN — hiçbir şey kuyruğa alınmadı.');

  await prisma.$disconnect();
}

run().catch(err => {
  console.error('[backfill] Beklenmeyen hata:', err.message);
  process.exit(1);
});
