import { MetadataRoute } from 'next';
import { buildCategoryPath, buildSlideoPath, buildSlidePath, buildTopicPath } from '@/lib/url';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
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
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  const categoriesData = await fetchJson<{ id: number; slug: string; name: string }[]>('/categories');
  const categoryPages: MetadataRoute.Sitemap = (categoriesData ?? []).map((cat) => ({
    url: `${BASE_URL}${buildCategoryPath(cat.slug)}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.75,
  }));

  const topicsData = await fetchJson<{ topics: { id: number; slug?: string; title?: string; createdAt: string }[] }>(
    '/topics?sort=latest&limit=200&page=1',
  );
  const topicPages: MetadataRoute.Sitemap = (topicsData?.topics ?? []).map((topic) => ({
    url: `${BASE_URL}${buildTopicPath({ id: topic.id, slug: topic.slug, title: topic.title })}`,
    lastModified: new Date(topic.createdAt),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const slidesData = await fetchJson<{ id: number; slug?: string; title?: string; createdAt: string }[]>(
    '/slides/popular?limit=300',
  );
  const slidePages: MetadataRoute.Sitemap = (slidesData ?? []).map((slide) => ({
    url: `${BASE_URL}${buildSlidePath({ id: slide.id, slug: slide.slug, title: slide.title })}`,
    lastModified: new Date(slide.createdAt),
    changeFrequency: 'monthly',
    priority: 0.65,
  }));

  const slideoData = await fetchJson<{ slideos: { id: number; title?: string; createdAt: string }[] }>(
    '/slideo/feed?sort=new&limit=200&page=1',
  );
  const slideoPages: MetadataRoute.Sitemap = (slideoData?.slideos ?? []).map((slideo) => ({
    url: `${BASE_URL}${buildSlideoPath({ id: slideo.id, title: slideo.title })}`,
    lastModified: new Date(slideo.createdAt),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...topicPages, ...slidePages, ...slideoPages];
}
