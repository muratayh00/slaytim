'use client';

/**
 * ImageSlideViewer
 *
 * Renders slide previews from pre-generated per-page WebP images.
 * No PDF.js required — images load instantly from CDN/storage.
 *
 * Features:
 *  - First page eager-loads; remaining pages lazy-load on scroll/navigation
 *  - Keyboard navigation (←/→/Esc/F)
 *  - Touch swipe navigation
 *  - Grid overview mode
 *  - Fullscreen support (Fullscreen API)
 *  - Skeleton placeholders while images load
 *  - Graceful fallback slot if an image fails to load
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Grid3x3, Maximize2, Minimize2, X, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { analytics } from '@/lib/analytics';

export interface SlidePreviewPage {
  pageNumber: number;
  url: string;
  width: number;
  height: number;
}

interface ImageSlideViewerProps {
  pages: SlidePreviewPage[];
  /** Total expected pages when generation is still in progress (pages.length < totalPages) */
  totalPages?: number;
  /** 'processing' while BullMQ worker is still generating remaining pages */
  previewStatus?: string;
  title?: string;
  coverUrl?: string;
  onPageChange?: (page: number) => void;
  className?: string;
  /** Slide ID used for TTFV analytics */
  slideId?: number;
  /** Navigation start timestamp (performance.now() or Date.now()) for TTFV measurement */
  navStartMs?: number;
}

// Max height for the slide image area — tall enough to read, small enough not
// to dominate the page. Fullscreen mode ignores this via the viewer container.
const SLIDE_MAX_H = 'max-h-[460px]';

// ── Skeleton ─────────────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className={cn('w-full bg-muted/60 animate-pulse rounded-lg', SLIDE_MAX_H, 'aspect-video')} />
  );
}

// ── Single page image ─────────────────────────────────────────────────────────
function SlidePageImage({
  page,
  eager,
  onLoad,
}: {
  page: SlidePreviewPage;
  eager: boolean;
  onLoad?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  if (error) {
    return (
      <div className={cn('w-full flex items-center justify-center bg-muted/40 rounded-lg aspect-video', SLIDE_MAX_H)}>
        <span className="text-xs text-muted-foreground">Sayfa yüklenemedi</span>
      </div>
    );
  }

  return (
    <div className="relative w-full flex items-center justify-center">
      {/* Skeleton shown until image loads */}
      {!loaded && (
        <div className={cn('w-full bg-muted/60 animate-pulse rounded-lg aspect-video', SLIDE_MAX_H)} />
      )}
      {/* Image — scales to fill width, never taller than SLIDE_MAX_H */}
      <img
        src={page.url}
        alt={`Sayfa ${page.pageNumber}`}
        loading={eager ? 'eager' : 'lazy'}
        decoding={eager ? 'sync' : 'async'}
        draggable={false}
        className={cn(
          'w-full h-auto object-contain rounded-lg select-none transition-opacity duration-200',
          SLIDE_MAX_H,
          loaded ? 'opacity-100' : 'absolute opacity-0 pointer-events-none'
        )}
        onLoad={handleLoad}
        onError={() => setError(true)}
      />
    </div>
  );
}

// ── Main viewer ───────────────────────────────────────────────────────────────
export default function ImageSlideViewer({
  pages,
  totalPages: totalPagesProp,
  previewStatus,
  title,
  onPageChange,
  className,
  slideId,
  navStartMs,
}: ImageSlideViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const firstVisualFired = useRef(false);

  // TTFV: fire once when first page image is loaded
  const handleFirstPageLoad = useCallback(() => {
    if (firstVisualFired.current || !slideId) return;
    firstVisualFired.current = true;
    const ttMs = navStartMs ? Date.now() - navStartMs : 0;
    analytics.previewFirstVisual({ slide_id: slideId, mode: 'images', tt_ms: ttMs });
  }, [slideId, navStartMs]);

  const totalPages     = pages.length;
  // Total expected pages (may be larger than pages.length while still generating)
  const expectedTotal  = totalPagesProp || totalPages;
  const isGenerating   = previewStatus === 'processing' && totalPages < expectedTotal;
  const currentPageData = pages.find((p) => p.pageNumber === currentPage) || pages[0];

  const goTo = useCallback(
    (pageNum: number) => {
      const clamped = Math.max(1, Math.min(totalPages, pageNum));
      setCurrentPage(clamped);
      onPageChange?.(clamped);
      setShowGrid(false);
    },
    [totalPages, onPageChange]
  );

  const prev = useCallback(() => goTo(currentPage - 1), [currentPage, goTo]);
  const next = useCallback(() => goTo(currentPage + 1), [currentPage, goTo]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showGrid) {
        if (e.key === 'Escape') setShowGrid(false);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev(); }
      else if (e.key === 'Escape') {
        if (isFullscreen) exitFullscreen();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'g' || e.key === 'G') {
        setShowGrid((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, showGrid, isFullscreen]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      diff > 0 ? next() : prev();
    }
    touchStartX.current = null;
  };

  // Fullscreen API
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };
  const exitFullscreen = () => { document.exitFullscreen().catch(() => {}); };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  if (!pages.length) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex flex-col bg-card rounded-2xl overflow-hidden select-none',
        isFullscreen && 'fixed inset-0 z-[9999] rounded-none bg-black',
        className
      )}
    >
      {/* ── Grid overview ── */}
      {showGrid && (
        <div className="absolute inset-0 z-20 bg-card/98 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-foreground">{title || 'Tüm Sayfalar'}</p>
            <button
              onClick={() => setShowGrid(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {pages.map((p) => (
              <button
                key={p.pageNumber}
                onClick={() => goTo(p.pageNumber)}
                className={cn(
                  'relative rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.03]',
                  p.pageNumber === currentPage
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border hover:border-primary/40'
                )}
              >
                <div className="relative w-full" style={{ paddingTop: '66%' }}>
                  <img
                    src={p.url}
                    alt={`Sayfa ${p.pageNumber}`}
                    loading="lazy"
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-contain bg-muted/30"
                  />
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-black/50 py-0.5 text-center">
                  <span className="text-[9px] font-semibold text-white">{p.pageNumber}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main slide area ── */}
      <div
        className={cn(
          'flex items-center justify-center p-3 sm:p-4',
          isFullscreen ? 'flex-1 bg-black' : 'bg-muted/20'
        )}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {currentPageData ? (
          <div className={cn(
            'w-full',
            isFullscreen
              ? 'flex items-center justify-center h-full'
              : 'max-w-3xl mx-auto'
          )}>
            {isFullscreen ? (
              // Fullscreen: fill available height, no max-h cap
              <img
                src={currentPageData.url}
                alt={`Sayfa ${currentPageData.pageNumber}`}
                loading="eager"
                decoding="sync"
                draggable={false}
                className="max-w-full max-h-full object-contain select-none"
              />
            ) : (
              <SlidePageImage
                key={currentPageData.pageNumber}
                page={currentPageData}
                eager={currentPageData.pageNumber === 1}
                onLoad={currentPageData.pageNumber === 1 ? handleFirstPageLoad : undefined}
              />
            )}
          </div>
        ) : (
          <PageSkeleton />
        )}
      </div>

      {/* ── Controls bar ── */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2 border-t border-border/60',
        isFullscreen ? 'bg-black/80 border-white/10' : 'bg-card'
      )}>
        {/* Prev */}
        <button
          onClick={prev}
          disabled={currentPage <= 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
          aria-label="Önceki sayfa"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page counter */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-muted-foreground tabular-nums">
            {currentPage} / {expectedTotal}
            {isGenerating && (
              <span className="ml-1 text-[10px] text-primary/70 font-normal">yükleniyor…</span>
            )}
          </span>

          {/* Generation progress spinner */}
          {isGenerating && (
            <Loader2 className="w-3 h-3 text-primary/60 animate-spin shrink-0" />
          )}

          {/* Page dots (show up to 12 available pages) */}
          {totalPages <= 12 && !isGenerating && (
            <div className="hidden sm:flex items-center gap-0.5">
              {pages.map((p) => (
                <button
                  key={p.pageNumber}
                  onClick={() => goTo(p.pageNumber)}
                  className={cn(
                    'rounded-full transition-all',
                    p.pageNumber === currentPage
                      ? 'w-3.5 h-1.5 bg-primary'
                      : 'w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                  )}
                  aria-label={`Sayfa ${p.pageNumber}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowGrid((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label="Izgara görünümü"
            title="Tüm sayfaları gör (G)"
          >
            <Grid3x3 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
            title={isFullscreen ? 'Tam ekrandan çık (Esc)' : 'Tam ekran (F)'}
          >
            {isFullscreen
              ? <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" />
              : <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
            }
          </button>
        </div>

        {/* Next */}
        <button
          onClick={next}
          disabled={currentPage >= totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
          aria-label="Sonraki sayfa"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Preload next 2 pages ── */}
      <div className="hidden" aria-hidden="true">
        {pages
          .filter((p) => p.pageNumber > currentPage && p.pageNumber <= currentPage + 2)
          .map((p) => (
            <link key={p.pageNumber} rel="prefetch" href={p.url} as="image" />
          ))}
      </div>
    </div>
  );
}
