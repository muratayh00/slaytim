import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Providers from '@/components/shared/Providers';
import CookieBanner from '@/components/shared/CookieBanner';
import AdSenseScript from '@/components/shared/AdSenseScript';
import GlobalErrorBoundary from '@/components/shared/GlobalErrorBoundary';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Slaytim - Kisa Slayt Kesif Platformu',
    template: '%s | Slaytim',
  },
  description: "Sunumlardan kisa slaytlar olustur, paylas ve kesfet. Turkiye'nin slayt kesif platformu.",
  keywords: ['slayt', 'sunum', 'paylasim', 'egitim', 'slideo', 'slaytim', 'konu', 'kategori', 'kisa slayt', 'kesif'],
  authors: [{ name: 'Slaytim' }],
  creator: 'Slaytim',
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: '/',
    siteName: 'Slaytim',
    title: 'Slaytim - Kisa Slayt Kesif Platformu',
    description: 'Sunumlardan kisa slaytlar olustur, paylas ve kesfet.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Slaytim' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Slaytim - Kisa Slayt Kesif Platformu',
    description: 'Sunumlardan kisa slaytlar olustur, paylas ve kesfet.',
    creator: '@slaytim',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: { canonical: '/' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className={`${font.variable} font-sans`}>
        <Providers>
          <GlobalErrorBoundary>
            {children}
            <CookieBanner />
            <AdSenseScript />
            <Suspense fallback={null}>
              <GoogleAnalytics />
            </Suspense>
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'hsl(var(--card))',
                  color: 'hsl(var(--card-foreground))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.875rem',
                  fontSize: '13.5px',
                  fontWeight: '500',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                },
              }}
            />
          </GlobalErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
