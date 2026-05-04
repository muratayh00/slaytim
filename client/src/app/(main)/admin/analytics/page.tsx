'use client';

/**
 * Admin Analytics Control Tower — /admin/analytics
 *
 * Sections:
 *  1. Realtime KPI row      (SSE, refreshes every 5 s)
 *  2. Traffic Overview      (24h / 7d / 30d Recharts AreaChart)
 *  3. Slideo Metrics        (completions, saves, like rate, top 10)
 *  4. Content Intelligence  (top slides, top topics, zero-view uploads)
 *  5. Search Intelligence   (top queries, zero-result queries)
 *  6. Conversion Funnel     (visit → signup → upload → save)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList,
} from 'recharts';
import {
  Activity, Users, Upload, Play, Search, BarChart2,
  TrendingUp, ArrowLeft, AlertCircle, Zap, Eye, Heart,
  Bookmark, ChevronRight, RefreshCw, FileText, Layers,
  Globe, ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { getApiBaseUrl } from '@/lib/api-origin';

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */
type Realtime = {
  activeNow: number; last30m: number;
  pageviewsToday: number; signupsToday: number;
  uploadsToday: number; slideoViewsToday: number;
  searchesToday: number; activeSlideoViewers: number;
  topPages: { path: string; count: number }[];
  source: string; ts: number;
};

type Overview = {
  users: { total: number; today: number; week: number; month: number };
  content: {
    slides: { total: number; today: number; week: number };
    topics: { total: number; week: number };
  };
  engagement: {
    slideoViewsWeek: number; slideoCompletionsWeek: number;
    completionRatePct: number; savesWeek: number; likesWeek: number;
  };
  moderation: { pendingReports: number };
};

type TrafficPoint = { ts?: string; date?: string; count?: number; signups?: number; uploads?: number };
type SlideoMetrics = {
  days: number;
  totals: { views: number; completions: number; saves: number; likes: number;
            completionRatePct: number; saveRatePct: number; likeRatePct: number };
  topSlideos: { id: number; title: string; author?: string; views: number; likes: number; saves: number; completions: number }[];
};
type SearchData = {
  topQueries: { query: string; count: number }[];
  zeroResultQueries: { query: string; count: number }[];
  totalSearches: number; uniqueQueries: number; note?: string;
};
type FunnelData = {
  steps: { label: string; value: number; pct: number }[];
};
type ContentData = {
  topSlides: { id: number; title: string; slug?: string; viewsCount: number; likesCount: number; savesCount: number; user?: { username: string }; topic?: { title: string } }[];
  topTopics: { id: number; title: string; slug?: string; viewsCount: number; likesCount: number; category?: { name: string } }[];
  zeroViewUploads: { id: number; title: string; slug?: string; createdAt: string; user?: { username: string } }[];
};

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */
const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

function KpiCard({
  icon, label, value, sub, accent = false,
}: { icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 flex items-start gap-3 transition-all
      ${accent ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
        ${accent ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-xl font-black tracking-tight mt-0.5 ${accent ? 'text-primary' : 'text-foreground'}`}>
          {typeof value === 'number' ? fmt(value) : value}
        </p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="font-bold text-base leading-tight">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-xl animate-pulse bg-muted ${className}`} />;
}

/* ─────────────────────────────────────────────
   Main Page
   ───────────────────────────────────────────── */
export default function AdminAnalyticsPage() {
  const { user } = useAuthStore();
  const router   = useRouter();

  // Auth guard
  useEffect(() => {
    if (user && !user.isAdmin) router.replace('/');
  }, [user, router]);

  /* State */
  const [rt,       setRt]       = useState<Realtime | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [traffic,  setTraffic]  = useState<{ range: string; points: TrafficPoint[] } | null>(null);
  const [trafficRange, setTrafficRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [slideo,   setSlideo]   = useState<SlideoMetrics | null>(null);
  const [search,   setSearch]   = useState<SearchData | null>(null);
  const [funnel,   setFunnel]   = useState<FunnelData | null>(null);
  const [content,  setContent]  = useState<ContentData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const sseRef            = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const failCountRef      = useRef(0);
  const mountedRef        = useRef(false);

  /* ── SSE connection with single-timer reconnect + polling fallback ─── */
  const connectSSE = useCallback(() => {
    if (!mountedRef.current) return;

    // Clear any existing reconnect timer before opening a new connection
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (sseRef.current) {
      sseRef.current.onmessage = null;
      sseRef.current.onerror   = null;
      sseRef.current.close();
      sseRef.current = null;
    }

    const BASE = getApiBaseUrl();
    const es = new EventSource(`${BASE}/admin/analytics/realtime`, { withCredentials: true });

    es.onmessage = (e) => {
      failCountRef.current = 0; // reset on successful message
      try { setRt(JSON.parse(e.data)); } catch {}
    };

    es.onerror = () => {
      // Null out handlers immediately so this closure never fires again
      es.onmessage = null;
      es.onerror   = null;
      es.close();
      sseRef.current = null;

      if (!mountedRef.current) return;

      failCountRef.current += 1;

      // After 3 consecutive failures switch to silent REST polling
      if (failCountRef.current >= 3) {
        if (pollTimerRef.current === null) {
          pollTimerRef.current = setInterval(async () => {
            if (!mountedRef.current) return;
            try {
              const BASE2 = getApiBaseUrl();
              const res = await fetch(`${BASE2}/admin/analytics/realtime-snapshot`, {
                credentials: 'include',
              });
              if (res.ok) {
                const data = await res.json();
                setRt(data);
              }
            } catch {
              // silent — no console spam
            }
          }, 10_000);
        }
        return; // don't schedule another SSE reconnect
      }

      // Schedule exactly one reconnect attempt
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connectSSE();
      }, 10_000);
    };

    sseRef.current = es;
  }, []);

  useEffect(() => {
    if (!user?.isAdmin) return;
    mountedRef.current = true;
    failCountRef.current = 0;
    connectSSE();
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (pollTimerRef.current !== null) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (sseRef.current) {
        sseRef.current.onmessage = null;
        sseRef.current.onerror   = null;
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [user, connectSSE]);

  /* ── REST data fetch ─── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, sl, sr, fn, ct] = await Promise.allSettled([
        api.get('/admin/analytics/overview'),
        api.get('/admin/analytics/slideo?days=7'),
        api.get('/admin/analytics/search?days=7'),
        api.get('/admin/analytics/funnel?days=30'),
        api.get('/admin/analytics/content?days=7'),
      ]);
      if (ov.status === 'fulfilled') setOverview(ov.value.data);
      if (sl.status === 'fulfilled') setSlideo(sl.value.data);
      if (sr.status === 'fulfilled') setSearch(sr.value.data);
      if (fn.status === 'fulfilled') setFunnel(fn.value.data);
      if (ct.status === 'fulfilled') setContent(ct.value.data);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTraffic = useCallback(async (range: '24h' | '7d' | '30d') => {
    try {
      const { data } = await api.get(`/admin/analytics/traffic?range=${range}`);
      setTraffic(data);
    } catch {}
  }, []);

  useEffect(() => {
    if (!user?.isAdmin) return;
    fetchAll();
  }, [user, fetchAll]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    fetchTraffic(trafficRange);
  }, [trafficRange, user, fetchTraffic]);

  // Auto-refresh REST data every 5 min
  useEffect(() => {
    const t = setInterval(() => { if (user?.isAdmin) { fetchAll(); fetchTraffic(trafficRange); } }, 300_000);
    return () => clearInterval(t);
  }, [user, fetchAll, fetchTraffic, trafficRange]);

  if (!user?.isAdmin) return null;

  const rtColor = rt?.source === 'redis' ? 'text-emerald-500' : 'text-amber-500';

  /* ── Render ─── */
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              Analytics Control Tower
            </h1>
            <p className="text-xs text-muted-foreground">
              Son güncelleme: {lastRefresh.toLocaleTimeString('tr-TR')}
              {rt && (
                <span className={`ml-2 ${rtColor}`}>
                  ● {rt.source === 'redis' ? 'Realtime' : 'DB fallback'}
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => { fetchAll(); fetchTraffic(trafficRange); }}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {/* ── 1. REALTIME KPI ROW ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-xs font-bold text-primary uppercase tracking-wide">Canlı — her 5 saniyede güncellenir</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <KpiCard accent icon={<Users className="w-4 h-4" />}  label="Şu an aktif" value={rt?.activeNow ?? '—'} sub="son 60 sn" />
          <KpiCard accent icon={<TrendingUp className="w-4 h-4" />} label="Son 30 dk" value={rt?.last30m ?? '—'} />
          <KpiCard icon={<Globe className="w-4 h-4" />}    label="Bugün görüntüleme" value={rt?.pageviewsToday ?? overview?.users.today ?? '—'} />
          <KpiCard icon={<Users className="w-4 h-4" />}    label="Bugün kayıt" value={rt?.signupsToday ?? overview?.users.today ?? '—'} />
          <KpiCard icon={<Upload className="w-4 h-4" />}   label="Bugün yükleme" value={rt?.uploadsToday ?? overview?.content.slides.today ?? '—'} />
          <KpiCard icon={<Play className="w-4 h-4" />}     label="Slideo izleme" value={rt?.slideoViewsToday ?? '—'} sub="bugün" />
          <KpiCard icon={<Activity className="w-4 h-4" />} label="Aktif slideo" value={rt?.activeSlideoViewers ?? '—'} sub="şu an" />
          <KpiCard icon={<Search className="w-4 h-4" />}   label="Arama" value={rt?.searchesToday ?? '—'} sub="bugün" />
        </div>
        {rt?.topPages && rt.topPages.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {rt.topPages.map(p => (
              <span key={p.path} className="text-[11px] bg-muted px-2.5 py-1 rounded-lg font-mono text-muted-foreground">
                {p.path} <strong className="text-foreground ml-1">{p.count}</strong>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ── OVERVIEW CARDS ── */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard icon={<Users className="w-4 h-4" />}     label="Toplam Kullanıcı"  value={overview.users.total}    sub={`+${fmt(overview.users.week)} bu hafta`} />
          <KpiCard icon={<FileText className="w-4 h-4" />}  label="Toplam Slayt"      value={overview.content.slides.total} sub={`+${fmt(overview.content.slides.week)} bu hafta`} />
          <KpiCard icon={<Layers className="w-4 h-4" />}    label="Toplam Konu"       value={overview.content.topics.total} sub={`+${fmt(overview.content.topics.week)} bu hafta`} />
          <KpiCard icon={<Play className="w-4 h-4" />}      label="Slideo Tamamlama"  value={`%${overview.engagement.completionRatePct}`} sub="7 günlük oran" />
          <KpiCard icon={<Bookmark className="w-4 h-4" />}  label="Kaydetme (7g)"     value={overview.engagement.savesWeek} />
          {overview.moderation.pendingReports > 0
            ? <KpiCard accent icon={<ShieldAlert className="w-4 h-4" />} label="Bekleyen Rapor" value={overview.moderation.pendingReports} sub="⚠ inceleme gerekli" />
            : <KpiCard icon={<ShieldAlert className="w-4 h-4" />}        label="Bekleyen Rapor" value={0} sub="temiz" />
          }
        </div>
      )}

      {/* ── 2. TRAFFIC CHART ── */}
      <section className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <SectionHeader icon={<TrendingUp className="w-4 h-4" />} title="Trafik Grafiği" sub="Kayıt ve yükleme trendi" />
          <div className="flex gap-1 bg-muted p-1 rounded-xl">
            {(['24h', '7d', '30d'] as const).map(r => (
              <button
                key={r}
                onClick={() => setTrafficRange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all
                  ${trafficRange === r ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        {!traffic ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            {trafficRange === '24h' ? (
              <AreaChart data={traffic.points}>
                <defs>
                  <linearGradient id="gPv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="ts" tick={{ fontSize: 10 }} tickFormatter={v => v?.slice(11, 16) ?? ''} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={(v: any) => [v, 'Görüntüleme']} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#gPv)" strokeWidth={2} dot={false} />
              </AreaChart>
            ) : (
              <AreaChart data={traffic.points}>
                <defs>
                  <linearGradient id="gSu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gUl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v?.slice(5) ?? ''} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 12 }} />
                <Area type="monotone" dataKey="signups" name="Kayıt"    stroke="hsl(var(--primary))" fill="url(#gSu)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="uploads" name="Yükleme"  stroke="#f97316"              fill="url(#gUl)" strokeWidth={2} dot={false} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </section>

      {/* ── 3. SLIDEO METRICS ── */}
      <section className="bg-card border border-border rounded-2xl p-5">
        <SectionHeader icon={<Play className="w-4 h-4" />} title="Slideo Metrikleri" sub="Son 7 günlük performans" />
        {!slideo ? <Skeleton className="h-32 w-full" /> : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
              <KpiCard icon={<Eye className="w-4 h-4" />}      label="Görüntüleme"  value={slideo.totals.views} />
              <KpiCard icon={<Zap className="w-4 h-4" />}      label="Tamamlama"    value={slideo.totals.completions} />
              <KpiCard accent icon={<Activity className="w-4 h-4" />} label="Tamamlama %" value={`%${slideo.totals.completionRatePct}`} />
              <KpiCard icon={<Bookmark className="w-4 h-4" />} label="Kaydetme"     value={slideo.totals.saves} />
              <KpiCard icon={<Heart className="w-4 h-4" />}    label="Beğeni"       value={slideo.totals.likes} />
              <KpiCard icon={<Bookmark className="w-4 h-4" />} label="Kaydetme %"   value={`%${slideo.totals.saveRatePct}`} />
              <KpiCard icon={<Heart className="w-4 h-4" />}    label="Beğeni %"     value={`%${slideo.totals.likeRatePct}`} />
            </div>
            {slideo.topSlideos.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/40 border-b border-border">
                    <th className="text-left px-4 py-2.5 font-semibold text-foreground">Slideo</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">İzleme</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Tamamlama</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Kaydetme</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Beğeni</th>
                  </tr></thead>
                  <tbody>
                    {slideo.topSlideos.map(s => (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5">
                          <Link href={`/slideo/${s.id}`} prefetch={false} className="font-medium hover:text-primary transition-colors line-clamp-1">{s.title}</Link>
                          <span className="text-[11px] text-muted-foreground">@{s.author}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold">{fmt(s.views)}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-600 font-semibold">{fmt(s.completions)}</td>
                        <td className="px-4 py-2.5 text-right">{fmt(s.saves)}</td>
                        <td className="px-4 py-2.5 text-right">{fmt(s.likes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── 4. CONTENT INTELLIGENCE ── */}
      <section className="bg-card border border-border rounded-2xl p-5">
        <SectionHeader icon={<FileText className="w-4 h-4" />} title="İçerik Zekası" sub="En popüler ve sıfır görüntülemeli içerikler" />
        {!content ? <Skeleton className="h-48 w-full" /> : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Top Slides */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">En Çok Görüntülenen Slaytlar</h3>
              <div className="space-y-2">
                {content.topSlides.slice(0, 8).map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2.5">
                    <span className="text-[11px] font-black text-muted-foreground/50 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <Link href={`/slides/${s.id}`} prefetch={false} className="text-xs font-semibold line-clamp-1 hover:text-primary">{s.title}</Link>
                      <p className="text-[10px] text-muted-foreground">@{s.user?.username}</p>
                    </div>
                    <span className="text-xs font-bold shrink-0 text-muted-foreground">{fmt(s.viewsCount)}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Top Topics */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">En Çok Görüntülenen Konular</h3>
              <div className="space-y-2">
                {content.topTopics.slice(0, 8).map((t, i) => (
                  <div key={t.id} className="flex items-center gap-2.5">
                    <span className="text-[11px] font-black text-muted-foreground/50 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <Link href={`/topics/${t.id}`} prefetch={false} className="text-xs font-semibold line-clamp-1 hover:text-primary">{t.title}</Link>
                      <p className="text-[10px] text-muted-foreground">{t.category?.name}</p>
                    </div>
                    <span className="text-xs font-bold shrink-0 text-muted-foreground">{fmt(t.viewsCount)}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Zero-view uploads */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-3 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Sıfır Görüntüleme (7g)
              </h3>
              {content.zeroViewUploads.length === 0
                ? <p className="text-xs text-muted-foreground">Tüm yeni yüklemeler görüntülenmiş.</p>
                : (
                  <div className="space-y-2">
                    {content.zeroViewUploads.map(s => (
                      <div key={s.id} className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <Link href={`/slides/${s.id}`} prefetch={false} className="text-xs font-semibold line-clamp-1 hover:text-primary">{s.title}</Link>
                          <p className="text-[10px] text-muted-foreground">@{s.user?.username} · {new Date(s.createdAt).toLocaleDateString('tr-TR')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}
      </section>

      {/* ── 5. SEARCH INTELLIGENCE ── */}
      <section className="bg-card border border-border rounded-2xl p-5">
        <SectionHeader icon={<Search className="w-4 h-4" />} title="Arama Zekası" sub="Kullanıcı arama davranışı" />
        {!search ? <Skeleton className="h-40 w-full" /> : search.note ? (
          <div className="text-sm text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            {search.note}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <KpiCard icon={<Search className="w-4 h-4" />}  label="Toplam Arama"    value={search.totalSearches} />
              <KpiCard icon={<BarChart2 className="w-4 h-4" />} label="Benzersiz Sorgu" value={search.uniqueQueries} />
              <KpiCard icon={<AlertCircle className="w-4 h-4" />} label="Sonuçsuz Sorgu" value={search.zeroResultQueries.length} />
              <KpiCard icon={<TrendingUp className="w-4 h-4" />}  label="En Çok Aranan" value={search.topQueries[0]?.query ?? '—'} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">En Çok Aranan</h3>
                {search.topQueries.length === 0
                  ? <p className="text-xs text-muted-foreground">Henüz veri yok.</p>
                  : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={search.topQueries.slice(0, 10)} layout="vertical" margin={{ left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="query" tick={{ fontSize: 10 }} width={100} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 12 }} />
                        <Bar dataKey="count" name="Arama" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                }
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-3 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Sonuç Bulunamayan Aramalar
                </h3>
                {search.zeroResultQueries.length === 0
                  ? <p className="text-xs text-emerald-600">Tüm aramalar sonuç döndürüyor.</p>
                  : (
                    <div className="space-y-2">
                      {search.zeroResultQueries.slice(0, 10).map((q) => (
                        <div key={q.query} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/40">
                          <span className="text-sm font-mono text-foreground truncate">{q.query}</span>
                          <span className="text-xs bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded-full font-semibold shrink-0">{q.count}×</span>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── 6. CONVERSION FUNNEL ── */}
      <section className="bg-card border border-border rounded-2xl p-5">
        <SectionHeader icon={<ChevronRight className="w-4 h-4" />} title="Dönüşüm Hunisi" sub="Son 30 günlük kullanıcı yolculuğu" />
        {!funnel ? <Skeleton className="h-40 w-full" /> : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {funnel.steps.map((step, i) => {
              const pct    = step.pct;
              const colors = ['bg-primary', 'bg-blue-500', 'bg-violet-500', 'bg-emerald-500'];
              return (
                <div key={step.label} className="bg-muted/30 rounded-2xl p-4 text-center border border-border/60">
                  <div className={`w-10 h-10 rounded-xl ${colors[i]} text-white font-black text-lg flex items-center justify-center mx-auto mb-2`}>
                    {i + 1}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">{step.label}</p>
                  <p className="text-2xl font-black text-foreground">{fmt(step.value)}</p>
                  <p className={`text-xs font-bold mt-1 ${i === 0 ? 'text-muted-foreground' : pct >= 10 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {i === 0 ? 'baz' : `%${pct}`}
                  </p>
                  {i > 0 && (
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${colors[i]} rounded-full`} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer spacer */}
      <div className="h-8" />
    </div>
  );
}
