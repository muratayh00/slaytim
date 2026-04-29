import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

export const metadata: Metadata = {
  title: 'Koleksiyonlar | Slaytim',
  description: 'Slaytim\'de slayt koleksiyonlarını keşfet ve takip et. Kişiselleştirilmiş slayt listeleri oluştur.',
  alternates: { canonical: `${BASE_URL}/collections` },
  openGraph: {
    title: 'Koleksiyonlar | Slaytim',
    description: 'Slayt koleksiyonlarını keşfet ve takip et.',
    url: `${BASE_URL}/collections`,
    siteName: 'Slaytim',
    type: 'website',
  },
};

export default function CollectionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
