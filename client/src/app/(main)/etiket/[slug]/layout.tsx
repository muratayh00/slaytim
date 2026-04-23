import type { Metadata } from 'next';
import { getApiBaseUrl } from '@/lib/api-origin';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';
const API_URL = getApiBaseUrl();

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug || '');
  const label = slug.replace(/-/g, ' ');
  let indexable = false;
  if (API_URL && slug) {
    try {
      const res = await fetch(`${API_URL}/tags/${encodeURIComponent(slug)}`, { cache: 'no-store' });
      if (res.ok) {
        const payload = await res.json();
        indexable = Boolean(payload?.seo?.indexable);
      }
    } catch {
      // Ignore metadata fetch failures.
    }
  }
  return {
    title: `#${label} etiketi | Slaytim`,
    description: `#${label} etiketiyle ilgili slayt ve konulari kesfet.`,
    alternates: { canonical: `${BASE_URL}/etiket/${slug}` },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

export default function TagLayout({ children }: { children: React.ReactNode }) {
  return children;
}
