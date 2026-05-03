import { permanentRedirect, notFound } from 'next/navigation';
import { buildCollectionPath } from '@/lib/url';
import { getApiBaseUrl } from '@/lib/api-origin';
import CollectionDetailClient from './CollectionDetailClient';

const API_URL = getApiBaseUrl();

export const dynamic = 'force-dynamic';

/** Sentinel returned when the API says 403 (private collection — server has no auth cookie) */
const FORBIDDEN = Symbol('forbidden');

async function fetchCollection(idOrSlug: string): Promise<Record<string, unknown> | typeof FORBIDDEN | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/collections/${encodeURIComponent(idOrSlug)}`, { cache: 'no-store' });
    if (res.status === 403) return FORBIDDEN;   // private collection → let client handle auth
    if (!res.ok) return null;                    // true 404 or other error
    return res.json();
  } catch {
    return null;
  }
}

export default async function CollectionDetailPage({ params }: { params: { id: string } }) {
  const col = await fetchCollection(params.id);

  // True 404 (collection doesn't exist).
  // For RSC prefetch requests we return a 200 with empty UI so the browser
  // doesn't log a network error in the console (same pattern as /kategori/[slug]).
  if (!col) {
    let isPrefetch = false;
    try {
      const { headers } = await import('next/headers');
      isPrefetch = headers().get('Next-Router-Prefetch') === '1';
    } catch {
      // headers() unavailable during build — treat as direct navigation
    }
    if (!isPrefetch) notFound();
    // Prefetch: render nothing (200) so the browser discards it silently
    return null;
  }

  // Private collection: server component has no auth cookie, delegate entirely to client
  if (col === FORBIDDEN) {
    return <CollectionDetailClient />;
  }

  const canonicalPath = buildCollectionPath({ id: col.id as number, slug: col.slug as string | null, name: col.name as string | null });
  const currentSegment = decodeURIComponent(params.id);

  // Redirect numeric IDs or wrong slugs to canonical slug URL
  if (currentSegment !== canonicalPath.replace('/collections/', '')) {
    permanentRedirect(canonicalPath);
  }

  return <CollectionDetailClient />;
}
