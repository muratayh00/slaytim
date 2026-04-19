import Link from 'next/link';
import type { Metadata } from 'next';
import { FolderTree } from 'lucide-react';
import { CategoryItem, groupCategories } from '@/lib/categorySeo';
import { getApiBaseUrl } from '@/lib/api-origin';

const API_URL = getApiBaseUrl();
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

// force-dynamic: categories change frequently and the API may not be reachable
// at build time (ECONNREFUSED in CI). Render on first request instead.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tum Kategoriler | Slaytim',
  description: 'YKS, LGS, yazilim, finans, pazarlama ve daha fazlasinda SEO uyumlu kategori landing sayfalari.',
  alternates: { canonical: `${BASE_URL}/kategori` },
  openGraph: {
    title: 'Tum Kategoriler | Slaytim',
    description: 'Ders notlari, slaytlar ve konu anlatimlari icin kategorileri kesfedin.',
    url: `${BASE_URL}/kategori`,
    type: 'website',
    siteName: 'Slaytim',
  },
};

async function getCategories(): Promise<CategoryItem[]> {
  if (!API_URL) return [];
  try {
    const res = await fetch(`${API_URL}/categories`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

export default async function CategoriesPage() {
  const categories = await getCategories();
  const grouped = groupCategories(categories);
  const totalTopics = categories.reduce((sum, cat) => sum + Number(cat?._count?.topics || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <section className="border border-border bg-card rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <FolderTree className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Tum Kategoriler</h1>
            <p className="text-sm text-muted-foreground">
              {categories.length} kategori • {totalTopics} aktif konu
            </p>
          </div>
        </div>
        <p className="text-sm md:text-base text-muted-foreground max-w-3xl">
          Kategoriler SEO niyetine gore gruplanmistir. Her kategori kendi slug sayfasinda konu listesi, takip ozelligi ve
          guncel icerik akisiyla sunulur.
        </p>
      </section>

      {grouped.map((group) => (
        <section key={group.key} className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">{group.title}</h2>
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {group.items.map((cat) => (
              <Link
                key={cat.id}
                href={`/kategori/${cat.slug}`}
                className="border border-border rounded-xl px-4 py-3 bg-card hover:border-primary/40 transition-colors"
              >
                <p className="text-sm font-medium leading-snug">{cat.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{Number(cat?._count?.topics || 0)} konu</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
