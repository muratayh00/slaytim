import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

export const metadata: Metadata = {
  title: 'Keşfet | Slaytim',
  description: 'Slaytim\'de binlerce sunumu keşfet. Eğitim, teknoloji, iş dünyası ve daha pek çok kategoride slaytlar.',
  alternates: { canonical: `${BASE_URL}/kesfet` },
  openGraph: {
    title: 'Keşfet | Slaytim',
    description: 'Slaytim\'de binlerce sunumu keşfet.',
    url: `${BASE_URL}/kesfet`,
    siteName: 'Slaytim',
    type: 'website',
  },
};

export default function KesfetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
