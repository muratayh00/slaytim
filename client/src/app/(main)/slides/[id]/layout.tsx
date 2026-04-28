import type { Metadata } from 'next';
import Script from 'next/script';
import { Suspense } from 'react';
import { buildCategoryPath, buildProfilePath, buildSlidePath, buildTopicPath, splitIdSlug } from '@/lib/url';
import { getApiBaseUrl, getApiOrigin } from '@/lib/api-origin';

const API_URL = getApiBaseUrl();
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';
const SERVER_BASE = getApiOrigin();

// force-dynamic: slide IDs are user-generated; build-time API calls cause
// ECONNREFUSED in CI. Metadata and JSON-LD are generated at request time.
export const dynamic = 'force-dynamic';

function resolveUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return path.startsWith('http') ? path : `${SERVER_BASE}${path}`;
}

async function fetchSlide(id: string) {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/slides/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function getParamId(params: { id?: string; slug?: string }): string {
  const raw = String(params.id || params.slug || '');
  const parsed = splitIdSlug(raw);
  return String(parsed.id || raw);
}

export async function generateMetadata({ params }: { params: { id?: string; slug?: string } }): Promise<Metadata> {
  try {
    const slide = await fetchSlide(getParamId(params));
    if (!slide) return { title: 'Slayt Bulunamadi', robots: { index: false, follow: false } };

    const title = slide.title as string;
    const description = slide.description
      ? (slide.description as string).slice(0, 155)
      : `"${title}" sunumunu goruntule ve indir.`;
    const url = `${BASE_URL}${buildSlidePath({ id: slide.id, slug: slide.slug, title: slide.title })}`;
    const image = resolveUrl(slide.thumbnailUrl);

    const shouldNoIndex = !slide.pdfUrl || slide.conversionStatus !== 'done';

    return {
      title,
      description,
      ...(shouldNoIndex ? { robots: { index: false, follow: false } } : {}),
      openGraph: {
        title,
        description,
        url,
        type: 'article',
        siteName: 'Slaytim',
        ...(image ? { images: [{ url: image, width: 1280, height: 720, alt: title }] } : {}),
      },
      twitter: {
        card: image ? 'summary_large_image' : 'summary',
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
      alternates: { canonical: url },
    };
  } catch {
    return { title: 'Slayt', robots: { index: false, follow: false } };
  }
}

function SlideSkeleton() {
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

type BreadcrumbItem = { name: string; href: string };

export default async function SlideLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id?: string; slug?: string };
}) {
  let presentationJsonLd: object | null = null;
  let breadcrumbJsonLd: object | null = null;
  let breadcrumbTrail: BreadcrumbItem[] = [];
  try {
    const slide = await fetchSlide(getParamId(params));
    if (slide) {
      const url = `${BASE_URL}${buildSlidePath({ id: slide.id, slug: slide.slug, title: slide.title })}`;
      presentationJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'PresentationDigitalDocument',
        name: slide.title,
        description: slide.description || `"${slide.title}" sunumu.`,
        url,
        inLanguage: 'tr-TR',
        author: {
          '@type': 'Person',
          name: slide.user?.username || 'Slaytim Kullanicisi',
          url: slide.user?.username ? `${BASE_URL}${buildProfilePath(slide.user.username)}` : BASE_URL,
        },
        publisher: { '@type': 'Organization', name: 'Slaytim', url: BASE_URL },
        datePublished: slide.createdAt,
        dateModified: slide.updatedAt || slide.createdAt,
        thumbnailUrl: resolveUrl(slide.thumbnailUrl),
        interactionStatistic: [
          { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: slide.likesCount },
          { '@type': 'InteractionCounter', interactionType: 'https://schema.org/ViewAction', userInteractionCount: slide.viewsCount },
        ],
        isPartOf: slide.topic ? {
          '@type': 'Collection',
          name: slide.topic.title,
          url: `${BASE_URL}${buildTopicPath({
            id: slide.topic.id,
            slug: slide.topic.slug,
            title: slide.topic.title,
          })}`,
        } : undefined,
      };

      // BreadcrumbList: Home → Category → Topic → Slide. Each level is omitted
      // gracefully if the entity is missing (e.g. slide without topic).
      // Stored as relative hrefs for the visible nav, absolute URLs for JSON-LD.
      const trail: BreadcrumbItem[] = [
        { name: 'Anasayfa', href: '/' },
      ];
      if (slide.topic?.category?.slug && slide.topic.category.name) {
        trail.push({
          name: slide.topic.category.name,
          href: buildCategoryPath(slide.topic.category.slug),
        });
      }
      if (slide.topic?.id) {
        trail.push({
          name: slide.topic.title,
          href: buildTopicPath({
            id: slide.topic.id,
            slug: slide.topic.slug,
            title: slide.topic.title,
          }),
        });
      }
      trail.push({ name: slide.title, href: buildSlidePath({ id: slide.id, slug: slide.slug, title: slide.title }) });
      breadcrumbTrail = trail;
      breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: trail.map((item, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: item.name,
          item: `${BASE_URL}${item.href === '/' ? '' : item.href}`,
        })),
      };
    }
  } catch {
    // silently skip
  }

  return (
    <>
      {/*
        Route-scoped PDF.js preload: emitted only when the slide layout mounts,
        so non-slide pages (homepage, profiles, search) never pay the 2-5 MB cost.
        Worker file is intentionally not preloaded — PDF.js spawns it via Blob URL
        which never matches a preload hint.
      */}
      <link rel="modulepreload" href="/pdf.min.mjs" />
      {presentationJsonLd && (
        <Script
          id="slide-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(presentationJsonLd) }}
        />
      )}
      {breadcrumbJsonLd && (
        <Script
          id="slide-breadcrumb-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      )}
      {breadcrumbTrail.length > 0 && (
        // Visible breadcrumb: rendered server-side so it appears in initial HTML
        // (good for crawl depth and SEO). The accompanying BreadcrumbList JSON-LD
        // is emitted above; this nav is purely for users + non-script crawlers.
        <nav
          aria-label="Breadcrumb"
          className="max-w-4xl mx-auto px-4 pt-6 -mb-2 text-sm text-muted-foreground flex flex-wrap items-center gap-1.5"
        >
          {breadcrumbTrail.map((item, idx) => {
            const isLast = idx === breadcrumbTrail.length - 1;
            return (
              <span key={item.href} className="flex items-center gap-1.5 min-w-0">
                {idx > 0 && <span aria-hidden="true" className="text-muted-foreground/50">/</span>}
                {isLast ? (
                  <span className="text-foreground font-medium truncate max-w-[60vw] sm:max-w-none">
                    {item.name}
                  </span>
                ) : (
                  <a
                    href={item.href}
                    className="hover:text-foreground transition-colors truncate max-w-[40vw] sm:max-w-none"
                  >
                    {item.name}
                  </a>
                )}
              </span>
            );
          })}
        </nav>
      )}
      {/* Suspense is required here because the page component uses useSearchParams() */}
      <Suspense fallback={<SlideSkeleton />}>
        {children}
      </Suspense>
    </>
  );
}
