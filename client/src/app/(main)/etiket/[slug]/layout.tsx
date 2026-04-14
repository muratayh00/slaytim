import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug || '');
  const label = slug.replace(/-/g, ' ');
  return {
    title: `#${label} etiketi | Slaytim`,
    description: `#${label} etiketiyle ilgili slayt ve konulari kesfet.`,
    alternates: { canonical: `${BASE_URL}/etiket/${slug}` },
  };
}

export default function TagLayout({ children }: { children: React.ReactNode }) {
  return children;
}
