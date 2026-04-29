'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Play, Loader2, Flame, Clock, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import api from '@/lib/api';
import SlideoViewer, { SlideoItem } from '@/components/slideo/SlideoViewer';
import SelectSlideForSlideoModal from '@/components/slideo/SelectSlideForSlideoModal';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { AdProvider } from '@/components/ads/AdProvider';
import { useSlideoFeedWithAds } from '@/components/ads/SlideoAdInjector';

const BATCH = 8;

function SlideoPageContent() {
  const [validFocusId, setValidFocusId] = useState<number | null>(null);
  const user = useAuthStore((s) => s.user);

  const [slideos, setSlideos] = useState<SlideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [activeIdx, setActiveIdx] = useState(0);
  const [sort, setSort] = useState<'new' | 'popular'>('new');
  const [feedMeta, setFeedMeta] = useState<{ variant?: string; experiment?: string; subjectKey?: string }>({});
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Reklam enjeksiyonlu karışık feed (içerik + reklam slotları)
  const feedItems = useSlideoFeedWithAds(slideos);

  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const focusedSlideoRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const focusParam = params.get('focus') || params.get('id');
    const focusId = focusParam ? Number(focusParam) : null;
    const normalized = focusId && Number.isFinite(focusId) && focusId > 0 ? focusId : null;
    setValidFocusId(normalized);
  }, []);

  const fetchSlideos = useCallback(async (p: number, s: 'new' | 'popular', replace = false) => {
    try {
      const { data } = await api.get(`/slideo/feed?page=${p}&limit=${BATCH}&sort=${s}`);
      setFeedMeta({
        variant: data?.variant,
        experiment: data?.experiment,
        subjectKey: data?.subjectKey,
      });
      const incoming = Array.isArray(data?.slideos) ? data.slideos : [];
      setSlideos((prev) => (replace ? incoming : [...prev, ...incoming]));
      setHasMore(Boolean(data?.hasMore));
    } catch {
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setSlideos([]);
    setPage(1);
    setActiveIdx(0);
    focusedSlideoRef.current = null;
    fetchSlideos(1, sort, true);
  }, [fetchSlideos, sort]);

  // Focus parametresi ile belirli slideo'ya scroll
  useEffect(() => {
    if (!validFocusId || slideos.length === 0) return;
    if (focusedSlideoRef.current === validFocusId) return;

    // feedItems içinde slideo kind'larının gerçek index'ini bul
    const feedIdx = feedItems.findIndex(
      (fi) => fi.kind === 'slideo' && fi.item.id === validFocusId,
    );
    if (feedIdx !== -1) {
      focusedSlideoRef.current = validFocusId;
      setActiveIdx(feedIdx);
      requestAnimationFrame(() => {
        itemRefs.current[feedIdx]?.scrollIntoView({ behavior: 'auto' });
      });
      return;
    }

    if (hasMore && !loadingMore && !loading) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      fetchSlideos(nextPage, sort);
    }
  }, [validFocusId, slideos, feedItems, hasMore, loadingMore, loading, page, fetchSlideos, sort]);

  // Intersection observer — hangi item aktif
  useEffect(() => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const idx = itemRefs.current.findIndex((el) => el === entry.target);
              if (idx !== -1) setActiveIdx(idx);
            }
          });
        },
        { threshold: 0.6, rootMargin: '0px' },
      );
    }

    const observer = observerRef.current;
    itemRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [feedItems]);

  // Sonuna yaklaşınca daha fazla yükle
  useEffect(() => {
    if (activeIdx >= feedItems.length - 3 && hasMore && !loadingMore && !loading) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      fetchSlideos(nextPage, sort);
    }
  }, [activeIdx, feedItems.length, hasMore, loadingMore, loading, page, fetchSlideos, sort]);

  const scrollToIdx = useCallback((idx: number) => {
    itemRefs.current[idx]?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const goNext = useCallback(() => {
    const next = activeIdx + 1;
    if (next < feedItems.length) scrollToIdx(next);
  }, [activeIdx, feedItems.length, scrollToIdx]);

  const goPrev = useCallback(() => {
    const prev = activeIdx - 1;
    if (prev >= 0) scrollToIdx(prev);
  }, [activeIdx, scrollToIdx]);

  if (loading) {
    return (
      <div className="slideo-h flex flex-col items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 text-white/70">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm font-semibold">Slideo yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!loading && slideos.length === 0) {
    return (
      <>
        <div className="slideo-h flex flex-col items-center justify-center gap-6 bg-black text-white">
          <div className="w-20 h-20 rounded-lg bg-white/10 flex items-center justify-center">
            <Play className="w-10 h-10 text-white/60" fill="currentColor" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Henüz Slideo yok</h2>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-5 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Slayttan Slideo Oluştur
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showUploadModal && (
            <SelectSlideForSlideoModal
              onClose={() => setShowUploadModal(false)}
              onCreated={() => {
                fetchSlideos(1, sort, true);
                setShowUploadModal(false);
              }}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="slideo-h relative bg-black">
      {user && (
        <button
          onClick={() => setShowUploadModal(true)}
          className="absolute top-3 right-4 z-40 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="text-xs font-bold">Oluştur</span>
        </button>
      )}

      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-0.5 bg-black/65 backdrop-blur-md rounded-xl p-1 border border-white/12">
        <button
          onClick={() => setSort('new')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
            sort === 'new' ? 'bg-white text-black' : 'text-white/65 hover:text-white hover:bg-white/10',
          )}
        >
          <Clock className="w-3 h-3" />
          Yeni
        </button>
        <button
          onClick={() => setSort('popular')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
            sort === 'popular' ? 'bg-white text-black' : 'text-white/65 hover:text-white hover:bg-white/10',
          )}
        >
          <Flame className="w-3 h-3" />
          Popüler
        </button>
      </div>

      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-2">
        <button
          onClick={goPrev}
          disabled={activeIdx === 0}
          className="w-9 h-9 rounded-xl bg-black/60 backdrop-blur-sm border border-white/12 flex items-center justify-center text-white/70 disabled:opacity-20"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <button
          onClick={goNext}
          disabled={activeIdx >= feedItems.length - 1 && !hasMore}
          className="w-9 h-9 rounded-xl bg-black/60 backdrop-blur-sm border border-white/12 flex items-center justify-center text-white/70 disabled:opacity-20"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      <div
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {feedItems.map((fi, i) => {
          if (fi.kind === 'slideo') {
            return (
              <div
                key={`slideo-${fi.item.id}`}
                ref={(el) => { itemRefs.current[i] = el; }}
                className="snap-start shrink-0 slideo-h"
              >
                <SlideoViewer
                  slideo={fi.item}
                  isActive={i === activeIdx}
                  onNext={goNext}
                  onPrev={goPrev}
                  feedVariant={feedMeta.variant || 'A'}
                  feedSubjectKey={feedMeta.subjectKey || ''}
                  isFullscreen
                />
              </div>
            );
          }

          if (fi.kind === 'static_ad' || fi.kind === 'video_ad') {
            /* TODO: Google Ads kodu buraya eklenecek (slideo_infeed) */
            return null;
          }

          return null;
        })}

        {loadingMore && (
          <div className="snap-start shrink-0 slideo-h flex items-center justify-center bg-black">
            <div className="flex items-center gap-3 text-white/40">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Daha fazla yükleniyor...</span>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showUploadModal && (
          <SelectSlideForSlideoModal
            onClose={() => setShowUploadModal(false)}
            onCreated={() => {
              fetchSlideos(1, sort, true);
              setShowUploadModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SlideoPage() {
  return (
    <AdProvider pageType="slideo">
      <SlideoPageContent />
    </AdProvider>
  );
}
