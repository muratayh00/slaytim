import type { Metadata } from 'next';
import { buildCategorySeoDescription } from '@/lib/categorySeo';
import { getApiBaseUrl } from '@/lib/api-origin';

const API_URL = getApiBaseUrl();
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

// force-dynamic: prevents build-time API calls (ECONNREFUSED in CI).
// Category pages are user-generated and cannot be statically pre-rendered.
export const dynamic = 'force-dynamic';

async function fetchCategory(slug: string) {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/categories/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const cat = await fetchCategory(params.slug);
    if (!cat) return { title: 'Kategori' };

    const title = `${cat.name} Slaytlari ve Konulari | Slaytim`;
    const description = buildCategorySeoDescription(cat.name);
    const url = `${BASE_URL}/kategori/${params.slug}`;
    const topicCount = Number(cat?._count?.topics || 0);

    return {
      title,
      description,
      ...(topicCount <= 0 ? { robots: { index: false, follow: false } } : {}),
      openGraph: { title, description, url, type: 'website', siteName: 'Slaytim' },
      twitter: { card: 'summary', title, description },
      alternates: { canonical: url },
    };
  } catch {
    return { title: 'Kategori' };
  }
}

// generateStaticParams intentionally removed: would cause build-time API fetches
// (ECONNREFUSED in CI). Pages are rendered on-demand via force-dynamic.

async function fetchCategoryTopics(slug: string) {
  if (!API_URL) return null;
  try {
    // Cap at 12 — enough for ItemList signal, not so many that we blow up
    // the JSON-LD payload. Google de-duplicates anyway.
    const res = await fetch(`${API_URL}/topics?categorySlug=${encodeURIComponent(slug)}&sort=popular&limit=12`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function CategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  // CollectionPage + ItemList: tells Google that /kategori/<slug> is a curated
  // collection landing (vs. a single article), and gives it a top-N preview of
  // members so it can render a richer SERP card.
  let collectionJsonLd: object | null = null;
  try {
    const [cat, topicsPayload] = await Promise.all([
      fetchCategory(params.slug),
      fetchCategoryTopics(params.slug),
    ]);
    if (cat) {
      const url = `${BASE_URL}/kategori/${params.slug}`;
      const topics: Array<{ id: number; title: string; slug?: string }> = Array.isArray(topicsPayload?.topics)
        ? topicsPayload.topics
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
        name: cat.name,
        url,
        description: buildCategorySeoDescription(cat.name).slice(0, 300),
        inLanguage: 'tr-TR',
        isPartOf: { '@type': 'WebSite', name: 'Slaytim', url: BASE_URL },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: Number(cat?._count?.topics || itemListElement.length),
          itemListElement,
        },
      };
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
