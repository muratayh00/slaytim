import { getApiBaseUrl } from '@/lib/api-origin';
import HomeClient from './HomeClient';

const API_URL = getApiBaseUrl().replace(/\/+$/, '');
const FETCH_TIMEOUT_MS = 4000;

export const dynamic = 'force-dynamic';

async function fetchJson<T>(path: string): Promise<T | null> {
  if (!API_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: 'no-store', signal: controller.signal });
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

export default async function HomePage() {
  // Fetch all homepage data in parallel on the server
  const [trending, latestData, popular, categories, slideoData] = await Promise.all([
    fetchJson<any[]>('/topics/trending'),
    fetchJson<{ topics: any[] }>('/topics?sort=latest&limit=12'),
    fetchJson<any[]>('/slides/popular'),
    fetchJson<any[]>('/categories'),
    fetchJson<{ slideos: any[] }>('/slideo/feed?sort=popular&limit=8'),
  ]);

  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com').replace(/\/+$/, '');
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Slaytim',
    url: base,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${base}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomeClient
        initialTrending={(trending || []).slice(0, 6)}
        initialLatest={latestData?.topics || []}
        initialPopular={popular || []}
        initialCategories={categories || []}
        initialTrendingSlideos={slideoData?.slideos || []}
      />
    </>
  );
}
