'use client';

import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flag, CheckCircle, Shield, Loader2, RefreshCw,
  Trash2, VolumeX, Ban, AlertTriangle, Users, BarChart3,
  LayoutGrid, Search, ChevronLeft, ChevronRight, Eye, MessageSquare,
  FileText, Tag, Play, Heart, Bookmark, EyeOff, RotateCcw,
  TrendingUp, ClipboardList, Star, Info, Zap, Activity,
  UserCheck, ArrowUpRight, CheckCheck, XCircle, Layers, Image as ImageIcon,
  HardDrive, Clock, AlertCircle, Pencil, ChevronDown, ChevronUp, StickyNote,
  Server, Database, Cpu, Wifi, DoorOpen, Lock, MessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { buildCategoryPath, buildProfilePath, buildSlidePath, buildTopicPath } from '@/lib/url';
import { resolveMediaUrl } from '@/lib/media';

// ?? Constants ?????????????????????????????????????????????????????????????????

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam', copyright: 'Telif Hakkı', inappropriate: 'Uygunsuz',
  wrong_category: 'Yanlış Kategori', duplicate: 'Kopya',
};

const PRIORITY_CONFIG: Record<string, { label: string; cls: string }> = {
  low:      { label: 'Düşük',    cls: 'bg-slate-500/10 text-slate-500' },
  medium:   { label: 'Orta',     cls: 'bg-amber-500/10 text-amber-600' },
  high:     { label: 'Yüksek',   cls: 'bg-orange-500/10 text-orange-600' },
  critical: { label: 'Kritik',   cls: 'bg-red-500/10 text-red-600' },
};

const ROLE_CONFIG: Record<string, { label: string; cls: string }> = {
  user:        { label: 'Kullanıcı',  cls: 'bg-muted text-muted-foreground' },
  moderator:   { label: 'Moderatör',  cls: 'bg-blue-500/10 text-blue-600' },
  support:     { label: 'Destek',     cls: 'bg-cyan-500/10 text-cyan-600' },
  analytics:   { label: 'Analitik',   cls: 'bg-violet-500/10 text-violet-600' },
  operations:  { label: 'Operasyon',  cls: 'bg-emerald-500/10 text-emerald-600' },
  super_admin: { label: 'Süper Admin',cls: 'bg-primary/10 text-primary' },
};

const ACTION_LABELS: Record<string, string> = {
  ban_user: 'Kullanıcı Banlandı', unban_user: 'Ban Kaldırıldı',
  mute_user: 'Kullanıcı Susturuldu', unmute_user: 'Susturma Kaldırıldı',
  warn_user: 'Kullanıcı Uyarıldı',
  hide_content: 'İçerik Gizlendi', restore_content: 'İçerik Geri Yüklendi',
  delete_content: 'İçerik Silindi', delete_slideo: 'Slideo Silindi',
  update_role: 'Rol Güncellendi', set_report_priority: 'Rapor Önceliği Ayarlandı',
};

const ADMIN_TABS = [
  { id: 'overview',    label: 'Genel Bakış',   icon: Activity },
  { id: 'analytics',  label: 'Analitik',       icon: BarChart3 },
  { id: 'conversion', label: 'Dönüşüm',        icon: RefreshCw },
  { id: 'preview',    label: 'Preview Ops',    icon: Layers },
  { id: 'reports',    label: 'Raporlar',       icon: Flag },
  { id: 'content',    label: 'İçerik',         icon: LayoutGrid },
  { id: 'intel',      label: 'İçerik Zekası',  icon: Star },
  { id: 'users',      label: 'Kullanıcılar',   icon: Users },
  { id: 'slideos',    label: 'Slideo',          icon: Play },
  { id: 'rooms',      label: 'Odalar',          icon: DoorOpen },
  { id: 'audit',      label: 'Denetim Logu',   icon: ClipboardList },
  { id: 'sistem',     label: 'Sistem',          icon: Server },
];

// ?? Main Page ?????????????????????????????????????????????????????????????????

export default function AdminPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Bu sayfaya erişmek için giriş yapmalısın.</p>
      </div>
    );
  }

  if (!(user as any).isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Shield className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
        <h1 className="text-xl font-extrabold mb-2">Erişim Yok</h1>
        <p className="text-muted-foreground">Bu sayfa yalnızca yöneticiler için.</p>
        <p className="text-sm text-muted-foreground mt-2">Admin panele giriş URL&apos;i: <span className="font-semibold">/admin</span>. Erişim için hesabında <span className="font-semibold">isAdmin=true</span> olmalı.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Admin Paneli</h1>
          <p className="text-sm text-muted-foreground">Platform yönetimi ve moderasyon merkezi</p>
        </div>
      </div>

      <div className="mb-6 p-4 rounded-2xl border border-border bg-card/60 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">Admin panele erişim ve kullanım</p>
        <p>Giriş URL: <span className="font-semibold">/admin</span>. Bu panelde moderasyon, dönüşüm kuyruğu, içerik zekası, analitik ve denetim loglarını tek yerden yönetebilirsin.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit mb-8 flex-wrap">
        {ADMIN_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {activeTab === 'overview'    && <OverviewTab />}
          {activeTab === 'analytics'   && <AnalyticsTab />}
          {activeTab === 'conversion'  && <ConversionTab />}
          {activeTab === 'preview'     && <PreviewOpsTab />}
          {activeTab === 'reports'     && <ReportsTab />}
          {activeTab === 'content'     && <ContentTab />}
          {activeTab === 'intel'       && <ContentIntelTab />}
          {activeTab === 'users'       && <UsersTab />}
          {activeTab === 'slideos'     && <SlideoTab />}
          {activeTab === 'rooms'       && <RoomsTab />}
          {activeTab === 'audit'       && <AuditTab />}
          {activeTab === 'sistem'      && <SistemTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ?? OVERVIEW TAB ??????????????????????????????????????????????????????????????

function OverviewTab() {
  const [stats, setStats] = useState<any>(null);
  const [feedExperiment, setFeedExperiment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [statsRes, feedRes] = await Promise.all([
      api.get('/admin/stats', { timeout: 12_000 }).catch((e: any) => ({ data: null, _err: e })),
      api.get('/slideo/feed/experiment-stats?days=7', { timeout: 12_000 }).catch(() => ({ data: null })),
    ]);
    const statsData = (statsRes as any)?.data || null;
    if (!statsData) {
      const isTimeout = (statsRes as any)?._err?.code === 'ECONNABORTED';
      setError(isTimeout ? 'timeout' : 'error');
    }
    setStats(statsData);
    setFeedExperiment((feedRes as any)?.data || null);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>;
  if (!stats) return (
    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
      <h3 className="text-lg font-bold text-red-600 mb-1">
        {error === 'timeout' ? 'Zaman Aşımı' : 'Sunucu Hatası'}
      </h3>
      <p className="text-sm text-red-600/80 mb-4">
        {error === 'timeout'
          ? 'İstatistik sorgusu 12s içinde yanıt vermedi. Veritabanı meşgul olabilir.'
          : 'Veriler yüklenemedi. Backend konsolundaki hata loglarını kontrol edin.'}
      </p>
      <button
        onClick={loadData}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Tekrar Dene
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Critical Alerts */}
      {(stats.reports.critical > 0 || stats.slides.failedConversions > 0) && (
        <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-red-500" />
            <span className="text-sm font-bold text-red-600">Acil Dikkat Gerektiren</span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-semibold">
            {stats.reports.critical > 0 && (
              <span className="text-red-600">🚨 {stats.reports.critical} kritik rapor bekliyor</span>
            )}
            {stats.slides.failedConversions > 0 && (
              <span className="text-orange-600">⚠️ {stats.slides.failedConversions} dönüştürme başarısız</span>
            )}
          </div>
        </div>
      )}

      {/* User KPIs */}
      <Section title="Kullanıcılar">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Toplam"       value={stats.users.total}  color="primary" />
          <StatCard label="Bugün"        value={stats.users.today}  color="emerald" />
          <StatCard label="Bu Hafta"     value={stats.users.week}   color="blue" />
          <StatCard label="Bu Ay"        value={stats.users.month}  color="violet" />
          <StatCard label="Banlı"        value={stats.users.banned} color="red" />
          <StatCard label="Susturulmuş"  value={stats.users.muted}  color="orange" />
        </div>
      </Section>

      {/* Content KPIs */}
      <Section title="İçerik">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Toplam Konu"   value={stats.topics.total}  color="primary" />
          <StatCard label="Bugün Konu"    value={stats.topics.today}  color="emerald" />
          <StatCard label="Gizli Konu"    value={stats.topics.hidden} color="slate" />
          <StatCard label="Toplam Slayt"  value={stats.slides.total}  color="blue" />
          <StatCard label="Bugün Slayt"   value={stats.slides.today}  color="cyan" />
          <StatCard label="Gizli Slayt"   value={stats.slides.hidden} color="slate" />
          <StatCard label="Dönüştürme ✗"  value={stats.slides.failedConversions} color="red" />
          <StatCard label="Toplam Slideo" value={stats.slideos.total} color="violet" />
          <StatCard label="Bugün Slideo"  value={stats.slideos.today} color="pink" />
          <StatCard label="Toplam Yorum"  value={stats.comments.total} color="amber" />
          <StatCard label="Toplam Oda"    value={stats.rooms?.total ?? 0} color="cyan" />
          <StatCard label="Açık Oda"      value={stats.rooms?.public ?? 0} color="emerald" />
          <StatCard label="Özel Oda"      value={stats.rooms?.private ?? 0} color="slate" />
        </div>
      </Section>

      {/* Report KPIs */}
      <Section title="Raporlar">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Bekleyen"   value={stats.reports.pending}  color="amber" />
          <StatCard label="Kritik"     value={stats.reports.critical} color="red" />
          <StatCard label="Toplam"     value={stats.reports.total}    color="slate" />
        </div>
      </Section>

      {/* Top Topics */}
      <Section title="En Çok Görüntülenen Konular">
        <div className="space-y-2">
          {stats.topTopics.map((t: any, i: number) => (
            <div key={t.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              <span className="text-lg font-black text-muted-foreground/40 w-6 text-center shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <Link href={buildTopicPath({ id: t.id, slug: t.slug, title: t.title })} className="font-semibold text-sm hover:text-primary line-clamp-1">{t.title}</Link>
                <p className="text-xs text-muted-foreground">@{t.user.username}</p>
              </div>
              <div className="text-right shrink-0 text-xs">
                <p className="font-bold flex items-center gap-1 justify-end"><Eye className="w-3 h-3" />{t.viewsCount.toLocaleString()}</p>
                <p className="text-muted-foreground"><Heart className="w-3 h-3 inline" /> {t.likesCount}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Categories */}
      <Section title="Kategoriler">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.categoryStats.map((c: any) => (
            <Link key={c.id} href={buildCategoryPath(c.slug)}
              className="p-4 bg-card border border-border rounded-xl hover:border-primary/40 transition-all">
              <p className="font-black text-2xl">{c.count}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Tag className="w-3 h-3" />{c.name}
              </p>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Feed Experiment Dashboard">
        {!feedExperiment ? (
          <div className="p-4 rounded-2xl border border-border bg-card text-sm text-muted-foreground">
            Feed A/B verisi bulunamadı.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl border border-border bg-card">
              <div className="mb-2">
                <p className="text-sm font-bold">
                  {feedExperiment?.experiment || 'feed_v2_ab'} • Son {feedExperiment?.days || 7} gün
                </p>
                <p className="text-xs text-muted-foreground">
                  Varyant bazlı etkileşim kıyaslaması
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {['A', 'B'].map((variant) => {
                  const item = feedExperiment?.variants?.[variant] || {};
                  return (
                    <div key={variant} className="rounded-xl border border-border bg-background p-3">
                      <p className="text-xs font-bold text-muted-foreground mb-2">Varyant {variant}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <MiniMetric label="Impression" value={item.impression || 0} />
                        <MiniMetric label="Open" value={item.open || 0} />
                        <MiniMetric label="Save" value={item.save || 0} />
                        <MiniMetric label="Share" value={item.share || 0} />
                        <MiniMetric label="Complete" value={item.complete || 0} />
                        <MiniMetric label="Skip" value={item.skip || 0} />
                        <MiniMetric label="CTR %" value={item.ctr || 0} />
                        <MiniMetric label="Completion %" value={item.completionRate || 0} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-card">
              <p className="text-xs font-bold text-muted-foreground mb-2">Kıyas Özeti (B - A)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <MiniMetric
                  label="Open Delta"
                  value={(feedExperiment?.variants?.B?.open || 0) - (feedExperiment?.variants?.A?.open || 0)}
                />
                <MiniMetric
                  label="Save Delta"
                  value={(feedExperiment?.variants?.B?.save || 0) - (feedExperiment?.variants?.A?.save || 0)}
                />
                <MiniMetric
                  label="CTR Delta"
                  value={Number(((feedExperiment?.variants?.B?.ctr || 0) - (feedExperiment?.variants?.A?.ctr || 0)).toFixed(2))}
                />
                <MiniMetric
                  label="Completion Delta"
                  value={Number(((feedExperiment?.variants?.B?.completionRate || 0) - (feedExperiment?.variants?.A?.completionRate || 0)).toFixed(2))}
                />
              </div>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

function AnalyticsTab() {
  const [stats, setStats] = useState<any>(null);
  const [feedExperiment, setFeedExperiment] = useState<any>(null);
  const [shadow, setShadow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, feedRes, shadowRes] = await Promise.all([
        api.get('/admin/stats', { timeout: 12_000 }).catch(() => ({ data: null })),
        api.get('/slideo/feed/experiment-stats?days=7', { timeout: 12_000 }).catch(() => ({ data: null })),
        api.get('/recommendation/shadow-stats?days=7', { timeout: 12_000 }).catch(() => ({ data: null })),
      ]);
      setStats(statsRes.data || null);
      setFeedExperiment(feedRes?.data || null);
      setShadow(shadowRes?.data || null);
    } catch {
      toast.error('Analitik verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Admin Analytics</h2>
          <p className="text-sm text-muted-foreground">Canlı platform metrikleri ve öneri sistemi telemetrisi</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/analytics"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <BarChart3 className="w-4 h-4" />
            Control Tower
          </a>
          <button onClick={load} className="px-3 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted">
            Yenile
          </button>
        </div>
      </div>

      <Section title="Temel Metrikler (7g)">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Yeni Kullanıcı" value={stats?.users?.week || 0} color="emerald" />
          <StatCard label="Yeni Konu" value={stats?.topics?.today || 0} color="primary" />
          <StatCard label="Yeni Slayt" value={stats?.slides?.today || 0} color="blue" />
          <StatCard label="Yeni Slideo" value={stats?.slideos?.today || 0} color="pink" />
          <StatCard label="Bekleyen Rapor" value={stats?.reports?.pending || 0} color="amber" />
          <StatCard label="Kritik Rapor" value={stats?.reports?.critical || 0} color="red" />
        </div>
      </Section>

      <Section title="Slideo Feed Deneyi">
        {!feedExperiment ? (
          <EmptyState icon={Info} text="Feed deney verisi bulunamadı" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard label="Variant A CTR (x100)" value={Math.round(Number(feedExperiment?.variants?.A?.openRate || 0) * 100)} color="slate" />
            <StatCard label="Variant B CTR (x100)" value={Math.round(Number(feedExperiment?.variants?.B?.openRate || 0) * 100)} color="violet" />
            <StatCard label="Delta (x100)" value={Math.round(Number((feedExperiment?.variants?.B?.openRate || 0) - (feedExperiment?.variants?.A?.openRate || 0)) * 100)} color="blue" />
          </div>
        )}
      </Section>

      <Section title="Recommendation Shadow Stats">
        {!shadow ? (
          <EmptyState icon={BarChart3} text="Shadow değerlendirme verisi yok" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <StatCard label="Toplam Karşılaştırma" value={shadow?.totals?.comparisons || 0} color="primary" />
            <StatCard label="Eski Sistem Kazanç" value={shadow?.totals?.baselineWins || 0} color="slate" />
            <StatCard label="Yeni Sistem Kazanç" value={shadow?.totals?.candidateWins || 0} color="emerald" />
            <StatCard label="Tie" value={shadow?.totals?.ties || 0} color="amber" />
          </div>
        )}
      </Section>
    </div>
  );
}

function ConversionTab() {
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState({ pending: 0, processing: 0, failed: 0, done: 0, unsupported: 0 });
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [retryLimit, setRetryLimit] = useState(50);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data }, healthRes] = await Promise.all([
        api.get(`/admin/conversion-jobs?status=${status}&q=${encodeURIComponent(q)}&page=${page}`, { timeout: 10_000 }).catch(() => ({ data: null })),
        api.get('/admin/conversion-jobs/health', { timeout: 10_000 }).catch(() => ({ data: null })),
      ]);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setSummary(data?.summary || { pending: 0, processing: 0, failed: 0, done: 0, unsupported: 0 });
      setTotalPages(Math.max(1, Number(data?.pages || 1)));
      setHealth(healthRes?.data || null);
    } catch {
      toast.error('Dönüşüm kuyruğu yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [status, q, page]);

  useEffect(() => { load(); }, [load]);

  const retryOne = async (id: number) => {
    setRetryingId(id);
    try {
      await api.post(`/admin/conversion-jobs/${id}/retry`);
      toast.success('İş kuyruğa tekrar alındı');
      load();
    } catch {
      toast.error('Retry başarısız');
    } finally {
      setRetryingId(null);
    }
  };

  const retryAllFailed = async () => {
    setRetryingAll(true);
    try {
      const { data } = await api.post('/admin/conversion-jobs/retry-failed', { limit: retryLimit });
      toast.success(`${Number(data?.requeued || 0)} failed iş yeniden kuyruğa alındı`);
      load();
    } catch {
      toast.error('Toplu retry başarısız');
    } finally {
      setRetryingAll(false);
    }
  };

  const reclassifyInvalid = async () => {
    setReclassifying(true);
    try {
      const { data } = await api.post('/admin/conversion-jobs/reclassify-invalid');
      toast.success(`${Number(data?.reclassified || 0)} bozuk iş unsupported olarak işaretlendi`);
      load();
    } catch {
      toast.error('Reclassify başarısız');
    } finally {
      setReclassifying(false);
    }
  };

  const statusBadge = (s: string) => {
    if (s === 'queued') return 'bg-amber-500/10 text-amber-600';
    if (s === 'processing') return 'bg-blue-500/10 text-blue-600';
    if (s === 'failed') return 'bg-red-500/10 text-red-600';
    return 'bg-emerald-500/10 text-emerald-600';
  };

  return (
    <div className="space-y-5">
      {health && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          health.level === 'critical'
            ? 'bg-red-500/5 border-red-500/20 text-red-600'
            : health.level === 'warning'
            ? 'bg-amber-500/5 border-amber-500/20 text-amber-600'
            : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600'
        }`}>
          <div className="font-bold mb-1">Conversion Health: {String(health.level || 'ok').toUpperCase()}</div>
          <div className="text-xs opacity-90">
            queued: {health.queued} | processing: {health.processing} | failed: {health.failed} | stale: {health.staleProcessing}
          </div>
        </div>
      )}

      <Section title="Kuyruk Özeti">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Pending" value={summary.pending} color="amber" />
          <StatCard label="Processing" value={summary.processing} color="blue" />
          <StatCard label="Failed" value={summary.failed} color="red" />
          <StatCard label="Done" value={summary.done} color="emerald" />
          <StatCard label="Unsupported" value={summary.unsupported} color="slate" />
        </div>
      </Section>

      <div className="flex flex-wrap gap-2 items-center">
        {[
          { value: 'all', label: 'Tümü' },
          { value: 'pending', label: 'Pending' },
          { value: 'processing', label: 'Processing' },
          { value: 'failed', label: 'Failed' },
          { value: 'done', label: 'Done' },
          { value: 'unsupported', label: 'Unsupported' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatus(f.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              status === f.value ? 'bg-background border border-border text-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}

        <div className="flex-1 min-w-[220px] flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setQ(searchInput);
                setPage(1);
              }
            }}
            placeholder="Slayt/Konu/Kullanıcı ara"
            className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm"
          />
          <button
            onClick={() => { setQ(searchInput); setPage(1); }}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
          >
            Ara
          </button>
        </div>

        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={500}
            value={retryLimit}
            onChange={(e) => setRetryLimit(Math.max(1, Math.min(500, Number(e.target.value))))}
            className="w-16 px-2 py-2 text-xs rounded-l-xl border border-red-500/30 bg-background focus:outline-none focus:ring-1 focus:ring-red-500/30 text-center"
            title="Retry limiti"
          />
          <button
            onClick={retryAllFailed}
            disabled={retryingAll || summary.failed === 0}
            className="px-4 py-2 rounded-r-xl border border-l-0 border-red-500/30 bg-red-500/5 text-red-600 text-xs font-bold disabled:opacity-50"
          >
            {retryingAll ? 'Çalışıyor...' : 'Failed Retry All'}
          </button>
        </div>
        <button
          onClick={reclassifyInvalid}
          disabled={reclassifying || summary.unsupported === 0}
          className="px-4 py-2 rounded-xl border border-slate-500/30 bg-slate-500/5 text-slate-700 text-xs font-bold disabled:opacity-50"
        >
          {reclassifying ? 'Çalışıyor...' : 'Reclassify Invalid'}
        </button>
        <button onClick={load} className="p-2 rounded-xl border border-border hover:bg-muted">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={RefreshCw} text="Kuyrukta iş bulunamadı" />
      ) : (
        <div className="space-y-2">
          {items.map((job) => (
            <div key={job.id} className="p-4 rounded-xl border border-border bg-card flex items-center gap-3 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full font-bold ${statusBadge(job.status)}`}>{job.status}</span>
              <span className="text-xs text-muted-foreground">Job #{job.id}</span>
              <Link href={buildSlidePath({ id: job.slide?.id, slug: job.slide?.slug, title: job.slide?.title })} className="text-sm font-semibold hover:text-primary">
                {job.slide?.title || `Slide #${job.slideId}`}
              </Link>
              <span className="text-xs text-muted-foreground">/ {job.slide?.topic?.title || '-'}</span>
              <span className="text-xs text-muted-foreground">@{job.slide?.user?.username || '-'}</span>
              <span className="text-xs text-muted-foreground">attempt: {job.attempts}</span>
              {job.lastError && <span className="text-xs text-red-500 line-clamp-1">err: {job.lastError}</span>}

              <div className="ml-auto">
                <button
                  onClick={() => retryOne(job.id)}
                  disabled={retryingId === job.id || job.status === 'processing'}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-primary/30 bg-primary/10 text-primary disabled:opacity-50"
                >
                  {retryingId === job.id ? 'Retry...' : 'Retry'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}

// ?? REPORTS TAB ???????????????????????????????????????????????????????????????

const STATUS_FILTERS = [
  { value: 'pending',  label: 'Bekleyenler' },
  { value: 'reviewed', label: 'İncelenenler' },
  { value: 'resolved', label: 'Çözülenler' },
  { value: 'all',      label: 'Tümü' },
];

function ReportsTab() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [warnModal, setWarnModal] = useState<{ reportId: number; userId: number } | null>(null);
  // Note editing
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const load = useCallback(async (s = statusFilter, p = page) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/reports?status=${s}&page=${p}`, { timeout: 10_000 });
      setReports(data.reports);
      setTotalPages(data.pages);
    } catch { toast.error('Raporlar yüklenemedi'); }
    finally { setLoading(false); }
  }, [statusFilter, page]);

  useEffect(() => { load(statusFilter, page); }, [load, statusFilter, page]);

  const act = async (id: number, status: string, deleteContent = false) => {
    setActioningId(id);
    try {
      await api.patch(`/reports/${id}/status`, { status, deleteContent });
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
      toast.success(deleteContent ? 'İçerik silindi ve rapor kapatıldı' : 'Durum güncellendi');
    } catch { toast.error('İşlem başarısız'); }
    finally { setActioningId(null); }
  };

  const setPriority = async (id: number, priority: string) => {
    try {
      await api.patch(`/admin/reports/${id}/priority`, { priority });
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, priority } : r));
      toast.success('Öncelik güncellendi');
    } catch { toast.error('Öncelik güncellenemedi'); }
  };

  const doWarn = async (userId: number, reason: string) => {
    try {
      await api.post(`/admin/users/${userId}/warn`, { reason });
      toast.success('Uyarı gönderildi');
    } catch { toast.error('Uyarı gönderilemedi'); }
    setWarnModal(null);
  };

  const startEditNote = (report: any) => {
    setEditingNoteId(report.id);
    setNoteText(report.note || '');
  };

  const saveNote = async (id: number) => {
    setNoteSaving(true);
    try {
      await api.patch(`/admin/reports/${id}/note`, { note: noteText.trim() });
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, note: noteText.trim() } : r));
      toast.success('Not kaydedildi');
      setEditingNoteId(null);
    } catch { toast.error('Not kaydedilemedi'); }
    finally { setNoteSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === f.value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4" /> Yenile
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
      ) : reports.length === 0 ? (
        <EmptyState icon={Flag} text="Rapor yok" />
      ) : (
        <div className="space-y-3">
          {reports.map((report, i) => {
            const pc = PRIORITY_CONFIG[report.priority] || PRIORITY_CONFIG.medium;
            return (
              <motion.div key={report.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card border border-border rounded-2xl p-5 shadow-card">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {/* Status badge */}
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${report.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : report.status === 'reviewed' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                        {report.status === 'pending' ? 'Bekliyor' : report.status === 'reviewed' ? 'İncelendi' : 'Çözüldü'}
                      </span>
                      {/* Priority selector */}
                      <select
                        value={report.priority || 'medium'}
                        onChange={(e) => setPriority(report.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full font-bold border-0 cursor-pointer ${pc.cls}`}
                      >
                        {Object.entries(PRIORITY_CONFIG).map(([v, c]) => (
                          <option key={v} value={v}>{c.label}</option>
                        ))}
                      </select>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-muted font-semibold">{report.targetType}#{report.targetId}</span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 font-semibold">
                        {REASON_LABELS[report.reason] || report.reason}
                      </span>
                    </div>
                    {report.details && <p className="text-sm text-muted-foreground mb-2">"{report.details}"</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <Link href={buildProfilePath(report.user.username)} className="font-semibold text-foreground hover:text-primary">@{report.user.username}</Link>
                      <span>{formatDate(report.createdAt)}</span>
                      <Link
                        href={`/${report.targetType === 'slide' ? 'slides' : 'topics'}/${report.targetId}`}
                        className="text-primary hover:underline font-semibold"
                      >
                        İçeriği Görüntüle →
                      </Link>
                    </div>

                    {/* ── Moderator note ── */}
                    {editingNoteId === report.id ? (
                      <div className="mt-3">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          rows={3}
                          maxLength={2000}
                          placeholder="Moderasyon notu gir..."
                          className="w-full text-sm px-3 py-2 rounded-xl border border-primary/30 bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                          autoFocus
                        />
                        <div className="flex items-center gap-2 mt-1.5">
                          <button
                            onClick={() => saveNote(report.id)}
                            disabled={noteSaving}
                            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1"
                          >
                            {noteSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                            Kaydet
                          </button>
                          <button onClick={() => setEditingNoteId(null)} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted">
                            İptal
                          </button>
                          <span className="text-[10px] text-muted-foreground ml-auto">{noteText.length}/2000</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-start gap-2">
                        {report.note ? (
                          <div className="flex-1 bg-amber-500/8 border border-amber-500/20 rounded-xl px-3 py-2">
                            <div className="flex items-center gap-1.5 mb-1">
                              <StickyNote className="w-3 h-3 text-amber-600" />
                              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Moderasyon Notu</span>
                            </div>
                            <p className="text-xs text-foreground leading-relaxed">{report.note}</p>
                          </div>
                        ) : null}
                        <button
                          onClick={() => startEditNote(report)}
                          className="shrink-0 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors mt-0.5"
                          title={report.note ? 'Notu düzenle' : 'Not ekle'}
                        >
                          <Pencil className="w-3 h-3" />
                          {report.note ? 'Düzenle' : 'Not ekle'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {report.status !== 'reviewed' && (
                      <ActionBtn icon={Eye} label="İncele" variant="blue" loading={actioningId === report.id}
                        onClick={() => act(report.id, 'reviewed')} />
                    )}
                    {report.status !== 'resolved' && (
                      <ActionBtn icon={CheckCircle} label="Çöz" variant="green" loading={actioningId === report.id}
                        onClick={() => act(report.id, 'resolved')} />
                    )}
                    <ActionBtn icon={Trash2} label="İçeriği Sil" variant="red" loading={actioningId === report.id}
                      onClick={() => act(report.id, 'resolved', true)} />
                    <ActionBtn icon={AlertTriangle} label="Uyar" variant="amber"
                      onClick={() => setWarnModal({ reportId: report.id, userId: report.user.id })} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />

      <AnimatePresence>
        {warnModal && (
          <WarnModal onConfirm={(reason) => doWarn(warnModal.userId, reason)} onClose={() => setWarnModal(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ?? CONTENT TAB ???????????????????????????????????????????????????????????????

const CONTENT_TYPES = [
  { value: 'topics',   label: 'Konular',  icon: FileText },
  { value: 'slides',   label: 'Slaytlar', icon: LayoutGrid },
  { value: 'comments', label: 'Yorumlar', icon: MessageSquare },
];

function ContentTab() {
  const [type, setType] = useState('topics');
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actingId, setActingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get(`/admin/content?type=${type}&q=${q}&page=${page}`, { timeout: 10_000 });
      setItems(data.items);
      setTotalPages(data.pages);
    } catch { toast.error('İçerik yüklenemedi'); setLoadError(true); }
    finally { setLoading(false); }
  }, [type, q, page]);

  useEffect(() => { load(); }, [load]);

  const handleHide = async (id: number) => {
    const contentType = type === 'topics' ? 'topic' : 'slide';
    setActingId(id);
    try {
      await api.post(`/admin/content/${contentType}/${id}/hide`);
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, isHidden: true } : i));
      toast.success('İçerik gizlendi');
    } catch { toast.error('Gizlenemedi'); }
    finally { setActingId(null); }
  };

  const handleRestore = async (id: number) => {
    const contentType = type === 'topics' ? 'topic' : 'slide';
    setActingId(id);
    try {
      await api.post(`/admin/content/${contentType}/${id}/restore`);
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, isHidden: false } : i));
      toast.success('İçerik geri yüklendi');
    } catch { toast.error('Geri yüklenemedi'); }
    finally { setActingId(null); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu içeriği kalıcı olarak silmek istediğinizden emin misiniz?')) return;
    const contentType = type === 'topics' ? 'topic' : type === 'slides' ? 'slide' : 'comment';
    setActingId(id);
    try {
      await api.delete(`/admin/content/${contentType}/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Silindi');
    } catch { toast.error('Silinemedi'); }
    finally { setActingId(null); }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {CONTENT_TYPES.map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => { setType(value); setPage(1); setQ(''); setSearchInput(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${type === value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-1">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setQ(searchInput); setPage(1); } }}
            placeholder="Ara..."
            className="flex-1 px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button onClick={() => { setQ(searchInput); setPage(1); }}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : loadError ? (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600 font-semibold mb-3">İçerik yüklenemedi</p>
          <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Tekrar Dene
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={LayoutGrid} text="İçerik bulunamadı" />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className={`flex items-center justify-between gap-4 p-4 bg-card border rounded-xl flex-wrap transition-all ${item.isHidden ? 'border-orange-500/30 bg-orange-500/3 opacity-70' : 'border-border'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.isHidden && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 font-bold">GİZLİ</span>}
                  {type !== 'comments' ? (
                    <Link href={type === 'topics'
                      ? buildTopicPath({ id: item.id, slug: item.slug, title: item.title })
                      : buildSlidePath({ id: item.id, slug: item.slug, title: item.title })}
                      className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1">
                      {item.title}
                    </Link>
                  ) : (
                    <p className="text-sm line-clamp-2">{item.content}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span>@{item.user.username}</span>
                  {item.category && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{item.category.name}</span>}
                  {item.topic && <Link href={buildTopicPath({ id: item.topic.id, slug: item.topic.slug, title: item.topic.title })} className="hover:text-primary line-clamp-1">{item.topic.title}</Link>}
                  {item._count && <span>{item._count.slides} slayt · {item._count.comments} yorum</span>}
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {type !== 'comments' && !item.isHidden && (
                  <button onClick={() => handleHide(item.id)} disabled={actingId === item.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-orange-500/30 bg-orange-500/5 text-orange-600 text-xs font-bold hover:bg-orange-500/10 transition-all disabled:opacity-50">
                    {actingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
                    Gizle
                  </button>
                )}
                {type !== 'comments' && item.isHidden && (
                  <button onClick={() => handleRestore(item.id)} disabled={actingId === item.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-emerald-600 text-xs font-bold hover:bg-emerald-500/10 transition-all disabled:opacity-50">
                    {actingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    Geri Yükle
                  </button>
                )}
                <button onClick={() => handleDelete(item.id)} disabled={actingId === item.id}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/5 text-red-600 text-xs font-bold hover:bg-red-500/10 transition-all disabled:opacity-50">
                  {actingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}

// ?? CONTENT INTELLIGENCE TAB ??????????????????????????????????????????????????

const INTEL_TYPES = [
  { value: 'slides', label: 'Slaytlar' },
  { value: 'topics', label: 'Konular' },
];

const INTEL_SORTS = [
  { value: 'quality', label: 'Kalite Puanı', desc: 'saves×5 + likes×1 + views×0.01' },
  { value: 'saves', label: 'Kayıt Sayısı', desc: 'En çok kaydedilen' },
  { value: 'views', label: 'Görüntülenme', desc: 'En çok görüntülenen' },
  { value: 'underexposed', label: 'Gizli Mücevherler', desc: 'Yüksek kalite, düşük görüntülenme' },
];

function ContentIntelTab() {
  const [type, setType] = useState('slides');
  const [sort, setSort] = useState('quality');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get(`/admin/content-intel?type=${type}&sort=${sort}&page=${page}`, { timeout: 10_000 });
      setItems(data.items);
      setTotalPages(data.pages);
    } catch { toast.error('İçerik zekası yüklenemedi'); setLoadError(true); }
    finally { setLoading(false); }
  }, [type, sort, page]);

  useEffect(() => { load(); }, [load]);

  const currentSort = INTEL_SORTS.find(s => s.value === sort);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {INTEL_TYPES.map(({ value, label }) => (
            <button key={value} onClick={() => { setType(value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${type === value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-xl flex-wrap">
          {INTEL_SORTS.map(({ value, label }) => (
            <button key={value} onClick={() => { setSort(value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sort === value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {currentSort && (
        <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
          <Info className="w-3.5 h-3.5" /> {currentSort.desc}
        </p>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : loadError ? (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600 font-semibold mb-3">İçerik zekası yüklenemedi</p>
          <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Tekrar Dene
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Star} text="İçerik bulunamadı" />
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={item.id} className={`flex items-center gap-3 p-4 bg-card border rounded-xl flex-wrap ${item.isHidden ? 'border-orange-500/30 opacity-60' : 'border-border'}`}>
              <span className="text-lg font-black text-muted-foreground/40 w-7 text-center shrink-0">
                {(page - 1) * 20 + i + 1}
              </span>

              {/* Quality Score Badge */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                <span className="text-xs font-black text-primary leading-none">{item.qualityScore}</span>
                <span className="text-[9px] text-primary/60 font-bold">puan</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.isHidden && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 font-bold">GİZLİ</span>}
                  <Link href={`/${type === 'slides' ? 'slides' : 'topics'}/${item.id}`}
                    className="font-semibold text-sm hover:text-primary line-clamp-1">{item.title}</Link>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>@{item.user.username}</span>
                  {item.topic && <span className="line-clamp-1 max-w-[140px]">{item.topic.title}</span>}
                  {item.category && <span><Tag className="w-3 h-3 inline" /> {item.category.name}</span>}
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Eye className="w-3.5 h-3.5" /><strong className="text-foreground">{Number(item.viewsCount || 0).toLocaleString()}</strong>
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Heart className="w-3.5 h-3.5" /><strong className="text-foreground">{item.likesCount}</strong>
                </span>
                {type === 'slides' && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Bookmark className="w-3.5 h-3.5" /><strong className="text-foreground">{item.savesCount}</strong>
                  </span>
                )}
                {type === 'topics' && item._count && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MessageSquare className="w-3.5 h-3.5" /><strong className="text-foreground">{item._count.comments}</strong>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}

// ?? USERS TAB ?????????????????????????????????????????????????????????????????

const USER_FILTERS = [
  { value: 'all',    label: 'Tümü' },
  { value: 'banned', label: 'Banlılar' },
  { value: 'muted',  label: 'Susturulanlar' },
  { value: 'admin',  label: 'Adminler' },
];

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actingId, setActingId] = useState<number | null>(null);
  const [warnTarget, setWarnTarget] = useState<number | null>(null);
  const [roleTarget, setRoleTarget] = useState<any | null>(null);
  const [expandedWarnings, setExpandedWarnings] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get(`/admin/users?q=${q}&filter=${filter}&page=${page}`, { timeout: 10_000 });
      setUsers(data.users);
      setTotalPages(data.pages);
    } catch { toast.error('Kullanıcılar yüklenemedi'); setLoadError(true); }
    finally { setLoading(false); }
  }, [q, filter, page]);

  useEffect(() => { load(); }, [load]);

  const toggleMute = async (id: number) => {
    setActingId(id);
    try {
      const { data } = await api.post(`/admin/users/${id}/mute`);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isMuted: data.isMuted } : u));
      toast.success(data.isMuted ? 'Susturuldu' : 'Susturma kaldırıldı');
    } catch { toast.error('İşlem başarısız'); }
    finally { setActingId(null); }
  };

  const toggleBan = async (id: number) => {
    if (!confirm('Kullanıcıyı banlamak/banı kaldırmak istediğinizden emin misiniz?')) return;
    setActingId(id);
    try {
      const { data } = await api.post(`/admin/users/${id}/ban`);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isBanned: data.isBanned } : u));
      toast.success(data.isBanned ? 'Banlandı' : 'Ban kaldırıldı');
    } catch { toast.error('İşlem başarısız'); }
    finally { setActingId(null); }
  };

  const doWarn = async (userId: number, reason: string) => {
    try {
      await api.post(`/admin/users/${userId}/warn`, { reason });
      toast.success('Uyarı gönderildi');
    } catch { toast.error('Uyarı gönderilemedi'); }
    setWarnTarget(null);
  };

  const doUpdateRole = async (userId: number, role: string) => {
    try {
      const { data } = await api.patch(`/admin/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: data.role, isAdmin: data.isAdmin } : u));
      toast.success('Rol güncellendi');
    } catch { toast.error('Rol güncellenemedi'); }
    setRoleTarget(null);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {USER_FILTERS.map((f) => (
            <button key={f.value} onClick={() => { setFilter(f.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f.value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-1">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setQ(searchInput); setPage(1); } }}
            placeholder="Kullanıcı adı veya e-posta ara..."
            className="flex-1 px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button onClick={() => { setQ(searchInput); setPage(1); }}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : loadError ? (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600 font-semibold mb-3">Kullanıcılar yüklenemedi</p>
          <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Tekrar Dene
          </button>
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} text="Kullanıcı bulunamadı" />
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const roleConf = ROLE_CONFIG[u.role] || ROLE_CONFIG.user;
            return (
              <div key={u.id} className="flex items-center justify-between gap-4 p-4 bg-card border border-border rounded-xl flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden relative">
                    {resolveMediaUrl(u.avatarUrl)
                      ? <Image src={resolveMediaUrl(u.avatarUrl)!} alt={u.username} fill className="object-cover" />
                      : u.username.slice(0, 2).toUpperCase()
                    }
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={buildProfilePath(u.username)} className="font-bold text-sm hover:text-primary">@{u.username}</Link>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${roleConf.cls}`}>{roleConf.label}</span>
                      {u.isBanned && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 font-bold">Banlı</span>}
                      {u.isMuted && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 font-bold">Susturulmuş</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {u.email} · {u._count.topics} konu · {u._count.slides} slayt · {u._count.reports || 0} rapor · {formatDate(u.createdAt)}
                    </p>
                    {u.warnings?.length > 0 && (
                      <div className="mt-0.5">
                        <button
                          onClick={() => setExpandedWarnings((prev) => {
                            const next = new Set(prev);
                            next.has(u.id) ? next.delete(u.id) : next.add(u.id);
                            return next;
                          })}
                          className="flex items-center gap-1 text-xs text-amber-600 font-semibold hover:text-amber-700"
                        >
                          ⚠️ {u.warnings.length} uyarı
                          {expandedWarnings.has(u.id)
                            ? <ChevronUp className="w-3 h-3" />
                            : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {expandedWarnings.has(u.id) && (
                          <div className="mt-1 space-y-1 pl-2 border-l-2 border-amber-300">
                            {u.warnings.map((w: any, i: number) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(w.createdAt)}</span>
                                <span className="text-xs text-amber-700">{w.reason}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {!u.isAdmin && (
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button onClick={() => setWarnTarget(u.id)} disabled={actingId === u.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-600 text-xs font-bold hover:bg-amber-500/10 transition-all">
                      <AlertTriangle className="w-3.5 h-3.5" /> Uyar
                    </button>
                    <button onClick={() => toggleMute(u.id)} disabled={actingId === u.id}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all disabled:opacity-50 ${u.isMuted ? 'border-orange-500/30 bg-orange-500/10 text-orange-600 hover:bg-orange-500/15' : 'border-border text-muted-foreground hover:border-orange-500/30 hover:text-orange-600 hover:bg-orange-500/5'}`}>
                      {actingId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <VolumeX className="w-3.5 h-3.5" />}
                      {u.isMuted ? 'Susturmayı Kaldır' : 'Sustur'}
                    </button>
                    <button onClick={() => toggleBan(u.id)} disabled={actingId === u.id}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all disabled:opacity-50 ${u.isBanned ? 'border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/15' : 'border-border text-muted-foreground hover:border-red-500/30 hover:text-red-600 hover:bg-red-500/5'}`}>
                      {actingId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                      {u.isBanned ? 'Banı Kaldır' : 'Banla'}
                    </button>
                    <button onClick={() => setRoleTarget(u)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-bold hover:bg-muted transition-all">
                      <UserCheck className="w-3.5 h-3.5" /> Rol
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />

      <AnimatePresence>
        {warnTarget && <WarnModal onConfirm={(reason) => doWarn(warnTarget, reason)} onClose={() => setWarnTarget(null)} />}
        {roleTarget && (
          <RoleModal user={roleTarget} onConfirm={(role) => doUpdateRole(roleTarget.id, role)} onClose={() => setRoleTarget(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ?? SLIDEO TAB ????????????????????????????????????????????????????????????????

const SLIDEO_SORTS = [
  { value: 'views', label: 'Görüntülenme' },
  { value: 'likes', label: 'Beğeni' },
  { value: 'saves', label: 'Kayıt' },
  { value: 'new', label: 'Yeni' },
  { value: 'risk', label: 'Risk' },
];

const SLIDEO_STATUS = [
  { value: 'all', label: 'Tümü' },
  { value: 'visible', label: 'Görünür' },
  { value: 'hidden', label: 'Gizli' },
];

function SlideoTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sort, setSort] = useState('views');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get(`/admin/slideos?sort=${sort}&q=${q}&status=${status}&page=${page}`, { timeout: 10_000 });
      setItems(data.items);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch { toast.error('Slideo verileri yüklenemedi'); setLoadError(true); }
    finally { setLoading(false); }
  }, [sort, q, status, page]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    if (!confirm("Bu Slideo'yu silmek istediğinizden emin misiniz?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/slideos/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Slideo silindi');
    } catch { toast.error('Silinemedi'); }
    finally { setDeletingId(null); }
  };

  const toggleHidden = async (id: number, hidden: boolean) => {
    setTogglingId(id);
    try {
      if (hidden) {
        await api.patch(`/admin/slideos/${id}/restore`);
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isHidden: false, hiddenAt: null } : i)));
        toast.success('Slideo yeniden görünür yapıldı');
      } else {
        await api.patch(`/admin/slideos/${id}/hide`);
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isHidden: true, hiddenAt: new Date().toISOString() } : i)));
        toast.success('Slideo gizlendi');
      }
    } catch {
      toast.error('Moderasyon işlemi başarısız');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {SLIDEO_SORTS.map((s) => (
            <button key={s.value} onClick={() => { setSort(s.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sort === s.value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-1">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
          >
            {SLIDEO_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setQ(searchInput); setPage(1); } }}
            placeholder="Slideo başlığı ara..."
            className="flex-1 px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button onClick={() => { setQ(searchInput); setPage(1); }}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90">
            <Search className="w-4 h-4" />
          </button>
        </div>
        <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground mb-3 font-medium">Toplam {total} Slideo</p>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : loadError ? (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600 font-semibold mb-3">Slideo verileri yüklenemedi</p>
          <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Tekrar Dene
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Play} text="Slideo bulunamadı" />
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={item.id} className="flex items-center justify-between gap-4 p-4 bg-card border border-border rounded-xl flex-wrap">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-base font-black text-muted-foreground/40 w-6 text-center shrink-0">
                  {(page - 1) * 20 + i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm line-clamp-1">{item.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0">
                      {item.pageIndices.length} sayfa
                    </span>
                    {item.isHidden && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold shrink-0">
                        Gizli
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">@{item.user.username}</span>
                    <Link href={buildSlidePath({ id: item.slide.id, slug: item.slide.slug, title: item.slide.title })} className="hover:text-primary line-clamp-1 max-w-[160px]">{item.slide.title}</Link>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground"><Eye className="w-3.5 h-3.5" /><strong className="text-foreground">{item.viewsCount.toLocaleString()}</strong></span>
                <span className="flex items-center gap-1 text-muted-foreground"><Heart className="w-3.5 h-3.5" /><strong className="text-foreground">{item.likesCount.toLocaleString()}</strong></span>
                <span className="flex items-center gap-1 text-muted-foreground"><Bookmark className="w-3.5 h-3.5" /><strong className="text-foreground">{item.savesCount.toLocaleString()}</strong></span>
                <span className="flex items-center gap-1 text-muted-foreground" title="Toplam rapor">
                  <Flag className="w-3.5 h-3.5" />
                  <strong className="text-foreground">{Number(item.reportCount || 0)}</strong>
                </span>
                <span className={`px-2 py-1 rounded-full font-bold ${
                  Number(item.riskScore || 0) >= 60
                    ? 'bg-red-500/10 text-red-600'
                    : Number(item.riskScore || 0) >= 30
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-emerald-500/10 text-emerald-600'
                }`}>
                  Risk {Math.round(Number(item.riskScore || 0))}
                </span>
                {item.riskSignals?.suddenViewSpike && (
                  <span className="px-2 py-1 rounded-full bg-violet-500/10 text-violet-600 font-bold">Spike</span>
                )}
                {item.riskSignals?.highReportRatio && (
                  <span className="px-2 py-1 rounded-full bg-orange-500/10 text-orange-600 font-bold">Yüksek Rapor Oranı</span>
                )}
                {item.riskSignals?.hasPendingReports && (
                  <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                    {item.pendingReports ?? 0} Bekleyen Rapor
                  </span>
                )}
                <button
                  onClick={() => toggleHidden(item.id, !!item.isHidden)}
                  disabled={togglingId === item.id}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-700 text-xs font-bold hover:bg-amber-500/10 transition-all disabled:opacity-50"
                >
                  {togglingId === item.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : item.isHidden ? <RotateCcw className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {item.isHidden ? 'Geri Al' : 'Gizle'}
                </button>
                <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/5 text-red-600 text-xs font-bold hover:bg-red-500/10 transition-all disabled:opacity-50">
                  {deletingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}

// ?? AUDIT LOG TAB ?????????????????????????????????????????????????????????????

function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterAction, setFilterAction] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/audit?page=${page}&action=${filterAction}`, { timeout: 10_000 });
      setLogs(data.logs);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch { toast.error('Denetim logları yüklenemedi'); }
    finally { setLoading(false); }
  }, [page, filterAction]);

  useEffect(() => { load(); }, [load]);

  const ACTION_TYPES = [
    '', 'ban_user', 'unban_user', 'mute_user', 'unmute_user', 'warn_user',
    'hide_content', 'restore_content', 'delete_content', 'delete_slideo', 'update_role',
  ];

  const getActionStyle = (action: string) => {
    if (action.includes('ban')) return 'bg-red-500/10 text-red-600';
    if (action.includes('mute')) return 'bg-orange-500/10 text-orange-600';
    if (action.includes('warn')) return 'bg-amber-500/10 text-amber-600';
    if (action.includes('hide') || action.includes('delete')) return 'bg-rose-500/10 text-rose-600';
    if (action.includes('restore')) return 'bg-emerald-500/10 text-emerald-600';
    if (action.includes('role')) return 'bg-violet-500/10 text-violet-600';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          className="px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Tüm İşlemler</option>
          {ACTION_TYPES.filter(Boolean).map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ClipboardList className="w-3.5 h-3.5" />
          <span>{total} kayıt</span>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(10)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
      ) : logs.length === 0 ? (
        <EmptyState icon={ClipboardList} text="Denetim logu bulunamadı" />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            let meta: any = null;
            try { meta = log.meta ? JSON.parse(log.meta) : null; } catch {}
            return (
              <div key={log.id} className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl flex-wrap text-sm">
                {/* Timestamp */}
                <span className="text-xs text-muted-foreground shrink-0 w-32">{formatDate(log.createdAt)}</span>

                {/* Admin */}
                <Link href={buildProfilePath(log.admin.username)} className="font-bold text-xs hover:text-primary shrink-0">
                  @{log.admin.username}
                </Link>

                {/* Action */}
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold shrink-0 ${getActionStyle(log.action)}`}>
                  {ACTION_LABELS[log.action] || log.action}
                </span>

                {/* Target */}
                {log.targetType && log.targetId && (
                  <span className="text-xs text-muted-foreground">
                    → {log.targetType} #{log.targetId}
                  </span>
                )}

                {/* Meta */}
                {meta && (
                  <span className="text-xs text-muted-foreground italic">
                    {meta.reason || meta.role || meta.priority || ''}
                  </span>
                )}

                {/* IP */}
                {log.ip && (
                  <span className="text-[10px] text-muted-foreground/50 ml-auto shrink-0">{log.ip}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}

// ?? ROOMS TAB ?????????????????????????????????????????????????????????????????

function RoomsTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data: d } = await api.get('/admin/rooms', { timeout: 10_000 });
      setData(d);
    } catch {
      toast.error('Oda verileri yüklenemedi');
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>;

  if (loadError || !data) return (
    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
      <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
      <p className="text-sm text-red-600 font-semibold mb-3">Oda verileri yüklenemedi</p>
      <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
        <RefreshCw className="w-3.5 h-3.5" /> Tekrar Dene
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Odalar</h2>
        <button onClick={load} className="px-3 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <Section title="Özet">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Toplam Oda"    value={data.total}        color="primary" />
          <StatCard label="Açık Oda"      value={data.publicCount}  color="emerald" />
          <StatCard label="Özel Oda"      value={data.privateCount} color="slate" />
          <StatCard label="Toplam Üye"    value={data.totalMembers} color="blue" />
          <StatCard label="Toplam Mesaj"  value={data.totalMessages} color="violet" />
        </div>
      </Section>

      <Section title="Son Oluşturulan Odalar">
        {data.recent.length === 0 ? (
          <EmptyState icon={DoorOpen} text="Oda bulunamadı" />
        ) : (
          <div className="space-y-2">
            {data.recent.map((room: any) => (
              <div key={room.id} className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl flex-wrap text-sm">
                <div className="flex items-center gap-2 shrink-0">
                  {room.isPublic
                    ? <Wifi className="w-4 h-4 text-emerald-500" />
                    : <Lock className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{room.name}</p>
                  <p className="text-xs text-muted-foreground">@{room.owner.username} · /rooms/{room.slug}</p>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{room._count.members}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{room._count.messages}</span>
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{room._count.topics}</span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(room.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ?? SISTEM TAB ????????????????????????????????????????????????????????????????

function SistemTab() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get('/admin/health', { timeout: 10_000 });
      setHealth(data);
    } catch {
      toast.error('Sistem sağlığı yüklenemedi');
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusBadge = (s: string) => {
    if (s === 'ok') return 'bg-emerald-500/10 text-emerald-600';
    if (s === 'warning') return 'bg-amber-500/10 text-amber-600';
    if (s === 'critical' || s === 'error') return 'bg-red-500/10 text-red-600';
    return 'bg-slate-500/10 text-slate-500';
  };

  const statusIcon = (s: string) => {
    if (s === 'ok') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (s === 'warning') return <AlertCircle className="w-4 h-4 text-amber-500" />;
    if (s === 'critical' || s === 'error') return <XCircle className="w-4 h-4 text-red-500" />;
    return <AlertCircle className="w-4 h-4 text-slate-400" />;
  };

  if (loading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>;

  if (loadError || !health) return (
    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
      <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
      <p className="text-sm text-red-600 font-semibold mb-3">Sistem bilgisi yüklenemedi</p>
      <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
        <RefreshCw className="w-3.5 h-3.5" /> Tekrar Dene
      </button>
    </div>
  );

  const checks = health.checks || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Sistem Sağlığı</h2>
          <p className="text-sm text-muted-foreground">Gerçek zamanlı platform durumu</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-xl text-sm font-bold ${statusBadge(health.status)}`}>
            {health.status === 'ok' ? 'Tüm Sistemler Normal' : health.status === 'warning' ? 'Uyarı' : 'Kritik Sorun'}
          </span>
          <button onClick={load} className="px-3 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* System checks grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* DB */}
        <div className="p-4 bg-card border border-border rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            {statusIcon(checks.db?.status)}
            <span className="text-sm font-bold">Veritabanı</span>
          </div>
          <p className={`text-xs font-semibold ${statusBadge(checks.db?.status)} px-2 py-1 rounded-lg w-fit`}>
            {checks.db?.status === 'ok' ? `${checks.db?.latencyMs ?? '?'}ms` : checks.db?.error || 'Hata'}
          </p>
        </div>

        {/* Redis */}
        <div className="p-4 bg-card border border-border rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            {statusIcon(checks.redis?.status)}
            <span className="text-sm font-bold">Redis / Kuyruk</span>
          </div>
          <p className={`text-xs font-semibold ${statusBadge(checks.redis?.status)} px-2 py-1 rounded-lg w-fit`}>
            {checks.redis?.status === 'ok' ? 'Bağlı' : checks.redis?.error || 'Bağlanamadı'}
          </p>
          {checks.redis?.queue && (
            <p className="text-[10px] text-muted-foreground mt-1">
              waiting: {checks.redis.queue.waiting ?? 0} · active: {checks.redis.queue.active ?? 0}
            </p>
          )}
        </div>

        {/* Storage */}
        <div className="p-4 bg-card border border-border rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            {statusIcon(checks.storage?.status)}
            <span className="text-sm font-bold">Depolama</span>
          </div>
          <p className={`text-xs font-semibold ${statusBadge(checks.storage?.status)} px-2 py-1 rounded-lg w-fit`}>
            {checks.storage?.driver || 'local'}
          </p>
        </div>

        {/* Worker */}
        <div className="p-4 bg-card border border-border rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            {statusIcon(checks.worker?.status)}
            <span className="text-sm font-bold">Conversion Worker</span>
          </div>
          <p className={`text-xs font-semibold ${statusBadge(checks.worker?.status)} px-2 py-1 rounded-lg w-fit`}>
            {checks.worker?.status === 'ok' ? 'Normal' : checks.worker?.status === 'warning' ? 'Uyarı' : checks.worker?.status === 'critical' ? 'Kritik' : 'Bilinmiyor'}
          </p>
          {checks.worker && (
            <p className="text-[10px] text-muted-foreground mt-1">
              queued: {checks.worker.queued ?? '?'} · failed: {checks.worker.failed ?? '?'} · active: {checks.worker.processing ?? '?'}
            </p>
          )}
        </div>
      </div>

      {/* Server info */}
      <Section title="Sunucu Bilgisi">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 bg-card border border-border rounded-2xl">
            <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-muted-foreground" /><span className="text-xs font-bold text-muted-foreground">Uptime</span></div>
            <p className="font-black text-lg">{Math.floor((health.uptimeSeconds || 0) / 3600)}h {Math.floor(((health.uptimeSeconds || 0) % 3600) / 60)}m</p>
          </div>
          <div className="p-4 bg-card border border-border rounded-2xl">
            <div className="flex items-center gap-2 mb-1"><Cpu className="w-4 h-4 text-muted-foreground" /><span className="text-xs font-bold text-muted-foreground">Bellek (RSS)</span></div>
            <p className="font-black text-lg">{health.memoryMB ?? '?'} MB</p>
          </div>
          <div className="p-4 bg-card border border-border rounded-2xl">
            <div className="flex items-center gap-2 mb-1"><Server className="w-4 h-4 text-muted-foreground" /><span className="text-xs font-bold text-muted-foreground">Node.js</span></div>
            <p className="font-black text-lg">{health.nodeVersion || '?'}</p>
          </div>
          <div className="p-4 bg-card border border-border rounded-2xl">
            <div className="flex items-center gap-2 mb-1"><Database className="w-4 h-4 text-muted-foreground" /><span className="text-xs font-bold text-muted-foreground">DB Ping</span></div>
            <p className="font-black text-lg">{checks.db?.latencyMs != null ? `${checks.db.latencyMs}ms` : '—'}</p>
          </div>
        </div>
      </Section>

      <p className="text-xs text-muted-foreground text-right">Son kontrol: {health.checkedAt ? new Date(health.checkedAt).toLocaleTimeString('tr-TR') : '—'}</p>
    </div>
  );
}

// ?? SHARED COMPONENTS ?????????????????????????????????????????????????????????

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">{title}</h2>
      {children}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-500/10 text-emerald-600',
    blue:    'bg-blue-500/10 text-blue-600',
    cyan:    'bg-cyan-500/10 text-cyan-600',
    violet:  'bg-violet-500/10 text-violet-600',
    pink:    'bg-pink-500/10 text-pink-600',
    red:     'bg-red-500/10 text-red-600',
    orange:  'bg-orange-500/10 text-orange-600',
    amber:   'bg-amber-500/10 text-amber-600',
    slate:   'bg-slate-500/10 text-slate-500',
  };
  return (
    <div className={`p-4 rounded-2xl ${colorMap[color] || colorMap.slate}`}>
      <p className="text-2xl font-black">{Number(value || 0).toLocaleString()}</p>
      <p className="text-xs font-semibold mt-1 opacity-80">{label}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  const numeric = Number(value || 0);
  const isDelta = /delta/i.test(label);
  const tone = isDelta ? (numeric > 0 ? 'text-emerald-600' : numeric < 0 ? 'text-red-600' : 'text-muted-foreground') : 'text-foreground';
  const sign = isDelta && numeric > 0 ? '+' : '';

  return (
    <div className="rounded-lg border border-border bg-card px-2.5 py-2">
      <p className={`text-sm font-black ${tone}`}>
        {sign}{Number.isInteger(numeric) ? numeric.toLocaleString() : numeric}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
      <Icon className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
      <p className="font-semibold text-muted-foreground">{text}</p>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, variant, loading: isLoading, onClick, disabled }: {
  icon: any; label: string; variant: string; loading?: boolean; onClick: () => void; disabled?: boolean;
}) {
  const variantMap: Record<string, string> = {
    blue:  'border-blue-500/30 bg-blue-500/5 text-blue-600 hover:bg-blue-500/10',
    green: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10',
    red:   'border-red-500/30 bg-red-500/5 text-red-600 hover:bg-red-500/10',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-600 hover:bg-amber-500/10',
  };
  return (
    <button onClick={onClick} disabled={isLoading || disabled}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all disabled:opacity-50 ${variantMap[variant]}`}>
      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
        className="flex items-center gap-1 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-40">
        <ChevronLeft className="w-4 h-4" /> Önceki
      </button>
      <span className="text-sm text-muted-foreground font-medium">{page} / {totalPages}</span>
      <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
        className="flex items-center gap-1 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-40">
        Sonraki <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function WarnModal({ onConfirm, onClose }: { onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold mb-1">Kullanıcıyı Uyar</h2>
        <p className="text-sm text-muted-foreground mb-4">Kullanıcıya bildirim olarak gönderilecek.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Uyarı sebebi..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none mb-4"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">İptal</button>
          <button onClick={() => reason.trim() && onConfirm(reason.trim())} disabled={!reason.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-50">
            Uyarı Gönder
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RoleModal({ user, onConfirm, onClose }: { user: any; onConfirm: (role: string) => void; onClose: () => void }) {
  const [role, setRole] = useState(user.role || 'user');
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold mb-1">Rol Güncelle</h2>
        <p className="text-sm text-muted-foreground mb-4">@{user.username} için rol seç</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {Object.entries(ROLE_CONFIG).map(([value, conf]) => (
            <button key={value} onClick={() => setRole(value)}
              className={`p-3 rounded-xl border text-sm font-bold transition-all text-left ${role === value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>
              <span className={`text-xs px-2 py-0.5 rounded-full ${conf.cls}`}>{conf.label}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">İptal</button>
          <button onClick={() => onConfirm(role)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity">
            Kaydet
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── PREVIEW OPS TAB ───────────────────────────────────────────────────────────

function ActionButton({ icon: Icon, label, onClick, isLoading, className = '', disabled = false }: {
  icon: any; label: string; onClick: () => void; isLoading?: boolean; className?: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-bold transition-all disabled:opacity-50 hover:opacity-90 ${className}`}
    >
      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

const PREVIEW_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  none:       { label: 'Bekliyor',    cls: 'bg-slate-500/10 text-slate-500' },
  processing: { label: 'İşleniyor',  cls: 'bg-blue-500/10 text-blue-600' },
  ready:      { label: 'Hazır',      cls: 'bg-emerald-500/10 text-emerald-600' },
  failed:     { label: 'Başarısız',  cls: 'bg-red-500/10 text-red-600' },
};

function PreviewOpsTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/preview-ops', { timeout: 10_000 });
      setData(res.data);
    } catch {
      toast.error('Preview ops verisi yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doAction = async (action: string, extra?: Record<string, unknown>) => {
    setActionLoading(action);
    try {
      const res = await api.post('/admin/preview-ops/retry', { action, ...extra });
      toast.success(`${res.data.queued} slide kuyruğa alındı`);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'İşlem başarısız');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-600 font-semibold mb-3">Veri yüklenemedi</p>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Tekrar Dene
        </button>
      </div>
    );
  }

  const dist = data.distribution || {};
  const totalSlides = Object.values(dist).reduce((s: number, v: any) => s + v, 0);
  const readyCount = dist.ready || 0;
  const readyPct = totalSlides > 0 ? Math.round((readyCount / totalSlides) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold">Preview Operasyonları</h2>
          <p className="text-sm text-muted-foreground">WebP preview üretim durumu ve toplu yönetim</p>
        </div>
        <ActionButton label="Yenile" icon={RefreshCw} onClick={load} isLoading={loading} />
      </div>

      {/* Status Distribution */}
      <Section title="Preview Durum Dağılımı">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {Object.entries(PREVIEW_STATUS_CONFIG).map(([status, conf]) => (
            <div key={status} className="p-4 bg-card border border-border rounded-xl">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${conf.cls}`}>{conf.label}</span>
              <p className="text-2xl font-black mt-2">{(dist[status] || 0).toLocaleString()}</p>
            </div>
          ))}
        </div>
        {/* Progress bar */}
        <div className="p-4 bg-muted/40 rounded-xl">
          <div className="flex justify-between text-xs font-semibold mb-2">
            <span>Preview Coverage</span>
            <span className="text-emerald-600">{readyPct}% hazır ({readyCount.toLocaleString()} / {totalSlides.toLocaleString()})</span>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${readyPct}%` }} />
          </div>
        </div>
      </Section>

      {/* Asset Stats */}
      <Section title="Preview Asset İstatistikleri">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-card border border-border rounded-xl text-center">
            <ImageIcon className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-black">{(data.assets?.total || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Toplam Asset</p>
          </div>
          <div className="p-4 bg-card border border-border rounded-xl text-center">
            <HardDrive className="w-5 h-5 mx-auto text-blue-500 mb-1" />
            <p className="text-xl font-black">{data.assets?.totalSizeMB || 0} MB</p>
            <p className="text-xs text-muted-foreground">Toplam Boyut</p>
          </div>
          <div className="p-4 bg-card border border-border rounded-xl text-center">
            <BarChart3 className="w-5 h-5 mx-auto text-violet-500 mb-1" />
            <p className="text-xl font-black">{data.assets?.avgSizeKB || 0} KB</p>
            <p className="text-xs text-muted-foreground">Ort. Asset Boyutu</p>
          </div>
        </div>
      </Section>

      {/* Actions */}
      <Section title="Toplu İşlemler">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 bg-card border border-border rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Layers className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">Top-100 Backfill</p>
                <p className="text-xs text-muted-foreground mb-3">En çok görüntülenen 100 eksik slide'ı kuyruğa al</p>
                <p className="text-xs text-muted-foreground mb-3">
                  <span className="font-semibold text-amber-600">{(data.missingCount || 0).toLocaleString()}</span> slide preview bekliyor
                </p>
                <ActionButton
                  label="Top-100 Kuyruğa Al"
                  icon={Zap}
                  onClick={() => doAction('backfill_top', { limit: 100 })}
                  isLoading={actionLoading === 'backfill_top'}
                  className="bg-emerald-500 text-white hover:bg-emerald-600"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-card border border-border rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <RotateCcw className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">Failed → Retry</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Başarısız <span className="font-semibold text-red-600">{(dist.failed || 0).toLocaleString()}</span> slide'ı yeniden kuyruğa al
                </p>
                <ActionButton
                  label="Failed Sıfırla & Retry"
                  icon={RefreshCw}
                  onClick={() => doAction('retry_failed')}
                  isLoading={actionLoading === 'retry_failed'}
                  className="bg-orange-500 text-white hover:bg-orange-600"
                  disabled={!dist.failed}
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-card border border-border rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">Takılı İşlemleri Sıfırla</p>
                <p className="text-xs text-muted-foreground mb-3">
                  30+ dakikadır processing'de bekleyen <span className="font-semibold text-blue-600">{(data.stuckSlides?.length || 0)}</span> slide
                </p>
                <ActionButton
                  label="Stuck → Retry"
                  icon={AlertCircle}
                  onClick={() => doAction('retry_stuck')}
                  isLoading={actionLoading === 'retry_stuck'}
                  className="bg-blue-500 text-white hover:bg-blue-600"
                  disabled={!data.stuckSlides?.length}
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-card border border-border rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-4 h-4 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">Tümünü Backfill</p>
                <p className="text-xs text-muted-foreground mb-3">500 adede kadar eksik preview'ı kuyruğa al</p>
                <ActionButton
                  label="500 Slide Kuyruğa Al"
                  icon={Layers}
                  onClick={() => doAction('backfill_top', { limit: 500 })}
                  isLoading={actionLoading === 'backfill_top'}
                  className="bg-violet-500 text-white hover:bg-violet-600"
                  disabled={!data.missingCount}
                />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Stuck Slides */}
      {data.stuckSlides && data.stuckSlides.length > 0 && (
        <Section title={`Takılı Slide'lar (${data.stuckSlides.length})`}>
          <div className="space-y-2">
            {data.stuckSlides.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl">
                <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{s.title || `Slide #${s.id}`}</p>
                  <p className="text-xs text-muted-foreground">
                    Güncelleme: {formatDate(s.updatedAt)} · {s.viewsCount.toLocaleString()} görüntülenme
                  </p>
                </div>
                <ActionButton
                  label="Retry"
                  icon={RotateCcw}
                  onClick={() => doAction('retry_single', { slideId: s.id })}
                  isLoading={actionLoading === 'retry_single'}
                  className="text-xs"
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Failed Slides */}
      {data.failedSlides && data.failedSlides.length > 0 && (
        <Section title={`Başarısız Slide'lar (${data.failedSlides.length}${data.failedSlides.length === 20 ? '+' : ''})`}>
          <div className="space-y-2">
            {data.failedSlides.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{s.title || `Slide #${s.id}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.viewsCount.toLocaleString()} görüntülenme · {formatDate(s.updatedAt)}
                  </p>
                </div>
                <ActionButton
                  label="Retry"
                  icon={RotateCcw}
                  onClick={() => doAction('retry_single', { slideId: s.id })}
                  isLoading={actionLoading === 'retry_single'}
                  className="text-xs"
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Ops Guide */}
      <Section title="CLI Komutları">
        <div className="bg-muted/50 rounded-xl p-4 font-mono text-xs space-y-1 text-muted-foreground">
          <p className="text-foreground font-bold mb-2"># Preview yönetim komutları:</p>
          <p>npm run preview:backfill:top    <span className="text-slate-400"># top-100 kuyruğa al</span></p>
          <p>npm run preview:backfill        <span className="text-slate-400"># tüm eksikleri kuyruğa al (500 limit)</span></p>
          <p>npm run preview:backfill:dry    <span className="text-slate-400"># dry-run — sadece listele</span></p>
          <p>npm run preview:report          <span className="text-slate-400"># DB raporu</span></p>
          <p>npm run pm2:health             <span className="text-slate-400"># PM2 süreç sağlık kontrolü</span></p>
          <p>npm run backup:check           <span className="text-slate-400"># orphan + backup durumu</span></p>
        </div>
      </Section>
    </div>
  );
}
