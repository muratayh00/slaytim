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
        {/*
          Pre-download PDF.js files so they are browser-cached before the user
          navigates to any slide.  Without this, /pdf.min.mjs (2-5 MB) must be
          fetched cold on first slide open, adding 5-30 s on slow connections.
          modulepreload parses and compiles the ES module, not just downloads it.
        */}
        {/*
          Pre-download the PDF.js main module so it is browser-cached before
          the user navigates to any slide.  Without this, the 2-5 MB module
          must be fetched cold, adding 5-30 s on slow connections.
          modulepreload also parses + compiles the ES module ahead of time.

          The worker file (pdf.worker.min.mjs) is NOT preloaded here: PDF.js
          may spawn it via a Blob URL or module Worker, which never matches a
          preload hint — the browser would just emit a "preloaded but not used"
          warning and waste the bandwidth.  The worker loads fast enough once
          the main module is warm.
        */}
        <link rel="modulepreload" href="/pdf.min.mjs" />
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
