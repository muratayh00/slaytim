import type { Metadata } from 'next';
import { getApiBaseUrl } from '@/lib/api-origin';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';
const API_URL = getApiBaseUrl();

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug || '');
  const label = slug.replace(/-/g, ' ');
  let indexable = false;
  if (API_URL && slug) {
    try {
      const res = await fetch(`${API_URL}/tags/${encodeURIComponent(slug)}`, { cache: 'no-store' });
      if (res.ok) {
        const payload = await res.json();
        indexable = Boolean(payload?.seo?.indexable);
      }
    } catch {
      // Ignore metadata fetch failures.
    }
  }
  return {
    title: `#${label} etiketi | Slaytim`,
    description: `#${label} etiketiyle ilgili slayt ve konulari kesfet.`,
    alternates: { canonical: `${BASE_URL}/etiket/${slug}` },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

async function fetchTagTopics(slug: string) {
  if (!API_URL) return null;
  try {
    // Tag listing endpoint may vary; try the most common shape and fall back.
    const res = await fetch(`${API_URL}/tags/${encodeURIComponent(slug)}/topics?limit=12`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function TagLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const slug = decodeURIComponent(params.slug || '');
  const label = slug.replace(/-/g, ' ');

  // Only emit CollectionPage JSON-LD for indexable tags (matches the same
  // rule we use for metadata.robots, so we don't tell Google "here's a rich
  // collection!" while also telling it noindex).
  let collectionJsonLd: object | null = null;
  try {
    if (API_URL && slug) {
      const tagRes = await fetch(`${API_URL}/tags/${encodeURIComponent(slug)}`, { cache: 'no-store' });
      const tag = tagRes.ok ? await tagRes.json() : null;
      const indexable = Boolean(tag?.seo?.indexable);
      if (indexable) {
        const topicsPayload = await fetchTagTopics(slug);
        const topics: Array<{ id: number; title: string; slug?: string }> = Array.isArray(topicsPayload?.topics)
          ? topicsPayload.topics
          : Array.isArray(topicsPayload)
            ? topicsPayload
            : [];

        const itemListElement = topics.slice(0, 12).map((t, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: `${BASE_URL}/topics/${t.id}${t.slug ? `-${t.slug}` : ''}`,
          name: t.title,
        }));

        collectionJsonLd = {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: tag?.label || label,
          url: `${BASE_URL}/etiket/${slug}`,
          description: `#${tag?.label || label} etiketiyle ilgili slayt ve konular.`,
          inLanguage: 'tr-TR',
          isPartOf: { '@type': 'WebSite', name: 'Slaytim', url: BASE_URL },
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: Number(tag?.totals?.all || itemListElement.length),
            itemListElement,
          },
        };
      }
    }
  } catch {
    // ignore
  }

  return (
    <>
      {collectionJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
        />
      )}
      {children}
    </>
  );
}
