import { MetadataRoute } from 'next';
import { buildCategoryPath, buildCollectionPath, buildSlideoPath, buildSlidePath, buildTopicPath } from '@/lib/url';
import { getApiBaseUrl } from '@/lib/api-origin';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';
const API_URL = getApiBaseUrl().replace(/\/+$/, '');
const FETCH_TIMEOUT_MS = 5000;

// force-dynamic: sitemap must reflect current content, not a build-time snapshot.
// Prevents ECONNREFUSED errors when the API is unreachable during CI builds.
export const dynamic = 'force-dynamic';

function toSafeDate(input?: string): Date {
  if (!input) return new Date();
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

const isValidEntityId = (value: unknown): value is number =>
  Number.isInteger(Number(value)) && Number(value) > 0;

async function fetchJson<T>(path: string): Promise<T | null> {
  if (!API_URL) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const text = await res.text();
    const payload = text.trim();
    if (!payload) return null;

    // Build safety: reject obvious HTML/error pages to avoid JSON parse crashes.
    if (payload.startsWith('<!doctype') || payload.startsWith('<html') || payload.startsWith('<')) {
      return null;
    }

    // Prefer explicit JSON responses, but still parse safely if header is missing.
    if (contentType && !contentType.includes('json')) {
      return null;
    }

    try {
      return JSON.parse(payload) as T;
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/kesfet`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/slideo`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.85 },
    { url: `${BASE_URL}/kategori`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/hakkinda`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/iletisim`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/kullanim-kosullari`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/gizlilik`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/kvkk`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/cerez-politikasi`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/rooms`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/collections`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.65 },
  ];

  const categoriesData = await fetchJson<{ id: number; slug: string; name: string; isMain?: boolean; parentId?: number | null }[]>('/categories');
  const categoryPages: MetadataRoute.Sitemap = (categoriesData || [])
    .filter((cat) => cat?.isMain === true || cat?.parentId == null)
    .map((cat) => ({
    url: `${BASE_URL}${buildCategoryPath(cat.slug)}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.75,
  }));

  const topicsData = await fetchJson<{ topics: { id: number; slug?: string; title?: string; createdAt: string; updatedAt?: string }[] }>(
    '/topics?sort=latest&limit=200&page=1',
  );
  const topicPages: MetadataRoute.Sitemap = (topicsData?.topics || [])
    .filter((topic) => isValidEntityId(topic?.id))
    .map((topic) => ({
      url: `${BASE_URL}${buildTopicPath({ id: topic.id, slug: topic.slug, title: topic.title })}`,
      // Prefer updatedAt so Google sees fresh content as fresh (new comments,
      // edits, added slides). Falls back to createdAt for older rows.
      lastModified: toSafeDate(topic.updatedAt || topic.createdAt),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  const slidesData = await fetchJson<{ id: number; slug?: string; title?: string; createdAt: string; updatedAt?: string; conversionStatus?: string }[]>(
    '/slides/popular?limit=300',
  );
  const slidePages: MetadataRoute.Sitemap = (slidesData || [])
    .filter((slide) => isValidEntityId(slide?.id))
    .filter((slide) => !slide?.conversionStatus || slide.conversionStatus === 'done')
    .map((slide) => ({
      url: `${BASE_URL}${buildSlidePath({ id: slide.id, slug: slide.slug, title: slide.title })}`,
      lastModified: toSafeDate(slide.updatedAt || slide.createdAt),
      changeFrequency: 'monthly',
      priority: 0.65,
    }));

  const slideoData = await fetchJson<{ slideos: { id: number; title?: string; createdAt: string; updatedAt?: string }[] }>(
    '/slideo/feed?sort=new&limit=200&page=1',
  );
  const slideoPages: MetadataRoute.Sitemap = (slideoData?.slideos || [])
    .filter((slideo) => isValidEntityId(slideo?.id))
    .map((slideo) => ({
      url: `${BASE_URL}${buildSlideoPath({ id: slideo.id, title: slideo.title })}`,
      lastModified: toSafeDate(slideo.updatedAt || slideo.createdAt),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  const roomsData = await fetchJson<{ rooms: { id: number; slug?: string; updatedAt?: string; createdAt?: string }[] }>('/rooms');
  const roomPages: MetadataRoute.Sitemap = (roomsData?.rooms || [])
    .filter((room) => isValidEntityId(room?.id) && Boolean(String(room?.slug || '').trim()))
    .map((room) => ({
      url: `${BASE_URL}/rooms/${encodeURIComponent(String(room.slug).trim())}`,
      lastModified: toSafeDate(room.updatedAt || room.createdAt),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

  const collectionsData = await fetchJson<{ collections: { id: number; slug?: string; name?: string; updatedAt?: string; createdAt?: string; isPublic?: boolean }[] }>(
    '/collections?sort=latest&limit=200&page=1',
  );
  const collectionPages: MetadataRoute.Sitemap = (collectionsData?.collections || [])
    .filter((col) => isValidEntityId(col?.id) && col?.isPublic !== false)
    .map((col) => ({
      url: `${BASE_URL}${buildCollectionPath({ id: col.id, slug: col.slug, name: col.name })}`,
      lastModified: toSafeDate(col.updatedAt || col.createdAt),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

  // ── Profiles ───────────────────────────────────────────────────────────────
  // Only index profiles that have at least one topic (quality signal).
  // Uses a dedicated "popular contributors" endpoint; falls back to empty list
  // if the endpoint doesn't exist yet so the build never fails.
  const usersData = await fetchJson<{ users: { username: string; updatedAt?: string; createdAt?: string; _count?: { topics?: number; slides?: number } }[] }>(
    '/users?sort=popular&limit=200',
  );
  const profilePages: MetadataRoute.Sitemap = (usersData?.users || [])
    .filter((u) =>
      Boolean(String(u?.username || '').trim()) &&
      Number(u?._count?.topics || 0) + Number(u?._count?.slides || 0) > 0
    )
    .map((u) => ({
      url: `${BASE_URL}/@${encodeURIComponent(String(u.username).trim())}`,
      lastModified: toSafeDate(u.updatedAt || u.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.55,
    }));

  // ── Etiket / Tag pages ──────────────────────────────────────────────────────
  // Only index tags that have actual content (at least 1 topic or slide).
  const tagsData = await fetchJson<{
    tags?: {
      slug: string;
      label?: string;
      updatedAt?: string;
      totals?: { all?: number };
      seo?: { indexable?: boolean; minItems?: number; recentItems?: number };
    }[];
  } | {
    slug: string;
    label?: string;
    updatedAt?: string;
    totals?: { all?: number };
    seo?: { indexable?: boolean; minItems?: number; recentItems?: number };
  }[]>(
    '/tags?indexableOnly=1&limit=1000',
  );
  const tagsArray = Array.isArray(tagsData)
    ? tagsData
    : Array.isArray((tagsData as any)?.tags)
      ? (tagsData as any).tags
      : [];
  const tagPages: MetadataRoute.Sitemap = tagsArray
    .filter((t: any) =>
      Boolean(String(t?.slug || '').trim()) &&
      Number(t?.totals?.all || t?.count || 0) > 0 &&
      (t?.seo?.indexable === true || Number(t?.totals?.all || 0) >= Number(t?.seo?.minItems || 5))
    )
    .map((t: any) => ({
      url: `${BASE_URL}/etiket/${encodeURIComponent(String(t.slug).trim())}`,
      lastModified: toSafeDate(t.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));

  return [
    ...staticPages,
    ...categoryPages,
    ...topicPages,
    ...slidePages,
    ...slideoPages,
    ...roomPages,
    ...collectionPages,
    ...profilePages,
    ...tagPages,
  ];
}
