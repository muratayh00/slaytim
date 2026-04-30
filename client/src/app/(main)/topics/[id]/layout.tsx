import type { Metadata } from 'next';
import { getApiBaseUrl } from '@/lib/api-origin';
import { buildProfilePath, buildTopicPath, splitIdSlug } from '@/lib/url';
import { OG_WIDTH, OG_HEIGHT } from '@/app/api/og/_lib/theme';

const API_URL = getApiBaseUrl();
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

// force-dynamic: topic IDs/slugs are user-generated; build-time API calls cause
// ECONNREFUSED in CI. Metadata and JSON-LD are generated at request time.
export const dynamic = 'force-dynamic';

type RouteParams = { id?: string; slug?: string };

function getRouteKey(params: RouteParams): string | null {
  return params.id || params.slug || null;
}

async function fetchTopic(paramValue: string) {
  if (!API_URL) return null;
  try {
    const key = decodeURIComponent(paramValue);

    // Params may arrive as "123-konu-basligi" (id + slug combined).
    // splitIdSlug extracts the numeric id so we can hit /topics/:id directly.
    const { id: numericId } = splitIdSlug(key);
    const endpoint = numericId
      ? `/topics/${numericId}`
      : /^\d+$/.test(key)
        ? `/topics/${key}`
        : `/topics/slug/${encodeURIComponent(key)}`;

    const res = await fetch(`${API_URL}${endpoint}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  try {
    const key = getRouteKey(params);
    if (!key) return { title: 'Konu Bulunamadi', robots: { index: false, follow: false } };

    const topic = await fetchTopic(key);
    if (!topic) return { title: 'Konu Bulunamadi', robots: { index: false, follow: false } };

    const title = topic.title as string;
    const description = topic.description
      ? (topic.description as string).slice(0, 155)
      : `${topic._count?.slides || 0} slayt iceren "${title}" konusunu kesfet.`;
    const url = `${BASE_URL}${buildTopicPath({ id: topic.id, slug: topic.slug, title: topic.title })}`;

    const ogImage = `${BASE_URL}/api/og/topic/${topic.id}`;

    return {
      title,
      description,
      ...((Number(topic?._count?.slides || 0) <= 0) ? { robots: { index: false, follow: false } } : {}),
      openGraph: {
        title,
        description,
        url,
        type: 'article',
        siteName: 'Slaytim',
        images: [{ url: ogImage, width: OG_WIDTH, height: OG_HEIGHT, alt: title }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
      alternates: { canonical: url },
    };
  } catch {
    return { title: 'Konu', robots: { index: false, follow: false } };
  }
}

export default async function TopicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: RouteParams;
}) {
  let jsonLd: object | null = null;

  try {
    const key = getRouteKey(params);
    if (key) {
      const topic = await fetchTopic(key);
      if (topic) {
        const url = `${BASE_URL}${buildTopicPath({ id: topic.id, slug: topic.slug, title: topic.title })}`;
        jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: topic.title,
          description: topic.description || `${topic._count?.slides || 0} slayt iceren konu.`,
          url,
          author: {
            '@type': 'Person',
            name: topic.user?.username || 'Slaytim Kullanicisi',
            url: topic.user?.username ? `${BASE_URL}${buildProfilePath(topic.user.username)}` : BASE_URL,
          },
          publisher: { '@type': 'Organization', name: 'Slaytim', url: BASE_URL },
          datePublished: topic.createdAt,
          mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        };
      }
    }
  } catch {
    // ignore JSON-LD failures
  }

  return (
    <>
      {/* Plain <script>: next/script defers ld+json injection to post-hydration,
          invisible to crawlers. See slides/[id]/layout.tsx for full rationale. */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
