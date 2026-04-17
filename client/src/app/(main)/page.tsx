'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp, Layers, Plus, ChevronRight, Flame,
  ArrowRight, Rss, Search, Star, Play, Eye, Heart,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import TopicCard from '@/components/shared/TopicCard';
import SlideCard from '@/components/shared/SlideCard';
import AdUnit from '@/components/shared/AdUnit';
import { TopicCardSkeleton, SlideCardSkeleton } from '@/components/shared/Skeleton';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { resolveFileUrl } from '@/lib/pdfRenderer';
import { buildSlideoPath, buildTopicCreatePath } from '@/lib/url';

const CAT_ICONS: Record<string, string> = {
  'teknoloji': 'T', 'is-Girişimcilik': 'G', 'egitim': 'E',
  'tasarim': 'D', 'pazarlama': 'P', 'finans': 'F',
  'bilim': 'B', 'sanat-kultur': 'S',
};

export default function HomePage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [trending, setTrending] = useState<any[]>([]);
  const [latest, setLatest] = useState<any[]>([]);
  const [popular, setPopular] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [trendingSlideos, setTrendingSlideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [mainTab, setMainTab] = useState<'discover' | 'feed'>('discover');
  const [feed, setFeed] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedEmpty, setFeedEmpty] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [latestPage, setLatestPage] = useState(1);
  const [latestHasMore, setLatestHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t, l, p, c, sl] = await Promise.all([
          api.get('/topics/trending').catch(() => ({ data: [] })),
          api.get('/topics?sort=latest&limit=12').catch(() => ({ data: { topics: [] } })),
          api.get('/slides/popular').catch(() => ({ data: [] })),
          api.get('/categories').catch(() => ({ data: [] })),
          api.get('/slideo/feed?sort=popular&limit=8').catch(() => ({ data: { slideos: [] } })),
        ]);
        setTrending(t.data.slice ? t.data.slice(0, 6) : []);
        setLatest(l.data.topics || []);
        setLatestPage(1);
        setLatestHasMore((l.data.topics?.length || 0) >= 12);
        setPopular(p.data || []);
        setCategories(c.data || []);
        setTrendingSlideos(sl.data.slideos || []);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadFeed = async () => {
    if (feed.length > 0) return;
    setFeedLoading(true);
    try {
      const { data } = await api.get('/topics/feed');
      setFeed(data.topics);
      setFeedEmpty(data.isEmpty || data.topics.length === 0);
    } catch {
      setFeedEmpty(true);
    } finally {
      setFeedLoading(false);
    }
  };

  const switchTab = (tab: 'discover' | 'feed') => {
    setMainTab(tab);
    if (tab === 'feed') loadFeed();
  };

  const loadByCategory = async (slug: string) => {
    setActiveCategory(slug);
    setLoading(true);
    setLatestPage(1);
    try {
      const { data } = await api.get(slug ? `/topics?category=${slug}&limit=12` : '/topics?sort=latest&limit=12');
      setLatest(data.topics || []);
      setLatestHasMore((data.topics?.length || 0) >= 12);
    } catch {
      setLatest([]);
      setLatestHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreLatest = async () => {
    if (loadingMore || !latestHasMore) return;
    const nextPage = latestPage + 1;
    setLoadingMore(true);
    try {
      const url = activeCategory
        ? `/topics?category=${activeCategory}&limit=12&page=${nextPage}`
        : `/topics?sort=latest&limit=12&page=${nextPage}`;
      const { data } = await api.get(url);
      const newTopics = data.topics || [];
      setLatest((prev) => [...prev, ...newTopics]);
      setLatestPage(nextPage);
      setLatestHasMore(newTopics.length >= 12);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQ.trim()) router.push(`/search?q=${encodeURIComponent(searchQ.trim())}`);
  };

  return (
    <div>
      {!user && (
        <section className="border-b border-border bg-card">
          <div className="max-w-4xl mx-auto px-5 pt-14 pb-12 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted text-muted-foreground text-xs font-semibold mb-5">
              Slayt tabanli bilgi platformu
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">
              Bilgini slaytla paylas
            </h1>
            <p className="text-muted-foreground text-base max-w-[520px] mx-auto leading-relaxed mb-8">
              Konu Aç, slayt yükle ve düzenli bir bilgi arşivi oluştur.
            </p>
            <form onSubmit={handleSearch} className="relative max-w-md mx-auto mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground pointer-events-none" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Konu veya slayt ara..."
                className="w-full pl-12 pr-28 py-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-md bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                Ara
              </button>
            </form>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link href="/register" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity">
                Ücretsiz Başla
              </Link>
              <Link href="/kesfet" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border border-border bg-background font-semibold text-sm hover:bg-muted transition-colors">
                Konuları Keşfet <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <div className="border-b border-border bg-background">
          <div className="max-w-6xl mx-auto px-5 py-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
              {[{ id: 0, slug: '', name: 'Tümü' }, ...categories].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.slug);
                    if (mainTab !== 'discover') setMainTab('discover');
                    loadByCategory(cat.slug);
                    document.getElementById('latest-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors shrink-0 ${
                    activeCategory === cat.slug
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {cat.slug ? <span>{CAT_ICONS[cat.slug] || 'K'}</span> : null}
                  {cat.name}
                  {cat.slug && <span className="text-[10px] opacity-70">{(cat as any)._count?.topics ?? 0}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-5 py-10 space-y-14">
        {user && (
          <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
            <button onClick={() => switchTab('discover')} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${mainTab === 'discover' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Layers className="w-3.5 h-3.5" /> Keşfet
            </button>
            <button onClick={() => switchTab('feed')} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${mainTab === 'feed' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Rss className="w-3.5 h-3.5" /> Akışım
            </button>
          </div>
        )}

        {mainTab === 'feed' && user && (
          <section>
            {feedLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <TopicCardSkeleton key={i} />)}
              </div>
            ) : feedEmpty ? (
              <div className="text-center py-20 border border-dashed border-border rounded-xl text-muted-foreground">
                <Rss className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-semibold mb-1">Akisin boş</p>
                <p className="text-sm opacity-70 mb-5">Kullanıcıları ve kategorileri takip ederek kişisel akisini Oluştur.</p>
                <Link href="/kesfet" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                  Konuları Keşfet <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {feed.map((topic) => <TopicCard key={topic.id} topic={topic} />)}
              </div>
            )}
          </section>
        )}

        {(mainTab === 'discover' || !user) && (
          <>
            {trending.length > 0 && (
              <section>
                <SectionHeader icon={<Flame className="w-4 h-4 text-primary" />} iconBg="bg-primary/10" title="Trend Konular" sub="Bugun en cok goruntulenenler" href="/kesfet?sort=popular" />
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <TopicCardSkeleton key={i} />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {trending.map((topic) => <TopicCard key={topic.id} topic={topic} />)}
                  </div>
                )}
              </section>
            )}

            {popular.length > 0 && (
              <section>
                <SectionHeader icon={<Star className="w-4 h-4 text-primary" />} iconBg="bg-primary/10" title="Popüler Slaytlar" sub={user ? 'En çok beğenilen ve kaydedilen' : 'İndirmek için Üye ol'} />
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => <SlideCardSkeleton key={i} />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {popular.slice(0, 8).map((slide) => <SlideCard key={slide.id} slide={slide} />)}
                  </div>
                )}
              </section>
            )}

            {/* ── Homepage mid-content ad ──
                 Placed between Popular Slides and Slideo strip.
                 Reader already engaged → strong viewability.
                 Desktop: leaderboard (728×90). Mobile: leaderboard-sm (320×50). */}
            <section aria-hidden="true">
              <div className="hidden sm:block">
                <AdUnit
                  slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_MID || '0000000000'}
                  placement="home_mid_desktop"
                  size="leaderboard"
                />
              </div>
              <div className="sm:hidden">
                <AdUnit
                  slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_MID || '0000000000'}
                  placement="home_mid_mobile"
                  size="leaderboard-sm"
                />
              </div>
            </section>

            {trendingSlideos.length > 0 && (
              <section>
                <SectionHeader icon={<Play className="w-4 h-4 text-primary" fill="currentColor" />} iconBg="bg-primary/10" title="Slideo'da Yukselenler" sub="Kisa içeriklerle Keşfet" href="/slideo" />
                <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
                  {trendingSlideos.map((s: any) => <SlideoPreviewCard key={s.id} slideo={s} />)}
                  <Link href="/slideo" prefetch={false} className="shrink-0 w-[140px] rounded-xl border border-dashed border-border bg-background flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors group">
                    <Play className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" fill="currentColor" />
                    <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-primary transition-colors text-center leading-tight">Tümü</span>
                  </Link>
                </div>
              </section>
            )}

            <section id="latest-section">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-[17px] font-semibold leading-tight">{activeCategory ? 'Kategori Konuları' : 'Yeni Konular'}</h2>
                    <p className="text-[11px] text-muted-foreground">En güncel içerikler</p>
                  </div>
                </div>
                {user && (
                  <Link href={buildTopicCreatePath()} className="flex items-center gap-1.5 text-[13px] text-primary font-semibold hover:underline underline-offset-2">
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Konu Aç
                  </Link>
                )}
              </div>

              <div className="flex gap-2 flex-wrap mb-5 pb-4 border-b border-border/50">
                {[{ slug: '', name: 'Tümü' }, ...categories].map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => loadByCategory(cat.slug)}
                    className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors ${
                      activeCategory === cat.slug
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => <TopicCardSkeleton key={i} />)}
                </div>
              ) : latest.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground border border-dashed border-border rounded-xl">
                  <Layers className="w-10 h-10 mb-4 opacity-20" strokeWidth={1} />
                  <p className="font-semibold text-lg mb-1">Konu bulunamadı</p>
                  <p className="text-sm mb-6 opacity-70">Filtreni değiştir veya ilk konuyu ac.</p>
                  {user && (
                    <Link href={buildTopicCreatePath()} className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                      Konu Aç
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {latest.map((topic) => <TopicCard key={topic.id} topic={topic} />)}
                  </div>
                  {latestHasMore && (
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={loadMoreLatest}
                        disabled={loadingMore}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-border bg-background text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {loadingMore ? (
                          <>
                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Yükleniyor...
                          </>
                        ) : (
                          'Daha Fazla Göster'
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* ── Bottom-of-feed ad ── after topics list, long-session reader signal */}
            <section aria-hidden="true">
              <AdUnit
                slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_BOTTOM || process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_MID || '0000000000'}
                placement="home_bottom"
                size="infeed"
              />
            </section>
          </>
        )}
      </div>
    </div>
  );
}

const SLIDEO_AVATAR_COLORS = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];

function SlideoPreviewCard({ slideo }: { slideo: any }) {
  const pages = Array.isArray(slideo.pageIndices) ? slideo.pageIndices : [];
  const thumbSrc = resolveFileUrl(slideo?.slide?.thumbnailUrl || '');
  const avatarSrc = resolveFileUrl(slideo?.user?.avatarUrl || '');
  return (
    <Link href={buildSlideoPath({ id: slideo.id, title: slideo.title })} prefetch={false} className="shrink-0 w-[140px] flex flex-col rounded-xl border border-border bg-card hover:border-primary/40 transition-colors overflow-hidden group">
      <div className="h-[90px] bg-black/80 relative flex items-center justify-center overflow-hidden">
        {slideo.slide?.thumbnailUrl ? (
          <img
            src={thumbSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-90"
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <Play className="w-8 h-8 text-white/20" fill="currentColor" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <span className="absolute top-1.5 right-1.5 bg-black/70 text-white/80 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">{pages.length} s</span>
      </div>
      <div className="p-2.5 flex-1 flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">{slideo.title}</p>
        <div className="flex items-center gap-1 mt-auto">
          <div className={cn('w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[7px] font-black text-white overflow-hidden relative', SLIDEO_AVATAR_COLORS[slideo.user.id % SLIDEO_AVATAR_COLORS.length])}>
            {slideo.user.avatarUrl
              ? <img src={avatarSrc} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              : slideo.user.username.slice(0, 1).toUpperCase()}
          </div>
          <span className="text-[9px] text-muted-foreground truncate">{slideo.user.username}</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{slideo.likesCount}</span>
          <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{slideo.viewsCount}</span>
        </div>
      </div>
    </Link>
  );
}

function SectionHeader({ icon, iconBg, title, sub, href }: { icon: React.ReactNode; iconBg: string; title: string; sub: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>{icon}</div>
        <div>
          <h2 className="text-[17px] font-semibold leading-tight">{title}</h2>
          <p className="text-[11px] text-muted-foreground">{sub}</p>
        </div>
      </div>
      {href && (
        <Link href={href} prefetch={href.startsWith('/slideo') ? false : undefined} className="text-[13px] text-muted-foreground hover:text-primary flex items-center gap-1 font-medium transition-colors">
          Tümü <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}
