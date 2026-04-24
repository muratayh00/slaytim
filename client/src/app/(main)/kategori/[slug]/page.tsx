import { notFound } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/api-origin';
import CategoryPage from '../../categories/[slug]/page';

const API_URL = getApiBaseUrl();

export const dynamic = 'force-dynamic';

async function fetchCategoryData(slug: string) {
  if (!API_URL) return { category: null, topics: [], notFound: true };
  try {
    const decodedSlug = decodeURIComponent(slug);
    const [catRes, topicsRes] = await Promise.all([
      fetch(`${API_URL}/categories/${encodeURIComponent(decodedSlug)}`, { cache: 'no-store' }),
      fetch(`${API_URL}/topics?category=${encodeURIComponent(decodedSlug)}&limit=24`, { cache: 'no-store' }),
    ]);

    // 404 from the category API → genuine missing category, but render an empty
    // state instead of calling Next.js notFound().  This prevents RSC prefetch
    // requests from returning 404, which would surface as console errors even
    // though the category may simply have been renamed/reorganised.
    if (catRes.status === 404) {
      return { category: null, topics: [], notFound: true };
    }

    // Any other non-ok status (500, 503 …) is a transient backend error.
    // Propagate it so Next.js shows the error boundary instead of a blank page.
    if (!catRes.ok) {
      throw new Error(`Category API error: ${catRes.status}`);
    }

    const category = await catRes.json();
    const topicsData = topicsRes.ok ? await topicsRes.json() : { topics: [] };
    return { category, topics: topicsData.topics || [], notFound: false };
  } catch (err: any) {
    // Surface backend/network errors as 500, not 404.
    if (err?.message?.startsWith('Category API error:')) throw err;
    return { category: null, topics: [], notFound: true };
  }
}

export default async function KategoriDetailPage({ params }: { params: { slug: string } }) {
  const data = await fetchCategoryData(params.slug);

  // Only hard-404 for truly missing categories when this is a direct navigation
  // (not an RSC prefetch).  For prefetch requests Next.js will see a 200 with
  // the "not found" UI and quietly discard it — no console error.
  // We detect prefetch by checking the Next-Router-Prefetch header.
  // If it IS a direct navigation and the category is missing, show a proper 404.
  // NOTE: headers() is only available in server components; the import is lazy
  // to avoid breaking static builds that don't support it.
  if (data.notFound) {
    let isPrefetch = false;
    try {
      const { headers } = await import('next/headers');
      isPrefetch = headers().get('Next-Router-Prefetch') === '1';
    } catch {
      // headers() unavailable (e.g. during build) — treat as direct navigation
    }
    if (!isPrefetch) {
      notFound();
    }
    // For prefetch requests: fall through and render the empty state (200) so
    // the browser doesn't log a network error.
  }

  return (
    <CategoryPage
      initialCategory={data.category ?? undefined}
      initialTopics={data.topics}
    />
  );
}
