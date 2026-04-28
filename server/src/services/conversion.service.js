const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const pdfParse = require('../lib/pdf-parse');
const prisma = require('../lib/prisma');
const {
  putLocalFile,
  deleteStoredObject,
  extractStorageKeyFromUrl,
  resolveStorageReadUrl,
  isRemoteEnabled,
} = require('./storage.service');
const { enqueueFirstPagePreview, REDIS_ENABLED: PREVIEW_REDIS_ENABLED } = require('../queues/preview.queue');
const { generateAllPagesLocal, PREVIEW_ENABLED } = require('./preview-generator.service');
const { scanFile, hasClamAv, getClamScanBinary, isScanRequired } = require('./file-scan.service');
const { dispatchSummaryGeneration } = require('./aiSummary.service');
const logger = require('../lib/logger');
const {
  enqueueSlideConversion: enqueueWithRedis,
  reconcileMissingConversionJobs: reconcileRedisQueue,
  getConversionQueueState: getRedisQueueState,
  QueueUnavailableError,
  REDIS_ENABLED,
} = require('../queues/conversion.queue');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const PDF_DIR = path.join(UPLOADS_DIR, 'pdfs');
const THUMB_DIR = path.join(UPLOADS_DIR, 'thumbnails');

const LOCAL_FALLBACK_ENABLED = String(process.env.CONVERSION_LOCAL_FALLBACK || 'true').toLowerCase() !== 'false';
const LOCAL_MAX_ATTEMPTS = Math.max(1, Number(process.env.CONVERSION_LOCAL_MAX_ATTEMPTS || process.env.CONVERSION_ATTEMPTS || 5));
const LOCAL_RETRY_BASE_MS = Math.max(1000, Number(process.env.CONVERSION_LOCAL_RETRY_MS || process.env.CONVERSION_BACKOFF_MS || 5000));
const REDIS_ENQUEUE_TIMEOUT_MS = Math.max(500, Number(process.env.CONVERSION_REDIS_ENQUEUE_TIMEOUT_MS || 2500));
const CONVERSION_SANDBOX_DOCKER = String(process.env.CONVERSION_SANDBOX_DOCKER || 'false').toLowerCase() === 'true';
const CONVERSION_SANDBOX_IMAGE = String(process.env.CONVERSION_SANDBOX_IMAGE || '').trim();
const CONVERSION_SANDBOX_SOFFICE = String(process.env.CONVERSION_SANDBOX_SOFFICE || '/usr/bin/soffice').trim();
const THUMBNAIL_PLACEHOLDER_ON_ERROR = String(process.env.THUMBNAIL_PLACEHOLDER_ON_ERROR || 'true').toLowerCase() !== 'false';
const PLACEHOLDER_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAASwAAADICAIAAADdvUsCAAABYklEQVR4nO3TMQEAIAzAMMC/5+ECjiYKenbPzCwA4N+bHQD4M7EwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAPfIQDky2Xv6QAAAABJRU5ErkJggg==';

let fallbackQueue = [];
let fallbackSet = new Set();
let fallbackProcessing = false;
let fallbackWarned = false;
let fallbackHydrated = false;

[PDF_DIR, THUMB_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

async function waitForFileReady(filePath, maxTries = 10) {
  const statFn = fs?.promises?.stat;
  if (typeof statFn !== 'function') {
    // Test mocks may not provide fs.promises.stat; fall back to simple existence check.
    return fs.existsSync(filePath);
  }
  let prevSize = -1;
  for (let i = 0; i < maxTries; i += 1) {
    if (fs.existsSync(filePath)) {
      const stat = await statFn(filePath).catch(() => null);
      const size = Number(stat?.size || 0);
      if (size > 0 && size === prevSize) return true;
      prevSize = size;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

async function assertReadablePdf(filePath, options = {}) {
  const { strict = true, slideId = null } = options;
  const readFileFn = fs?.promises?.readFile;
  if (typeof readFileFn !== 'function') {
    // Test mocks may not provide fs.promises.readFile; skip deep validation in that case.
    return;
  }
  const raw = await readFileFn(filePath);
  try {
    const parsed = await pdfParse(raw);
    const pages = Number(parsed?.numpages || 0);
    if (!Number.isInteger(pages) || pages <= 0) {
      throw new Error('PDF sayfalari okunamadi');
    }
  } catch (err) {
    // Some PDFs render in browser/PDF.js but fail strict parser checks (e.g., xref quirks).
    // In non-strict mode, keep conversion flow alive if the file still looks like a PDF.
    if (!strict) {
      const hasPdfHeader = raw.subarray(0, 5).toString('ascii') === '%PDF-';
      if (hasPdfHeader && raw.length > 2048) {
        logger.warn('[conversion] PDF parser validation skipped (non-strict)', {
          slideId,
          filePath,
          sizeBytes: raw.length,
          error: err?.message || String(err),
        });
        return;
      }
    }
    throw err;
  }
}

async function assertReadablePng(filePath) {
  const readFileFn = fs?.promises?.readFile;
  if (typeof readFileFn !== 'function') return;
  const raw = await readFileFn(filePath);
  if (!raw || raw.length < 8) {
    throw new Error('Thumbnail dosyasi bos veya eksik');
  }
  const signature = raw.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error('Thumbnail PNG formatinda degil');
  }
}

function writePlaceholderPng(filePath) {
  const buf = Buffer.from(PLACEHOLDER_PNG_BASE64, 'base64');
  fs.writeFileSync(filePath, buf);
}

function getLibreOfficeBinary() {
  const envPath = String(process.env.LIBREOFFICE_PATH || '').trim();
  if (envPath && fs.existsSync(envPath)) return envPath;

  if (process.platform !== 'win32') {
    try {
      const result = require('child_process').execSync(
        'which libreoffice 2>/dev/null || which soffice 2>/dev/null',
        { encoding: 'utf8' }
      ).trim();
      return result || null;
    } catch {
      return null;
    }
  }

  const knownPaths = [
    'C:/Program Files/LibreOffice/program/soffice.exe',
    'C:/Program Files/LibreOffice/program/soffice.com',
    'C:/Program Files (x86)/LibreOffice/program/soffice.exe',
    'C:/Program Files (x86)/LibreOffice/program/soffice.com',
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files\\LibreOffice\\program\\soffice.com',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com',
  ];
  const found = knownPaths.find((p) => fs.existsSync(p));
  if (found) return found;

  try {
    const result = require('child_process').execSync('where soffice', { encoding: 'utf8' }).trim().split('\n')[0].trim();
    return result || null;
  } catch {
    return null;
  }
}

function hasLibreOffice() {
  return getLibreOfficeBinary();
}

function hasPowerPoint() {
  const paths = [
    'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
    'C:\\Program Files\\Microsoft Office\\Office16\\POWERPNT.EXE',
    'C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
    'C:\\Program Files (x86)\\Microsoft Office\\Office16\\POWERPNT.EXE',
  ];
  return paths.some((p) => fs.existsSync(p));
}

// One persistent profile per worker process.
// LibreOffice reuses the existing profile → eliminates the 15-30 s cold-start
// that a fresh profile creation causes on every conversion invocation.
const _loProfileDir = (() => {
  const base = path.join(UPLOADS_DIR, '.lo-profiles');
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return path.join(base, `profile-${process.pid}`);
})();

function buildLibreOfficeProfileDir() {
  // Create on first access (may already exist from a prior conversion in this process)
  if (!fs.existsSync(_loProfileDir)) {
    fs.mkdirSync(_loProfileDir, { recursive: true });
  }
  return _loProfileDir;
}

function convertWithLibreOffice(inputPath, outDir, sofficeBinary, outputFormat = 'pdf', timeoutMs = 120_000) {
  const profileDir = buildLibreOfficeProfileDir();
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
  const profileUri = `file:///${profileDir.replace(/\\/g, '/')}`;

  const args = [
    `-env:UserInstallation=${profileUri}`,
    '--headless',
    '--nologo',
    '--nolockcheck',
    '--nodefault',
    '--nofirststartwizard',
    '--convert-to', outputFormat,
    '--outdir', outDir,
    inputPath,
  ];

  return new Promise((resolve, reject) => {
    execFile(sofficeBinary, args, { timeout: timeoutMs, windowsHide: true }, (err, stdout, stderr) => {
      // Profile dir is intentionally kept alive (reused per process) — do NOT rmSync here
      if (err) {
        return reject(new Error((stderr || stdout || err.message || 'LibreOffice conversion failed').trim()));
      }
      resolve();
    });
  });
}

function toPosixContainerPath(hostPath) {
  return String(hostPath || '').replace(/\\/g, '/');
}

function convertWithLibreOfficeDockerSandbox(inputPath, outDir, outputFormat = 'pdf', timeoutMs = 180_000) {
  if (!CONVERSION_SANDBOX_IMAGE) {
    throw new Error('CONVERSION_SANDBOX_IMAGE missing while CONVERSION_SANDBOX_DOCKER=true');
  }

  const hostUploads = path.resolve(UPLOADS_DIR);
  const hostInput = path.resolve(inputPath);
  const hostOutDir = path.resolve(outDir);

  if (!hostInput.startsWith(hostUploads) || !hostOutDir.startsWith(hostUploads)) {
    throw new Error('Sandbox conversion paths must stay inside uploads directory');
  }

  const relInput = path.relative(hostUploads, hostInput);
  const relOutDir = path.relative(hostUploads, hostOutDir);
  const containerUploads = '/work/uploads';
  const containerInput = `${containerUploads}/${toPosixContainerPath(relInput)}`;
  const containerOutDir = `${containerUploads}/${toPosixContainerPath(relOutDir)}`;
  const profileUri = 'file:///tmp/lo-profile';

  const args = [
    'run',
    '--rm',
    '--network',
    'none',
    '--security-opt',
    'no-new-privileges',
    '--cap-drop',
    'ALL',
    '-v',
    `${hostUploads}:${containerUploads}`,
    CONVERSION_SANDBOX_IMAGE,
    CONVERSION_SANDBOX_SOFFICE,
    `-env:UserInstallation=${profileUri}`,
    '--headless',
    '--nologo',
    '--nolockcheck',
    '--nodefault',
    '--nofirststartwizard',
    '--convert-to',
    outputFormat,
    '--outdir',
    containerOutDir,
    containerInput,
  ];

  return new Promise((resolve, reject) => {
    execFile('docker', args, { timeout: timeoutMs, windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        return reject(
          new Error((stderr || stdout || err.message || 'Docker sandbox LibreOffice conversion failed').trim())
        );
      }
      resolve();
    });
  });
}

async function generateThumbnailFromPdf(pdfPath, slideId, libreOfficePath) {
  if (!libreOfficePath && !CONVERSION_SANDBOX_DOCKER) {
    throw new Error('LibreOffice is required for thumbnail generation');
  }

  const baseName = path.basename(pdfPath, '.pdf');
  const expectedThumb = path.join(THUMB_DIR, `${baseName}.png`);
  if (fs.existsSync(expectedThumb)) {
    try { fs.unlinkSync(expectedThumb); } catch {}
  }

  logger.info('[conversion] Thumbnail generation started', {
    slideId,
    inputPdfPath: pdfPath,
    outputThumbnailPath: expectedThumb,
  });

  const maxAttempts = 1;
  let lastErr = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (fs.existsSync(expectedThumb)) {
        try { fs.unlinkSync(expectedThumb); } catch {}
      }

      if (CONVERSION_SANDBOX_DOCKER) {
        await convertWithLibreOfficeDockerSandbox(pdfPath, THUMB_DIR, 'png', 60_000);
      } else {
        await convertWithLibreOffice(pdfPath, THUMB_DIR, libreOfficePath, 'png', 45_000);
      }

      if (!fs.existsSync(expectedThumb)) {
        throw new Error('Thumbnail conversion ran but PNG was not produced');
      }
      const ready = await waitForFileReady(expectedThumb, 15);
      if (!ready) {
        throw new Error('Generated thumbnail is not ready');
      }
      await assertReadablePng(expectedThumb);
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      logger.warn('[conversion] Thumbnail generation attempt failed', {
        slideId,
        attempt,
        maxAttempts,
        inputPdfPath: pdfPath,
        outputThumbnailPath: expectedThumb,
        error: err?.message || String(err),
      });
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      }
    }
  }

  if (lastErr) {
    if (!THUMBNAIL_PLACEHOLDER_ON_ERROR) {
      throw new Error(`Thumbnail generation failed after ${maxAttempts} attempts: ${lastErr.message || String(lastErr)}`);
    }

    logger.error('[conversion] Thumbnail generation failed, writing placeholder', {
      slideId,
      inputPdfPath: pdfPath,
      outputThumbnailPath: expectedThumb,
      error: lastErr?.message || String(lastErr),
    });

    writePlaceholderPng(expectedThumb);
    await assertReadablePng(expectedThumb);
  }

  logger.info('[conversion] Thumbnail generation completed', {
    slideId,
    outputThumbnailPath: expectedThumb,
  });

  return expectedThumb;
}

function convertWithPowerPoint(inputPath, outputPath) {
  const psScript = `
$ErrorActionPreference = 'Stop'
$app = New-Object -ComObject PowerPoint.Application
$app.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse
try {
  $pres = $app.Presentations.Open("${inputPath.replace(/\//g, '\\\\')}",
    [Microsoft.Office.Core.MsoTriState]::msoTrue,
    [Microsoft.Office.Core.MsoTriState]::msoFalse,
    [Microsoft.Office.Core.MsoTriState]::msoFalse)
  $pres.SaveAs("${outputPath.replace(/\//g, '\\\\')}",
    [Microsoft.Office.Interop.PowerPoint.PpSaveAsFileType]::ppSaveAsPDF)
  $pres.Close()
} finally {
  $app.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($app) | Out-Null
}
`.trim();

  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NonInteractive', '-NoProfile', '-Command', psScript],
      { timeout: 120_000, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve();
      }
    );
  });
}

function isUnrecoverableError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return (
    msg.includes('unsupported')
    || msg.includes('malicious')
    || msg.includes('scan failed')
    || msg.includes('input file missing')
    || msg.includes('slide file not found')
    || msg.includes('remote source download failed (404)')
    || msg.includes('no converter available')
    || msg.includes('libreoffice')
    || msg.includes('microsoft office')
  );
}

/**
 * Dispatch preview generation for a slide.
 *
 * When Redis is available: enqueues a BullMQ job (crash-safe, survives restarts).
 * When Redis is disabled:  falls back to in-process generation via setImmediate
 *                          so the conversion response is never blocked.
 *
 * This function is intentionally fire-and-forget — call with `void`.
 */
async function dispatchPreviewGeneration(slideId, pdfUrl) {
  try {
    if (PREVIEW_REDIS_ENABLED) {
      await enqueueFirstPagePreview(slideId, pdfUrl);
      logger.info('[conversion] Preview generation enqueued (BullMQ)', { slideId });
    } else if (PREVIEW_ENABLED) {
      // Local fallback — runs in background so it doesn't block the caller
      setImmediate(() => {
        generateAllPagesLocal(slideId, pdfUrl).catch((err) => {
          logger.error('[conversion] Local preview generation failed', {
            slideId,
            error: err?.message || String(err),
          });
        });
      });
      logger.info('[conversion] Preview generation scheduled (local setImmediate)', { slideId });
    }
  } catch (err) {
    // Never let preview dispatch break the conversion success path
    logger.warn('[conversion] Preview dispatch failed (non-fatal)', {
      slideId,
      error: err?.message || String(err),
    });
  }
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new QueueUnavailableError(timeoutMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

function scheduleFallback(slideId, delayMs = 0) {
  const id = Number(slideId);
  if (!Number.isInteger(id) || id <= 0) return;

  const enqueueNow = () => {
    if (fallbackSet.has(id)) return;
    fallbackSet.add(id);
    fallbackQueue.push(id);
    void runFallbackWorker();
  };

  if (delayMs > 0) {
    setTimeout(enqueueNow, delayMs);
  } else {
    enqueueNow();
  }
}

async function hydrateFallbackQueueFromDatabase() {
  if (fallbackHydrated) return;
  fallbackHydrated = true;
  try {
    const jobs = await prisma.conversionJob.findMany({
      where: { status: { in: ['queued', 'processing'] } },
      select: { slideId: true },
      take: 1000,
      orderBy: { updatedAt: 'asc' },
    });
    for (const job of jobs) {
      scheduleFallback(job.slideId);
    }
  } catch (err) {
    console.error('[conversion] Failed to hydrate fallback queue:', err?.message || err);
  }
}

async function runFallbackWorker() {
  if (fallbackProcessing) return;
  fallbackProcessing = true;

  while (fallbackQueue.length > 0) {
    const slideId = fallbackQueue.shift();
    fallbackSet.delete(slideId);

    const job = await prisma.conversionJob.findUnique({ where: { slideId } }).catch(() => null);
    const attempts = Number(job?.attempts || 0) + 1;

    await prisma.conversionJob.upsert({
      where: { slideId },
      create: {
        slideId,
        status: 'processing',
        attempts,
        lockedAt: new Date(),
        nextAttemptAt: null,
        lastError: null,
      },
      update: {
        status: 'processing',
        attempts,
        lockedAt: new Date(),
        nextAttemptAt: null,
        lastError: null,
      },
    }).catch(() => {});

    try {
      await convertSlide(slideId);
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
    } catch (err) {
      const unrecoverable = isUnrecoverableError(err);
      const exhausted = unrecoverable || attempts >= LOCAL_MAX_ATTEMPTS;
      const retryDelay = exhausted ? 0 : LOCAL_RETRY_BASE_MS * Math.pow(2, Math.max(0, attempts - 1));
      const nextAttemptAt = exhausted ? null : new Date(Date.now() + retryDelay);

      await prisma.conversionJob.updateMany({
        where: { slideId },
        data: {
          status: exhausted ? 'failed' : 'queued',
          lockedAt: null,
          finishedAt: exhausted ? new Date() : null,
          nextAttemptAt,
          lastError: String(err?.message || 'Fallback conversion failed').slice(0, 500),
        },
      }).catch(() => {});

      await prisma.slide.updateMany({
        where: { id: slideId },
        data: { conversionStatus: exhausted ? 'failed' : 'pending' },
      }).catch(() => {});

      if (!exhausted) {
        scheduleFallback(slideId, retryDelay);
      }
    }
  }

  fallbackProcessing = false;
}

async function enqueueSlideConversion(slideId) {
  if (!REDIS_ENABLED && LOCAL_FALLBACK_ENABLED) {
    if (!fallbackWarned) {
      fallbackWarned = true;
      console.warn('[conversion] Redis disabled, using local fallback conversion mode.');
    }
    await hydrateFallbackQueueFromDatabase();
    scheduleFallback(slideId);
    return true;
  }

  try {
    return await withTimeout(
      enqueueWithRedis(slideId),
      REDIS_ENQUEUE_TIMEOUT_MS,
      `Redis enqueue timeout after ${REDIS_ENQUEUE_TIMEOUT_MS}ms`
    );
  } catch (err) {
    if (err instanceof QueueUnavailableError && LOCAL_FALLBACK_ENABLED) {
      if (!fallbackWarned) {
        fallbackWarned = true;
        console.warn('[conversion] Redis unavailable, switched to local fallback conversion mode.');
      }
      await hydrateFallbackQueueFromDatabase();
      scheduleFallback(slideId);
      return true;
    }
    throw err;
  }
}

async function convertSlide(slideId) {
  const slide = await prisma.slide.findUnique({ where: { id: slideId } });
  if (!slide?.fileUrl) throw new Error('Slide file not found');

  const sourceIsRemote = /^https?:\/\//i.test(slide.fileUrl);
  const sourcePathForExt = sourceIsRemote ? new URL(slide.fileUrl).pathname : slide.fileUrl;
  const ext = path.extname(sourcePathForExt).toLowerCase();
  let inputPath = path.join(UPLOADS_DIR, slide.fileUrl.replace(/^\/uploads\//, ''));
  let tempInputPath = null;
  let uploadedPdfUrl = null;
  let uploadedThumbUrl = null;
  const libreOfficePath = getLibreOfficeBinary();

  const shouldFetchRemoteSource =
    sourceIsRemote
    || (slide.fileUrl?.startsWith('/uploads/') && isRemoteEnabled() && !fs.existsSync(inputPath));

  if (shouldFetchRemoteSource) {
    const sourceReadUrl = await resolveStorageReadUrl(slide.fileUrl);
    const response = await fetch(sourceReadUrl);
    if (!response.ok) {
      throw new Error(`Remote source download failed (${response.status})`);
    }
    const tempName = `source-${slideId}-${Date.now()}${ext || '.bin'}`;
    tempInputPath = path.join(UPLOADS_DIR, tempName);
    const arr = await response.arrayBuffer();
    const sourceBuffer = Buffer.from(arr);
    await fs.promises.writeFile(tempInputPath, sourceBuffer);
    inputPath = tempInputPath;
    logger.info('[conversion] Source file downloaded', {
      slideId,
      sourceHost: (() => {
        try {
          return new URL(sourceReadUrl).hostname;
        } catch {
          return 'unknown';
        }
      })(),
      bytes: sourceBuffer.length,
    });
  }

  try {
    await prisma.slide.update({ where: { id: slideId }, data: { conversionStatus: 'processing' } }).catch(() => {});

    if (ext === '.pdf') {
      const pdfName = path.basename(inputPath);
      let localPdfPath = inputPath;
      let resolvedPdfUrl = slide.fileUrl;

      if (!sourceIsRemote) {
        const destPath = path.join(PDF_DIR, pdfName);
        if (!fs.existsSync(destPath)) fs.copyFileSync(inputPath, destPath);
        const ready = await waitForFileReady(destPath);
        if (!ready) throw new Error('PDF dosyasi hazir degil');
        await assertReadablePdf(destPath, { strict: false, slideId });
        localPdfPath = destPath;
        resolvedPdfUrl = await putLocalFile(localPdfPath, `pdfs/${pdfName}`, 'application/pdf');
        uploadedPdfUrl = resolvedPdfUrl;
        logger.info('[conversion] PDF storage write completed', {
          slideId,
          inputPdfPath: localPdfPath,
          pdfStorageKey: extractStorageKeyFromUrl(resolvedPdfUrl),
        });
      } else {
        const ready = await waitForFileReady(localPdfPath);
        if (!ready) throw new Error('Remote PDF temp dosyasi hazir degil');
        await assertReadablePdf(localPdfPath, { strict: false, slideId });
      }

      const localThumbPath = await generateThumbnailFromPdf(localPdfPath, slideId, libreOfficePath);
      const thumbName = path.basename(localThumbPath);
      const resolvedThumbUrl = await putLocalFile(localThumbPath, `thumbnails/${thumbName}`, 'image/png');
      uploadedThumbUrl = resolvedThumbUrl;
      logger.info('[conversion] Thumbnail storage write completed', {
        slideId,
        inputPdfPath: localPdfPath,
        outputThumbnailPath: localThumbPath,
        thumbnailStorageKey: extractStorageKeyFromUrl(resolvedThumbUrl),
      });

      const updatedSlide = await prisma.slide.update({
        where: { id: slideId },
        data: {
          pdfUrl: resolvedPdfUrl,
          thumbnailUrl: resolvedThumbUrl,
          conversionStatus: 'done',
        },
      });

      logger.info('[conversion] Slide DB update completed', {
        slideId,
        dbUpdate: {
          pdfUrlSet: Boolean(updatedSlide.pdfUrl),
          thumbnailUrlSet: Boolean(updatedSlide.thumbnailUrl),
          conversionStatus: updatedSlide.conversionStatus,
        },
      });

      // Fire-and-forget: generate per-page image previews in the background
      void dispatchPreviewGeneration(slideId, resolvedPdfUrl);
      // Fire-and-forget: queue AI summary generation (BLUF for slide page +
      // PresentationDigitalDocument JSON-LD `abstract`). Never blocks the
      // conversion pipeline; aiSummary.service handles its own errors.
      dispatchSummaryGeneration(slideId);

      return;
    }

    if (!['.pptx', '.ppt'].includes(ext)) {
      await prisma.slide.update({ where: { id: slideId }, data: { conversionStatus: 'unsupported' } });
      throw new Error('Unsupported file extension for conversion');
    }

    if (!fs.existsSync(inputPath)) throw new Error('Input file missing');

    const scan = await scanFile(inputPath);
    if (!scan.clean) {
      await prisma.slide.update({ where: { id: slideId }, data: { conversionStatus: 'failed' } }).catch(() => {});
      throw new Error(`Scan failed: ${scan.output || 'malicious file detected'}`);
    }

    const baseName = path.basename(inputPath, ext);
    const expectedPdf = path.join(PDF_DIR, `${baseName}.pdf`);

    const officeAvailable = hasPowerPoint();

    if (libreOfficePath) {
      let libreErr = null;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          if (CONVERSION_SANDBOX_DOCKER) {
            await convertWithLibreOfficeDockerSandbox(inputPath, PDF_DIR, 'pdf');
          } else {
            await convertWithLibreOffice(inputPath, PDF_DIR, libreOfficePath, 'pdf');
          }
          libreErr = null;
          break;
        } catch (err) {
          libreErr = err;
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        }
      }
      if (libreErr) {
        if (officeAvailable) {
          await convertWithPowerPoint(inputPath, expectedPdf);
        } else {
          throw libreErr;
        }
      }
    } else if (officeAvailable) {
      await convertWithPowerPoint(inputPath, expectedPdf);
    } else {
      throw new Error('No converter available (install LibreOffice or Microsoft Office)');
    }

    if (!fs.existsSync(expectedPdf)) throw new Error('Converter ran but PDF was not produced');
    const ready = await waitForFileReady(expectedPdf);
    if (!ready) throw new Error('Converted PDF is not ready');
    await assertReadablePdf(expectedPdf, { strict: false, slideId });

    const finalPdfUrl = await putLocalFile(expectedPdf, `pdfs/${baseName}.pdf`, 'application/pdf');
    uploadedPdfUrl = finalPdfUrl;
    logger.info('[conversion] PDF storage write completed', {
      slideId,
      inputPdfPath: expectedPdf,
      pdfStorageKey: extractStorageKeyFromUrl(finalPdfUrl),
    });

    const localThumbPath = await generateThumbnailFromPdf(expectedPdf, slideId, libreOfficePath);
    const thumbName = path.basename(localThumbPath);
    const finalThumbUrl = await putLocalFile(localThumbPath, `thumbnails/${thumbName}`, 'image/png');
    uploadedThumbUrl = finalThumbUrl;
    logger.info('[conversion] Thumbnail storage write completed', {
      slideId,
      inputPdfPath: expectedPdf,
      outputThumbnailPath: localThumbPath,
      thumbnailStorageKey: extractStorageKeyFromUrl(finalThumbUrl),
    });

    const updatedSlide = await prisma.slide.update({
      where: { id: slideId },
      data: {
        pdfUrl: finalPdfUrl,
        thumbnailUrl: finalThumbUrl,
        conversionStatus: 'done',
      },
    });

    logger.info('[conversion] Slide DB update completed', {
      slideId,
      dbUpdate: {
        pdfUrlSet: Boolean(updatedSlide.pdfUrl),
        thumbnailUrlSet: Boolean(updatedSlide.thumbnailUrl),
        conversionStatus: updatedSlide.conversionStatus,
      },
    });

    // Fire-and-forget: enqueue per-page image preview generation
    void dispatchPreviewGeneration(slideId, finalPdfUrl);
    // Fire-and-forget: AI summary generation. See PDF-direct branch above.
    dispatchSummaryGeneration(slideId);
  } catch (err) {
    if (uploadedThumbUrl) {
      await deleteStoredObject(uploadedThumbUrl).catch((cleanupErr) => {
        logger.warn('[conversion] Failed to cleanup uploaded thumbnail after conversion error', {
          slideId,
          thumbnailStorageKey: extractStorageKeyFromUrl(uploadedThumbUrl),
          error: cleanupErr?.message || String(cleanupErr),
        });
      });
    }
    if (uploadedPdfUrl) {
      await deleteStoredObject(uploadedPdfUrl).catch((cleanupErr) => {
        logger.warn('[conversion] Failed to cleanup uploaded pdf after conversion error', {
          slideId,
          pdfStorageKey: extractStorageKeyFromUrl(uploadedPdfUrl),
          error: cleanupErr?.message || String(cleanupErr),
        });
      });
    }

    await prisma.slide.update({ where: { id: slideId }, data: { conversionStatus: 'failed' } }).catch(() => {});
    logger.error('[conversion] Conversion failed', {
      slideId,
      error: err?.message || String(err),
      pdfStorageKey: extractStorageKeyFromUrl(uploadedPdfUrl),
      thumbnailStorageKey: extractStorageKeyFromUrl(uploadedThumbUrl),
    });
    throw err;
  } finally {
    if (tempInputPath && fs.existsSync(tempInputPath)) {
      try { fs.unlinkSync(tempInputPath); } catch {}
    }
  }
}

async function getConversionQueueState() {
  const redisQueue = REDIS_ENABLED
    ? await getRedisQueueState()
    : {
        mode: 'redis_disabled',
        available: false,
        queueName: 'slide-conversion',
        waiting: 0,
        active: 0,
        failed: 0,
        completed: 0,
        delayed: 0,
        paused: 0,
        oldestWaitingAgeSec: 0,
      };
  return {
    ...redisQueue,
    localFallback: {
      enabled: LOCAL_FALLBACK_ENABLED,
      queued: fallbackQueue.length,
      processing: fallbackProcessing,
      maxAttempts: LOCAL_MAX_ATTEMPTS,
      retryBaseMs: LOCAL_RETRY_BASE_MS,
    },
  };
}

async function reconcileMissingConversionJobs(options = {}) {
  if (!REDIS_ENABLED) {
    return {
      mode: 'redis_disabled',
      candidateCount: 0,
      missingCount: 0,
      reEnqueued: 0,
      failed: 0,
    };
  }
  return reconcileRedisQueue(options);
}

async function recoverStuckConversionJobs(options = {}) {
  const thresholdMinutes = Math.max(1, Number(options.thresholdMinutes || process.env.CONVERSION_STUCK_MINUTES || 10));
  const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);
  const maxRecover = Math.max(1, Number(options.limit || process.env.CONVERSION_STUCK_RECOVER_LIMIT || 50));

  const stuckJobs = await prisma.conversionJob.findMany({
    where: {
      status: 'processing',
      lockedAt: { lt: threshold },
      slide: { deletedAt: null },
    },
    orderBy: { lockedAt: 'asc' },
    take: maxRecover,
    select: {
      slideId: true,
      attempts: true,
      lockedAt: true,
    },
  });

  if (!stuckJobs.length) {
    return { thresholdMinutes, recovered: 0, queued: 0 };
  }

  let requeued = 0;
  for (const job of stuckJobs) {
    await prisma.conversionJob.update({
      where: { slideId: job.slideId },
      data: {
        status: 'queued',
        lockedAt: null,
        nextAttemptAt: new Date(),
        lastError: `Auto-recovered: processing lock older than ${thresholdMinutes}m`,
      },
    }).catch(() => {});

    await prisma.slide.updateMany({
      where: { id: job.slideId, conversionStatus: 'processing' },
      data: { conversionStatus: 'pending' },
    }).catch(() => {});

    try {
      await enqueueSlideConversion(job.slideId);
      requeued += 1;
    } catch (err) {
      logger.warn('[conversion] Failed to requeue stuck job', {
        slideId: job.slideId,
        error: err?.message || String(err),
      });
    }
  }

  return {
    thresholdMinutes,
    recovered: stuckJobs.length,
    queued: requeued,
  };
}

async function getUploadPipelineHealth() {
  const stuck5mThreshold = new Date(Date.now() - 5 * 60 * 1000);
  const stuck10mThreshold = new Date(Date.now() - 10 * 60 * 1000);

  const [jobs, stageCounts, queue] = await Promise.all([
    prisma.conversionJob.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        slideId: true,
        status: true,
        attempts: true,
        lastError: true,
        nextAttemptAt: true,
        finishedAt: true,
        updatedAt: true,
      },
    }),
    prisma.slide.groupBy({
      by: ['conversionStatus'],
      _count: { _all: true },
    }),
    getConversionQueueState(),
  ]);

  const stages = stageCounts.reduce((acc, row) => {
    acc[row.conversionStatus || 'unknown'] = row._count?._all || 0;
    return acc;
  }, {});

  const [processingOver5m, processingOver10m] = await Promise.all([
    prisma.conversionJob.count({
      where: {
        status: 'processing',
        lockedAt: { lt: stuck5mThreshold },
      },
    }),
    prisma.conversionJob.count({
      where: {
        status: 'processing',
        lockedAt: { lt: stuck10mThreshold },
      },
    }),
  ]);

  const processingTotal = Number(stages.processing || 0);
  const stuckRatio = processingTotal > 0 ? Number((processingOver10m / processingTotal).toFixed(4)) : 0;

  return {
    status: 'ok',
    scanners: {
      clamAv: hasClamAv(),
      required: isScanRequired(),
      binary: getClamScanBinary(),
    },
    converters: {
      libreOffice: Boolean(hasLibreOffice()),
      libreOfficePath: getLibreOfficeBinary() || null,
      powerPoint: Boolean(hasPowerPoint()),
    },
    queue,
    stages,
    processingHealth: {
      processingTotal,
      processingOver5m,
      processingOver10m,
      stuckRatio,
      warning: processingOver10m > 0 || stuckRatio >= 0.2,
    },
    recentJobs: jobs,
  };
}

module.exports = {
  convertSlide,
  enqueueSlideConversion,
  reconcileMissingConversionJobs,
  getConversionQueueState,
  getUploadPipelineHealth,
  recoverStuckConversionJobs,
  hasLibreOffice,
  hasPowerPoint,
  getLibreOfficeBinary,
  dispatchPreviewGeneration,
};
