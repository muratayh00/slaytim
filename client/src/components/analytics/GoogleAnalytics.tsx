'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useConsentStore } from '@/store/consent';
import { analytics } from '@/lib/analytics';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function GoogleAnalytics() {
  const analyticsConsent = useConsentStore((s) => s.analytics);
  const decided = useConsentStore((s) => s.decided);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrl = useRef<string | null>(null);
  const firstRender = useRef(true);
  const query = searchParams?.toString() || '';

  // Track route changes without duplicates.
  // Initial page_view is sent by gtag config to avoid race conditions.
  useEffect(() => {
    if (!analyticsConsent || !decided || !GA_MEASUREMENT_ID) return;
    const url = pathname + (query ? `?${query}` : '');
    if (firstRender.current) {
      firstRender.current = false;
      lastTrackedUrl.current = url;
      return;
    }
    if (lastTrackedUrl.current === url) return;
    lastTrackedUrl.current = url;
    analytics.pageView(url);
  }, [pathname, query, analyticsConsent, decided]);

  // Don't load GA until consent is given and env var is set
  if (!decided || !analyticsConsent || !GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="ga4-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              send_page_view: true,
              anonymize_ip: true,
              cookie_flags: 'SameSite=None;Secure'
            });
          `,
        }}
      />
    </>
  );
}
