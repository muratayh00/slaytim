'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  SkipBack, SkipForward, Loader2, Grid3X3, X,
} from 'lucide-react';
import { loadPdfDocument, renderPageToCanvas, resolveFileUrl } from '@/lib/pdfRenderer';

interface SlideViewerProps {
  pdfUrl: string;
  slideId: number;
  /** Thumbnail / cover image shown immediately while the PDF is loading */
  coverUrl?: string;
  /** Slide title — shown in the no-thumbnail loading placeholder */
  title?: string;
  className?: string;
  transitionMode?: 'instant' | 'fade' | 'slide' | 'snap' | 'swipe' | 'auto';
  autoStepMs?: number;
  onPageChange?: (page: number) => void;
  onPageCount?: (count: number) => void;
}

const THUMB_W = 90;
const THUMB_MEM_LIMIT = 5000;
const THUMB_DB_NAME = 'slaytim-thumb-cache';
const THUMB_DB_STORE = 'thumbs-v1';

const thumbMemCache = new Map<string, string>();
let thumbDbPromise: Promise<IDBDatabase | null> | null = null;

function thumbCacheKey(slideId: number, pageNum: number) {
  return `${slideId}:${pageNum}`;
}

function setThumbMem(slideId: number, pageNum: number, dataUrl: string) {
  const key = thumbCacheKey(slideId, pageNum);
  thumbMemCache.set(key, dataUrl);
  if (thumbMemCache.size > THUMB_MEM_LIMIT) {
    const first = thumbMemCache.keys().next().value;
    if (first) thumbMemCache.delete(first);
  }
}

function getThumbMem(slideId: number, pageNum: number): string | null {
  return thumbMemCache.get(thumbCacheKey(slideId, pageNum)) || null;
}

async function getThumbDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return null;
  if (!thumbDbPromise) {
    thumbDbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(THUMB_DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(THUMB_DB_STORE)) {
            db.createObjectStore(THUMB_DB_STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return thumbDbPromise;
}

async function getThumbIdb(slideId: number, pageNum: number): Promise<string | null> {
  const db = await getThumbDb();
  if (!db) return null;
  const key = thumbCacheKey(slideId, pageNum);
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(THUMB_DB_STORE, 'readonly');
      const req = tx.objectStore(THUMB_DB_STORE).get(key);
      req.onsuccess = () => resolve((req.result as string) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function setThumbIdb(slideId: number, pageNum: number, dataUrl: string): Promise<void> {
  const db = await getThumbDb();
  if (!db) return;
  const key = thumbCacheKey(slideId, pageNum);
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(THUMB_DB_STORE, 'readwrite');
      tx.objectStore(THUMB_DB_STORE).put(dataUrl, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export default function SlideViewer({
  pdfUrl,
  slideId,
  coverUrl,
  title,
  className = '',
  transitionMode = 'fade',
  autoStepMs = 0,
  onPageChange,
  onPageCount,
}: SlideViewerProps) {
  const [doc, setDoc] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [resumePage, setResumePage] = useState<number | null>(null);
  const [rendering, setRendering] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [thumbnails, setThumbnails] = useState<(string | null)[]>([]);
  const [showGrid, setShowGrid] = useState(false);
  const [activeTransition, setActiveTransition] = useState(transitionMode);

  // firstRenderDone: tracks whether the canvas has painted at least one page.
  // Used to keep the cover image visible until the canvas is ready.
  const [firstRenderDone, setFirstRenderDone] = useState(false);
  const firstRenderDoneRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbStripRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  // Sequence counter: discard stale renders
  const renderSeqRef = useRef(0);
  const pendingRenderCountRef = useRef(0);
  const storageKey = `slide_page_${slideId}`;
  const transitionKey = `slide_transition_${slideId}`;
  // Keep fullscreen accessible inside renderPage without adding it to useCallback deps
  const fullscreenRef = useRef(fullscreen);
  useEffect(() => { fullscreenRef.current = fullscreen; }, [fullscreen]);

  // â”€â”€ Load PDF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    setDoc(null);
    setLoadError(null);
    setThumbnails([]);
    setNumPages(0);
    setCurrentPage(1);
    setResumePage(null);
    firstRenderDoneRef.current = false;
    setFirstRenderDone(false);

    const loadWithRetry = async () => {
      // Always route through the Next.js proxy to stay same-origin.
      // Direct pdfUrl (e.g. http://localhost:5001/uploads/...) is cross-origin
      // and blocked by browser CORS/CORP â€” use /api/slides/:id/pdf instead.
      const apiPath = `/api/slides/${slideId}/pdf`;
      try {
        return await loadPdfDocument(apiPath);
      } catch {
        return await loadPdfDocument(`${apiPath}?v=${Date.now()}`);
      }
    };

    loadWithRetry().then(loaded => {
      const n = loaded.numPages;
      setDoc(loaded);
      setNumPages(n);
      onPageCount?.(n);
      setThumbnails(Array.from({ length: n }, (_, idx) => getThumbMem(slideId, idx + 1)));

      const saved = parseInt(localStorage.getItem(storageKey) || '1', 10);
      const start = Math.min(Math.max(1, saved), n);
      setCurrentPage(start);
      if (start > 1) setResumePage(start);

      (async () => {
        const from = Math.max(1, start - 2);
        const to = Math.min(n, start + 24);
        const updates: Array<{ page: number; url: string }> = [];
        for (let page = from; page <= to; page += 1) {
          if (getThumbMem(slideId, page)) continue;
          const cached = await getThumbIdb(slideId, page);
          if (!cached) continue;
          setThumbMem(slideId, page, cached);
          updates.push({ page, url: cached });
        }
        if (!updates.length) return;
        setThumbnails((prev) => {
          const next = [...prev];
          for (const item of updates) {
            next[item.page - 1] = item.url;
          }
          return next;
        });
      })();
    }).catch((err) => {
      console.error('[SlideViewer] PDF load failed for slideId:', slideId, err);
      setLoadError('PDF önizlemesi yüklenemedi');
    });
  }, [slideId, storageKey, onPageCount]);

  useEffect(() => {
    const persisted = localStorage.getItem(transitionKey);
    if (persisted === 'instant' || persisted === 'fade' || persisted === 'slide' || persisted === 'snap' || persisted === 'swipe' || persisted === 'auto') {
      setActiveTransition(persisted);
      return;
    }
    setActiveTransition(transitionMode);
  }, [transitionMode, transitionKey]);

  useEffect(() => {
    onPageChange?.(currentPage);
  }, [currentPage, onPageChange]);

  useEffect(() => {
    if (!autoStepMs || autoStepMs < 1000 || !doc || numPages <= 1) return;
    const id = setInterval(() => {
      setCurrentPage((p) => (p >= numPages ? 1 : p + 1));
    }, autoStepMs);
    return () => clearInterval(id);
  }, [autoStepMs, doc, numPages]);

  // â”€â”€ Render current page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderPage = useCallback(async (pageNum: number) => {
    if (!doc || !canvasRef.current) return;
    const seq = ++renderSeqRef.current;
    pendingRenderCountRef.current += 1;
    setRendering(true);
    try {
      const isFs = fullscreenRef.current;
      const containerW = canvasRef.current.parentElement?.clientWidth ?? 800;
      // Keep the first visual fast by limiting non-fullscreen render size.
      // This cuts render pixel count materially on large displays.
      const w = isFs
        ? Math.max(containerW, 400)
        : Math.min(Math.max(containerW, 360), 960);
      // Lower DPR on normal mode for quicker page paint while remaining readable.
      const dpr = Math.min(
        typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1,
        isFs ? 1.75 : 1.2,
      );
      // Constrain height so portrait/A4 slides don't require vertical scrolling.
      // Cap height so slides never overflow the viewport on first view.
      // 640 px feels readable without being overwhelming; fullscreen is uncapped.
      const maxH = isFs
        ? undefined
        : Math.min(Math.max((typeof window !== 'undefined' ? window.innerHeight : 800) - 280, 360), 640);
      await renderPageToCanvas(doc, pageNum, canvasRef.current, w, dpr, maxH);
      if (seq === renderSeqRef.current) {
        localStorage.setItem(storageKey, String(pageNum));
        // Signal that the canvas has painted its first frame so the cover can hide.
        if (!firstRenderDoneRef.current) {
          firstRenderDoneRef.current = true;
          setFirstRenderDone(true);
        }
      }
    } catch (err) {
      console.error('[SlideViewer] renderPage failed:', err);
    } finally {
      pendingRenderCountRef.current = Math.max(0, pendingRenderCountRef.current - 1);
      setRendering(pendingRenderCountRef.current > 0);
    }
  }, [doc, storageKey]);

  useEffect(() => {
    if (doc) renderPage(currentPage);
  }, [currentPage, renderPage, doc]);

  // Re-render on fullscreen change (canvas size changes)
  useEffect(() => {
    if (!fullscreen && doc) {
      setTimeout(() => renderPage(currentPage), 100);
    }
  }, [fullscreen]); // eslint-disable-line

  // â”€â”€ Generate thumbnails progressively â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!doc || numPages === 0) return;
    // Don't start thumbnail rendering until first canvas page is visible.
    // PDF.js processes one render task at a time; starting thumbnails immediately
    // forces page-1 to queue behind them, delaying first paint.
    if (!firstRenderDone && !showGrid) return;
    let cancelled = false;
    const before = 1;
    // Grid mode prefetches up to 10 visible thumbnails; normal mode only fetches
    // the next 3 pages â€” enough to avoid loading spinners on fast swipes.
    const after = showGrid ? 10 : 3;
    const yieldMs = showGrid ? 20 : 12; // yield so main thread stays responsive
    const from = Math.max(1, currentPage - before);
    const to = Math.min(numPages, currentPage + after);
    const targets: number[] = [];
    for (let i = from; i <= to; i += 1) {
      if (!thumbnails[i - 1]) targets.push(i);
    }
    if (targets.length === 0) return;

    (async () => {
      for (const i of targets) {
        if (cancelled) break;
        try {
          const canvas = document.createElement('canvas');
          // Thumbnail'ler iÃ§in DPR = 1 (kÃ¼Ã§Ã¼k boyut, ekstra piksel anlamsÄ±z)
          await renderPageToCanvas(doc, i, canvas, THUMB_W, 1);
          const url = canvas.toDataURL('image/jpeg', 0.75);
          if (!cancelled) {
            setThumbnails(prev => {
              if (prev[i - 1]) return prev;
              const next = [...prev];
              next[i - 1] = url;
              return next;
            });
          }
          setThumbMem(slideId, i, url);
          setThumbIdb(slideId, i, url).catch(() => {});
          // Ana iÅŸ parÃ§acÄ±ÄŸÄ±na yield et; grid modda daha uzun bekleme â†’ daha akÄ±cÄ± scroll
          await new Promise(r => setTimeout(r, yieldMs));
        } catch {
          // Tek sayfa thumbnail hatalarÄ±nÄ± yoksay.
        }
      }
    })();
    return () => { cancelled = true; };
  // firstRenderDone is intentionally a dep: thumbnail generation only starts
  // after the first canvas page has painted.  This gives renderPage() exclusive
  // access to the PDF.js task queue on initial load (cuts time-to-first-paint).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, numPages, currentPage, showGrid, thumbnails, slideId, firstRenderDone]);

  // â”€â”€ Scroll active thumbnail into view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!thumbStripRef.current) return;
    const el = thumbStripRef.current.children[currentPage - 1] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [currentPage]);

  // â”€â”€ Keyboard navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          setCurrentPage(p => Math.min(p + 1, numPages));
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          setCurrentPage(p => Math.max(p - 1, 1));
          break;
        case 'Home':
          setCurrentPage(1);
          break;
        case 'End':
          setCurrentPage(numPages);
          break;
        case 'Escape':
          setShowGrid(false);
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          break;
        case 'g':
        case 'G':
          setShowGrid(s => !s);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [numPages]);

  // â”€â”€ Touch swipe â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);
    if (Math.abs(dx) > 50 && dy < 80) {
      if (dx < 0) setCurrentPage(p => Math.min(p + 1, numPages));
      else setCurrentPage(p => Math.max(p - 1, 1));
    }
    touchStartRef.current = null;
  };

  // â”€â”€ Fullscreen API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // â”€â”€ Loading state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loadError) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-2xl ${className}`} style={{ minHeight: '60vh' }}>
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <a
            href={resolveFileUrl(pdfUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-primary hover:underline"
          >
            PDF'i yeni sekmede aç
          </a>
        </div>
      </div>
    );
  }

  // â”€â”€ Cover-aware loading state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // While the PDF document is being fetched/parsed, show the slide thumbnail
  // so users see real content instantly instead of a blank spinner.
  if (!doc) {
    return (
      <div className={`${className}`}>
        <div className="relative rounded-2xl overflow-hidden bg-zinc-900">
          {coverUrl ? (
            <>
              <img
                src={coverUrl}
                alt="Slayt önizlemesi"
                className="w-full block"
                style={{ maxHeight: '640px', objectFit: 'contain', background: '#18181b' }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white/80" />
                  <span className="text-xs text-white/80 font-medium">PDF hazırlanıyor…</span>
                </div>
              </div>
            </>
          ) : (
            <div
              className="flex items-center justify-center"
              style={{ minHeight: '40vh', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(17,24,39,0.55))' }}
            >
              <div className="flex flex-col items-center gap-3 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                  <Grid3X3 className="w-7 h-7 text-white/70" />
                </div>
                {title && (
                  <p className="text-base font-bold text-white/90 leading-snug max-w-xs line-clamp-2">{title}</p>
                )}
                <p className="text-xs text-white/55 font-medium">Önizleme hazırlanıyor…</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isFirst = currentPage === 1;
  const isLast = currentPage === numPages;
  const motionMode = activeTransition === 'auto' ? 'fade' : activeTransition;
  const animationProps = motionMode === 'slide' || motionMode === 'swipe'
    ? {
      initial: { opacity: 0.92, x: 12 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0.92, x: -12 },
      transition: { duration: 0.16, ease: 'easeOut' as const },
    }
    : motionMode === 'instant'
      ? {
        initial: false,
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0 },
      }
      : {
        initial: { opacity: 0.7, y: 0 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0.7, y: 0 },
        transition: { duration: 0.14, ease: 'easeOut' as const },
      };

  return (
    <div ref={containerRef} className={`${className} ${fullscreen ? 'bg-black' : ''}`}>

      {/* â”€â”€ Grid overview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {showGrid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85  overflow-auto"
            onClick={() => setShowGrid(false)}
          >
            <div className="max-w-5xl mx-auto px-4 py-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-extrabold text-lg">{numPages} Sayfa</h3>
                <button
                  onClick={() => setShowGrid(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                {thumbnails.map((thumb, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentPage(i + 1); setShowGrid(false); }}
                    className={`relative rounded-xl overflow-hidden border-2 transition-colors hover:scale-[1.04] ${
                      i + 1 === currentPage
                        ? 'border-primary shadow-lg shadow-primary/40'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    {thumb
                      ? <img src={thumb} alt={`Sayfa ${i + 1}`} className="w-full h-auto" />
                      : <div className="aspect-video bg-white/5 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-white/20" />
                        </div>
                    }
                    <span className="absolute bottom-0 inset-x-0 text-[9px] text-center text-white/70 bg-black/50 py-0.5 font-semibold">
                      {i + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€ Main viewer area â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className={`relative rounded-2xl overflow-hidden bg-zinc-900 select-none ${
          fullscreen ? 'rounded-none flex flex-col justify-center' : ''
        }`}
        style={fullscreen ? { height: '100vh' } : {}}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Cover overlay: keeps cover visible for the ~100-300 ms gap between
            setDoc() and the first canvas paint so the canvas never flashes blank. */}
        {!firstRenderDone && coverUrl && (
          <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-2xl">
            <img
              src={coverUrl}
              alt=""
              className="w-full h-full object-contain"
              style={{ background: '#18181b' }}
            />
          </div>
        )}

        {/* Resume banner */}
        <AnimatePresence>
          {resumePage !== null && resumePage > 1 && currentPage === resumePage && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/70  text-white text-xs px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg"
            >
              <span className="opacity-80">Kaldığın yerden · Sayfa {resumePage}</span>
              <button
                onClick={() => { setCurrentPage(1); setResumePage(null); }}
                className="underline opacity-70 hover:opacity-100 transition"
              >
                Başa dön
              </button>
              <button onClick={() => setResumePage(null)} className="opacity-50 hover:opacity-100 transition ml-1">
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Canvas */}
        <div
          className={`flex items-center justify-center ${fullscreen ? 'flex-1 min-h-0' : ''}`}
        >
          {rendering && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <Loader2 className="w-7 h-7 animate-spin text-white/30" />
            </div>
          )}
          <div className={`w-full flex items-center justify-center ${!fullscreen ? 'min-h-[30vh]' : ''}`}>
            <canvas
              ref={canvasRef}
              className={fullscreen ? 'max-h-full max-w-full object-contain bg-white' : 'max-w-full h-auto block bg-white mx-auto'}
              style={{
                transition: motionMode === 'snap' ? 'opacity 0.08s, transform 0.08s' : 'opacity 0.16s, transform 0.16s',
                opacity: 1,
              }}
            />
          </div>
        </div>

        {/* Prev / Next overlay */}
        <button
          onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
          disabled={isFirst}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-black/55  text-white flex items-center justify-center transition-colors hover:bg-black/70 disabled:opacity-0 disabled:pointer-events-none"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentPage(p => Math.min(p + 1, numPages))}
          disabled={isLast}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-black/55  text-white flex items-center justify-center transition-colors hover:bg-black/70 disabled:opacity-0 disabled:pointer-events-none"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Bottom HUD */}
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-3 pb-3 pt-8 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
          {!fullscreen && (
            <select
              value={activeTransition}
              onChange={(e) => {
                const next = e.target.value as typeof activeTransition;
                setActiveTransition(next);
                localStorage.setItem(transitionKey, next);
              }}
              className="absolute left-12 bottom-3 text-[10px] bg-black/55 text-white border border-white/15 rounded-md px-1.5 py-0.5"
              title="Gecis tipi"
            >
              <option value="instant">Aninda</option>
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
              <option value="snap">Snap</option>
              <option value="swipe">Swipe</option>
              <option value="auto">Auto</option>
            </select>
          )}
          <button
            onClick={() => setShowGrid(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/50  text-white hover:bg-black/70 transition"
            title="Genel görünüm (G)"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-white bg-black/50  px-3 py-1 rounded-full">
            {currentPage} / {numPages}
          </span>
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/50  text-white hover:bg-black/70 transition"
            title="Tam ekran"
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* â”€â”€ Thumbnail strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {!fullscreen && thumbnails.length > 0 && (
        <div
          ref={thumbStripRef}
          className="flex gap-2 overflow-x-auto py-2.5 scrollbar-hide mt-1"
        >
          {thumbnails.map((thumb, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`shrink-0 rounded-lg overflow-hidden border-2 transition-colors group ${
                i + 1 === currentPage
                  ? 'border-primary '
                  : 'border-transparent opacity-60 hover:opacity-90 hover:border-border/60'
              }`}
              style={{ width: 68 }}
              title={`Sayfa ${i + 1}`}
            >
              {thumb
                ? <img src={thumb} alt={`${i + 1}`} className="w-full h-auto" loading="lazy" />
                : <div className="aspect-[4/3] bg-muted animate-pulse" />
              }
              <p className="text-[9px] text-center text-muted-foreground mt-0.5 pb-0.5">{i + 1}</p>
            </button>
          ))}
        </div>
      )}

      {/* â”€â”€ Controls bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {!fullscreen && (
        <div className="flex items-center justify-between mt-1.5 px-0.5">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={isFirst}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" /> İlk sayfa
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={isFirst}
              className="w-8 h-8 rounded-xl border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold w-16 text-center tabular-nums">
              {currentPage} / {numPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, numPages))}
              disabled={isLast}
              className="w-8 h-8 rounded-xl border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setCurrentPage(numPages)}
            disabled={isLast}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            Son sayfa <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* â”€â”€ Keyboard hint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {!fullscreen && numPages > 1 && (
        <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
          ← → tuşları · kaydır · G: genel görünüm · F11: tam ekran
        </p>
      )}
    </div>
  );
}

