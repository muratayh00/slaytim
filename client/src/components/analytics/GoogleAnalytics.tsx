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
import { useAuthStore } from '@/store/auth';

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
  try {
    window.gtag('consent', 'update', params);
  } catch {
    // GA blocked by adblock/consent/network — silent fail
  }
}

/**
 * Returns true when Google's Funding Choices CMP (AdSense panel) has registered
 * a real __tcfapi implementation.  When active for EEA/UK users, the CMP manages
 * all consent signals itself — we must NOT call gtag('consent','update') manually
 * or we risk overriding the CMP's decision.
 */
function isGoogleCmpActive(): boolean {
  if (typeof window === 'undefined') return false;
  // Real TCF handler is a function; pre-stubs are arrays or undefined
  return typeof (window as any).__tcfapi === 'function';
}

export default function GoogleAnalytics() {
  const analyticsConsent   = useConsentStore((s) => s.analytics);
  const advertisingConsent = useConsentStore((s) => s.advertising);
  const decided            = useConsentStore((s) => s.decided);
  const setConsent         = useConsentStore((s) => s.setConsent);
  const pathname           = usePathname();
  const searchParams       = useSearchParams();
  const query              = searchParams?.toString() || '';
  const user               = useAuthStore((s) => s.user);

  const lastTrackedUrl  = useRef<string | null>(null);
  const prevDecided     = useRef(decided);
  const isFirstRender   = useRef(true);

  // ── Auto-grant analytics for authenticated users who haven't seen the banner
  // Logged-in users bypass the cookie banner, so `decided` stays false and GA
  // never fires for them. Grant analytics-only consent on their behalf (no ads).
  // Skip when Google CMP is managing consent (EEA/UK users) — let CMP decide.
  useEffect(() => {
    if (user && !decided && !isGoogleCmpActive()) {
      setConsent({ analytics: true, advertising: false });
    }
  }, [user, decided, setConsent]);

  // ── Consent Mode v2 updater ──────────────────────────────────────────────
  // Skip if Google CMP is active — it calls gtag('consent','update') on its
  // own; a duplicate call from us would override the CMP's decision.
  useEffect(() => {
    if (!decided || isGoogleCmpActive()) return;
    const adState: ConsentState = advertisingConsent ? 'granted' : 'denied';
    gtagConsentUpdate({
      analytics_storage  : analyticsConsent ? 'granted' : 'denied',
      ad_storage         : adState,
      ad_user_data       : adState,
      ad_personalization : adState,
    });
  }, [decided, analyticsConsent, advertisingConsent]);

  // ── SPA page_view ─────────────────────────────────────────────────────────
  // Also fires when consent is granted for the first time (catches the current
  // page that was already loaded before the user accepted cookies).
  useEffect(() => {
    if (!analyticsConsent || !decided || !GA_ID) return;
    const url = pathname + (query ? `?${query}` : '');

    // First render: skip if NOT a fresh consent grant (duplicate prevention).
    // But if decided just flipped from false → true, fire for the current page.
    const justGranted = !prevDecided.current && decided;
    prevDecided.current = decided;

    if (isFirstRender.current && !justGranted) {
      isFirstRender.current = false;
      lastTrackedUrl.current = url;
      return;
    }
    isFirstRender.current = false;

    if (lastTrackedUrl.current === url) return;
    lastTrackedUrl.current = url;
    analytics.pageView(url);
  }, [pathname, query, analyticsConsent, decided]);

  return null;
}
