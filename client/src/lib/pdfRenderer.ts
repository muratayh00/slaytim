// Browser-side PDF.js helpers.
// All PDF loading goes through the Next.js proxy at /api/slides/:id/pdf
// to keep requests same-origin and avoid cross-origin issues.

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001/api';
const SERVER_BASE = API_BASE.replace('/api', '');

function normalizeApiPath(path: string): string {
  if (!path) return path;
  return path.replace(/\/api\/api\//g, '/api/');
}

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

export function resolveFileUrl(path: string): string {
  if (!path) return '';
  const normalized = normalizeApiPath(path);
  if (normalized.startsWith('/api/')) return normalized;
  return normalized.startsWith('http') ? normalized : `${SERVER_BASE}${normalized}`;
}

/**
 * Load a PDF document.
 *
 * IMPORTANT: pdfPath should always be a same-origin path like /api/slides/:id/pdf.
 * Direct Express URLs (http://localhost:5001/uploads/...) are cross-origin and will
 * be blocked by the browser's CORS/CORP restrictions.
 */
export async function loadPdfDocument(pdfPath: string) {
  const lib = await getPdfjs();

  const resolved = resolveFileUrl(pdfPath);
  console.log('[PDF] Fetching:', resolved);

  const response = await fetch(resolved, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    let errBody = '';
    try { errBody = await response.text(); } catch {}
    console.error(`[PDF] Fetch failed: HTTP ${response.status} ${response.statusText}`, errBody);
    throw new Error(`PDF fetch failed: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const data = await response.arrayBuffer();
  console.log('[PDF] Fetched OK — content-type:', contentType, 'bytes:', data.byteLength);

  if (data.byteLength === 0) {
    console.error('[PDF] Empty response body');
    throw new Error('PDF response was empty');
  }

  try {
    const doc = await lib.getDocument({ data: new Uint8Array(data) }).promise;
    console.log('[PDF] Loaded OK — pages:', doc.numPages);
    return doc;
  } catch (err) {
    console.error('[PDF] getDocument() failed:', err);
    throw err;
  }
}

export async function renderPageToCanvas(
  doc: any,
  pageNum: number,
  canvas: HTMLCanvasElement,
  maxWidth: number,
  devicePixelRatio = 1,
): Promise<void> {
  const prevTask = activeCanvasRenderTasks.get(canvas);
  if (prevTask && typeof prevTask.cancel === 'function') {
    try { prevTask.cancel(); } catch {}
  }

  const page = await doc.getPage(pageNum);
  const baseVp = page.getViewport({ scale: 1, rotation: 0 });
  const safeMaxWidth = Math.max(320, Number.isFinite(maxWidth) ? maxWidth : 320);
  const safeDpr = Math.max(1, Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1);
  const scale = (safeMaxWidth / baseVp.width) * safeDpr;
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
