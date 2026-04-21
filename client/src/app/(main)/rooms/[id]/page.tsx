import { permanentRedirect, notFound } from 'next/navigation';
import { buildRoomPath } from '@/lib/url';
import { getApiBaseUrl } from '@/lib/api-origin';
import RoomDetailClient from './RoomDetailClient';

const API_URL = getApiBaseUrl();

export const dynamic = 'force-dynamic';

async function fetchRoom(idOrSlug: string) {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/rooms/${encodeURIComponent(idOrSlug)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function RoomDetailPage({ params }: { params: { id: string } }) {
  const room = await fetchRoom(params.id);
  if (!room) notFound();

  const canonicalPath = buildRoomPath({ slug: room.slug, name: room.name, id: room.id });
  const currentSegment = decodeURIComponent(params.id);

  // Redirect numeric IDs or wrong slugs to canonical slug URL
  if (currentSegment !== canonicalPath.replace('/rooms/', '')) {
    permanentRedirect(canonicalPath);
  }

  return <RoomDetailClient />;
}
