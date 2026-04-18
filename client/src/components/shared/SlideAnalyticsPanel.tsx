'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, MessageCircle, Send } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { pushTelemetryEvent, pushSessionSnapshot, flushTelemetry } from '@/lib/telemetryBuffer';

type PageStat = {
  pageNumber: number;
  viewCount: number;
  uniqueViewCount: number;
  totalReadMs: number;
  likeCount: number;
  saveCount: number;
  shareCount: number;
  confusedCount: number;
  summaryCount: number;
  examCount: number;
  emojiCount: number;
  commentCount: number;
  dropCount: number;
};

type SlideComment = {
  id: number;
  pageNumber?: number | null;
  content: string;
  createdAt: string;
  user: { id: number; username: string };
};

const reactionButtons = [
  { key: 'confused', label: 'Burayı anlamadım' },
  { key: 'summary', label: 'Çok iyi özet' },
  { key: 'exam', label: 'Sınavlık' },
] as const;

export default function SlideAnalyticsPanel({
  slideId,
  currentPage,
  totalPages,
  sessionId,
  isOwner,
}: {
  slideId: number;
  currentPage: number;
  totalPages: number;
  sessionId: string;
  isOwner: boolean;
}) {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<PageStat[]>([]);
  const [comments, setComments] = useState<SlideComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const enterAtRef = useRef<number>(Date.now());
  const prevPageRef = useRef<number>(currentPage);
  const pagesViewedRef = useRef<Set<number>>(new Set([currentPage]));
  const maxScrollRef = useRef<number>(0);
  const interactionsRef = useRef<{ likeClicked: boolean; saveClicked: boolean; shareClicked: boolean }>({
    likeClicked: false,
    saveClicked: false,
    shareClicked: false,
  });

  const currentStat = useMemo(
    () => stats.find((s) => s.pageNumber === currentPage) || null,
    [stats, currentPage],
  );

  const reloadStats = useCallback(async () => {
    try {
      const { data } = await api.get(`/slides/${slideId}/page-stats`);
      setStats(Array.isArray(data?.pages) ? data.pages : []);
    } catch {
      // best effort
    }
  }, [slideId]);

  const reloadComments = useCallback(async () => {
    try {
      const { data } = await api.get(`/slides/${slideId}/comments?pageNumber=${currentPage}`);
      setComments(Array.isArray(data) ? data : []);
    } catch {
      // best effort
    }
  }, [slideId, currentPage]);

  useEffect(() => {
    reloadStats();
  }, [reloadStats]);

  useEffect(() => {
    reloadComments();
  }, [reloadComments]);

  useEffect(() => {
    const now = Date.now();
    const prevPage = prevPageRef.current;
    const readMs = Math.max(0, now - enterAtRef.current);

    pushTelemetryEvent('slide_page_view', sessionId, {
      slideId,
      pageNumber: prevPage,
      readMs,
      completed: prevPage >= totalPages,
    });

    pagesViewedRef.current.add(currentPage);
    enterAtRef.current = now;
    prevPageRef.current = currentPage;
  }, [currentPage, slideId, sessionId, totalPages]);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollTop = Math.max(doc.scrollTop, body.scrollTop);
      const scrollHeight = Math.max(doc.scrollHeight, body.scrollHeight);
      const clientHeight = doc.clientHeight || window.innerHeight || 1;
      const denom = Math.max(1, scrollHeight - clientHeight);
      const pct = Math.max(0, Math.min(100, Math.round((scrollTop / denom) * 100)));
      if (pct > maxScrollRef.current) maxScrollRef.current = pct;
    };

    const onLeave = () => {
      const readMs = Math.max(0, Date.now() - enterAtRef.current);

      pushTelemetryEvent('dwell', sessionId, {
        slideId,
        pageNumber: prevPageRef.current,
        readMs,
      });

      pushTelemetryEvent('session_summary', sessionId, {
        slideId,
        pagesViewed: Array.from(pagesViewedRef.current).sort((a, b) => a - b),
        maxScroll: maxScrollRef.current,
      });

      pushSessionSnapshot({
        sessionId,
        slideId,
        durationMs: readMs,
        maxScroll: maxScrollRef.current,
        pagesViewed: Array.from(pagesViewedRef.current).sort((a, b) => a - b),
        interactions: interactionsRef.current,
      }).catch(() => {});

      flushTelemetry({ forceBeacon: true }).catch(() => {});
    };

    window.addEventListener('beforeunload', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      onLeave();
      window.removeEventListener('beforeunload', onLeave);
      window.removeEventListener('scroll', onScroll);
    };
  }, [slideId, sessionId]);

  const sendReaction = async (reactionType: string, emoji?: string) => {
    try {
      if (reactionType === 'like') interactionsRef.current.likeClicked = true;
      if (reactionType === 'save') interactionsRef.current.saveClicked = true;
      if (reactionType === 'share') interactionsRef.current.shareClicked = true;

      await api.post(
        `/slides/${slideId}/page-reaction`,
        { pageNumber: currentPage, reactionType, emoji },
        { headers: { 'X-View-Session': sessionId } },
      );

      reloadStats();
    } catch {
      toast.error('Tepki kaydedilemedi');
    }
  };

  const submitComment = async () => {
    if (!user) return toast.error('Yorum için giriş yapmalısın');
    if (!commentText.trim()) return;

    try {
      const { data } = await api.post(`/slides/${slideId}/comments`, {
        pageNumber: currentPage,
        content: commentText.trim(),
      });

      setCommentText('');
      setComments((prev) => [data, ...prev]);
      reloadStats();
    } catch {
      toast.error('Yorum gönderilemedi');
    }
  };

  const maxHeat = Math.max(
    ...stats.map((s) => s.viewCount + s.saveCount * 2 + s.shareCount * 2 + s.dropCount),
    1,
  );

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">Etkileşim Isı Haritası</h3>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
          {Array.from({ length: totalPages }).map((_, idx) => {
            const page = idx + 1;
            const s = stats.find((x) => x.pageNumber === page);
            const score = (s?.viewCount || 0) + (s?.saveCount || 0) * 2 + (s?.shareCount || 0) * 2 + (s?.dropCount || 0);
            const intensity = Math.max(0.12, score / maxHeat);
            const active = page === currentPage;

            return (
              <div
                key={page}
                className={`h-7 rounded-md text-[10px] font-bold flex items-center justify-center border ${active ? 'border-primary' : 'border-border'}`}
                style={{ backgroundColor: `rgba(99, 102, 241, ${intensity})` }}
                title={`Sayfa ${page} • V:${s?.viewCount || 0} • K:${s?.saveCount || 0} • Terk:${s?.dropCount || 0}`}
              >
                {page}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold text-sm mb-3">Sayfa {currentPage} Etkileşimi</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
          <Stat label="Beğeni" value={currentStat?.likeCount || 0} />
          <Stat label="Kaydetme" value={currentStat?.saveCount || 0} />
          <Stat label="Paylaşım" value={currentStat?.shareCount || 0} />
          <Stat label="Yorum" value={currentStat?.commentCount || 0} />
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => sendReaction('like')} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted">Beğendim</button>
          <button onClick={() => sendReaction('save')} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted">Kaydettim</button>
          <button onClick={() => sendReaction('share')} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted">Paylaşırım</button>
          <button onClick={() => sendReaction('emoji', '🔥')} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted">🔥</button>
          <button onClick={() => sendReaction('emoji', '👏')} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted">👏</button>
          {reactionButtons.map((r) => (
            <button key={r.key} onClick={() => sendReaction(r.key)} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted">
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">Bu Sayfa Yorumları</h3>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Bu sayfa hakkında yorum yaz..."
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
          <button onClick={submitComment} className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-bold">
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto">
          {comments.length === 0 && <p className="text-xs text-muted-foreground">Henüz yorum yok.</p>}
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg border border-border p-2.5">
              <p className="text-xs font-semibold">@{c.user.username}</p>
              <p className="text-sm">{c.content}</p>
            </div>
          ))}
        </div>
      </div>

      {isOwner && <CreatorInsights slideId={slideId} />}
    </div>
  );
}

function CreatorInsights({ slideId }: { slideId: number }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get(`/slides/${slideId}/insights`).then(({ data: d }) => setData(d)).catch(() => {});
  }, [slideId]);

  if (!data) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="font-bold text-sm mb-3">Üretici Paneli</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <Stat label="Toplam görüntülenme" value={data.totalViews || 0} />
        <Stat label="Tekil görüntülenme" value={data.uniqueViews || 0} />
        <Stat label="Ort. okunma (sn)" value={data.averageReadSeconds || 0} />
        <Stat label="Tamamlama %" value={data.completionRate || 0} />
        <Stat label="Drop sayfası" value={data.dropPage || '-'} />
        <Stat label="Save yüksek sayfa" value={data.highSavePage || '-'} />
        <Stat label="Profil ziyareti %" value={data.profileVisitRate || 0} />
        <Stat label="Takip dönüşüm %" value={data.followConversionRate || 0} />
        <Stat label="Paylaşım oranı %" value={data.shareRate || 0} />
      </div>
      {data.bestSlideo && (
        <div className="mt-3 text-xs rounded-lg border border-border p-2.5">
          <p className="font-semibold">En iyi Slideo: {data.bestSlideo.title}</p>
          <p className="text-muted-foreground">Skor: {Math.round(data.bestSlideo.score || 0)}</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
}
