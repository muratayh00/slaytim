'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Eye, Tag, Calendar, Upload, ArrowLeft, LayoutGrid, Flag, Pin, PinOff } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { formatDate } from '@/lib/utils';
import SlideCard from '@/components/shared/SlideCard';
import { SlideCardSkeleton } from '@/components/shared/Skeleton';
import UploadSlideModal from '@/components/shared/UploadSlideModal';
import CommentSection from '@/components/shared/CommentSection';
import ReportModal from '@/components/shared/ReportModal';
import AdUnit from '@/components/shared/AdUnit';
import toast from 'react-hot-toast';
import { resolveFileUrl } from '@/lib/pdfRenderer';
import { buildCategoryPath, buildProfilePath, buildTopicPath, splitIdSlug } from '@/lib/url';

const AVATAR_COLORS = [
  'from-indigo-500 to-violet-500',
  'from-violet-500 to-purple-500',
  'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-amber-500 to-orange-500',
];

const toSlidesArray = (payload: any): any[] => {
  const candidates = [
    payload,
    payload?.slides,
    payload?.items,
    payload?.data,
    payload?.data?.slides,
    payload?.data?.items,
  ];

  const arr = candidates.find(Array.isArray);
  if (!Array.isArray(arr)) return [];

  return arr.filter((item) => item && typeof item === 'object');
};

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawParam = String((params as Record<string, string>)?.id || (params as Record<string, string>)?.slug || '');
  const topicKey = decodeURIComponent(rawParam);
  const { id: parsedId, slug: parsedSlug } = splitIdSlug(topicKey);
  const topicId = parsedId || Number(topicKey) || 0;
  const isNumericTopicKey = Number.isInteger(topicId) && topicId > 0;
  const { user } = useAuthStore();

  const [topic, setTopic] = useState<any>(null);
  const [slideItemsState, setSlideItemsState] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [sort, setSort] = useState('latest');
  const [showUpload, setShowUpload] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [pinBusyId, setPinBusyId] = useState<number | null>(null);

  const visibleSlides = useMemo(() => {
    const arr = toSlidesArray(slideItemsState);
    const pinnedId = Number(topic?.pinnedSlideId || 0);
    if (!pinnedId) return arr;
    const pinned = arr.find((s) => Number(s?.id) === pinnedId);
    if (!pinned) return arr;
    return [pinned, ...arr.filter((s) => Number(s?.id) !== pinnedId)];
  }, [slideItemsState, topic?.pinnedSlideId]);

  useEffect(() => {
    if (!topicKey) {
      setTopic(null);
      setSlideItemsState([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const topicRes = await api.get(
          isNumericTopicKey
            ? `/topics/${topicId}`
            : `/topics/slug/${encodeURIComponent(topicKey)}`
        );

        if (cancelled) return;

        const loadedTopic = topicRes?.data || null;
        const resolvedTopicId = Number(loadedTopic?.id || 0);
        const slidesRes = resolvedTopicId
          ? await api.get(`/slides/topic/${resolvedTopicId}`)
          : { data: [] };
        const loadedSlides = toSlidesArray(slidesRes?.data);

        setTopic(loadedTopic);
        setSlideItemsState(loadedSlides);
        setSubscribed(Boolean(loadedTopic?.isSubscribed));

        if (user) {
          const likes = await api.get('/likes/me');
          if (cancelled) return;
          const likedTopics = Array.isArray(likes?.data?.topics) ? likes.data.topics : [];
          setLiked(resolvedTopicId ? likedTopics.includes(resolvedTopicId) : false);
        } else {
          setLiked(false);
          setSubscribed(false);
        }
      } catch {
        if (cancelled) return;
        setTopic(null);
        setSlideItemsState([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [topicKey, topicId, isNumericTopicKey, user]);

  useEffect(() => {
    if (!topic) return;
    const canonical = buildTopicPath({ id: topic.id, slug: topic.slug, title: topic.title });
    const expectedSlug = String(topic?.slug || '').toLowerCase();
    const hasMismatch = expectedSlug && parsedSlug !== expectedSlug;
    const isLegacyPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/topics/');
    if (!hasMismatch && !isLegacyPath) return;
    router.replace(canonical);
  }, [topic, parsedSlug, router]);

  const loadSlides = async (newSort: string) => {
    const resolvedTopicId = Number(topic?.id || 0);
    if (!resolvedTopicId) return;

    setSort(newSort);
    try {
      const { data } = await api.get(`/slides/topic/${resolvedTopicId}?sort=${newSort}`);
      setSlideItemsState(toSlidesArray(data));
    } catch {
      setSlideItemsState([]);
      toast.error('Slaytlar yüklenemedi');
    }
  };

  const handleLike = async () => {
    if (!user) return toast.error('Beğenmek için giriş yapmalısın');
    const resolvedTopicId = Number(topic?.id || 0);
    if (!resolvedTopicId) return;

    const { data } = await api.post(`/likes/topic/${resolvedTopicId}`);
    setLiked(Boolean(data?.liked));
    setTopic((prev: any) => {
      if (!prev || typeof prev !== 'object') return prev;
      const currentLikes = Number(prev.likesCount || 0);
      return {
        ...prev,
        likesCount: currentLikes + (data?.liked ? 1 : -1),
      };
    });
  };

  const handleSubscribe = async () => {
    if (!user) return toast.error('Abone olmak için giriş yapmalısın');
    const resolvedTopicId = Number(topic?.id || 0);
    if (!resolvedTopicId) return;
    try {
      const { data } = await api.post(`/topics/${resolvedTopicId}/subscribe`);
      setSubscribed(Boolean(data?.subscribed));
      toast.success(data?.subscribed ? 'Yeni yüklemeler için abonelik açıldı' : 'Abonelik kapatıldı');
    } catch {
      toast.error('Abonelik işlemi başarısız');
    }
  };

  const canPinSlides = Boolean(user && topic && (Number(user.id) === Number(topic.user?.id) || user.isAdmin));
  const pinnedSlideId = Number(topic?.pinnedSlideId || 0);

  const handlePinSlide = async (slideId: number | null) => {
    if (!canPinSlides) return;
    const resolvedTopicId = Number(topic?.id || 0);
    if (!resolvedTopicId) return;
    setPinBusyId(slideId ?? -1);
    try {
      const { data } = await api.patch(`/topics/${resolvedTopicId}/pin-slide`, { slideId });
      setTopic((prev: any) => ({ ...(prev || {}), ...data }));
      toast.success(slideId ? 'Slayt konuya sabitlendi' : 'Sabitlenen slayt kaldirildi');
    } catch {
      toast.error('Sabitlenemedi');
    } finally {
      setPinBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="h-56 skeleton rounded-2xl mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SlideCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!topic || typeof topic !== 'object') {
    return <div className="p-8 text-center text-muted-foreground">Konu bulunamadi.</div>;
  }

  const topicUser = topic.user || {};
  const topicCategory = topic.category || {};
  const avatarGradient = AVATAR_COLORS[(Number(topicUser.id) || 0) % AVATAR_COLORS.length];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Ana Sayfa
      </Link>

      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-8 shadow-card">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-violet-500 to-indigo-400" />

        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Link
                  href={topicCategory.slug ? buildCategoryPath(topicCategory.slug) : '/kategori'}
                  className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-bold flex items-center gap-1.5 hover:bg-primary/20 transition-colors"
                >
                  <Tag className="w-3 h-3" />
                  {topicCategory.name || 'Kategori'}
                </Link>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {topic.createdAt ? formatDate(topic.createdAt) : '-'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 leading-tight tracking-tight">{topic.title || 'Konu'}</h1>
              {topic.description && (
                <p className="text-muted-foreground leading-relaxed text-[15px]">{topic.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {user && (
                <button
                  onClick={handleSubscribe}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all ${
                    subscribed
                      ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/15'
                      : 'border-border hover:bg-muted hover:border-primary/30'
                  }`}
                >
                  {subscribed ? 'Abone' : 'Yeni Yüklemeleri Takip Et'}
                </button>
              )}
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all ${
                  liked
                    ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/15'
                    : 'border-border hover:bg-muted hover:border-primary/30'
                }`}
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                {Number(topic.likesCount || 0)}
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
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6 pt-5 border-t border-border/60 flex-wrap">
            <Link href={topicUser.username ? buildProfilePath(topicUser.username) : '/'} className="flex items-center gap-2.5 hover:text-primary transition-colors group">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-xs font-bold text-white ring-2 ring-white/20 shadow-sm overflow-hidden`}>
                {topicUser.avatarUrl ? (
                  <img src={resolveFileUrl(topicUser.avatarUrl)} alt="" className="w-full h-full object-cover" />
                ) : (
                  String(topicUser.username || '?').slice(0, 2).toUpperCase()
                )}
              </div>
              <span className="text-sm font-semibold">{topicUser.username || 'Kullanici'}</span>
            </Link>
            <div className="flex items-center gap-3 ml-auto flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg">
                <Eye className="w-3.5 h-3.5" />
                {Number(topic.viewsCount || 0).toLocaleString()} goruntulenme
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg">
                <LayoutGrid className="w-3.5 h-3.5" />
                {visibleSlides.length} slayt
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="font-extrabold text-lg tracking-tight">Slaytlar</h2>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            {[
              { value: 'latest', label: 'Yeni' },
              { value: 'popular', label: 'Popüler' },
              { value: 'saved', label: 'Kaydedilen' },
            ].map((s) => (
              <button
                key={s.value}
                onClick={() => loadSlides(s.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sort === s.value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {user && (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all shadow-button hover:shadow-button-hover hover:-translate-y-0.5"
            >
              <Upload className="w-4 h-4" />
              Slayt Yukle
            </button>
          )}
        </div>
      </div>

      {visibleSlides.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Upload className="w-7 h-7 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-bold mb-1">Henuz slayt yok</p>
          <p className="text-sm mb-5">Bu konuya ilk slayti ekle</p>
          {user ? (
            <button
              onClick={() => setShowUpload(true)}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-button"
            >
              Slayt Yukle
            </button>
          ) : (
            <Link href="/register" className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-button">
              Kayit Ol ve Yukle
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {visibleSlides.map((slide: any, i: number) => (
            <div key={slide.id || `${i}-${slide.title || 'slide'}`} className="relative">
              {canPinSlides && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const isPinned = Number(slide?.id) === pinnedSlideId;
                    handlePinSlide(isPinned ? null : Number(slide?.id));
                  }}
                  disabled={pinBusyId !== null}
                  className={`absolute z-10 top-2 left-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold border backdrop-blur ${
                    Number(slide?.id) === pinnedSlideId
                      ? 'bg-primary text-white border-primary'
                      : 'bg-black/55 text-white border-white/20 hover:bg-black/70'
                  } disabled:opacity-60`}
                  title={Number(slide?.id) === pinnedSlideId ? 'Sabitlenmeyi kaldir' : 'Konuya sabitle'}
                >
                  {Number(slide?.id) === pinnedSlideId ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                  {Number(slide?.id) === pinnedSlideId ? 'Sabitli' : 'Sabitle'}
                </button>
              )}
              <SlideCard slide={slide} />
            </div>
          ))}
        </div>
      )}

      {/* ── Mid-content ad ── after slide grid, before comments.
           Reader already consumed the content → high purchase intent.
           Desktop: leaderboard. Mobile: leaderboard-sm. */}
      {visibleSlides.length > 0 && (
        <>
          <div className="mt-8 hidden sm:block">
            <AdUnit
              slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOPIC_MID || process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOPIC_DETAIL || '0000000000'}
              placement="topic_mid_desktop"
              size="leaderboard"
            />
          </div>
          <div className="mt-8 sm:hidden">
            <AdUnit
              slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOPIC_MID || process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOPIC_DETAIL || '0000000000'}
              placement="topic_mid_mobile"
              size="leaderboard-sm"
            />
          </div>
        </>
      )}

      <div className="mt-8">
        <CommentSection topicId={Number(topic?.id || 0)} />
      </div>

      {/* ── Bottom ad ── after comments (long-session readers) */}
      <div className="mt-6">
        <AdUnit
          slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOPIC_DETAIL || '0000000000'}
          placement="topic_bottom"
          size="infeed"
        />
      </div>

      {showUpload && (
        <UploadSlideModal
          topicId={Number(topic?.id || 0)}
          onSuccess={(slide) => setSlideItemsState((prev) => [slide, ...toSlidesArray(prev)])}
          onClose={() => setShowUpload(false)}
        />
      )}

      {showReport && (
        <ReportModal
          targetType="topic"
          targetId={Number(topic?.id || 0)}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
