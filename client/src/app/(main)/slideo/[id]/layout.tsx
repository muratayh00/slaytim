import Script from 'next/script';
import { buildCategoryPath, buildSlideoPath, buildTopicPath, splitIdSlug } from '@/lib/url';
import { getApiBaseUrl, getApiOrigin } from '@/lib/api-origin';

const API_URL = getApiBaseUrl();
const SERVER_BASE = getApiOrigin();
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

// force-dynamic: slideo IDs are user-generated; build-time API calls fail in CI.
export const dynamic = 'force-dynamic';

function resolveUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return path.startsWith('http') ? path : `${SERVER_BASE}${path}`;
}

async function fetchSlideo(id: number) {
  if (!Number.isInteger(id) || id <= 0 || !API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/slideo/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function SlideoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const parsed = splitIdSlug(params.id);
  const slideo = parsed.id ? await fetchSlideo(parsed.id) : null;

  // VideoObject + PresentationDigitalDocument hybrid: Slideo is a TikTok-style
  // page-by-page presentation, so we expose it primarily as a VideoObject (which
  // makes it eligible for Google Video search) but keep PresentationDigitalDocument
  // semantics in `mainEntity` so AI engines understand it is slide content, not
  // a literal video file.
  let videoJsonLd: object | null = null;
  let breadcrumbJsonLd: object | null = null;

  if (slideo) {
    const url = `${BASE_URL}${buildSlideoPath({ id: slideo.id, title: slideo.title })}`;
    const thumbnail = resolveUrl(slideo.slide?.thumbnailUrl);
    const pageCount = Array.isArray(slideo.pageIndices) ? slideo.pageIndices.length : 0;

    videoJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: slideo.title,
      description:
        slideo.description ||
        `${pageCount} sayfalık "${slideo.title}" slideosu — kısa slayt akışı.`,
      url,
      uploadDate: slideo.createdAt,
      ...(thumbnail ? { thumbnailUrl: thumbnail } : {}),
      inLanguage: 'tr-TR',
      author: slideo.user?.username
        ? {
            '@type': 'Person',
            name: slideo.user.username,
            url: `${BASE_URL}/@${slideo.user.username}`,
          }
        : undefined,
      publisher: { '@type': 'Organization', name: 'Slaytim', url: BASE_URL },
      interactionStatistic: [
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/WatchAction',
          userInteractionCount: slideo.viewsCount || 0,
        },
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/LikeAction',
          userInteractionCount: slideo.likesCount || 0,
        },
      ],
    };

    const breadcrumbItems: { name: string; url: string }[] = [
      { name: 'Anasayfa', url: BASE_URL },
      { name: 'Slideo', url: `${BASE_URL}/slideo` },
    ];
    if (slideo.slide?.topic?.category?.slug && slideo.slide.topic.category.name) {
      breadcrumbItems.push({
        name: slideo.slide.topic.category.name,
        url: `${BASE_URL}${buildCategoryPath(slideo.slide.topic.category.slug)}`,
      });
    }
    if (slideo.slide?.topic?.id) {
      breadcrumbItems.push({
        name: slideo.slide.topic.title,
        url: `${BASE_URL}${buildTopicPath({
          id: slideo.slide.topic.id,
          slug: slideo.slide.topic.slug,
          title: slideo.slide.topic.title,
        })}`,
      });
    }
    breadcrumbItems.push({ name: slideo.title, url });

    breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems.map((item, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: item.name,
        item: item.url,
      })),
    };
  }

  return (
    <>
      {/* Slideo also renders the PDF viewer for previews — preload here too. */}
      <link rel="modulepreload" href="/pdf.min.mjs" />
      {videoJsonLd && (
        <Script
          id="slideo-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }}
        />
      )}
      {breadcrumbJsonLd && (
        <Script
          id="slideo-breadcrumb-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      )}
      {children}
    </>
  );
}
