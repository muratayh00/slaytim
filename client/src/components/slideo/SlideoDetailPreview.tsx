'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Loader2, Share2, RefreshCw, ExternalLink, Play, Copy, Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { loadPdfDocument, renderPageToCanvas } from '@/lib/pdfRenderer';
import { useAuthStore } from '@/store/auth';
import { trackSlideoViewWithRetry } from '@/lib/trackSlideoView';
import { cn } from '@/lib/utils';
import { buildSlidePath, buildSlideoPath } from '@/lib/url';
import { shareUrl } from '@/lib/shareUrl';

const VIEW_DEDUP_MS = 30_000;

interface PageImage { pageNumber: number; url: string }

interface Props {
  slideoId: number;
  slideId: number;
  slideTitle: string;
  title: string;
  pageIndices: number[];
  conversionStatus?: string;
}

export default function SlideoDetailPreview({ slideoId, slideId, slideTitle, title, pageIndices, conversionStatus }: Props) {
  const { user } = useAuthStore();

  // Image mode (fast path)
  const [slideImages, setSlideImages] = useState<PageImage[]>([]);
  const [imageMode, setImageMode] = useState(false);
  const [currentImgLoaded, setCurrentImgLoaded] = useState(false);

  // PDF.js fallback (slow path)
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [pdfLoadAttempt, setPdfLoadAttempt] = useState(0);
  const [canvasReady, setCanvasReady] = useState(false);
  const [pageRendering, setPageRendering] = useState(false);

  const [idx, setIdx] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showShareFallback, setShowShareFallback] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const shareInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const renderSeqRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canPreview = conversionStatus === 'done'
    && Array.isArray(pageIndices)
    && pageIndices.length > 0
    && Number.isInteger(slideId)
    && slideId > 0;

  const previewPdfPath = `/api/slides/${slideId}/pdf`;

  // ?? Auto-hide controls ??????????????????????????????????????????????????????
  const bumpControls = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    bumpControls();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [bumpControls]);

  // ?? Try image mode first (fast path) ??????????????????????????????????????????????
  useEffect(() => {
    if (!canPreview) return;
    let cancelled = false;
    api.get(`/slides/${slideId}/preview-meta`, { timeout: 8_000 })
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.previewMode === 'images' && Array.isArray(data.pages) && data.pages.length > 0) {
          const needed = new Set(pageIndices);
          const imgs = data.pages.filter((p: PageImage) => needed.has(p.pageNumber));
          if (imgs.length > 0) {
            setSlideImages(imgs);
            setImageMode(true);
          }
        }
      })
      .catch(() => { /* fall through to PDF.js */ });
    return () => { cancelled = true; };
  }, [canPreview, slideId, pageIndices]);

  // Reset img loaded state on page change
  useEffect(() => {
    setCurrentImgLoaded(false);
  }, [idx]);

  // ?? Load PDF (only when no images available) ??????????????????????????????????????????
  useEffect(() => {
    if (!canPreview || imageMode) return;
    let cancelled = false;
    setPdfLoading(true);
    setPdfError(false);
    setCanvasReady(false);
    loadPdfDocument(previewPdfPath)
      .then((doc) => { if (!cancelled) setPdfDoc(doc); })
      .catch((err) => { console.error('[SlideoDetailPreview] PDF load failed:', previewPdfPath, err); if (!cancelled) setPdfError(true); })
      .finally(() => { if (!cancelled) setPdfLoading(false); });
    return () => { cancelled = true; };
  }, [canPreview, imageMode, previewPdfPath, pdfLoadAttempt]);

  // ?? View tracking ???????????????????????????????????????????????????????????
  useEffect(() => {
    if (!canPreview) return;
    const key = `slideo:detail:view:${slideoId}`;
    const now = Date.now();
    try {
      const prev = Number(sessionStorage.getItem(key) || '0');
      if (now - prev >= VIEW_DEDUP_MS) {
        sessionStorage.setItem(key, String(now));
        trackSlideoViewWithRetry(slideoId, 'detail').catch(() => {});
      }
    } catch {}
  }, [canPreview, slideoId]);

  // ?? Reset on slideo change ??????????????????????????????????????????????????
  useEffect(() => {
    setIdx(0);
    setCanvasReady(false);
  }, [slideoId]);

  // ?? Render page to canvas (PDF.js mode only) ??????????????????????????????????????
  const renderCurrent = useCallback(() => {
    if (imageMode || !pdfDoc || !canvasRef.current || !wrapRef.current || !canPreview) return;
    const pageNum = pageIndices[idx];
    if (!Number.isInteger(pageNum) || pageNum <= 0) return;
    const seq = ++renderSeqRef.current;
    const width = Math.max(320, Math.min(1000, wrapRef.current.clientWidth - 16));
    let cancelled = false;
    setPageRendering(true);
    setCanvasReady(false);
    renderPageToCanvas(pdfDoc, pageNum, canvasRef.current, width)
      .then(() => {
        if (!cancelled && seq === renderSeqRef.current) setCanvasReady(true);
      })
      .catch((err) => {
        console.error('[SlideoDetailPreview] renderPageToCanvas failed:', pageNum, err);
        if (!cancelled && seq === renderSeqRef.current) setPdfError(true);
      })
      .finally(() => {
        if (!cancelled && seq === renderSeqRef.current) setPageRendering(false);
      });
    return () => { cancelled = true; };
  }, [imageMode, pdfDoc, idx, pageIndices, canPreview]);

  useEffect(() => {
    const cleanup = renderCurrent();
    return cleanup;
  }, [renderCurrent]);

  useEffect(() => {
    const onResize = () => renderCurrent();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [renderCurrent]);

  // ?? Share ???????????????????????????????????????????????????????????????????
  const handleShare = async () => {
    const url = `${window.location.origin}${buildSlideoPath({ id: slideoId, title })}`;
    const result = await shareUrl(url, title);
    if (result.userCancelled) return;
    if (result.ok) {
      if (user) api.post(`/slideo/${slideoId}/share`).catch(() => {});
      toast.success('Link kopyalandı');
    } else {
      // All clipboard methods failed — show the URL in a visible input
      setShowShareFallback(true);
      setTimeout(() => shareInputRef.current?.select(), 50);
    }
  };

  const handleManualCopy = async () => {
    const url = `${window.location.origin}${buildSlideoPath({ id: slideoId, title })}`;
    try { await navigator.clipboard.writeText(url); } catch { shareInputRef.current?.select(); }
    setShareCopied(true);
    if (user) api.post(`/slideo/${slideoId}/share`).catch(() => {});
    toast.success('Link kopyalandı');
    setTimeout(() => setShareCopied(false), 2000);
  };

  // ?? Derived ?????????????????????????????????????????????????????????????????
  const total = pageIndices?.length ?? 0;
  const isLast = idx >= total - 1;
  const isFirst = idx === 0;
  const isReady = imageMode ? currentImgLoaded : canvasReady;

  return (
    <div className="rounded-2xl border border-border bg-black overflow-hidden">
      {/* Viewer area */}
      <div
        ref={wrapRef}
        className="relative bg-black min-h-[62vh] cursor-pointer"
        onClick={bumpControls}
      >
        {/* Content states */}
        {!canPreview ? (
          <div className="flex h-[62vh] items-center justify-center text-sm text-white/45 flex-col gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>PDF henüz hazır değil</span>
          </div>
        ) : !imageMode && pdfLoading ? (
          <div className="flex h-[62vh] items-center justify-center text-white/50">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        ) : !imageMode && pdfError ? (
          <div className="flex h-[62vh] flex-col items-center justify-center gap-3 text-white/55">
            <p className="text-sm font-semibold">Önizleme yüklenemedi</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPdfError(false);
                setPdfDoc(null);
                setCanvasReady(false);
                setPdfLoadAttempt((v) => v + 1);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/18 text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tekrar dene
            </button>
          </div>
        ) : null}

        {/* Image mode (fast path) */}
        {imageMode && canPreview && (() => {
          const currentPageNum = pageIndices[idx];
          const currentImg = slideImages.find((p) => p.pageNumber === currentPageNum);
          return currentImg ? (
            <div className="flex items-center justify-center min-h-[62vh]">
              {!currentImgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-white/50" />
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={currentPageNum}
                src={currentImg.url}
                alt={`Sayfa ${idx + 1}`}
                onLoad={() => setCurrentImgLoaded(true)}
                className={cn('max-w-full max-h-[62vh] object-contain transition-opacity duration-100', currentImgLoaded ? 'opacity-100' : 'opacity-0')}
              />
            </div>
          ) : (
            <div className="flex h-[62vh] items-center justify-center text-white/50">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          );
        })()}

        {/* Canvas (PDF.js fallback) */}
        <div
          className={cn(
            'transition-opacity duration-150',
            !imageMode && canPreview && !pdfError ? 'block' : 'hidden',
          )}
        >
          {pageRendering && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 pointer-events-none">
              <Loader2 className="h-5 w-5 animate-spin text-white/60" />
            </div>
          )}
          <div className="flex items-center justify-center min-h-[62vh] p-2">
            <canvas
              ref={canvasRef}
              className={cn(
                'max-w-full max-h-[62vh] object-contain bg-white mx-auto block transition-opacity duration-100',
                canvasReady ? 'opacity-100' : 'opacity-0',
              )}
            />
          </div>
        </div>

        {/* Page counter badge */}
        {canPreview && !pdfError && (
          <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-[11px] font-bold">
            {idx + 1} / {total}
          </div>
        )}

        {/* Progress bar */}
        {canPreview && !pdfError && total > 1 && (
          <div className="absolute top-0 inset-x-0 flex gap-[2px] px-3 pt-2">
            {pageIndices.map((_, i) => (
              <div key={i} className="h-[2px] flex-1 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-150"
                  style={{ width: i < idx ? '100%' : i === idx ? '60%' : '0%' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Controls overlay */}
        <AnimatePresence>
          {showControls && canPreview && !pdfError && (
            <motion.div
              key="detail-controls"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute bottom-0 inset-x-0 pointer-events-none"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
              <div className="relative px-3 pb-3 pt-8 flex items-center justify-between gap-2 pointer-events-auto">
                <button
                  onClick={(e) => { e.stopPropagation(); if (!isFirst) setIdx((v) => v - 1); bumpControls(); }}
                  disabled={isFirst}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-bold disabled:opacity-30 transition-opacity backdrop-blur-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Önceki
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleShare(); }}
                  className="w-9 h-9 rounded-xl border border-white/20 bg-black/60 text-white flex items-center justify-center backdrop-blur-sm"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); if (!isLast) setIdx((v) => v + 1); bumpControls(); }}
                  disabled={isLast}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-bold disabled:opacity-30 transition-opacity backdrop-blur-sm"
                >
                  Sonraki
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* End screen — last page reached */}
        <AnimatePresence>
          {isLast && isReady && showControls && (
            <motion.div
              key="detail-end"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 inset-x-0 pb-14 pt-10 px-3 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none"
            >
              <a
                href={buildSlidePath({ id: slideId, title: slideTitle })}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white text-black font-bold text-sm pointer-events-auto active:scale-98 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Tam sunuma git
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Share fallback — shown when clipboard API is blocked */}
      {showShareFallback && (
        <div className="border-t border-white/10 bg-black/80 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-white/60">Linki kopyalayın</p>
            <button
              type="button"
              onClick={() => setShowShareFallback(false)}
              className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="w-3 h-3 text-white/60" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              ref={shareInputRef}
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}${buildSlideoPath({ id: slideoId, title })}`}
              onFocus={(e) => e.target.select()}
              className="flex-1 min-w-0 px-3 py-1.5 text-[11px] rounded-lg border border-white/15 bg-white/10 text-white font-mono truncate focus:outline-none focus:ring-1 focus:ring-white/30"
            />
            <button
              type="button"
              onClick={handleManualCopy}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-white/15 bg-white/10 hover:bg-white/20 transition-colors"
              title="Kopyala"
            >
              {shareCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/70" />}
            </button>
          </div>
        </div>
      )}

      {/* Bottom mini-toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/8 bg-black/60">
        <span className="text-[11px] text-white/40 font-medium">{total} sayfa · Slideo önizlemesi</span>
        <Link
          href={`/slideo?focus=${slideoId}`}
          prefetch={false}
          className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white font-semibold transition-colors"
        >
          <Play className="w-3 h-3" fill="currentColor" />
          Akışta aç
        </Link>
      </div>
    </div>
  );
}

