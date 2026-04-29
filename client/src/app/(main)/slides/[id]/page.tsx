'use client';

import Image from 'next/image';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Bookmark, Download, ArrowLeft, Presentation, Calendar,
  ExternalLink, Lock, Eye, Flag, Loader2, AlertTriangle, FileX,
  FolderPlus, X, Check, Plus, ChevronRight, Play, Share2, Code2, Copy, Trash2,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import ReportModal from '@/components/shared/ReportModal';
import SlideCard from '@/components/shared/SlideCard';
import { type SlidePreviewPage } from '@/components/shared/ImageSlideViewer';
import SlideAnalyticsPanel from '@/components/shared/SlideAnalyticsPanel';
import SlideFlashcardsPanel from '@/components/shared/SlideFlashcardsPanel';
import { analytics } from '@/lib/analytics';
import { resolveFileUrl } from '@/lib/pdfRenderer';
import { buildProfilePath, buildSlideoPath, buildSlidePath, buildTopicPath, splitIdSlug } from '@/lib/url';
import { getApiOrigin, API_BASE_URL } from '@/lib/api-origin';
import AdUnit from '@/components/shared/AdUnit';

// PDF/canvas-based viewers are client-only — skip SSR to prevent hydration mismatches (#422, #425)
const SlideViewer = dynamic(() => import('@/components/shared/SlideViewer'), { ssr: false });
const ImageSlideViewer = dynamic(
  () => import('@/components/shared/ImageSlideViewer'),
  { ssr: false }
);
const CreateSlideoModal = dynamic(() => import('@/components/slideo/CreateSlideoModal'), { ssr: false });


const logSoftError = (scope: string, err?: unknown) => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[SlideDetailPage] ${scope}`, err);
  }
};

const AVATAR_COLORS = [
  'from-indigo-500 to-violet-500', 'from-violet-500 to-purple-500',
  'from-blue-500 to-indigo-500', 'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500', 'from-amber-500 to-orange-500',
];

const BG_GRADIENTS = [
  'from-indigo-500/10 via-violet-500/5 to-transparent',
  'from-violet-500/10 via-purple-500/5 to-transparent',
  'from-blue-500/10 via-indigo-500/5 to-transparent',
  'from-emerald-500/10 via-teal-500/5 to-transparent',
  'from-rose-500/10 via-pink-500/5 to-transparent',
  'from-amber-500/10 via-orange-500/5 to-transparent',
];

const API_BASE = getApiOrigin();

function ConversionBanner({
  status,
  lastError,
  onRetry,
  retrying,
}: {
  status: string;
  lastError?: string | null;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  if (status === 'done') return null;
  if (status === 'processing' || status === 'pending') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground mb-4">
        <Loader2 className="w-4 h-4 shrink-0 animate-spin text-primary" />
        <span>Slayt PDF&apos;e dönüştürülüyor, önizleme hazırlanıyor…</span>
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="truncate">
            PDF dönüşümü başarısız.
            {lastError ? ` Son hata: ${lastError}` : ' Sunucuda LibreOffice (veya Microsoft PowerPoint) kurulu olmalı.'}
          </span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="shrink-0 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold hover:bg-red-500/10 disabled:opacity-60"
          >
            {retrying ? 'Tekrar deneniyor...' : 'Tekrar dene'}
          </button>
        )}
      </div>
    );
  }
  if (status === 'unsupported') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400 mb-4">
        <FileX className="w-4 h-4 shrink-0" />
        <span>Bu dosya formatı için önizleme desteklenmiyor.</span>
      </div>
    );
  }
  return null;
}


// ?? Collection modal ??????????????????????????????????????????????????????????

function AddToCollectionModal({
  slideId,
  onClose,
}: {
  slideId: number;
  onClose: () => void;
}) {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());

  useEffect(() => {
    api.get('/collections/me').then(({ data }) => {
      setCollections(data);
      // Pre-check which collections already contain this slide
      const inCollections = new Set<number>(
        data.filter((c: any) => c.slides?.some((s: any) => s.slideId === slideId)).map((c: any) => c.id)
      );
      setAdded(inCollections);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [slideId]);

  const toggle = async (colId: number) => {
    setBusy(colId);
    try {
      const { data } = await api.post(`/collections/${colId}/slides/${slideId}`);
      setAdded(prev => {
        const next = new Set(prev);
        data.added ? next.add(colId) : next.delete(colId);
        return next;
      });
      setCollections(prev => prev.map((col) => {
        if (col.id !== colId) return col;
        const currentSlides = Number(col?._count?.slides || 0);
        const nextSlides = Number.isInteger(data?.slidesCount)
          ? Number(data.slidesCount)
          : Math.max(0, currentSlides + (data.added ? 1 : -1));
        return { ...col, _count: { ...(col?._count || {}), slides: nextSlides } };
      }));
      toast.success(data.added ? 'Koleksiyona eklendi' : 'Koleksiyondan çıkarıldı');
    } catch {
      toast.error('İşlem başarısız');
    } finally {
      setBusy(null);
    }
  };

  const createAndAdd = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data: col } = await api.post('/collections', { name: newName.trim() });
      const { data: addRes } = await api.post(`/collections/${col.id}/slides/${slideId}`);
      const slidesCount = Number.isInteger(addRes?.slidesCount) ? Number(addRes.slidesCount) : 1;
      setCollections(prev => [{ ...col, _count: { ...(col?._count || {}), slides: slidesCount } }, ...prev]);
      setAdded(prev => new Set(Array.from(prev).concat(col.id)));
      setNewName('');
      toast.success(`"${col.name}" oluşturuldu ve slayt eklendi`);
    } catch {
      toast.error('Koleksiyon oluşturulamadı');
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        onClick={e => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <h3 className="font-extrabold text-base">Koleksiyona Ekle</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : collections.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">Henüz koleksiyonun yok</p>
          ) : (
            collections.map(col => (
              <button
                key={col.id}
                onClick={() => toggle(col.id)}
                disabled={busy === col.id}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{col.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {Number.isFinite(col?._count?.slides) ? Number(col._count.slides) : Array.isArray(col?.slides) ? col.slides.length : 0} slayt
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                  added.has(col.id) ? 'bg-primary border-primary' : 'border-border'
                }`}>
                  {added.has(col.id) && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  {busy === col.id && <Loader2 className="w-3 h-3 animate-spin" />}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  createAndAdd();
                }
              }}
              placeholder="Yeni koleksiyon adı…"
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
            />
            <button
              onClick={createAndAdd}
              disabled={creating || !newName.trim()}
              className="px-3 py-2 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ?? Embed modal ???????????????????????????????????????????????????????????????

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

function EmbedModal({ slideId, onClose }: { slideId: number; onClose: () => void }) {
  const embedCode = `<iframe src="${SITE_URL}/embed/slides/${slideId}" width="640" height="420" style="border:none;border-radius:12px" allowfullscreen></iframe>`;
  // Use SITE_URL as SSR placeholder; update to window.location.origin after mount to avoid hydration mismatch
  const [previewOrigin, setPreviewOrigin] = useState(SITE_URL);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPreviewOrigin(window.location.origin);
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        onClick={e => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            <h3 className="font-extrabold text-base">Gömme Kodu</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-xs text-muted-foreground mb-3">Bu kodu blog, site veya Notion sayfana yapıştır:</p>
          <div className="relative">
            <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
              {embedCode}
            </pre>
            <button
              onClick={copy}
              className={`absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                copied ? 'bg-emerald-500 text-white' : 'bg-background border border-border hover:bg-muted'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Kopyalandı!' : 'Kopyala'}
            </button>
          </div>
          <div className="mt-4 rounded-xl overflow-hidden border border-border" style={{ height: 200 }}>
            <iframe
              src={`${previewOrigin}/embed/slides/${slideId}`}
              className="w-full h-full border-none"
              title="Embed önizleme"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">Canlı önizleme</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PostUploadSlideoPrompt({
  onClose,
  onConfirm,
  disabled,
}: {
  onClose: () => void;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-extrabold mb-2">Slideo olarak da paylaşmak ister misin?</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Slaytını 3-7 sayfalık kısa formatta yayınlayıp daha fazla kişiye ulaşabilirsin.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-muted transition"
          >
            Daha sonra
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
          >
            Evet, oluştur
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DeleteSlideModal({
  onClose,
  onConfirm,
  deleting,
}: {
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-extrabold mb-2 text-red-500">Slayt silinsin mi?</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Bu işlem geri alınamaz. Slayt ve ilişkili Slideo içerikleri kaldırılır.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-muted transition disabled:opacity-60"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 rounded-xl bg-red-500 text-white py-2.5 text-sm font-semibold hover:bg-red-600 transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            Slaytı sil
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ?? Related section ???????????????????????????????????????????????????????????

function RelatedSection({ slides, title }: { slides: any[]; title: string }) {
  if (!slides || slides.length === 0) return null;
  return (
    <section className="mt-2">
      <h3 className="text-[15px] font-extrabold mb-3">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {slides.map(slide => <SlideCard key={slide.id} slide={slide} />)}
      </div>
    </section>
  );
}

// ?? Main page ?????????????????????????????????????????????????????????????????

export default function SlideDetailPage() {
  const params = useParams();
  const rawParam = String((params as Record<string, string>)?.id || (params as Record<string, string>)?.slug || '');
  const { id: parsedId, slug: parsedSlug } = splitIdSlug(rawParam);
  const id = parsedId || Number(rawParam) || 0;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [slide, setSlide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const hasInitialDataRef = useRef(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showSlideoModal, setShowSlideoModal] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [sessionId, setSessionId] = useState('');
  const [related, setRelated] = useState<any>(null);
  const [slideos, setSlideos] = useState<any[]>([]);
  const [flashcardSets, setFlashcardSets] = useState<any[]>([]);
  const [autoSlideoHandled, setAutoSlideoHandled] = useState(false);
  const [showPostUploadPrompt, setShowPostUploadPrompt] = useState(false);
  const [openSlideoWhenReady, setOpenSlideoWhenReady] = useState(false);
  const [showDeleteSlideModal, setShowDeleteSlideModal] = useState(false);
  const [deletingSlide, setDeletingSlide] = useState(false);
  const [retryingConversion, setRetryingConversion] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [coverSaving, setCoverSaving] = useState(false);
  const [previewMeta, setPreviewMeta] = useState<{
    previewMode: 'images' | 'pdf';
    previewStatus: string;  // none | processing | ready | failed
    pages: SlidePreviewPage[];
    pageCount: number;      // available pages (may be < totalPages while processing)
  } | null>(null);
  const viewerWrapRef = useRef<HTMLDivElement | null>(null);
  const userId = user?.id ? Number(user.id) : null;
  const isSlideOwner = Boolean(
    user &&
    slide?.user &&
    (Number(user.id) === Number(slide.user.id) || user.username === slide.user.username)
  );

  const navigateSafely = useCallback((path: string) => {
    try {
      router.push(path);
      setTimeout(() => {
        if (typeof window === 'undefined') return;
        const expectedPath = path.split('?')[0];
        if (window.location.pathname !== expectedPath) {
          window.location.assign(path);
        }
      }, 1200);
    } catch {
      if (typeof window !== 'undefined') {
        window.location.assign(path);
      }
    }
  }, [router]);

  useEffect(() => {
    if (!slide || !Number.isInteger(id) || id <= 0) return;
    // /slides/ is canonical. Fix the slug portion if it's wrong or missing
    // (e.g. bare /slides/234 → /slides/234-guncel-cv), but never redirect
    // away from /slides/ itself.
    const expectedSlug = String(slide?.slug || '').toLowerCase();
    const onSlides = pathname.startsWith('/slides/');
    const shouldFixSlug = onSlides && expectedSlug && parsedSlug !== expectedSlug;
    if (!shouldFixSlug) return;
    const canonical = buildSlidePath({ id, slug: expectedSlug });
    const query = searchParams.toString();
    const nextUrl = query ? `${canonical}?${query}` : canonical;

    // Avoid fragile RSC transition fetches for canonical URL correction.
    // This keeps the current page mounted and only rewrites the URL bar.
    if (typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', nextUrl);
      return;
    }

    router.replace(nextUrl);
  }, [slide, id, parsedSlug, pathname, searchParams, router]);

  useEffect(() => {
    const key = `slide:view:session:${id}`;
    const existing = sessionStorage.getItem(key);
    if (existing) {
      setSessionId(existing);
      return;
    }
    const created = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, created);
    setSessionId(created);
  }, [id]);

  const load = useCallback(async () => {
    if (!sessionId) return;
    // Don't show loading spinner if we already have SSR initial data
    if (!hasInitialDataRef.current) setLoading(true);
    hasInitialDataRef.current = false;
    try {
      const { data } = await api.get(`/slides/${id}`);
      setSlide(data);
      setLoading(false);
      api
        .post(`/slides/${id}/view`, {}, sessionId ? { headers: { 'X-View-Session': sessionId } } : undefined)
        .catch((err) => logSoftError('view tracking failed', err));
      analytics.viewContent({ content_type: 'slide', content_id: Number(id), title: data.title });
    } catch {
      setSlide(null);
      setLoading(false);
    }
  }, [id, sessionId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!slide?.isSponsored) return;
    const viewKey = `sponsored:slide:view:${slide.id}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(viewKey)) return;
    analytics.sponsoredView({
      content_type: 'slide',
      content_id: Number(slide.id),
      sponsor_name: String(slide.sponsorName || ''),
      campaign_id: String(slide.sponsorCampaignId || ''),
    });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(viewKey, '1');
    }
  }, [slide?.id, slide?.isSponsored, slide?.sponsorName, slide?.sponsorCampaignId]);

  useEffect(() => {
    if (!userId || !id) return;
    let cancelled = false;
    Promise.allSettled([api.get('/likes/me'), api.get('/saves/me')]).then(([likes, saves]) => {
      if (cancelled) return;
      const likedSlides = likes.status === 'fulfilled' && Array.isArray(likes.value?.data?.slides)
        ? likes.value.data.slides
        : [];
      const savedSlides = saves.status === 'fulfilled' && Array.isArray(saves.value?.data)
        ? saves.value.data
        : [];
      setLiked(likedSlides.includes(Number(id)));
      setSaved(savedSlides.some((s: any) => Number(s?.id) === Number(id)));
    });
    return () => { cancelled = true; };
  }, [userId, id]);

  // Load related slides
  useEffect(() => {
    if (!id) return;
    api
      .get(`/slides/${id}/related`)
      .then(({ data }) => setRelated(data))
      .catch((err) => {
        logSoftError('related slides fetch failed', err);
        setRelated(null);
      });
    api.get(`/slideo/by-slide/${id}`).then(({ data }) => setSlideos(data)).catch(() => {});
  }, [id]);

  const loadFlashcards = useCallback(async () => {
    if (!id) return;
    try {
      const slideOwnerId = slide?.user?.id ? Number(slide.user.id) : null;
      const endpoint =
        userId && slideOwnerId === userId
          ? `/flashcards/mine/slide/${id}`
          : `/flashcards/slide/${id}`;
      const { data } = await api.get(endpoint);
      setFlashcardSets(Array.isArray(data) ? data : []);
    } catch {
      setFlashcardSets([]);
    }
  }, [id, slide?.user?.id, userId]);

  useEffect(() => {
    loadFlashcards();
  }, [loadFlashcards]);

  const clearFlowQueryFlags = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('fromUpload');
    next.delete('openSlideo');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (autoSlideoHandled) return;
    if (!user) return;
    if (!slide) return;
    const ownerById = Number(user.id) === Number(slide.user?.id);
    const ownerByUsername = Boolean(user.username && slide.user?.username && user.username === slide.user.username);
    const isOwner = ownerById || ownerByUsername || user.isAdmin;
    const openSlideo = searchParams.get('openSlideo') === '1';
    const fromUpload = searchParams.get('fromUpload') === '1';
    const promptKey = `slideo:prompt:${id}`;
    const fromSession = typeof window !== 'undefined' && sessionStorage.getItem(promptKey) === '1';
    if (!openSlideo && !fromUpload && !fromSession) return;
    if (!isOwner) return;

    if (openSlideo) {
      if (slide.conversionStatus === 'done' && slide.pdfUrl) {
        setShowSlideoModal(true);
      } else {
        setOpenSlideoWhenReady(true);
        toast('Dönüşüm biter bitmez Slideo penceresi açılacak');
      }
    } else {
      setShowPostUploadPrompt(true);
    }

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(promptKey);
    }
    clearFlowQueryFlags();
    setAutoSlideoHandled(true);
  }, [autoSlideoHandled, user, slide, searchParams, clearFlowQueryFlags, id]);

  useEffect(() => {
    if (!openSlideoWhenReady) return;
    if (!slide) return;
    if (slide.conversionStatus !== 'done' || !slide.pdfUrl) return;
    setShowSlideoModal(true);
    setOpenSlideoWhenReady(false);
  }, [openSlideoWhenReady, slide]);

  useEffect(() => {
    if (!slide || !isSlideOwner) return;
    const fromUpload = searchParams.get('fromUpload') === '1';
    if (!fromUpload) return;
    if (slide.conversionStatus !== 'done' || !slide.pdfUrl) return;
    toast('İstediğin sayfaya gel ve "Sayfa X kapak yap" ile kapak fotoğrafını seç.');
  }, [slide, isSlideOwner, searchParams]);

  // ── Auto-generate cover thumbnail ─────────────────────────────────────────
  // When the slide owner views a slide that has no thumbnail yet, automatically
  // capture page-1 and save it via PATCH /slides/:id/thumbnail.
  // Works with both ImageSlideViewer (uses img src) and SlideViewer (uses canvas).
  // This is a silent, best-effort background action — no toast, no blocking UI.
  const autoThumbDoneRef = useRef(false);
  useEffect(() => {
    if (!isSlideOwner) return;
    if (!slide || slide.thumbnailUrl) return;             // already has one
    if (slide.conversionStatus !== 'done' || !slide.pdfUrl) return;
    if (autoThumbDoneRef.current) return;

    const t = setTimeout(async () => {
      if (autoThumbDoneRef.current) return;
      try {
        let imageDataUrl = '';

        // Prefer ImageSlideViewer page-1 — load via same-origin proxy so canvas
        // drawImage() never taints the canvas (avoids direct browser→R2 CORS).
        const page1 = previewMeta?.pages?.find((p) => p.pageNumber === 1);
        if (page1?.url) {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = `${API_BASE_URL}/slides/${id}/page-image/1`;
          });
          const targetW = Math.min(720, img.naturalWidth);
          const targetH = Math.max(1, Math.round((targetW / img.naturalWidth) * img.naturalHeight));
          const tmp = document.createElement('canvas');
          tmp.width = targetW; tmp.height = targetH;
          const ctx = tmp.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, targetW, targetH);
          imageDataUrl = tmp.toDataURL('image/jpeg', 0.78);
        } else {
          // Fallback: grab from PDF.js canvas
          const canvas = viewerWrapRef.current?.querySelector('canvas');
          if (!(canvas instanceof HTMLCanvasElement)) return;
          const srcW = canvas.width || 0;
          const srcH = canvas.height || 0;
          if (!srcW || !srcH) return;
          const targetW = Math.min(720, srcW);
          const targetH = Math.max(1, Math.round((targetW / srcW) * srcH));
          const tmp = document.createElement('canvas');
          tmp.width = targetW; tmp.height = targetH;
          const ctx = tmp.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(canvas, 0, 0, targetW, targetH);
          imageDataUrl = tmp.toDataURL('image/jpeg', 0.78);
        }

        if (!imageDataUrl) return;
        const { data } = await api.patch(`/slides/${id}/thumbnail`, { imageDataUrl, pageNumber: 1 });
        autoThumbDoneRef.current = true;
        setSlide((prev: any) => ({ ...prev, thumbnailUrl: data?.thumbnailUrl || prev?.thumbnailUrl }));
      } catch {
        // best-effort — silent failure
      }
    }, 2000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSlideOwner, slide?.thumbnailUrl, slide?.conversionStatus, slide?.pdfUrl, previewMeta?.pages]);

  // Poll conversion status
  // Use a ref to read the latest status inside the interval without making
  // conversionStatus a dep — otherwise the effect re-fires (and restarts the
  // interval) on every 4-second tick, creating a cascade of redundant requests.
  const conversionStatus = slide?.conversionStatus;
  const conversionStatusRef = useRef(conversionStatus);
  useEffect(() => { conversionStatusRef.current = conversionStatus; }, [conversionStatus]);

  useEffect(() => {
    const initial = conversionStatusRef.current;
    if (!initial) return;
    if (initial === 'done' || initial === 'failed' || initial === 'unsupported') return;
    let pollCount = 0;
    const MAX_POLLS = 60; // 60 × 4 s = 4 minutes max
    const timer = setInterval(async () => {
      if (++pollCount > MAX_POLLS) { clearInterval(timer); return; }
      try {
        const { data } = await api.get(`/slides/${id}`);
        setSlide((prev: any) => ({ ...prev, pdfUrl: data.pdfUrl, conversionStatus: data.conversionStatus }));
        const done = data.conversionStatus !== 'pending' && data.conversionStatus !== 'processing';
        if (done) clearInterval(timer);
      } catch { clearInterval(timer); }
    }, 4000);
    return () => clearInterval(timer);
  }, [id]); // intentionally omit conversionStatus — read via ref above

  // ── Fetch preview-meta (image assets or PDF page count) ───────────────────
  useEffect(() => {
    if (slide?.conversionStatus !== 'done' || !slide?.pdfUrl) return;
    let cancelled = false;

    const fetchMeta = async () => {
      try {
        const { data } = await api.get(`/slides/${id}/preview-meta`);
        if (cancelled) return;
        setPreviewMeta({
          previewMode:   data.previewMode === 'images' ? 'images' : 'pdf',
          previewStatus: data.previewStatus || 'none',
          pages:         Array.isArray(data.pages) ? data.pages : [],
          pageCount:     Number(data.pageCount || data.totalPages || 1),
        });
      } catch {
        if (cancelled) return;
        setPreviewMeta({ previewMode: 'pdf', previewStatus: 'none', pages: [], pageCount: 1 });
      }
    };

    fetchMeta();
    return () => { cancelled = true; };
  }, [id, slide?.conversionStatus, slide?.pdfUrl]);

  // ── Poll preview-meta while preview generation is in progress ────────────
  //
  // Polling continues as long as previewStatus === 'processing'.
  // Even when images are already showing (page 1 visible), we keep polling
  // so newly completed pages are added to the viewer without a manual refresh.
  //
  // Stops when:  previewStatus === 'ready' (all pages done)
  //              previewStatus === 'failed' (permanent failure → PDF.js fallback)
  //              MAX_PREVIEW_POLLS exceeded
  useEffect(() => {
    if (!previewMeta) return;
    if (previewMeta.previewStatus === 'ready' || previewMeta.previewStatus === 'failed') return;
    if (previewMeta.previewStatus !== 'processing' && previewMeta.previewStatus !== 'none') return;
    if (slide?.conversionStatus !== 'done') return;

    // Adaptive polling: 1s for the first 20s, then 2s for next 40s, then stop.
    // Total max wait: 20 × 1s + 20 × 2s = 60s.
    let pollCount = 0;
    const FAST_POLLS  = 20;  // first 20 polls at 1s = 20 seconds
    const SLOW_POLLS  = 20;  // next 20 polls at 2s  = 40 seconds
    const MAX_POLLS   = FAST_POLLS + SLOW_POLLS;
    let currentInterval = 1000;
    let timer: ReturnType<typeof setInterval>;

    const doPoll = async () => {
      pollCount++;
      if (pollCount > MAX_POLLS) { clearInterval(timer); return; }

      try {
        const { data } = await api.get(`/slides/${id}/preview-meta`);
        const newMode   = data.previewMode === 'images' ? 'images' : 'pdf';
        const newStatus = data.previewStatus || 'none';
        const newPages  = Array.isArray(data.pages) ? data.pages : [];
        const newCount  = Number(data.pageCount || data.totalPages || 1);

        setPreviewMeta({ previewMode: newMode, previewStatus: newStatus, pages: newPages, pageCount: newCount });

        if (newStatus === 'ready' || newStatus === 'failed') {
          clearInterval(timer);
          return;
        }
      } catch { /* silent — keep polling */ }

      // Switch to slower interval after fast phase
      if (pollCount === FAST_POLLS && currentInterval === 1000) {
        clearInterval(timer);
        currentInterval = 2000;
        timer = setInterval(doPoll, currentInterval);
      }
    };

    timer = setInterval(doPoll, currentInterval);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, previewMeta?.previewStatus, slide?.conversionStatus]);

  const handleLike = async () => {
    if (!user) return toast.error('Beğenmek için giriş yapmalısın');
    if (likeBusy) return;
    setLikeBusy(true);
    try {
      const { data } = await api.post(`/likes/slide/${id}`);
      setLiked(data.liked);
      setSlide((s: any) => ({ ...s, likesCount: s.likesCount + (data.liked ? 1 : -1) }));
      if (data.liked) analytics.likeContent({ content_type: 'slide', content_id: Number(id) });
    } finally {
      setLikeBusy(false);
    }
  };

  const handleSave = async () => {
    if (!user) return toast.error('Kaydetmek için giriş yapmalısın');
    if (saveBusy) return;
    setSaveBusy(true);
    try {
      const { data } = await api.post(`/saves/slide/${id}`);
      setSaved(data.saved);
      setSlide((s: any) => ({ ...s, savesCount: s.savesCount + (data.saved ? 1 : -1) }));
      toast.success(data.saved ? 'Kaydedildi!' : 'Kaydedilenden çıkarıldı');
      if (data.saved) analytics.saveContent({ content_type: 'slide', content_id: Number(id) });
    } finally {
      setSaveBusy(false);
    }
  };

  const retryConversion = async () => {
    if (!user || !slide) return;
    if (retryingConversion) return;
    if (!isSlideOwner && !user.isAdmin) {
      toast.error('Bu işlem için slaytin sahibi veya admin olmalisin');
      return;
    }
    setRetryingConversion(true);
    try {
      await api.post(`/slides/${id}/retry-conversion`);
      setSlide((prev: any) => ({ ...prev, conversionStatus: 'pending' }));
      toast.success('Donusum yeniden kuyruga alindi');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Donusum tekrar denenemedi');
    } finally {
      setRetryingConversion(false);
    }
  };

  const trackProfileVisit = () => {
    if (!sessionId) return;
    api.post(
      `/slides/${id}/page-event`,
      { pageNumber: currentPage, eventType: 'profile_visit' },
      { headers: { 'X-View-Session': sessionId } },
    ).catch(() => {});
    localStorage.setItem('follow_source_slide_id', String(id));
    localStorage.setItem('follow_source_slide_page', String(currentPage));
  };

  const openSlideoComposer = useCallback(async () => {
    try {
      const { data } = await api.get(`/slides/${id}`);
      setSlide((prev: any) => ({
        ...prev,
        pdfUrl: data?.pdfUrl ?? prev?.pdfUrl,
        conversionStatus: data?.conversionStatus ?? prev?.conversionStatus,
      }));
      if (data?.conversionStatus === 'done' && data?.pdfUrl) {
        setShowSlideoModal(true);
        return;
      }
    } catch {
      // fallback to wait mode below
    }
    if (!openSlideoWhenReady) {
      setOpenSlideoWhenReady(true);
      toast('Dönüşüm biter bitmez Slideo penceresi açılacak');
    }
  }, [id, openSlideoWhenReady]);

  const handleCreateSlideoFromPrompt = () => {
    setShowPostUploadPrompt(false);
    openSlideoComposer();
  };

  const handleSetCoverFromCurrentPage = async () => {
    if (!slide || !isSlideOwner || !hasPdf || coverSaving) return;

    let imageDataUrl = '';

    // If ImageSlideViewer is active, capture from the <img> element of the current page
    if (previewMeta?.previewMode === 'images' && previewMeta.pages.length > 0) {
      const pageData = previewMeta.pages.find((p) => p.pageNumber === currentPage) || previewMeta.pages[0];
      try {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          // Use same-origin proxy so canvas drawImage() never taints the canvas
          img.src = `${API_BASE_URL}/slides/${id}/page-image/${currentPage}`;
        });
        const targetW = Math.min(720, img.naturalWidth);
        const targetH = Math.max(1, Math.round((targetW / img.naturalWidth) * img.naturalHeight));
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = targetW;
        thumbCanvas.height = targetH;
        const ctx = thumbCanvas.getContext('2d');
        if (!ctx) throw new Error('ctx_unavailable');
        ctx.drawImage(img, 0, 0, targetW, targetH);
        imageDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.78);
      } catch {
        toast.error('Kapak görseli oluşturulamadı. Lütfen tekrar dene.');
        return;
      }
    } else {
      // PDF.js canvas path
      const canvas = viewerWrapRef.current?.querySelector('canvas');
      if (!(canvas instanceof HTMLCanvasElement)) {
        toast.error('Sayfa görseli henüz hazır değil. Lütfen tekrar dene.');
        return;
      }
      try {
        const srcW = canvas.width || 0;
        const srcH = canvas.height || 0;
        if (!srcW || !srcH) throw new Error('empty_canvas');
        const targetW = Math.min(720, srcW);
        const targetH = Math.max(1, Math.round((targetW / srcW) * srcH));
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = targetW;
        thumbCanvas.height = targetH;
        const ctx = thumbCanvas.getContext('2d');
        if (!ctx) throw new Error('ctx_unavailable');
        ctx.drawImage(canvas, 0, 0, targetW, targetH);
        imageDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.78);
      } catch {
        toast.error('Kapak görseli oluşturulamadı. Lütfen tekrar dene.');
        return;
      }
    }

    setCoverSaving(true);
    try {
      const { data } = await api.patch(`/slides/${id}/thumbnail`, {
        imageDataUrl,
        pageNumber: currentPage,
      });
      setSlide((prev: any) => ({
        ...prev,
        thumbnailUrl: data?.thumbnailUrl || prev?.thumbnailUrl,
      }));
      toast.success(`Sayfa ${currentPage} kapak olarak kaydedildi.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Kapak güncellenemedi.');
    } finally {
      setCoverSaving(false);
    }
  };

  const handleDownload = async () => {
    try {
      await api.post(`/slides/${id}/download`);
    } catch {
      // Best effort metric tracking; do not block file download.
    }
  };

  const handleDeleteSlide = async () => {
    if (!slide) return;
    if (!user) return;
    if (!isSlideOwner && !user.isAdmin) {
      toast.error('Bu slaydi sadece sahibi veya admin silebilir');
      return;
    }
    setDeletingSlide(true);
    try {
      await api.delete(`/slides/${id}`);
      toast.success('Slayt silindi');
      const nextPath = slide?.topic?.id
        ? buildTopicPath({ id: slide.topic.id, slug: slide.topic.slug, title: slide.topic.title })
        : '/kesfet';
      navigateSafely(nextPath);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Slayt silinemedi');
    } finally {
      setDeletingSlide(false);
      setShowDeleteSlideModal(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="skeleton h-8 w-48 mb-6 rounded-xl" />
        <div className="skeleton aspect-video rounded-2xl mb-6" />
        <div className="skeleton h-10 w-2/3 rounded-xl mb-4" />
        <div className="skeleton h-5 w-full rounded-xl mb-2" />
        <div className="skeleton h-5 w-3/4 rounded-xl" />
      </div>
    );
  }

  if (!slide) return <div className="p-8 text-center text-muted-foreground">Slayt bulunamadı.</div>;

  const bgGradient = BG_GRADIENTS[slide.id % BG_GRADIENTS.length];
  const avatarGradient = AVATAR_COLORS[slide.user.id % AVATAR_COLORS.length];
  const hasPdf = slide.conversionStatus === 'done' && slide.pdfUrl;
  const fileExt = slide.fileUrl?.split('.').pop()?.toUpperCase() || 'PPTX';
  const canDeleteSlide = Boolean(user && (isSlideOwner || user.isAdmin));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href={slide.topic?.id
          ? buildTopicPath({ id: slide.topic.id, slug: slide.topic.slug, title: slide.topic.title })
          : '/kesfet'}
        prefetch={false}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {slide.topic?.title || 'Konuya dön'}
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

        <ConversionBanner
          status={slide.conversionStatus}
          lastError={slide?.conversionJob?.lastError}
          onRetry={slide.conversionStatus === 'failed' ? retryConversion : undefined}
          retrying={retryingConversion}
        />

        {hasPdf ? (
          <div ref={viewerWrapRef}>
            {previewMeta?.previewMode === 'images' && previewMeta.pages.length > 0 ? (
              <ImageSlideViewer
                pages={previewMeta.pages}
                totalPages={previewMeta.pageCount}
                previewStatus={previewMeta.previewStatus}
                title={slide.title}
                className="mb-6"
                onPageChange={(p) => { setCurrentPage(p); setPageCount(previewMeta.pageCount); }}
              />
            ) : (
              <SlideViewer
                pdfUrl={slide.pdfUrl}
                slideId={Number(id)}
                coverUrl={resolveFileUrl(slide.thumbnailUrl) || undefined}
                title={slide.title}
                className="mb-6"
                transitionMode="fade"
                onPageChange={setCurrentPage}
                onPageCount={setPageCount}
              />
            )}
          </div>
        ) : (
          <div className={`aspect-video bg-gradient-to-br ${bgGradient} border border-border rounded-2xl flex items-center justify-center mb-6 overflow-hidden relative`}>
            {slide.thumbnailUrl ? (
              <Image src={resolveFileUrl(slide.thumbnailUrl)!} alt={slide.title} fill className="object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-4">
                {(slide.conversionStatus === 'pending' || slide.conversionStatus === 'processing') ? (
                  <Loader2 className="w-12 h-12 text-primary/30 animate-spin" />
                ) : (
                  <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/10">
                    <Presentation className="w-10 h-10 text-primary/40" />
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm font-bold text-muted-foreground">
                    {(slide.conversionStatus === 'pending' || slide.conversionStatus === 'processing')
                      ? 'Önizleme hazırlanıyor…'
                      : 'Slayt Önizlemesi'}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">.{fileExt.toLowerCase()} formatında</p>
                </div>
              </div>
            )}
            {!user && (
              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md rounded-xl px-3 py-2 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-white" />
                <span className="text-xs text-white font-semibold">İndirmek için üye ol</span>
              </div>
            )}
          </div>
        )}

        {/* Info card */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-card">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-extrabold mb-2 leading-tight tracking-tight">{slide.title}</h1>
              {slide.description && (
                <p className="text-muted-foreground leading-relaxed text-[15px]">{slide.description}</p>
              )}
              {slide.isSponsored && (
                <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                  <p className="font-bold">Sponsorlu Icerik</p>
                  <p>{slide.sponsorDisclosure || 'Bu icerik sponsorlu is birligi kapsaminda yayinlanmistir.'}</p>
                  {slide.sponsorName && (
                    <p className="mt-1">
                      Sponsor: <span className="font-semibold">{slide.sponsorName}</span>
                      {slide.sponsorUrl && (
                        <>
                          {' '}·{' '}
                          <a
                            href={slide.sponsorUrl}
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            className="underline"
                            onClick={() =>
                              analytics.sponsoredClick({
                                content_type: 'slide',
                                content_id: Number(slide.id),
                                sponsor_name: String(slide.sponsorName || ''),
                                campaign_id: String(slide.sponsorCampaignId || ''),
                              })
                            }
                          >
                            Sponsor Linki
                          </a>
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={handleLike}
                disabled={likeBusy}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all ${
                  liked
                    ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/15'
                    : 'border-border hover:bg-muted hover:border-primary/30'
                } disabled:opacity-60`}
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                {slide.likesCount}
              </button>
              <button
                onClick={handleSave}
                disabled={saveBusy}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all ${
                  saved
                    ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/15'
                    : 'border-border hover:bg-muted hover:border-primary/30'
                } disabled:opacity-60`}
              >
                <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                {slide.savesCount}
              </button>
              {user && (
                <button
                  onClick={() => setShowCollectionModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border font-bold text-sm hover:bg-muted hover:border-primary/30 transition-all"
                  title="Koleksiyona ekle"
                >
                  <FolderPlus className="w-4 h-4" />
                  Koleksiyon
                </button>
              )}
              {user && hasPdf && (
                <button
                  onClick={openSlideoComposer}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border font-bold text-sm hover:bg-muted hover:border-primary/30 transition-all"
                  title="Slideo oluştur"
                >
                  <Play className="w-4 h-4" fill="currentColor" />
                  Slideo
                </button>
              )}
              {user && hasPdf && isSlideOwner && (
                <button
                  onClick={handleSetCoverFromCurrentPage}
                  disabled={coverSaving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border font-bold text-sm hover:bg-muted hover:border-primary/30 transition-all disabled:opacity-60"
                  title="Açık sayfayı kapak olarak kaydet"
                >
                  {coverSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
                  {coverSaving ? 'Kaydediliyor...' : `Sayfa ${currentPage} kapak yap`}
                </button>
              )}
              {/* Share buttons */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(slide?.title || '')}&url=${encodeURIComponent(`${SITE_URL}${buildSlidePath({ id: slide.id, slug: slide.slug, title: slide.title })}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                title="X / Twitter'da paylaş"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.262 5.638L18.243 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${slide?.title || ''} – ${SITE_URL}${buildSlidePath({ id: slide.id, slug: slide.slug, title: slide.title })}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-green-500 hover:border-green-500/30 hover:bg-green-500/5 transition-all"
                title="WhatsApp'ta paylaş"
              >
                <Share2 className="w-4 h-4" />
              </a>
              <button
                onClick={() => setShowEmbed(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border font-bold text-sm hover:bg-muted hover:border-primary/30 transition-all"
                title="Gömme kodu al"
              >
                <Code2 className="w-4 h-4" />
                Göm
              </button>
              {user && (
                <button
                  onClick={() => setShowReport(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
                  title="Raporla"
                >
                  <Flag className="w-4 h-4" />
                </button>
              )}
              {canDeleteSlide && (
                <button
                  onClick={() => setShowDeleteSlideModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-500 font-bold text-sm hover:bg-red-500/8 transition-all"
                  title="Slayti sil"
                >
                  <Trash2 className="w-4 h-4" />
                  Sil
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-border/60 flex-wrap">
            <Link
              href={buildProfilePath(slide.user.username)}
              onClick={trackProfileVisit}
              className="flex items-center gap-2.5 hover:text-primary transition-colors group"
            >
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-xs font-bold text-white ring-2 ring-white/20 shadow-sm overflow-hidden relative`}>
                {slide.user.avatarUrl
                  ? <Image src={resolveFileUrl(slide.user.avatarUrl)!} alt={slide.user.username} fill className="object-cover" />
                  : slide.user.username.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm font-semibold">{slide.user.username}</span>
            </Link>
            <span className="text-xs text-muted-foreground flex items-center gap-1" suppressHydrationWarning>
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(slide.createdAt)}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {slide.viewsCount} görüntülenme
            </span>
            {slide.topic && (
              <Link
                href={buildTopicPath({ id: slide.topic.id, slug: slide.topic.slug, title: slide.topic.title })}
                prefetch={false}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium ml-auto"
              >
                <ExternalLink className="w-3 h-3" />
                {slide.topic.title}
              </Link>
            )}
          </div>
        </div>

        {hasPdf && sessionId && (
          <SlideAnalyticsPanel
            slideId={Number(id)}
            currentPage={currentPage}
            totalPages={Math.max(1, pageCount)}
            sessionId={sessionId}
            isOwner={Boolean(user && slide?.user?.id === user.id)}
          />
        )}

        {/* ── Mid-content ad ── highest viewability position: after viewer, before CTA.
             Desktop: leaderboard (728×90). Mobile: leaderboard-sm (320×50). */}
        <div className="mt-6 hidden sm:block">
          <AdUnit
            slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SLIDE_MID || process.env.NEXT_PUBLIC_ADSENSE_SLOT_SLIDE_DETAIL || '0000000000'}
            placement="slide_detail_mid_desktop"
            size="leaderboard"
          />
        </div>
        <div className="mt-6 sm:hidden">
          <AdUnit
            slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SLIDE_MID || process.env.NEXT_PUBLIC_ADSENSE_SLOT_SLIDE_DETAIL || '0000000000'}
            placement="slide_detail_mid_mobile"
            size="leaderboard-sm"
          />
        </div>

        <SlideFlashcardsPanel
          slideId={Number(id)}
          isOwner={Boolean(user && slide?.user?.id === user.id)}
          sets={flashcardSets}
          onRefresh={loadFlashcards}
        />

        {/* Download */}
        {user ? (
          <a
            href={`${API_BASE}${slide.fileUrl}`}
            download
            onClick={handleDownload}
            className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all shadow-button hover:shadow-button-hover hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            {fileExt === 'PDF' ? "PDF'i İndir" : `Slaytı İndir (.${fileExt.toLowerCase()})`}
          </a>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Lock className="w-5 h-5 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-bold mb-1">İndirmek için üye olman gerekiyor</p>
            <p className="text-xs text-muted-foreground mb-4">Slaytları indirmek ücretsiz – sadece kayıt ol</p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/register" className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors shadow-button">
                Ücretsiz Kayıt Ol
              </Link>
              <Link href="/login" className="px-5 py-2.5 rounded-xl border border-border font-medium text-sm hover:bg-muted transition-colors">
                Giriş Yap
              </Link>
            </div>
          </div>
        )}

        {/* Slideo'lar from this slide */}
        {slideos.length > 0 && (
          <div className="mt-8 border-t border-border pt-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Play className="w-4 h-4 text-violet-500" fill="currentColor" />
                </div>
                <div>
                  <h3 className="text-[15px] font-extrabold leading-tight">Bu slayttan Slideo&apos;lar</h3>
                  <p className="text-[11px] text-muted-foreground">Kısa keşif formatında</p>
                </div>
              </div>
              <Link href="/slideo" prefetch={false} className="text-[12px] text-muted-foreground hover:text-primary flex items-center gap-1 font-semibold transition-colors">
                Tümünü izle <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {slideos.slice(0, 8).map((s: any) => {
                const pages = Array.isArray(s.pageIndices) ? s.pageIndices : [];
                const avatarColors = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-cyan-500'];
                return (
                  <Link
                    key={s.id}
                    href={buildSlideoPath({ id: s.id, title: s.title })}
                    prefetch={false}
                    className="group rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-card transition-all overflow-hidden"
                  >
                    <div className="aspect-video bg-black/80 relative flex items-center justify-center overflow-hidden">
                      <Play className="w-8 h-8 text-white/20" fill="currentColor" />
                      {s.slide?.thumbnailUrl ? (
                        <Image src={resolveFileUrl(s.slide.thumbnailUrl)!} alt={s.title || ''} fill className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute top-1.5 right-1.5 bg-black/70 text-white/80 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        {pages.length} s
                      </span>
                    </div>
                    <div className="p-2.5">
                      <p className="text-[11px] font-bold leading-tight line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">{s.title}</p>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <div className={cn('w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] font-black text-white overflow-hidden shrink-0 relative', avatarColors[s.user.id % avatarColors.length])}>
                            {s.user.avatarUrl ? <Image src={resolveFileUrl(s.user.avatarUrl)!} alt="" fill className="object-cover" /> : s.user.username.slice(0,1).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[60px]">{s.user.username}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{s.likesCount}</span>
                          <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{s.viewsCount}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Related slides */}
        {related && (
          <div className="mt-10 space-y-8 border-t border-border pt-8">
            <RelatedSection slides={related.topicPopular} title="Bu başlıkta popüler" />
            <RelatedSection slides={related.categoryLatest} title="Aynı kategoriden" />
            <RelatedSection slides={related.newest} title="En yeni slaytlar" />
          </div>
        )}

        {/* ── Bottom ad ── after related slides; lower intent but high dwell time */}
        <div className="mt-8">
          <AdUnit
            slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SLIDE_DETAIL || '0000000000'}
            placement="slide_detail_bottom"
            size="infeed"
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {showReport && (
          <ReportModal targetType="slide" targetId={Number(id)} onClose={() => setShowReport(false)} />
        )}
        {showCollectionModal && (
          <AddToCollectionModal slideId={Number(id)} onClose={() => setShowCollectionModal(false)} />
        )}
        {showPostUploadPrompt && (
          <PostUploadSlideoPrompt
            onClose={() => setShowPostUploadPrompt(false)}
            onConfirm={handleCreateSlideoFromPrompt}
            disabled={deletingSlide}
          />
        )}
        {showSlideoModal && slide && (
          <CreateSlideoModal
            slide={slide}
            onClose={() => setShowSlideoModal(false)}
          />
        )}
        {showEmbed && (
          <EmbedModal slideId={Number(id)} onClose={() => setShowEmbed(false)} />
        )}
        {showDeleteSlideModal && (
          <DeleteSlideModal
            onClose={() => setShowDeleteSlideModal(false)}
            onConfirm={handleDeleteSlide}
            deleting={deletingSlide}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
