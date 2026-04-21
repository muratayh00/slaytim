import { notFound } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/api-origin';
import CategoryPage from '../../categories/[slug]/page';

const API_URL = getApiBaseUrl();

export const dynamic = 'force-dynamic';

async function fetchCategoryData(slug: string) {
  if (!API_URL) return null;
  try {
    const [catRes, topicsRes] = await Promise.all([
      fetch(`${API_URL}/categories/${encodeURIComponent(slug)}`, { cache: 'no-store' }),
      fetch(`${API_URL}/topics?category=${encodeURIComponent(slug)}&limit=24`, { cache: 'no-store' }),
    ]);
    if (!catRes.ok) return null;
    const category = await catRes.json();
    const topicsData = topicsRes.ok ? await topicsRes.json() : { topics: [] };
    return { category, topics: topicsData.topics || [] };
  } catch {
    return null;
  }
}

export default async function KategoriDetailPage({ params }: { params: { slug: string } }) {
  const data = await fetchCategoryData(params.slug);
  if (!data) notFound();

  return (
    <CategoryPage
      initialCategory={data.category}
      initialTopics={data.topics}
    />
  );
}
