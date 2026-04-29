import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

export const metadata: Metadata = {
  title: 'Konular | Slaytim',
  description: 'Slaytim\'de tüm konuları keşfet. Eğitim, teknoloji, iş dünyası ve daha fazlası için sunumlar.',
  alternates: { canonical: `${BASE_URL}/kesfet` },
  openGraph: {
    title: 'Konular | Slaytim',
    description: 'Slaytim\'de tüm konuları keşfet.',
    url: `${BASE_URL}/kesfet`,
    siteName: 'Slaytim',
    type: 'website',
  },
};

export default function TopicsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
