import type { Metadata } from 'next';
import { buildCategorySeoDescription } from '@/lib/categorySeo';
import { getApiBaseUrl } from '@/lib/api-origin';

const API_URL = getApiBaseUrl();
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

// force-dynamic: prevents build-time API calls (ECONNREFUSED in CI).
// Category pages are user-generated and cannot be statically pre-rendered.
export const dynamic = 'force-dynamic';

async function fetchCategory(slug: string) {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/categories/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const cat = await fetchCategory(params.slug);
    if (!cat) return { title: 'Kategori' };

    const title = `${cat.name} Slaytlari ve Konulari | Slaytim`;
    const description = buildCategorySeoDescription(cat.name);
    const url = `${BASE_URL}/kategori/${params.slug}`;

    return {
      title,
      description,
      openGraph: { title, description, url, type: 'website', siteName: 'Slaytim' },
      twitter: { card: 'summary', title, description },
      alternates: { canonical: url },
    };
  } catch {
    return { title: 'Kategori' };
  }
}

// generateStaticParams intentionally removed: would cause build-time API fetches
// (ECONNREFUSED in CI). Pages are rendered on-demand via force-dynamic.

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
