import type { Metadata } from 'next';
import { buildRoomPath } from '@/lib/url';
import { getApiBaseUrl } from '@/lib/api-origin';

const API_URL = getApiBaseUrl();
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

export const dynamic = 'force-dynamic';

type RoomPayload = {
  id: number;
  slug?: string | null;
  name: string;
  description?: string | null;
  isPublic?: boolean;
  viewerIsMember?: boolean;
  _count?: { members?: number };
};

async function fetchRoom(idOrSlug: string): Promise<RoomPayload | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/rooms/${encodeURIComponent(idOrSlug)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchRoomTopicCount(roomId: number): Promise<number> {
  if (!API_URL || !Number.isInteger(roomId) || roomId <= 0) return 0;
  try {
    const res = await fetch(`${API_URL}/topics?roomId=${roomId}&limit=1&page=1&sort=latest`, { cache: 'no-store' });
    if (!res.ok) return 0;
    const data = await res.json();
    return Number(data?.total || 0);
  } catch {
    return 0;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const room = await fetchRoom(params.id);
  if (!room) {
    return {
      title: 'Oda Bulunamadi',
      robots: { index: false, follow: false },
    };
  }

  const canonicalPath = buildRoomPath({ slug: room.slug, name: room.name, id: room.id });
  const canonicalUrl = `${BASE_URL}${canonicalPath}`;
  const description = room.description
    ? room.description.slice(0, 155)
    : `${room.name} odasindaki konu ve paylasimlari kesfet.`;

  const topicCount = await fetchRoomTopicCount(room.id);
  const shouldNoIndex = room.isPublic === false || topicCount <= 0;

  return {
    title: `${room.name} odasi | Slaytim`,
    description,
    ...(shouldNoIndex ? { robots: { index: false, follow: false } } : {}),
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${room.name} odasi | Slaytim`,
      description,
      url: canonicalUrl,
      type: 'website',
      siteName: 'Slaytim',
    },
    twitter: {
      card: 'summary',
      title: `${room.name} odasi | Slaytim`,
      description,
    },
  };
}

export default function RoomDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
