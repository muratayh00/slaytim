// Browser-side PDF.js helpers.
// All PDF loading goes through the Next.js proxy at /api/slides/:id/pdf
// to keep requests same-origin and avoid cross-origin issues.

import { resolveMediaUrl } from './media';

let pdfjsLib: any = null;
const runtimeImport = new Function('u', 'return import(u)') as (u: string) => Promise<any>;
const activeCanvasRenderTasks = new WeakMap<HTMLCanvasElement, any>();

async function getPdfjs() {
  if (typeof window === 'undefined') throw new Error('PDF.js only runs in browser');
  if (!pdfjsLib) {
    let lib: any = null;
    let primaryErr: unknown = null;

    try {
      // NOTE: Use native browser module import from /public to avoid Next/Webpack
      // interop issues with pdfjs-dist package entrypoints in dev mode.
      lib = await runtimeImport('/pdf.min.mjs');
      console.log('[PDF] loaded from /pdf.min.mjs');
    } catch (err) {
      primaryErr = err;
      console.error('[PDF] primary import failed (/pdf.min.mjs):', err);
    }

    if (!lib) {
      try {
        lib = await runtimeImport('/pdf.legacy.min.mjs');
        console.log('[PDF] loaded from /pdf.legacy.min.mjs');
      } catch (legacyErr) {
        console.error('[PDF] legacy import failed (/pdf.legacy.min.mjs):', legacyErr);
        throw primaryErr || legacyErr;
      }
    }

    lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    console.log('[PDF] workerSrc set to /pdf.worker.min.mjs');
    pdfjsLib = lib;
  }
  return pdfjsLib;
}

// Kept for backward compat — delegates to the shared media resolver.
// Returns '' (not null) so existing callers that use it as a src prop
// stay type-compatible; the truthy check in callers guards against rendering.
export function resolveFileUrl(path: string | null | undefined): string {
  if (!path) return '';
  const cleaned = path.replace(/\/api\/api\//g, '/api/');
  // Route all paths (including /api/ proxy paths) through resolveMediaUrl so that
  // the browser always fetches from the absolute backend origin rather than a
  // relative Vercel/Next.js URL.  This avoids proxy timeouts on Vercel and
  // ensures credentials are sent to the correct host.
  // slaytim.com and api.slaytim.com share the same eTLD+1, so SameSite=Lax
  // cookies are forwarded correctly on cross-subdomain fetch calls.
  return resolveMediaUrl(cleaned) ?? cleaned;
}

/**
 * Load a PDF document via PDF.js URL-based loading.
 *
 * PDF.js fetches the file directly, using byte-range requests when the server
 * supports them (our backend does), so only the pages actually needed are
 * downloaded — dramatically reducing time-to-first-page for large PDFs.
 */
/**
 * Eagerly initialise the PDF.js module + worker so the singleton is warm
 * before the user navigates to a slide.  Call this early (e.g. Navbar mount)
 * with a setTimeout so it doesn't compete with critical page resources.
 * Safe to call multiple times — getPdfjs() is idempotent.
 */
export async function warmupPdfjs(): Promise<void> {
  try { await getPdfjs(); } catch { /* ignore — caller doesn't need the result */ }
}

export async function loadPdfDocument(pdfPath: string) {
  const lib = await getPdfjs();
  const resolved = resolveFileUrl(pdfPath);
  console.log('[PDF] Loading:', resolved);

  try {
    const doc = await lib.getDocument({
      url: resolved,
      withCredentials: true,   // send same-site cookies (SameSite=Lax ok across slaytim.com subdomains)
      disableRange: false,     // enable byte-range requests
      rangeChunkSize: 262144,  // 256 KB chunks reduce request churn on high-latency networks
      disableStream: false,    // allow PDF.js to start rendering before full download
      disableAutoFetch: true,  // prioritize first visible page; fetch additional pages on demand
    }).promise;
    console.log('[PDF] Loaded OK — pages:', doc.numPages);
    return doc;
  } catch (err: any) {
    console.error('[PDF] getDocument() failed:', err);
    // UnexpectedResponseException carries the HTTP status
    if (err?.name === 'UnexpectedResponseException') {
      throw new Error(`PDF fetch failed: ${err.status ?? 'unknown'}`);
    }
    throw err;
  }
}

export async function renderPageToCanvas(
  doc: any,
  pageNum: number,
  canvas: HTMLCanvasElement,
  maxWidth: number,
  devicePixelRatio = 1,
  maxHeight?: number, // CSS px — constrains tall/portrait slides to fit the viewport
): Promise<void> {
  const prevTask = activeCanvasRenderTasks.get(canvas);
  if (prevTask && typeof prevTask.cancel === 'function') {
    try { prevTask.cancel(); } catch {}
  }

  const page = await doc.getPage(pageNum);
  const baseVp = page.getViewport({ scale: 1, rotation: 0 });
  const safeMaxWidth = Math.max(320, Number.isFinite(maxWidth) ? maxWidth : 320);
  const safeDpr = Math.max(1, Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1);

  let scale = (safeMaxWidth / baseVp.width) * safeDpr;
  // Also constrain by height so portrait/A4 slides don't overflow the viewport.
  if (maxHeight && Number.isFinite(maxHeight) && maxHeight > 0) {
    const heightScale = (Math.max(240, maxHeight) / baseVp.height) * safeDpr;
    if (heightScale < scale) scale = heightScale;
  }

  const viewport = page.getViewport({ scale, rotation: 0 });

  // Render into an offscreen canvas first so the visible canvas is not cleared
  // when a render gets cancelled/restarted in fast refresh or strict mode.
  const workCanvas = document.createElement('canvas');
  workCanvas.width = viewport.width;
  workCanvas.height = viewport.height;
  const workCtx = workCanvas.getContext('2d');
  if (!workCtx) return;

  const task = page.render({
    canvasContext: workCtx,
    viewport,
    intent: 'display',
    background: '#ffffff',
  });
  activeCanvasRenderTasks.set(canvas, task);
  try {
    await task.promise;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = workCanvas.width;
    canvas.height = workCanvas.height;
    ctx.drawImage(workCanvas, 0, 0);
  } catch (err: any) {
    // Ignore cancellation noise; caller already requested a newer render on same canvas.
    if (err?.name !== 'RenderingCancelledException') throw err;
  } finally {
    if (activeCanvasRenderTasks.get(canvas) === task) {
      activeCanvasRenderTasks.delete(canvas);
    }
  }
}

export async function getThumbnailDataUrl(
  doc: any,
  pageNum: number,
  thumbWidth = 300,
): Promise<string> {
  const canvas = document.createElement('canvas');
  await renderPageToCanvas(doc, pageNum, canvas, thumbWidth, 1);
  return canvas.toDataURL('image/jpeg', 0.85);
}
