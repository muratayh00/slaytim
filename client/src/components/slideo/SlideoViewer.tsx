'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Heart, Bookmark, Share2, ExternalLink, Loader2, Play, ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { loadPdfDocument, renderPageToCanvas, resolveFileUrl } from '@/lib/pdfRenderer';
import api from '@/lib/api';
import { trackSlideoViewWithRetry } from '@/lib/trackSlideoView';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { buildSlideoPath, buildSlidePath, buildTopicPath } from '@/lib/url';

export interface SlideoItem {
  id: number;
  title: string;
  description?: string | null;
  pageIndices: number[];
  coverPage: number;
  likesCount: number;
  savesCount: number;
  viewsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
  user: { id: number; username: string; avatarUrl?: string | null };
  slide: {
    id: number;
    title: string;
    pdfUrl?: string | null;
    thumbnailUrl?: string | null;
    conversionStatus: string;
    topic?: { id: number; slug?: string; title: string; category?: { name: string; slug: string } } | null;
  };
}

interface Props {
  slideo: SlideoItem;
  isActive: boolean;
  onNext: () => void;
  onPrev: () => void;
  feedVariant?: string;
  feedSubjectKey?: string;
  isFullscreen?: boolean;
}

const VIEW_DEDUP_MS = 30_000;
const AUTO_PAGE_ADVANCE_MS = 3000;
const AUTO_NEXT_SLIDEO_DELAY_MS = 700;
const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-orange-500', 'bg-pink-500', 'bg-cyan-500',
];

export default function SlideoViewer({
  slideo, isActive, onNext, onPrev, feedVariant = 'A', feedSubjectKey = '', isFullscreen = true,
}: Props) {
  const { user } = useAuthStore();
  const pages = slideo.pageIndices;

  // PDF state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [pdfLoadAttempt, setPdfLoadAttempt] = useState(0);
  const [canvasRendered, setCanvasRendered] = useState(false);

  // Page state
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentIdxRef = useRef(0);
  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);

  // Page transition flash
  const [pageFlash, setPageFlash] = useState(false);

  // Interaction state
  const [liked, setLiked] = useState(slideo.isLiked);
  const [saved, setSaved] = useState(slideo.isSaved);
  const [likesCount, setLikesCount] = useState(slideo.likesCount);
  const [savesCount, setSavesCount] = useState(slideo.savesCount);

  // UI state ? "ended" means last page reached
  const [isEnded, setIsEnded] = useState(false);
  // "immersive" ? user tapped center to hide overlays
  const [isImmersive, setIsImmersive] = useState(false);
  const [autoProgressPct, setAutoProgressPct] = useState(0);
  const immersiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Heart double-tap animation
  const [heartAnim, setHeartAnim] = useState<{ id: number; x: number; y: number } | null>(null);

  // Related slideos
  const [related, setRelated] = useState<{ sameCreator: SlideoItem[]; sameTopic: SlideoItem[] } | null>(null);
  const relatedFetchedRef = useRef(false);
  const completionTrackedRef = useRef(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderSeqRef = useRef(0);
  const ptrStartYRef = useRef(0);
  const ptrStartXRef = useRef(0);
  const lastTapTimeRef = useRef(0);
  const lastTapPosRef = useRef({ x: 0, y: 0 });

  const previewPdfPath = `/api/slides/${slideo.slide.id}/pdf`;

  // ?? Reset on slideo change ??????????????????????????????????????????????????
  useEffect(() => {
    setLiked(slideo.isLiked);
    setSaved(slideo.isSaved);
    setLikesCount(slideo.likesCount);
    setSavesCount(slideo.savesCount);
    setPdfDoc(null);
    setPdfError(false);
    setPdfLoading(false);
    setPdfLoadAttempt(0);
    setCanvasRendered(false);
    completionTrackedRef.current = false;
  }, [slideo.id, slideo.isLiked, slideo.isSaved, slideo.likesCount, slideo.savesCount]);

  // ?? Reset page / related when active changes ????????????????????????????????
  useEffect(() => {
    if (!isActive) return;
    setCurrentIdx(0);
    setIsEnded(false);
    setIsImmersive(false);
    relatedFetchedRef.current = false;
    setRelated(null);
  }, [isActive]);

  // ?? Detect "ended" ??????????????????????????????????????????????????????????
  useEffect(() => {
    setIsEnded(currentIdx === pages.length - 1 && canvasRendered);
  }, [currentIdx, pages.length, canvasRendered]);

  // ?? Completion tracking ?????????????????????????????????????????????????????
  useEffect(() => {
    if (!isActive || !user) return;
    if (currentIdx !== pages.length - 1) return;
    if (completionTrackedRef.current) return;
    completionTrackedRef.current = true;
    api.post(`/slideo/${slideo.id}/complete`, { variant: feedVariant, subjectKey: feedSubjectKey }).catch(() => {});
  }, [isActive, user, currentIdx, pages.length, slideo.id, feedVariant, feedSubjectKey]);

  // ?? Related slideos fetch ???????????????????????????????????????????????????
  useEffect(() => {
    if (isActive && currentIdx === pages.length - 1 && !relatedFetchedRef.current) {
      relatedFetchedRef.current = true;
      api.get(`/slideo/${slideo.id}/related`).then(({ data }) => setRelated(data)).catch(() => {});
    }
  }, [isActive, currentIdx, pages.length, slideo.id]);

  // ?? Feed open event ?????????????????????????????????????????????????????????
  useEffect(() => {
    if (!isActive || !feedSubjectKey) return;
    api.post('/slideo/feed/evaluate', {
      items: [{ slideoId: slideo.id, eventType: 'open', page: 1, position: 0 }],
    }).catch(() => {});
  }, [isActive, slideo.id, feedSubjectKey]);

  // ?? PDF load ????????????????????????????????????????????????????????????????
  useEffect(() => {
    if (!isActive || slideo.slide.conversionStatus !== 'done') return;
    if (pdfDoc) return;
    let cancelled = false;
    setPdfLoading(true);
    setPdfError(false);
    loadPdfDocument(previewPdfPath)
      .then((doc) => { if (!cancelled) setPdfDoc(doc); })
      .catch((err) => { console.error('[SlideoViewer] PDF load failed:', previewPdfPath, err); if (!cancelled) setPdfError(true); })
      .finally(() => { if (!cancelled) setPdfLoading(false); });
    return () => { cancelled = true; };
  }, [isActive, slideo.slide.conversionStatus, slideo.id, previewPdfPath, pdfDoc, pdfLoadAttempt]);

  // ?? View tracking ???????????????????????????????????????????????????????????
  useEffect(() => {
    if (!isActive || slideo.slide.conversionStatus !== 'done') return;
    const viewKey = `slideo:view:${slideo.id}`;
    const now = Date.now();
    let shouldTrack = true;
    try {
      const prev = Number(sessionStorage.getItem(viewKey) || '0');
      if (now - prev < VIEW_DEDUP_MS) shouldTrack = false;
      else sessionStorage.setItem(viewKey, String(now));
    } catch {}
    if (shouldTrack) {
      const sessionId = (() => {
        try {
          const key = 'slideo:view:session-id';
          const existing = sessionStorage.getItem(key);
          if (existing) return existing;
          const created = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          sessionStorage.setItem(key, created);
          return created;
        } catch { return 'na'; }
      })();
      trackSlideoViewWithRetry(slideo.id, 'viewer', { 'X-View-Session': sessionId }).catch(() => {});
    }
  }, [isActive, slideo.id, slideo.slide.conversionStatus]);

  // ?? Render page to canvas ???????????????????????????????????????????????????
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !isActive) return;
    const pageNum = pages[currentIdx];
    if (!pageNum) return;
    const seq = ++renderSeqRef.current;
    const container = containerRef.current;
    const measuredWidth = container?.clientWidth || 0;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    const w = Math.min(1200, Math.max(360, measuredWidth || viewportWidth || 800));
    let cancelled = false;
    setCanvasRendered(false);
    setPageFlash(true);
    renderPageToCanvas(pdfDoc, pageNum, canvasRef.current, Math.min(w, 1200))
      .then(() => {
        if (!cancelled && seq === renderSeqRef.current) {
          setCanvasRendered(true);
          setPageFlash(false);
        }
      })
      .catch((err) => {
        console.error('[SlideoViewer] renderPageToCanvas failed:', pageNum, err);
        if (!cancelled && seq === renderSeqRef.current) {
          setPdfError(true);
          setPageFlash(false);
        }
      });
    return () => { cancelled = true; };
  }, [pdfDoc, currentIdx, isActive, slideo.id, pages]);

  // ?? Page navigation ?????????????????????????????????????????????????????????
  const goToPage = useCallback((idx: number) => {
    if (idx < 0 || idx >= pages.length) return;
    setCurrentIdx(idx);
    setIsEnded(false);
  }, [pages.length]);

  const goPageNext = useCallback(() => {
    if (currentIdxRef.current < pages.length - 1) goToPage(currentIdxRef.current + 1);
  }, [pages.length, goToPage]);

  const goPagePrev = useCallback(() => {
    if (currentIdxRef.current > 0) goToPage(currentIdxRef.current - 1);
  }, [goToPage]);

  // ? Auto advance pages (Reels/TikTok-like pacing) ?
  useEffect(() => {
    if (!isActive) return;
    if (pdfLoading || pdfError || !canvasRendered) return;
    if (isImmersive) return;
    if (currentIdx >= pages.length - 1) return;

    const startedAt = Date.now();
    setAutoProgressPct(0);
    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.min(100, (elapsed / AUTO_PAGE_ADVANCE_MS) * 100);
      setAutoProgressPct(pct);
    }, 50);

    const timer = setTimeout(() => {
      setCurrentIdx((prev) => Math.min(prev + 1, pages.length - 1));
    }, AUTO_PAGE_ADVANCE_MS);

    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
    };
  }, [isActive, pdfLoading, pdfError, canvasRendered, isImmersive, currentIdx, pages.length]);

  useEffect(() => {
    if (currentIdx >= pages.length - 1) setAutoProgressPct(100);
  }, [currentIdx, pages.length]);

  useEffect(() => {
    if (!isActive) return;
    if (pdfLoading || pdfError || !canvasRendered) return;
    if (currentIdx !== pages.length - 1) return;
    const timer = setTimeout(() => {
      onNext();
    }, AUTO_NEXT_SLIDEO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isActive, pdfLoading, pdfError, canvasRendered, currentIdx, pages.length, onNext]);

  // ?? Immersive toggle ????????????????????????????????????????????????????????
  const showUI = useCallback(() => {
    setIsImmersive(false);
    if (immersiveTimerRef.current) clearTimeout(immersiveTimerRef.current);
  }, []);

  const toggleImmersive = useCallback(() => {
    setIsImmersive((v) => !v);
    if (immersiveTimerRef.current) clearTimeout(immersiveTimerRef.current);
  }, []);

  useEffect(() => () => {
    if (immersiveTimerRef.current) clearTimeout(immersiveTimerRef.current);
  }, []);

  // ?? Like / Save / Share ?????????????????????????????????????????????????????
    const handleLike = useCallback(async () => {
    if (!user) return toast.error('Beğenmek için giriş yap');
    try {
      const { data } = await api.post(`/slideo/${slideo.id}/like`, { variant: feedVariant, subjectKey: feedSubjectKey });
      if (feedSubjectKey) api.post('/slideo/feed/evaluate', { items: [{ slideoId: slideo.id, eventType: 'like', page: 1, position: 0 }] }).catch(() => {});
      setLiked(data.liked);
      setLikesCount((c) => c + (data.liked ? 1 : -1));
    } catch {
      toast.error('Beğeni işlemi tamamlanamadı');
    }
  }, [user, slideo.id, feedVariant, feedSubjectKey]);

    const handleSave = useCallback(async () => {
    if (!user) return toast.error('kaydetmek için giriş yap');
    try {
      const { data } = await api.post(`/slideo/${slideo.id}/save`, { variant: feedVariant, subjectKey: feedSubjectKey });
      if (feedSubjectKey) api.post('/slideo/feed/evaluate', { items: [{ slideoId: slideo.id, eventType: 'save', page: 1, position: 0 }] }).catch(() => {});
      setSaved(data.saved);
      setSavesCount((c) => c + (data.saved ? 1 : -1));
      toast.success(data.saved ? 'Kaydedildi' : 'Kaldırıldı');
    } catch {
      toast.error('kaydetme işlemi tamamlanamadı');
    }
  }, [user, slideo.id, feedVariant, feedSubjectKey]);

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}${buildSlideoPath({ id: slideo.id, title: slideo.title })}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    if (user) api.post(`/slideo/${slideo.id}/share`, { variant: feedVariant, subjectKey: feedSubjectKey }).catch(() => {});
    toast.success('Link kopyalandı');
  }, [slideo.id, slideo.title, user, feedVariant, feedSubjectKey]);

  // ?? Keyboard shortcuts ??????????????????????????????????????????????????????
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.key === 'ArrowRight' || e.key === 'l') { e.preventDefault(); goPageNext(); showUI(); }
      else if (e.key === 'ArrowLeft' || e.key === 'h') { e.preventDefault(); goPagePrev(); showUI(); }
      else if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); onNext(); }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); onPrev(); }
      else if (e.key === ' ') { e.preventDefault(); toggleImmersive(); }
      else if (e.key === 'f') handleLike();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, goPageNext, goPagePrev, onNext, onPrev, handleLike, showUI, toggleImmersive]);

  // ?? Touch / pointer gestures ????????????????????????????????????????????????
  const onPtrDown = useCallback((e: React.PointerEvent) => {
    ptrStartYRef.current = e.clientY;
    ptrStartXRef.current = e.clientX;
  }, []);

  const onPtrUp = useCallback((e: React.PointerEvent) => {
    const dy = ptrStartYRef.current - e.clientY;
    const dx = ptrStartXRef.current - e.clientX;

    // Vertical swipe ? change slideo
    if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx) * 1.2) {
      if (dy > 0) onNext(); else onPrev();
      return;
    }

    // Horizontal swipe ? change page within slideo
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx > 0) goPageNext(); else goPagePrev();
      showUI();
      return;
    }

    // Tap logic
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const now = Date.now();
    const timeSinceLast = now - lastTapTimeRef.current;
    const distSinceLast = Math.hypot(x - lastTapPosRef.current.x, y - lastTapPosRef.current.y);
    const isDoubleTap = timeSinceLast < 320 && distSinceLast < 60;
    const inCenter = x >= rect.width * 0.25 && x <= rect.width * 0.75;

    if (isDoubleTap && inCenter) {
      // Double tap center ? like
      setHeartAnim({ id: now, x, y });
      setTimeout(() => setHeartAnim(null), 900);
      if (!liked) handleLike();
      lastTapTimeRef.current = 0;
      return;
    }

    lastTapTimeRef.current = now;
    lastTapPosRef.current = { x, y };

    // Single tap left/right zones ? page nav
    if (x <= rect.width * 0.3) {
      goPagePrev(); showUI(); return;
    }
    if (x >= rect.width * 0.7) {
      goPageNext(); showUI(); return;
    }

    // Tap center ? toggle immersive
    if (inCenter) toggleImmersive();
  }, [onNext, onPrev, goPageNext, goPagePrev, liked, handleLike, showUI, toggleImmersive]);

  const handleRetry = useCallback(() => {
    setPdfError(false);
    setPdfDoc(null);
    setCanvasRendered(false);
    setPdfLoadAttempt((v) => v + 1);
  }, []);

  // ?? Derived ?????????????????????????????????????????????????????????????????
  const noPdf = slideo.slide.conversionStatus !== 'done';
  const continueHref = slideo.slide.topic
    ? buildTopicPath({
        id: slideo.slide.topic.id,
        slug: slideo.slide.topic.slug,
        title: slideo.slide.topic.title,
      })
    : '/slideo';
  const avatarColor = AVATAR_COLORS[slideo.user.id % AVATAR_COLORS.length];

  // ?? Render ??????????????????????????????????????????????????????????????????
  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full bg-black select-none overFlow-hidden touch-none',
        isFullscreen && 'min-h-full',
      )}
      onPointerDown={onPtrDown}
      onPointerUp={onPtrUp}
    >
      {/* ?? Canvas / loading layer ?? */}
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        {noPdf ? (
          <div className="flex flex-col items-center gap-3 text-white/30">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="text-sm">PDF hazırlanıyor...</p>
          </div>
        ) : pdfLoading ? (
          <div className="flex flex-col items-center gap-3 text-white/40">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="text-sm font-semibold">Yükleniyor...</p>
          </div>
        ) : pdfError ? (
          <div className="flex flex-col items-center gap-3 text-white/55 px-6 text-center">
            <p className="text-sm font-semibold">Önizleme yüklenemedi</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleRetry(); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tekrar dene
            </button>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className={cn(
              'max-w-full max-h-full object-contain bg-white transition-opacity duration-100',
              pageFlash ? 'opacity-70' : 'opacity-100',
            )}
            style={{ display: pdfDoc ? 'block' : 'none' }}
          />
        )}
      </div>

      {/* ?? Heart double-tap animation ?? */}
      <AnimatePresence>
        {heartAnim && (
          <motion.div
            key={heartAnim.id}
            initial={{ opacity: 1, scale: 0.6, y: 0 }}
            animate={{ opacity: 0, scale: 1.4, y: -28 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="absolute z-30 pointer-events-none"
            style={{ left: heartAnim.x - 28, top: heartAnim.y - 28 }}
          >
            <Heart className="w-14 h-14 text-red-400 fill-red-400 drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ?? UI overlays ? hidden in immersive mode ?? */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none transition-opacity duration-200',
          isImmersive ? 'opacity-0' : 'opacity-100',
        )}
      >
        {/* Progress bar ? top */}
        <div
          className="absolute top-0 inset-x-0 flex gap-[3px] px-3 pt-2.5 pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { goToPage(i); showUI(); }}
              className="h-[3px] flex-1 rounded-full bg-white/25 overFlow-hidden focus:outline-none"
            >
              <div
                className="h-full bg-white rounded-full transition-all duration-150"
                style={{ width: i < currentIdx ? '100%' : i === currentIdx ? `${autoProgressPct}%` : '0%' }}
              />
            </button>
          ))}
        </div>

        {/* Right action column */}
        <div
          className="absolute right-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-3 pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          {/* Like */}
          <button onClick={handleLike} aria-label="Beğen" className="group flex flex-col items-center gap-1.5 min-w-[52px]">
            <div className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center border backdrop-blur-md transition-all duration-200 active:scale-90 shadow-lg',
              liked
                ? 'bg-gradient-to-b from-rose-500/50 to-red-500/35 border-rose-300/70'
                : 'bg-black/55 border-white/20 group-hover:bg-white/15',
            )}>
              <Heart className={cn('w-[21px] h-[21px] transition-all', liked ? 'text-red-400 fill-red-400 scale-110' : 'text-white')} />
            </div>
            <span className="text-[10px] text-white/85 font-black tabular-nums leading-none">{likesCount}</span>
            <span className="text-[9px] text-white/55 font-semibold leading-none">Beğen</span>
          </button>

          {/* Save */}
          <button onClick={handleSave} aria-label="Kaydet" className="group flex flex-col items-center gap-1.5 min-w-[52px]">
            <div className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center border backdrop-blur-md transition-all duration-200 active:scale-90 shadow-lg',
              saved
                ? 'bg-gradient-to-b from-indigo-500/50 to-primary/35 border-indigo-200/70'
                : 'bg-black/55 border-white/20 group-hover:bg-white/15',
            )}>
              <Bookmark className={cn('w-[21px] h-[21px] transition-all', saved ? 'text-primary fill-primary scale-110' : 'text-white')} />
            </div>
            <span className="text-[10px] text-white/85 font-black tabular-nums leading-none">{savesCount}</span>
            <span className="text-[9px] text-white/55 font-semibold leading-none">Kaydet</span>
          </button>

          {/* Share */}
          <button onClick={handleShare} aria-label="Paylaş" className="group flex flex-col items-center gap-1.5 min-w-[52px]">
            <div className="w-11 h-11 rounded-2xl bg-black/55 border border-white/20 backdrop-blur-md flex items-center justify-center transition-all duration-200 group-hover:bg-white/15 active:scale-90 shadow-lg">
              <Share2 className="w-[21px] h-[21px] text-white" />
            </div>
            <span className="text-[10px] text-white/85 font-black leading-none">Paylaş</span>
          </button>
        </div>

        {/* Bottom info bar */}
        <div
          className="absolute bottom-0 inset-x-0 pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

          <div className="relative px-4 pt-8 pb-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            {/* Creator row */}
            <div className="flex items-center gap-2 mb-1.5">
              <div className={cn(
                'w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black text-white overFlow-hidden relative',
                avatarColor,
              )}>
                {slideo.user.username.slice(0, 1).toUpperCase()}
                {slideo.user.avatarUrl && (
                  <img
                    src={resolveFileUrl(slideo.user.avatarUrl)}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
              </div>
              <span className="text-[12px] text-white/80 font-semibold">@{slideo.user.username}</span>
              <span className="text-white/30 text-[10px] ml-auto font-bold tabular-nums">
                {currentIdx + 1} / {pages.length}
              </span>
            </div>

            {/* Persistent CTA + title */}
            <div className="flex flex-col gap-2">
              <a
                href={buildSlidePath({ id: slideo.slide.id, title: slideo.slide.title })}
                onClick={(e) => e.stopPropagation()}
                className="self-start shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl bg-white/15 border border-white/25 backdrop-blur-md text-white text-[11px] font-bold hover:bg-white/25 transition-all active:scale-95"
              >
                <ExternalLink className="w-3 h-3" />
                Tam sunuma git
              </a>
              <div className="min-w-0">
                <p className="text-white font-bold text-[14px] leading-snug line-clamp-2">{slideo.title}</p>
                {slideo.slide.topic && (
                  <p className="text-white/45 text-[11px] mt-0.5 truncate">
                    {slideo.slide.topic.title}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ?? End-of-slideo overlay ?? */}
      <AnimatePresence>
        {false && isEnded && !isImmersive && (
          <motion.div
            key="end-overlay"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="absolute bottom-0 inset-x-0 z-20 pt-14 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-black via-black/98 to-transparent"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            {/* Full slide CTA */}
            <a
              href={buildSlidePath({ id: slideo.slide.id, title: slideo.slide.title })}
              className="flex items-center justify-center gap-2 w-full max-w-[520px] mx-auto py-3.5 rounded-2xl bg-white text-black font-bold text-[13px] shadow-xl hover:bg-white/90 active:scale-98 transition-all mb-2.5"
            >
              <ExternalLink className="w-4 h-4" />
              Tam sunuma git
            </a>

            {/* Continue in feed */}
            <button
              type="button"
              onClick={onNext}
              className="flex items-center justify-center gap-2 w-full max-w-[520px] mx-auto py-2.5 rounded-2xl border border-white/18 bg-white/8 text-white/80 font-bold text-[12px] hover:bg-white/15 active:scale-98 transition-all mb-5"
            >
              <Play className="w-3.5 h-3.5" fill="currentColor" />
              Sonraki Slideo
            </button>

            {/* Related slideos */}
            {(related?.sameTopic?.length ?? 0) > 0 && (
              <div>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2 pl-1">
                  Aynı konudan
                </p>
                <div className="flex gap-2.5 overFlow-x-auto scrollbar-none pb-1">
                  {(related?.sameTopic || []).map((r) => (
                    <MiniSlideoCard key={r.id} slideo={r} />
                  ))}
                  <Link
                    href={continueHref}
                    prefetch={false}
                    className="shrink-0 w-[70px] h-[86px] rounded-xl border border-white/12 bg-white/5 flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-white/45" />
                    <span className="text-[8px] text-white/35 font-bold text-center leading-tight">Daha<br />fazla</span>
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ?? Mini card for related slideos ????????????????????????????????????????????
function MiniSlideoCard({ slideo: s }: { slideo: SlideoItem }) {
  const avatarColor = AVATAR_COLORS[s.user.id % AVATAR_COLORS.length];
  return (
    <Link href={`/slideo?focus=${s.id}`} className="shrink-0 w-[70px] flex flex-col gap-1.5 group">
      <div className="w-[70px] h-[54px] rounded-xl overFlow-hidden bg-white/8 border border-white/12 flex items-center justify-center relative">
        <Play className="w-4 h-4 text-white/30" fill="currentColor" />
        {s.slide.thumbnailUrl && (
          <img
            src={resolveFileUrl(s.slide.thumbnailUrl)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <span className="absolute bottom-1 right-1 text-[7px] font-black text-white/75 bg-black/65 px-1 rounded">
          {s.pageIndices.length}
        </span>
      </div>
      <p className="text-[9px] text-white/60 font-semibold leading-tight line-clamp-2 group-hover:text-white transition-colors">
        {s.title}
      </p>
      <div className="flex items-center gap-1">
        <div className={cn(
          'w-3 h-3 rounded-full shrink-0 flex items-center justify-center text-[5px] font-black text-white overFlow-hidden relative',
          avatarColor,
        )}>
          {s.user.username.slice(0, 1).toUpperCase()}
          {s.user.avatarUrl && (
            <img
              src={resolveFileUrl(s.user.avatarUrl)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>
        <span className="text-[8px] text-white/40 font-medium truncate">{s.user.username}</span>
      </div>
    </Link>
  );
}

