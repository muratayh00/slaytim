import type { Metadata } from 'next';
import { buildCollectionPath } from '@/lib/url';
import { getApiBaseUrl } from '@/lib/api-origin';

const API_URL = getApiBaseUrl();
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

export const dynamic = 'force-dynamic';

type CollectionPayload = {
  id: number;
  slug?: string | null;
  name: string;
  description?: string | null;
  isPublic?: boolean;
  _count?: { slides?: number };
  user?: { username?: string };
};

async function fetchCollection(idOrSlug: string): Promise<CollectionPayload | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/collections/${encodeURIComponent(idOrSlug)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const col = await fetchCollection(params.id);
  if (!col) {
    return {
      title: 'Koleksiyon Bulunamadi',
      robots: { index: false, follow: false },
    };
  }

  const title = `${col.name} koleksiyonu | Slaytim`;
  const description = col.description
    ? col.description.slice(0, 155)
    : `${col.name} koleksiyonundaki slaytlari kesfet.`;
  const canonicalPath = buildCollectionPath({ id: col.id, slug: col.slug, name: col.name });
  const canonicalUrl = `${BASE_URL}${canonicalPath}`;
  const slideCount = Number(col?._count?.slides || 0);
  const shouldNoIndex = col.isPublic === false || slideCount <= 0;

  return {
    title,
    description,
    ...(shouldNoIndex ? { robots: { index: false, follow: false } } : {}),
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonicalUrl,
      siteName: 'Slaytim',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default function CollectionDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
