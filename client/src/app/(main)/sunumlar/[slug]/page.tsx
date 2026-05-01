import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Upload, ChevronRight, Tag, Search, ChevronDown } from 'lucide-react';
import {
  getSeoPageConfig,
  SEO_PAGE_SLUGS,
  SEO_INDEX_THRESHOLD,
  type SeoPageConfig,
} from '@/lib/programmaticSeoPages';
import { getApiBaseUrl } from '@/lib/api-origin';
import { buildSlidePath, buildSlideoPath, buildTopicPath, buildTagPath } from '@/lib/url';
import TopicCard from '@/components/shared/TopicCard';
import SlideCard from '@/components/shared/SlideCard';
import { OG_WIDTH, OG_HEIGHT } from '@/app/api/og/_lib/theme';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';
const API_URL = getApiBaseUrl();
const FETCH_TIMEOUT_MS = 8_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SeoPageData = {
  topics: any[];
  slides: any[];
  slideos: any[];
  tags: { slug: string; name: string }[];
  contentCount: number;
};

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------
async function fetchSeoPageData(slug: string): Promise<SeoPageData | null> {
  if (!API_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/seo-pages/${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Static params — build only the 12 known slugs
// ---------------------------------------------------------------------------
export function generateStaticParams() {
  return SEO_PAGE_SLUGS.map((slug) => ({ slug }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const cfg = getSeoPageConfig(params.slug);
  if (!cfg) return {};

  const data = await fetchSeoPageData(params.slug);
  const contentCount = data?.contentCount ?? 0;
  const isIndexable = contentCount >= SEO_INDEX_THRESHOLD;

  const canonical = `${BASE_URL}/sunumlar/${cfg.slug}`;
  const title = cfg.ogTitle ?? `${cfg.h1} | Slaytim`;
  const ogImage = `${BASE_URL}/api/og/seo-page/${cfg.slug}`;

  return {
    title,
    description: cfg.metaDescription,
    alternates: { canonical },
    robots: isIndexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title,
      description: cfg.metaDescription,
      url: canonical,
      siteName: 'Slaytim',
      type: 'website',
      images: [{ url: ogImage, width: OG_WIDTH, height: OG_HEIGHT, alt: cfg.h1 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: cfg.metaDescription,
      images: [ogImage],
    },
  };
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------
function buildCollectionAndItemJsonLd(cfg: SeoPageConfig, data: SeoPageData) {
  const pageUrl = `${BASE_URL}/sunumlar/${cfg.slug}`;

  const listItems: { url: string; name: string }[] = [
    ...data.topics.slice(0, 4).map((t: any) => ({
      url: `${BASE_URL}${buildTopicPath({ id: t.id, slug: t.slug, title: t.title })}`,
      name: t.title,
    })),
    ...data.slides.slice(0, 4).map((s: any) => ({
      url: `${BASE_URL}${buildSlidePath({ id: s.id, slug: s.slug, title: s.title })}`,
      name: s.title,
    })),
    ...data.slideos.slice(0, 2).map((sl: any) => ({
      url: `${BASE_URL}${buildSlideoPath({ id: sl.id, title: sl.title })}`,
      name: sl.title,
    })),
  ].slice(0, 10);

  const collectionPage = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${cfg.h1} | Slaytim`,
    description: cfg.metaDescription,
    url: pageUrl,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Sunumlar', item: `${BASE_URL}/sunumlar` },
        { '@type': 'ListItem', position: 3, name: cfg.breadcrumbLabel, item: pageUrl },
      ],
    },
  };

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: cfg.h1,
    numberOfItems: listItems.length,
    itemListElement: listItems.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: item.url,
      name: item.name,
    })),
  };

  return [collectionPage, itemList];
}

function buildFaqJsonLd(cfg: SeoPageConfig) {
  if (!cfg.faqs?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: cfg.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function SeoLandingPage({
  params,
}: {
  params: { slug: string };
}) {
  const cfg = getSeoPageConfig(params.slug);
  if (!cfg) notFound();

  const data = await fetchSeoPageData(params.slug);
  const contentCount = data?.contentCount ?? 0;
  const isEmpty = contentCount === 0;
  const isIndexable = contentCount >= SEO_INDEX_THRESHOLD;

  // JSON-LD: CollectionPage + ItemList only when we have content to list.
  const contentJsonLd = data && !isEmpty ? buildCollectionAndItemJsonLd(cfg, data) : null;
  // FAQPage JSON-LD is always emitted (evergreen value regardless of content count).
  const faqJsonLd = buildFaqJsonLd(cfg);

  return (
    <>
      {/* Structured data */}
      {contentJsonLd?.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Ana Sayfa</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/sunumlar" className="hover:text-foreground transition-colors">Sunumlar</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">{cfg.breadcrumbLabel}</span>
        </nav>

        {/* Hero */}
        <section>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">{cfg.h1}</h1>
          <p className="text-muted-foreground leading-relaxed max-w-3xl text-[15px]">
            {cfg.guideText}
          </p>

          {/* Popular tags */}
          <div className="flex flex-wrap gap-2 mt-5">
            {cfg.popularTags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-primary/8 text-primary text-xs font-semibold border border-primary/15"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Noindex notice — dev only */}
          {!isIndexable && process.env.NODE_ENV !== 'production' && (
            <p className="mt-4 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              ⚠ Bu sayfa henüz yeterli içeriğe sahip değil ({contentCount}/{SEO_INDEX_THRESHOLD}). noindex, follow uygulandı.
            </p>
          )}
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-r from-primary/10 via-violet-500/8 to-indigo-500/5 border border-primary/15 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-lg">Kendi sunumunu paylaş</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {cfg.h1} alanındaki sunumunu Slaytim&apos;e yükle, binlerce kişiye ulaş.
            </p>
          </div>
          <Link
            href="/konu/yeni"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-button hover:shadow-button-hover hover:-translate-y-0.5 transition-all shrink-0"
          >
            <Upload className="w-4 h-4" />
            Sunum Yükle
          </Link>
        </div>

        {/* Content or evergreen */}
        {isEmpty ? (
          /* No community content yet — show evergreen guide instead of dead empty state */
          <EvergreenContent cfg={cfg} />
        ) : (
          <>
            {/* Topics */}
            {data!.topics.length > 0 && (
              <Section title="Konular" count={data!.topics.length} searchQuery={cfg.slug}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data!.topics.map((topic: any) => (
                    <TopicCard key={topic.id} topic={topic} />
                  ))}
                </div>
              </Section>
            )}

            {/* Slides */}
            {data!.slides.length > 0 && (
              <Section title="Slaytlar" count={data!.slides.length}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data!.slides.map((slide: any, i: number) => (
                    <SlideCard key={slide.id} slide={slide} priority={i === 0} />
                  ))}
                </div>
              </Section>
            )}

            {/* Slideos */}
            {data!.slideos.length > 0 && (
              <Section title="Slideo'lar" count={data!.slideos.length}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data!.slideos.map((slideo: any) => (
                    <SlideoMiniCard key={slideo.id} slideo={slideo} />
                  ))}
                </div>
              </Section>
            )}

            {/* Related tags from DB */}
            {data!.tags.length > 0 && (
              <Section title="İlgili Etiketler">
                <div className="flex flex-wrap gap-2">
                  {data!.tags.map((tag) => (
                    <Link
                      key={tag.slug}
                      href={buildTagPath(tag.slug)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm font-semibold hover:bg-muted/80 transition-colors border border-border"
                    >
                      <Tag className="w-3 h-3 text-muted-foreground" />
                      {tag.name}
                    </Link>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}

        {/* FAQ — always shown, SEO value regardless of content count */}
        {cfg.faqs?.length > 0 && <FaqSection faqs={cfg.faqs} />}

        {/* Bottom CTA */}
        <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            Daha fazla sunum keşfetmek ister misin?
          </p>
          <div className="flex gap-3">
            <Link
              href="/kesfet"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
            >
              <Search className="w-4 h-4" />
              Keşfet
            </Link>
            <Link
              href="/sunumlar"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
            >
              Tüm Kategoriler
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function Section({
  title,
  count,
  searchQuery,
  children,
}: {
  title: string;
  count?: number;
  searchQuery?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">
          {title}
          {count !== undefined && count > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">({count})</span>
          )}
        </h2>
        {searchQuery && (
          <Link
            href={`/kesfet?q=${encodeURIComponent(searchQuery)}`}
            className="text-xs text-primary hover:underline font-semibold"
          >
            Tümünü gör →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * Evergreen guide shown when contentCount === 0.
 * Renders the per-slug long-form sections so the page has substantive content
 * for crawlers even before any community submissions arrive.
 */
function EvergreenContent({ cfg }: { cfg: SeoPageConfig }) {
  return (
    <article className="prose prose-invert prose-sm sm:prose-base max-w-none">
      {cfg.evergreenSections.map((section) => (
        <section key={section.heading} className="mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3 not-prose">
            {section.heading}
          </h2>
          <p className="text-muted-foreground leading-relaxed not-prose">
            {section.body}
          </p>
        </section>
      ))}

      {/* Gentle call-to-action inside the evergreen section */}
      <div className="not-prose mt-8 rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
        <p className="font-semibold text-foreground mb-1">
          {cfg.h1} konusunda sunum hazırladın mı?
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Topluluğumuza ilk içeriği ekleyen sen ol — binlerce kişi görsün.
        </p>
        <Link
          href="/konu/yeni"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-button hover:shadow-button-hover hover:-translate-y-0.5 transition-all"
        >
          <Upload className="w-4 h-4" />
          İlk Sunumu Ekle
        </Link>
      </div>
    </article>
  );
}

/**
 * FAQ accordion using native <details>/<summary> — no client JS required,
 * works in SSR and is directly readable by Googlebot for FAQPage rich results.
 */
function FaqSection({ faqs }: { faqs: SeoPageConfig['faqs'] }) {
  return (
    <section aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="text-xl font-bold mb-5">
        Sık Sorulan Sorular
      </h2>
      <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
        {faqs.map((faq, i) => (
          <details key={i} className="group">
            <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer select-none hover:bg-muted/40 transition-colors list-none [&::-webkit-details-marker]:hidden">
              <span className="font-semibold text-sm sm:text-base text-foreground">
                {faq.q}
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-5 pb-5 pt-1">
              <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function SlideoMiniCard({ slideo }: { slideo: any }) {
  return (
    <Link
      href={buildSlideoPath({ id: slideo.id, title: slideo.title })}
      className="group block rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/40 hover:shadow-card transition-all"
    >
      <div className="aspect-video bg-black/80 relative flex items-center justify-center">
        {slideo.slide?.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slideo.slide.thumbnailUrl}
            alt={slideo.title}
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-2xl">▶</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3">
          <p className="text-white text-xs font-bold line-clamp-2 drop-shadow">{slideo.title}</p>
        </div>
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] text-white/80 font-bold">
          {slideo.pageIndices?.length ?? 0} sayfa
        </div>
      </div>
      <div className="px-3 py-2.5 text-xs text-muted-foreground flex items-center gap-3">
        <span>❤ {slideo.likesCount}</span>
        <span>👁 {slideo.viewsCount}</span>
        {slideo.user && <span className="ml-auto truncate">@{slideo.user.username}</span>}
      </div>
    </Link>
  );
}
