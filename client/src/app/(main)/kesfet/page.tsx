import Link from 'next/link';
import { ChevronRight, Compass, Flame, Star, Layers, Bookmark, Play } from 'lucide-react';
import TopicCard from '@/components/shared/TopicCard';
import SlideCard from '@/components/shared/SlideCard';
import EmptyState from '@/components/shared/EmptyState';
import { getApiBaseUrl } from '@/lib/api-origin';
import { buildCategoryPath } from '@/lib/url';

const API_URL = getApiBaseUrl().replace(/\/+$/, '');
const FETCH_TIMEOUT_MS = 4000;

export const dynamic = 'force-dynamic';

async function safeFetch<T>(path: string): Promise<T | null> {
  if (!API_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate: 300 },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim() || text.trim().startsWith('<')) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default async function KesfetPage() {
  const [trending, latestData, popular, mostSavedRaw, slideoData, cats] =
    await Promise.all([
      safeFetch<any[]>('/topics/trending?limit=6'),
      safeFetch<{ topics: any[] }>('/topics?sort=latest&limit=8'),
      safeFetch<any[]>('/slides/popular?limit=8'),
      safeFetch<any[]>('/slides/most-saved?limit=8'),
      safeFetch<{ slideos: any[] }>('/slideo/feed?sort=popular&limit=6'),
      safeFetch<any[]>('/categories'),
    ]);

  const trendingTopics = Array.isArray(trending) ? trending.slice(0, 6) : [];
  const latestTopics = latestData?.topics ?? [];
  const popularSlides = Array.isArray(popular) ? popular : [];
  // /slides/most-saved endpoint may not exist — fall back to popular as defense
  const savedSlides = Array.isArray(mostSavedRaw) && mostSavedRaw.length > 0
    ? mostSavedRaw
    : popularSlides.slice().reverse();
  const slideos = slideoData?.slideos ?? [];
  const categories = (Array.isArray(cats) ? cats : [])
    .filter((c: any) => c?.isMain === true || c?.parentId == null)
    .slice(0, 12);

  const hasAnyContent =
    trendingTopics.length > 0 ||
    latestTopics.length > 0 ||
    popularSlides.length > 0 ||
    slideos.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
      {/* Page header */}
      <header className="mb-10 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Compass className="w-6 h-6 text-primary" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Keşfet</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 max-w-xl">
            Trend konuları, popüler slaytları ve kısa Slideo akışını tek yerden keşfet.
          </p>
        </div>
      </header>

      {!hasAnyContent && (
        <EmptyState
          icon={Compass}
          title="Henüz içerik yok"
          description="İlk konuyu açarak ya da slayt yükleyerek topluluğa katıl."
          primaryAction={{ label: 'Ücretsiz Başla', href: '/register' }}
          secondaryAction={{ label: 'Konular', href: '/topics', variant: 'outline' }}
        />
      )}

      <div className="space-y-12">
        {/* Popüler slaytlar */}
        {popularSlides.length > 0 && (
          <Section
            icon={<Star className="w-4 h-4 text-primary" />}
            title="Popüler slaytlar"
            sub="En çok beğenilen ve görüntülenenler"
            href="/topics?sort=popular"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {popularSlides.slice(0, 8).map((slide: any) => (
                <SlideCard key={slide.id} slide={slide} />
              ))}
            </div>
          </Section>
        )}

        {/* Trend konular */}
        {trendingTopics.length > 0 && (
          <Section
            icon={<Flame className="w-4 h-4 text-primary" />}
            title="Trend konular"
            sub="Bugün öne çıkanlar"
            href="/topics?sort=popular"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendingTopics.map((topic: any) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          </Section>
        )}

        {/* Yeni konular */}
        {latestTopics.length > 0 && (
          <Section
            icon={<Layers className="w-4 h-4 text-primary" />}
            title="Yeni konular"
            sub="Son eklenen tartışmalar"
            href="/topics?sort=latest"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {latestTopics.slice(0, 6).map((topic: any) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          </Section>
        )}

        {/* En çok kaydedilenler */}
        {savedSlides.length > 0 && (
          <Section
            icon={<Bookmark className="w-4 h-4 text-primary" />}
            title="En çok kaydedilenler"
            sub="Topluluğun favorileri"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {savedSlides.slice(0, 8).map((slide: any) => (
                <SlideCard key={slide.id} slide={slide} />
              ))}
            </div>
          </Section>
        )}

        {/* Kategorilere göre keşfet */}
        {categories.length > 0 && (
          <Section
            icon={<Compass className="w-4 h-4 text-primary" />}
            title="Kategorilere göre keşfet"
            sub="İlgi alanına göre hızlı erişim"
            href="/kategori"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {categories.map((cat: any) => (
                <Link
                  key={cat.id}
                  href={buildCategoryPath(cat.slug)}
                  prefetch={false}
                  className="group flex flex-col items-center justify-center text-center gap-2 p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/30 hover:shadow-card-hover transition-all min-h-[100px]"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center text-sm font-extrabold text-primary transition-colors">
                    {String(cat.name || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <span className="text-xs sm:text-sm font-semibold leading-tight line-clamp-2">
                    {cat.name}
                  </span>
                  {typeof cat?._count?.topics === 'number' && (
                    <span className="text-[10px] text-muted-foreground">
                      {cat._count.topics} konu
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* Slideo önerileri */}
        {slideos.length > 0 && (
          <Section
            icon={<Play className="w-4 h-4 text-primary" fill="currentColor" />}
            title="Slideo önerileri"
            sub="Kısa, dikey slayt akışı"
            href="/slideo"
          >
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
              {slideos.map((s: any) => (
                <Link
                  key={s.id}
                  href={`/slideo?focus=${s.id}`}
                  prefetch={false}
                  className="shrink-0 w-[160px] rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-card-hover transition-all overflow-hidden"
                >
                  <div className="h-[180px] bg-black/80 relative flex items-center justify-center overflow-hidden">
                    <Play className="w-9 h-9 text-white/30" fill="currentColor" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      {Array.isArray(s.pageIndices) ? s.pageIndices.length : 0} s
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold leading-tight line-clamp-2">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-1.5 truncate">
                      @{s.user?.username}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  sub,
  href,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h2 className="text-base sm:text-[17px] font-semibold leading-tight">{title}</h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground">{sub}</p>
          </div>
        </div>
        {href && (
          <Link
            href={href}
            prefetch={href.startsWith('/slideo') ? false : undefined}
            className="text-[13px] text-muted-foreground hover:text-primary flex items-center gap-1 font-medium transition-colors"
          >
            Tümünü Gör <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
