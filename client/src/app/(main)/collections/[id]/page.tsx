import { permanentRedirect, notFound } from 'next/navigation';
import { buildCollectionPath } from '@/lib/url';
import { getApiBaseUrl } from '@/lib/api-origin';
import CollectionDetailClient from './CollectionDetailClient';

const API_URL = getApiBaseUrl();

export const dynamic = 'force-dynamic';

async function fetchCollection(idOrSlug: string) {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/collections/${encodeURIComponent(idOrSlug)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function CollectionDetailPage({ params }: { params: { id: string } }) {
  const col = await fetchCollection(params.id);
  if (!col) notFound();

  const canonicalPath = buildCollectionPath({ id: col.id, slug: col.slug, name: col.name });
  const currentSegment = decodeURIComponent(params.id);

  // Redirect numeric IDs or wrong slugs to canonical slug URL
  if (currentSegment !== canonicalPath.replace('/collections/', '')) {
    permanentRedirect(canonicalPath);
  }

  return <CollectionDetailClient />;
}
