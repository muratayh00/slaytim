import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

export const metadata: Metadata = {
  title: 'Slideo | Slaytim',
  description: 'Slaytim Slideo ile kısa slayt akışlarını keşfet. TikTok tarzı sunum deneyimi.',
  alternates: { canonical: `${BASE_URL}/slideo` },
  openGraph: {
    title: 'Slideo | Slaytim',
    description: 'Kısa slayt akışlarını keşfet.',
    url: `${BASE_URL}/slideo`,
    siteName: 'Slaytim',
    type: 'website',
  },
};

export default function SlideoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
