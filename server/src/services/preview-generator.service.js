'use strict';

/**
 * preview-generator.service.js
 *
 * Low-level building blocks for per-page WebP image preview generation.
 * Designed to be called by the BullMQ preview worker — NOT to schedule jobs
 * itself.  Scheduling lives in preview.queue.js.
 *
 * KEY ARCHITECTURE:
 *   renderPageRangeToPng()  — ONE pdftoppm call for all pages in range.
 *                             Eliminates per-page cold start (was 30× spawns).
 *   generatePageAssetsRange() — Batch version: one pdftoppm + parallel sharp +
 *                               parallel upload + parallel DB upserts.
 *   generatePageAsset()     — Single-page version (page 1 fast path only).
 *
 * Config env vars:
 *   PREVIEW_ENABLED         (default: true)
 *   PREVIEW_MAX_PAGES       (default: 60)
 *   PREVIEW_MAX_PDF_SIZE_MB (default: 80)
 *   PREVIEW_WIDTH           (default: 1280)
 *   PREVIEW_QUALITY         (default: 82)
 *   PREVIEW_DPI             (default: 120)   ← was 150, lowered for speed
 *   PDFTOPPM_PATH           (default: auto-detect)
 */

const path      = require('path');
const fs        = require('fs');
const os        = require('os');
const { execFile } = require('child_process');
const prisma    = require('../lib/prisma');
const { putBuffer, resolveStorageReadUrl, isRemoteEnabled } = require('./storage.service');
const logger    = require('../lib/logger');

// ── Config ────────────────────────────────────────────────────────────────────
const PREVIEW_ENABLED     = String(process.env.PREVIEW_ENABLED ?? 'true').toLowerCase() !== 'false';
const MAX_PAGES           = Math.max(1,   Number(process.env.PREVIEW_MAX_PAGES       || 60));
const MAX_PDF_SIZE_MB     = Math.max(1,   Number(process.env.PREVIEW_MAX_PDF_SIZE_MB || 80));
const PREVIEW_WIDTH       = Math.max(400, Number(process.env.PREVIEW_WIDTH           || 1280));
const PREVIEW_QUALITY     = Math.min(100, Math.max(10, Number(process.env.PREVIEW_QUALITY || 82)));
// DPI lowered from 150→120: 20% faster rendering, still crisp on screen
const PREVIEW_DPI         = Math.max(72,  Number(process.env.PREVIEW_DPI             || 120));

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// ── Lazy-load sharp ───────────────────────────────────────────────────────────
let _sharp = null;
let _sharpChecked = false;

function getSharp() {
  if (_sharpChecked) return _sharp;
  _sharpChecked = true;
  try {
    _sharp = require('sharp');
  } catch {
    _sharp = null;
    logger.warn('[preview-gen] sharp not installed — run: cd server && npm install sharp');
  }
  return _sharp;
}

// ── pdftoppm detection ────────────────────────────────────────────────────────
let _pdftoppmPath    = undefined;
let _pdftoppmChecked = false;

function getPdftoppmBinary() {
  if (_pdftoppmChecked) return _pdftoppmPath;
  _pdftoppmChecked = true;

  const envPath = String(process.env.PDFTOPPM_PATH || '').trim();
  if (envPath && fs.existsSync(envPath)) { _pdftoppmPath = envPath; return _pdftoppmPath; }

  if (process.platform !== 'win32') {
    try {
      const res = require('child_process')
        .execSync('which pdftoppm 2>/dev/null', { encoding: 'utf8' }).trim();
      if (res) { _pdftoppmPath = res; return _pdftoppmPath; }
    } catch {}
  }

  // Windows: common poppler install locations
  const winCandidates = [
    'C:\\Program Files\\poppler\\bin\\pdftoppm.exe',
    'C:\\Program Files (x86)\\poppler\\bin\\pdftoppm.exe',
    'C:\\tools\\poppler\\bin\\pdftoppm.exe',
  ];
  const found = winCandidates.find((p) => fs.existsSync(p));
  if (found) { _pdftoppmPath = found; return _pdftoppmPath; }

  _pdftoppmPath = null;
  logger.warn('[preview-gen] pdftoppm not found — install poppler-utils: apt-get install -y poppler-utils');
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Render a RANGE of PDF pages to PNGs using a SINGLE pdftoppm invocation.
 *
 * This is the key performance optimization: instead of spawning pdftoppm once
 * per page (each time re-reading the entire PDF), we spawn it once and let it
 * render all pages in sequence while keeping the PDF in memory.
 *
 * Output files are named: page-{N}.png (zero-padded based on last page number)
 *
 * @param {string} pdfPath   — local PDF file path
 * @param {number} fromPage  — 1-based, inclusive
 * @param {number} toPage    — 1-based, inclusive
 * @param {string} outDir    — directory to write PNGs into
 * @returns {Promise<Array<{pngPath: string, pageNumber: number}>>}
 */
function renderPageRangeToPng(pdfPath, fromPage, toPage, outDir) {
  const pdftoppm = getPdftoppmBinary();
  if (!pdftoppm) throw new Error('pdftoppm not available');

  const prefix = path.join(outDir, 'pg');
  const args = [
    '-r', String(PREVIEW_DPI),
    '-f', String(fromPage),
    '-l', String(toPage),
    '-png',
    pdfPath,
    prefix,
  ];

  return new Promise((resolve, reject) => {
    // Generous timeout: 2 min for large PDFs (60 pages at 120 DPI ≈ 15-30s)
    execFile(pdftoppm, args, { timeout: 120_000 }, (err, _stdout, stderr) => {
      if (err) return reject(new Error((stderr || err.message || 'pdftoppm failed').trim()));

      // Collect all generated PNG files
      let files;
      try {
        files = fs.readdirSync(outDir)
          .filter((f) => f.startsWith('pg') && f.endsWith('.png'))
          .map((f) => {
            // pdftoppm output: pg-002.png, pg-02.png, pg-2.png depending on range
            const numStr = f.replace(/^pg-?/, '').replace('.png', '');
            const num = parseInt(numStr, 10);
            return { pngPath: path.join(outDir, f), pageNumber: num };
          })
          .filter((f) => !isNaN(f.pageNumber))
          .sort((a, b) => a.pageNumber - b.pageNumber);
      } catch (readErr) {
        return reject(new Error(`Failed to read pdftoppm output: ${readErr.message}`));
      }

      if (files.length === 0) {
        return reject(new Error(`pdftoppm produced no PNGs for pages ${fromPage}-${toPage}`));
      }

      resolve(files);
    });
  });
}

/**
 * Render a single PDF page to PNG.
 * Used for the first-page fast-path only.
 */
function renderPageToPng(pdfPath, pageNumber, outDir) {
  const pdftoppm = getPdftoppmBinary();
  if (!pdftoppm) throw new Error('pdftoppm not available');

  const prefix = path.join(outDir, `pg-${pageNumber}`);
  const args = [
    '-r', String(PREVIEW_DPI),
    '-f', String(pageNumber),
    '-l', String(pageNumber),
    '-png',
    '-singlefile',
    pdfPath,
    prefix,
  ];

  return new Promise((resolve, reject) => {
    execFile(pdftoppm, args, { timeout: 60_000 }, (err, _stdout, stderr) => {
      if (err) return reject(new Error((stderr || err.message || 'pdftoppm failed').trim()));
      const outFile = `${prefix}.png`;
      if (!fs.existsSync(outFile)) {
        return reject(new Error(`pdftoppm produced no output for page ${pageNumber}`));
      }
      resolve(outFile);
    });
  });
}

/**
 * Convert a PNG file → WebP buffer via sharp.
 * Resizes to PREVIEW_WIDTH (aspect-ratio preserving).
 * effort=0: fastest possible encoding (3-5× faster than effort=4, ~10% larger files)
 *
 * @returns {{ data: Buffer, info: { width, height, size } }}
 */
async function pngToWebp(pngPath) {
  const sharp = getSharp();
  if (!sharp) throw new Error('sharp not available');
  return sharp(pngPath)
    .resize({ width: PREVIEW_WIDTH, withoutEnlargement: true })
    .webp({ quality: PREVIEW_QUALITY, effort: 0 })  // effort=0 = fastest
    .toBuffer({ resolveWithObject: true });
}

// ── Public: resolveLocalPdf ───────────────────────────────────────────────────

/**
 * Given a stored pdfUrl (relative /uploads/... or remote https://...),
 * ensure a local file is available and return its path.
 *
 * If remote/missing, downloads to a temp file.
 * Caller MUST delete temp file when isTempFile === true.
 */
async function resolveLocalPdf(pdfUrl) {
  const localCandidate = path.join(UPLOADS_DIR, pdfUrl.replace(/^\/uploads\//, ''));
  const isRemote =
    /^https?:\/\//i.test(pdfUrl) ||
    (pdfUrl.startsWith('/uploads/') && isRemoteEnabled() && !fs.existsSync(localCandidate));

  if (!isRemote && fs.existsSync(localCandidate)) {
    return { localPath: localCandidate, isTempFile: false };
  }

  // Download to temp file
  const readUrl = await resolveStorageReadUrl(pdfUrl);
  const response = await fetch(readUrl);
  if (!response.ok) throw new Error(`PDF download failed (${response.status}): ${readUrl}`);
  const buf = Buffer.from(await response.arrayBuffer());
  const tmpPath = path.join(os.tmpdir(), `prev-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  await fs.promises.writeFile(tmpPath, buf);
  return { localPath: tmpPath, isTempFile: true };
}

// ── Public: getPdfPageCount ───────────────────────────────────────────────────

/**
 * Return the number of pages in a local PDF file.
 */
async function getPdfPageCount(localPdfPath) {
  const pdfParse = require('../lib/pdf-parse');
  const buf = await fs.promises.readFile(localPdfPath);
  const parsed = await pdfParse(buf);
  return Math.max(1, Number(parsed?.numpages || 0));
}

// ── Public: generatePageAssetsRange ──────────────────────────────────────────

/**
 * Batch-generate WebP preview assets for a range of pages.
 *
 * Uses ONE pdftoppm invocation to render all pages, then processes each PNG
 * in parallel (sharp encode + storage upload + DB upsert).
 *
 * Much faster than per-page calls for multi-page PDFs:
 *   Old: N × (spawn + PDF read + render) ≈ N × 1.5s
 *   New: 1× (spawn + PDF read) + N × (render) + parallel sharp/upload
 *        ≈ 1s overhead + N × 400ms render, all parallel uploads
 *
 * @param {number} slideId
 * @param {string} localPdfPath  — absolute path to PDF
 * @param {number} fromPage      — 1-based, inclusive
 * @param {number} toPage        — 1-based, inclusive
 * @returns {Promise<number>}    — number of pages successfully generated
 */
async function generatePageAssetsRange(slideId, localPdfPath, fromPage, toPage) {
  if (!PREVIEW_ENABLED) throw new Error('Preview disabled');

  const sharp = getSharp();
  if (!sharp) throw new Error('sharp not installed');
  const pdftoppmBin = getPdftoppmBinary();
  if (!pdftoppmBin) throw new Error('pdftoppm not installed');

  if (fromPage > toPage) return 0;

  const tmpDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), `prevrange-${slideId}-`)
  );

  let successCount = 0;

  try {
    // ONE pdftoppm call renders all pages in range
    const pages = await renderPageRangeToPng(localPdfPath, fromPage, toPage, tmpDir);

    logger.info('[preview-gen] Batch pdftoppm done', {
      slideId, fromPage, toPage, pagesGenerated: pages.length,
    });

    // Process all pages in parallel: sharp + upload + DB
    const results = await Promise.allSettled(
      pages.map(async ({ pngPath, pageNumber }) => {
        const { data: webpBuf, info } = await pngToWebp(pngPath);
        const { width, height, size } = info;

        const storageKey = `previews/${slideId}/page-${pageNumber}.webp`;
        const storedUrl = await putBuffer(webpBuf, storageKey, 'image/webp');

        await prisma.slidePreviewAsset.upsert({
          where:  { slideId_pageNumber: { slideId, pageNumber } },
          create: { slideId, pageNumber, url: storedUrl, width, height, fileSizeBytes: size },
          update: { url: storedUrl, width, height, fileSizeBytes: size },
        });

        logger.debug('[preview-gen] Page asset saved', { slideId, pageNumber, bytes: size });
        return pageNumber;
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        successCount++;
      } else {
        logger.error('[preview-gen] Page failed in batch (non-fatal)', {
          slideId,
          error: r.reason?.message,
        });
      }
    }

    logger.info('[preview-gen] Batch complete', { slideId, fromPage, toPage, successCount });
  } finally {
    fs.rm(tmpDir, { recursive: true, force: true }, () => {});
  }

  return successCount;
}

// ── Public: generatePageAsset (single-page fast path) ────────────────────────

/**
 * Generate and upload the WebP preview for a single page.
 * Used for the first-page job only — remaining pages use generatePageAssetsRange.
 *
 * @param {number} slideId
 * @param {string} localPdfPath  — absolute path to a locally accessible PDF
 * @param {number} pageNumber    — 1-based
 */
async function generatePageAsset(slideId, localPdfPath, pageNumber) {
  if (!PREVIEW_ENABLED) throw new Error('Preview generation disabled');

  const sharp = getSharp();
  if (!sharp) throw new Error('sharp not installed');
  const pdftoppm = getPdftoppmBinary();
  if (!pdftoppm) throw new Error('pdftoppm not installed');

  // Size guard on page 1 only
  if (pageNumber === 1) {
    const stat = await fs.promises.stat(localPdfPath);
    const sizeMb = stat.size / (1024 * 1024);
    if (sizeMb > MAX_PDF_SIZE_MB) {
      throw new Error(`PDF too large for preview (${sizeMb.toFixed(1)} MB > ${MAX_PDF_SIZE_MB} MB)`);
    }
  }

  if (pageNumber > MAX_PAGES) {
    throw new Error(`Page ${pageNumber} exceeds PREVIEW_MAX_PAGES (${MAX_PAGES})`);
  }

  const tmpDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), `prevpg-${slideId}-${pageNumber}-`)
  );
  let pngPath = null;

  try {
    // 1. Render page → PNG
    pngPath = await renderPageToPng(localPdfPath, pageNumber, tmpDir);

    // 2. PNG → WebP (effort=0 = fastest)
    const { data: webpBuf, info } = await pngToWebp(pngPath);
    const { width, height, size } = info;

    // 3. Upload to storage
    const storageKey = `previews/${slideId}/page-${pageNumber}.webp`;
    const storedUrl  = await putBuffer(webpBuf, storageKey, 'image/webp');

    // 4. Upsert DB record
    await prisma.slidePreviewAsset.upsert({
      where:  { slideId_pageNumber: { slideId, pageNumber } },
      create: { slideId, pageNumber, url: storedUrl, width, height, fileSizeBytes: size },
      update: { url: storedUrl, width, height, fileSizeBytes: size },
    });

    logger.info('[preview-gen] Page 1 asset generated', { slideId, width, height, bytes: size });
  } finally {
    if (pngPath && fs.existsSync(pngPath)) fs.unlink(pngPath, () => {});
    fs.rm(tmpDir, { recursive: true, force: true }, () => {});
  }
}

// ── Public: generateAllPagesLocal (Redis-disabled fallback) ───────────────────

/**
 * Full pipeline that runs in-process when Redis is disabled.
 * Uses the batch approach (one pdftoppm call for all pages).
 */
async function generateAllPagesLocal(slideId, pdfUrl) {
  if (!PREVIEW_ENABLED) return;
  if (!getPdftoppmBinary() || !getSharp()) return;

  logger.info('[preview-gen] Local generation started', { slideId, pdfUrl });

  await prisma.slide.updateMany({
    where: { id: slideId, previewStatus: { in: ['none', 'failed'] } },
    data:  { previewStatus: 'processing' },
  }).catch(() => {});

  let localPdfPath = null;
  let isTempFile   = false;

  try {
    ({ localPath: localPdfPath, isTempFile } = await resolveLocalPdf(pdfUrl));

    const stat   = await fs.promises.stat(localPdfPath);
    const sizeMb = stat.size / (1024 * 1024);
    if (sizeMb > MAX_PDF_SIZE_MB) {
      logger.warn('[preview-gen] PDF too large, skipping local preview', { slideId, sizeMb });
      await prisma.slide.updateMany({ where: { id: slideId }, data: { previewStatus: 'failed' } }).catch(() => {});
      return;
    }

    const totalPages     = await getPdfPageCount(localPdfPath);
    const pagesToProcess = Math.min(totalPages, MAX_PAGES);

    // Phase 1: page 1 immediately (fast feedback)
    try {
      await generatePageAsset(slideId, localPdfPath, 1);
    } catch (err) {
      logger.error('[preview-gen] Local page 1 failed', { slideId, error: err?.message });
      await prisma.slide.updateMany({ where: { id: slideId }, data: { previewStatus: 'failed' } }).catch(() => {});
      return;
    }

    if (pagesToProcess === 1) {
      await prisma.slide.update({
        where: { id: slideId },
        data:  { previewStatus: 'ready', previewPageCount: 1, previewGeneratedAt: new Date() },
      });
      return;
    }

    // Phase 2: remaining pages — ONE batch pdftoppm call
    const successCount = await generatePageAssetsRange(slideId, localPdfPath, 2, pagesToProcess);

    const totalAssets = await prisma.slidePreviewAsset.count({ where: { slideId } });
    await prisma.slide.update({
      where: { id: slideId },
      data: {
        previewStatus:      totalAssets > 0 ? 'ready' : 'failed',
        previewPageCount:   totalAssets,
        previewGeneratedAt: totalAssets > 0 ? new Date() : null,
      },
    });

    logger.info('[preview-gen] Local generation complete', { slideId, totalAssets, successCount });
  } catch (err) {
    logger.error('[preview-gen] Local generation error', { slideId, error: err?.message });
    await prisma.slide.updateMany({ where: { id: slideId }, data: { previewStatus: 'failed' } }).catch(() => {});
  } finally {
    if (isTempFile && localPdfPath && fs.existsSync(localPdfPath)) {
      fs.unlink(localPdfPath, () => {});
    }
  }
}

module.exports = {
  generatePageAsset,
  generatePageAssetsRange,
  generateAllPagesLocal,
  getPdfPageCount,
  resolveLocalPdf,
  getPdftoppmBinary,
  getSharp,
  PREVIEW_ENABLED,
};
