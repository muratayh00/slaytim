/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const prisma = require('../src/lib/prisma');
const { enqueueSlideConversion, convertSlide } = require('../src/services/conversion.service');

const ROOT = path.join(__dirname, '..');
const UPLOADS_DIR = path.join(ROOT, 'uploads');
const SLIDES_DIR = path.join(UPLOADS_DIR, 'slides');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function pickTemplatePptx() {
  if (!fs.existsSync(SLIDES_DIR)) return null;
  const files = fs.readdirSync(SLIDES_DIR)
    .filter((f) => /\.pptx$/i.test(f))
    .map((f) => path.join(SLIDES_DIR, f))
    .filter((p) => fs.statSync(p).isFile());
  return files.length > 0 ? files[0] : null;
}

function localPathFromUrl(fileUrl) {
  return path.join(UPLOADS_DIR, String(fileUrl).replace(/^\/uploads\//, ''));
}

async function main() {
  const shouldEnqueue = String(process.env.REPAIR_ENQUEUE || 'false').toLowerCase() === 'true';
  const shouldConvert = String(process.env.REPAIR_CONVERT || 'false').toLowerCase() === 'true';
  ensureDir(SLIDES_DIR);

  const template = pickTemplatePptx();
  if (!template) {
    console.error('[repair] No template .pptx found under uploads/slides. Cannot repair missing demo files.');
    process.exit(1);
  }

  const slides = await prisma.slide.findMany({
    where: {
      fileUrl: { startsWith: '/uploads/slides/demo-' },
    },
    select: { id: true, fileUrl: true, conversionStatus: true },
  });

  let repairedFiles = 0;
  let queuedSlides = 0;
  let queueErrors = 0;
  let convertedSlides = 0;
  let convertErrors = 0;

  for (const slide of slides) {
    const absPath = localPathFromUrl(slide.fileUrl);
    if (!fs.existsSync(absPath)) {
      ensureDir(path.dirname(absPath));
      fs.copyFileSync(template, absPath);
      repairedFiles += 1;
      console.log(`[repair] created missing source: ${absPath}`);
    }

    await prisma.slide.update({
      where: { id: slide.id },
      data: { conversionStatus: 'pending', pdfUrl: null, thumbnailUrl: null },
    });

    await prisma.conversionJob.upsert({
      where: { slideId: slide.id },
      create: {
        slideId: slide.id,
        status: 'queued',
        attempts: 0,
        lastError: null,
        lockedAt: null,
        nextAttemptAt: null,
      },
      update: {
        status: 'queued',
        lastError: null,
        lockedAt: null,
        nextAttemptAt: null,
      },
    });

    if (shouldEnqueue) {
      try {
        await enqueueSlideConversion(slide.id);
        queuedSlides += 1;
      } catch (err) {
        queueErrors += 1;
        console.warn(`[repair] enqueue failed for slide ${slide.id}: ${err?.message || String(err)}`);
      }
    }

    if (shouldConvert) {
      try {
        await prisma.conversionJob.updateMany({
          where: { slideId: slide.id },
          data: { status: 'processing', lastError: null, lockedAt: new Date() },
        });
      } catch {}

      try {
        await convertSlide(slide.id);
        convertedSlides += 1;
        await prisma.conversionJob.updateMany({
          where: { slideId: slide.id },
          data: { status: 'done', lockedAt: null, finishedAt: new Date(), lastError: null },
        });
      } catch (err) {
        convertErrors += 1;
        console.warn(`[repair] convert failed for slide ${slide.id}: ${err?.message || String(err)}`);
        await prisma.conversionJob.updateMany({
          where: { slideId: slide.id },
          data: {
            status: 'failed',
            lockedAt: null,
            finishedAt: new Date(),
            lastError: String(err?.message || err).slice(0, 500),
          },
        }).catch(() => {});
      }
    }
  }

  console.log('[repair] done', {
    template,
    totalDemoSlides: slides.length,
    enqueueEnabled: shouldEnqueue,
    convertEnabled: shouldConvert,
    repairedFiles,
    queuedSlides,
    queueErrors,
    convertedSlides,
    convertErrors,
  });
}

main()
  .catch((err) => {
    console.error('[repair] failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
