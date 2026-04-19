'use strict';

/**
 * preview-generator.service.js
 *
 * Low-level building blocks for per-page WebP image preview generation.
 * Designed to be called by the BullMQ preview worker — NOT to schedule jobs
 * itself.  Scheduling lives in preview.queue.js.
 *
 * Exports (used by preview.worker.js):
 *   generatePageAsset(slideId, localPdfPath, pageNumber) → void
 *   getPdfPageCount(localPdfPath)                        → number
 *   resolveLocalPdf(pdfUrl)                             → { localPath, isTempFile }
 *
 * Exports (local-fallback used when Redis is disabled):
 *   generateAllPagesLocal(slideId, pdfUrl)              → void   (fire-and-forget safe)
 *
 * Config env vars:
 *   PREVIEW_ENABLED         (default: true)
 *   PREVIEW_MAX_PAGES       (default: 60)
 *   PREVIEW_MAX_PDF_SIZE_MB (default: 80)
 *   PREVIEW_WIDTH           (default: 1280)
 *   PREVIEW_QUALITY         (default: 82)
 *   PREVIEW_DPI             (default: 150)
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
const PREVIEW_DPI         = Math.max(72,  Number(process.env.PREVIEW_DPI             || 150));

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
let _pdftoppmPath    = undefined; // undefined = not checked yet
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

  // Windows: look in common poppler install locations
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
 * Render a single PDF page to a PNG using pdftoppm.
 * Returns the path to the generated file (<prefix>.png).
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
 * Returns { data: Buffer, info: { width, height, size } }
 */
async function pngToWebp(pngPath) {
  const sharp = getSharp();
  if (!sharp) throw new Error('sharp not available');
  return sharp(pngPath)
    .resize({ width: PREVIEW_WIDTH, withoutEnlargement: true })
    .webp({ quality: PREVIEW_QUALITY, effort: 4 })
    .toBuffer({ resolveWithObject: true });
}

// ── Public: resolveLocalPdf ───────────────────────────────────────────────────

/**
 * Given a stored pdfUrl (relative /uploads/... or remote https://...),
 * ensure a local file is available and return its path.
 *
 * If the file is remote/missing-locally, downloads it to a temp file.
 * Caller MUST clean up the temp file when isTempFile === true.
 *
 * @returns {{ localPath: string, isTempFile: boolean }}
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
 * Uses pdf-parse (already a dependency).
 */
async function getPdfPageCount(localPdfPath) {
  const pdfParse = require('../lib/pdf-parse');
  const buf = await fs.promises.readFile(localPdfPath);
  const parsed = await pdfParse(buf);
  return Math.max(1, Number(parsed?.numpages || 0));
}

// ── Public: generatePageAsset ─────────────────────────────────────────────────

/**
 * Generate and upload the WebP preview for a single page.
 * Creates/updates a SlidePreviewAsset record in the DB.
 *
 * Used directly by the preview worker for each page.
 * Throws on failure — caller handles retry logic.
 *
 * @param {number} slideId
 * @param {string} localPdfPath  — absolute path to a locally accessible PDF
 * @param {number} pageNumber    — 1-based
 */
async function generatePageAsset(slideId, localPdfPath, pageNumber) {
  if (!PREVIEW_ENABLED) throw new Error('Preview generation disabled (PREVIEW_ENABLED=false)');

  const sharp = getSharp();
  if (!sharp) throw new Error('sharp not installed');
  const pdftoppm = getPdftoppmBinary();
  if (!pdftoppm) throw new Error('pdftoppm not installed');

  // Size guard (only checked on page 1 to avoid redundant stat calls)
  if (pageNumber === 1) {
    const stat = await fs.promises.stat(localPdfPath);
    const sizeMb = stat.size / (1024 * 1024);
    if (sizeMb > MAX_PDF_SIZE_MB) {
      throw new Error(`PDF too large for preview (${sizeMb.toFixed(1)} MB > ${MAX_PDF_SIZE_MB} MB)`);
    }
  }

  // Page count guard
  if (pageNumber > MAX_PAGES) {
    throw new Error(`Page ${pageNumber} exceeds PREVIEW_MAX_PAGES (${MAX_PAGES})`);
  }

  // Work in a per-call temp directory so concurrent pages don't collide
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), `prevpg-${slideId}-${pageNumber}-`));
  let pngPath = null;

  try {
    // 1. PDF page → PNG
    pngPath = await renderPageToPng(localPdfPath, pageNumber, tmpDir);

    // 2. PNG → WebP
    const { data: webpBuf, info } = await pngToWebp(pngPath);
    const { width, height, size } = info;

    // 3. Upload to storage  (returns canonical /uploads/... URL or CDN URL)
    const storageKey = `previews/${slideId}/page-${pageNumber}.webp`;
    const storedUrl  = await putBuffer(webpBuf, storageKey, 'image/webp');

    // 4. Upsert DB record
    await prisma.slidePreviewAsset.upsert({
      where:  { slideId_pageNumber: { slideId, pageNumber } },
      create: { slideId, pageNumber, url: storedUrl, width, height, fileSizeBytes: size },
      update: { url: storedUrl, width, height, fileSizeBytes: size },
    });

    logger.info('[preview-gen] Page asset generated', { slideId, pageNumber, width, height, bytes: size });
  } finally {
    // Always clean up the temp PNG
    if (pngPath && fs.existsSync(pngPath)) fs.unlink(pngPath, () => {});
    fs.rm(tmpDir, { recursive: true, force: true }, () => {});
  }
}

// ── Public: generateAllPagesLocal (Redis-disabled fallback) ───────────────────

/**
 * Full pipeline that runs in-process when Redis is disabled.
 * Should be called via setImmediate / fire-and-forget from conversion.service.js.
 *
 * Implements graceful degradation:
 *   Phase 1 — generate page 1, mark previewStatus='processing'
 *   Phase 2 — generate remaining pages, mark previewStatus='ready'
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

    const stat    = await fs.promises.stat(localPdfPath);
    const sizeMb  = stat.size / (1024 * 1024);
    if (sizeMb > MAX_PDF_SIZE_MB) {
      logger.warn('[preview-gen] PDF too large, skipping local preview', { slideId, sizeMb });
      await prisma.slide.updateMany({ where: { id: slideId }, data: { previewStatus: 'failed' } }).catch(() => {});
      return;
    }

    const totalPages    = await getPdfPageCount(localPdfPath);
    const pagesToProcess = Math.min(totalPages, MAX_PAGES);

    // Phase 1: page 1 (high value, fast feedback)
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

    // Phase 2: remaining pages
    const CONCURRENCY = Math.max(1, Number(process.env.PREVIEW_CONCURRENCY || 2));
    for (let i = 2; i <= pagesToProcess; i += CONCURRENCY) {
      const batch = Array.from({ length: Math.min(CONCURRENCY, pagesToProcess - i + 1) }, (_, k) => i + k);
      await Promise.all(batch.map(async (pg) => {
        try   { await generatePageAsset(slideId, localPdfPath, pg); }
        catch (err) { logger.error('[preview-gen] Local page failed', { slideId, pg, error: err?.message }); }
      }));
    }

    const assetCount = await prisma.slidePreviewAsset.count({ where: { slideId } });
    await prisma.slide.update({
      where: { id: slideId },
      data: {
        previewStatus:      assetCount > 0 ? 'ready' : 'failed',
        previewPageCount:   assetCount,
        previewGeneratedAt: assetCount > 0 ? new Date() : null,
      },
    });

    logger.info('[preview-gen] Local generation complete', { slideId, assetCount });
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
  generateAllPagesLocal,
  getPdfPageCount,
  resolveLocalPdf,
  getPdftoppmBinary,
  getSharp,
  PREVIEW_ENABLED,
};
