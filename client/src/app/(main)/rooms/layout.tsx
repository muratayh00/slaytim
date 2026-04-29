import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

export const metadata: Metadata = {
  title: 'Odalar | Slaytim',
  description: 'Slaytim Odaları ile canlı sunum deneyimi yaşa. Gerçek zamanlı slayt paylaşım odalarına katıl.',
  alternates: { canonical: `${BASE_URL}/rooms` },
  openGraph: {
    title: 'Odalar | Slaytim',
    description: 'Canlı sunum odalarına katıl.',
    url: `${BASE_URL}/rooms`,
    siteName: 'Slaytim',
    type: 'website',
  },
};

export default function RoomsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
