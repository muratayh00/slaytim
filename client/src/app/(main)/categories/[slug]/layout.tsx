import type { Metadata } from 'next';
import { buildCategorySeoDescription } from '@/lib/categorySeo';
import { getApiBaseUrl } from '@/lib/api-origin';

const API_URL = getApiBaseUrl();
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const res = await fetch(`${API_URL}/categories/${params.slug}`, { next: { revalidate: 86400 } });
    if (!res.ok) return { title: 'Kategori' };
    const cat = await res.json();

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

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/categories`, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((cat: { slug: string }) => ({ slug: cat.slug }));
  } catch {
    return [];
  }
}

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

