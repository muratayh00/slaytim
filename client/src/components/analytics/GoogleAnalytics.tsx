'use client';

/**
 * GoogleAnalytics.tsx
 *
 * Script injection YAPMAZ — o layout.tsx <head> içinde server-side yapılır.
 *
 * Görevleri:
 * 1. Consent Mode v2 güncellemesi (4 alan)
 *    Kullanıcı cookie banner kararı verince gtag('consent','update',{...})
 *    çağrılır. Returning user'lar için hydration sırasında da tetiklenir;
 *    layout'taki wait_for_update:500 penceresinden önce consent promote edilir.
 *
 * 2. SPA page_view
 *    pathname değiştiğinde analytics consent varsa page_view gönderilir.
 *    (layout'ta send_page_view:false olduğu için initial hit tekrarlanmaz.)
 *
 * Bileşen hiçbir zaman görsel çıktı üretmez (return null).
 * Root layout'ta <Suspense> içinde çağrılır (useSearchParams gereği).
 */

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useConsentStore } from '@/store/consent';
import { analytics } from '@/lib/analytics';

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

type ConsentState = 'granted' | 'denied';

interface ConsentParams {
  analytics_storage: ConsentState;
  ad_storage: ConsentState;
  ad_user_data: ConsentState;
  ad_personalization: ConsentState;
}

/** gtag consent update — window.gtag yoksa sessizce atla */
function gtagConsentUpdate(params: ConsentParams) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function' || !GA_ID) return;
  window.gtag('consent', 'update', params);
}

export default function GoogleAnalytics() {
  const analyticsConsent  = useConsentStore((s) => s.analytics);
  const advertisingConsent = useConsentStore((s) => s.advertising);
  const decided            = useConsentStore((s) => s.decided);
  const pathname           = usePathname();
  const searchParams       = useSearchParams();
  const query              = searchParams?.toString() || '';

  const lastTrackedUrl = useRef<string | null>(null);
  const isFirstRender  = useRef(true);

  // ── Consent Mode v2 updater ──────────────────────────────────────────────
  // Hem mount anında (returning user) hem de consent değişince çalışır.
  // Layout'taki default:'denied' üzerine kullanıcı tercihini yazar.
  useEffect(() => {
    if (!decided) return; // Banner henüz görülmedi — default:'denied' geçerli
    const adState: ConsentState = advertisingConsent ? 'granted' : 'denied';
    gtagConsentUpdate({
      analytics_storage  : analyticsConsent ? 'granted' : 'denied',
      ad_storage         : adState,
      ad_user_data       : adState,
      ad_personalization : adState,
    });
  }, [decided, analyticsConsent, advertisingConsent]);

  // ── SPA page_view ─────────────────────────────────────────────────────────
  // İlk render atlanır (duplicate önlemi). Sonraki route değişimlerinde
  // analytics consent varsa page_view gönderilir.
  useEffect(() => {
    if (!analyticsConsent || !decided || !GA_ID) return;
    const url = pathname + (query ? `?${query}` : '');

    if (isFirstRender.current) {
      isFirstRender.current = false;
      lastTrackedUrl.current = url;
      return;
    }

    if (lastTrackedUrl.current === url) return;
    lastTrackedUrl.current = url;
    analytics.pageView(url);
  }, [pathname, query, analyticsConsent, decided]);

  return null;
}
