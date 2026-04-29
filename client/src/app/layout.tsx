import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Providers from '@/components/shared/Providers';
import CookieBanner from '@/components/shared/CookieBanner';
import GlobalErrorBoundary from '@/components/shared/GlobalErrorBoundary';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import BuildVersionGuard from '@/components/shared/BuildVersionGuard';

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

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
    // AI Overview / Perplexity / Bing answer-engine snippet sizing.
    // -1 = unlimited; lets answer engines quote longer machine-readable summaries.
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  alternates: { canonical: '/' },
};

// ── Organization entity ─────────────────────────────────────────────────────
// Brand identity for Knowledge Graph + AI citation. Rendered once at root so
// every Slaytim page advertises the same Organization. logo, sameAs, and
// contactPoint are critical for E-E-A-T signaling.
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Slaytim',
  alternateName: 'slaytim.com',
  url: BASE_URL,
  logo: `${BASE_URL}/icon.png`,
  description: "Türkiye'nin slayt keşif platformu — kısa slaytlar oluştur, paylaş, keşfet.",
  sameAs: [
    'https://twitter.com/slaytim',
    'https://x.com/slaytim',
  ],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'iletisim@slaytim.com',
      availableLanguage: ['Turkish'],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        {/*
          Organization JSON-LD: emitted once site-wide so search engines and
          AI answer engines (ChatGPT, Perplexity, Gemini) can resolve
          "Slaytim" as a single entity. logo, sameAs, contactPoint feed the
          Knowledge Graph.

          PDF.js modulepreload was removed from the root layout — it shipped
          a 2-5 MB module on every page (homepage, profiles, search, settings)
          where PDF.js is never used. It is now preloaded only inside slide
          and slideo route layouts, where the viewer actually mounts.
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />

        {/*
          Google Tag (gtag.js) — Consent Mode v2
          ────────────────────────────────────────
          • Injected server-side so the measurement ID appears in raw HTML
            (required for ads.txt verification and Googlebot crawl).
          • Default consent state is DENIED — GA collects nothing until the
            user accepts via the cookie banner (useConsentStore).
          • GoogleAnalytics client component (below) calls gtag('consent','update')
            on hydration for returning users and on every consent change.
          • wait_for_update:500 gives the client component 500 ms to promote
            consent before GA fires the first hit — prevents data loss for
            users who already accepted.
          • send_page_view:false — SPA page_view events are sent manually by
            the GoogleAnalytics component to avoid double-counting on hydration.
        */}
        {GA_ID && (
          <>
            {/* eslint-disable-next-line @next/next/no-sync-scripts */}
            <script
              dangerouslySetInnerHTML={{
                __html: [
                  'window.dataLayer=window.dataLayer||[];',
                  'function gtag(){dataLayer.push(arguments);}',
                  // Set denied defaults BEFORE loading gtag.js so Consent Mode
                  // is in effect from the very first hit.
                  "gtag('consent','default',{",
                  "  analytics_storage:'denied',",
                  "  ad_storage:'denied',",
                  "  ad_user_data:'denied',",
                  "  ad_personalization:'denied',",
                  "  wait_for_update:500",
                  '});',
                  "gtag('js',new Date());",
                  `gtag('config','${GA_ID}',{send_page_view:false,anonymize_ip:true});`,
                ].join('\n'),
              }}
            />
            {/* async — non-blocking; loads in parallel with page render */}
            {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
          </>
        )}
      </head>
      <body className={`${font.variable} font-sans`}>
        <Providers>
          <GlobalErrorBoundary>
            {children}
            <CookieBanner />
            <BuildVersionGuard />
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
