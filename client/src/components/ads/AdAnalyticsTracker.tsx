'use client';

/**
 * AdAnalyticsTracker.tsx — Sayfa bazlı reklam analytics takibi.
 *
 * Her sayfanın layout/root'una ekle. Şunları otomatik izler:
 *  - Scroll derinliği (25/50/75/100%)
 *  - Sayfa terk edildiğinde session ad count raporlama
 *  - Sayfa değişince frequency store'u sıfırlama
 *
 * Kullanım (sayfa layout'larında):
 *   <AdAnalyticsTracker />
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackScrollDepth, trackScrollMilestone } from '@/lib/adViewability';
import { useAdFrequencyStore } from '@/lib/adFrequencyManager';
import { useAdContext } from '@/components/ads/AdProvider';

export default function AdAnalyticsTracker() {
  const pathname = usePathname();
  const { pageType } = useAdContext();
  const { resetPageCount, sessionAdCount } = useAdFrequencyStore();

  // Sayfa değişince pageAdCount sıfırla
  useEffect(() => {
    resetPageCount(pathname);
  }, [pathname, resetPageCount]);

  // Scroll derinliği izle
  useEffect(() => {
    const cleanup = trackScrollDepth((depth) => {
      trackScrollMilestone(depth, pageType);
    });
    return cleanup;
  }, [pathname, pageType]);

  // Sayfa kapatılınca session bilgisini log'la (isteğe bağlı beacon)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (typeof window === 'undefined' || !navigator.sendBeacon) return;
      // Backend'e session ad count raporla (opsiyonel — endpoint yoksa no-op)
      const body = JSON.stringify({
        session_ad_count: sessionAdCount,
        page_type: pageType,
        pathname,
      });
      try {
        navigator.sendBeacon('/api/analytics/ad-session', new Blob([body], { type: 'application/json' }));
      } catch {
        // Sessizce yoksay
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionAdCount, pageType, pathname]);

  // Bu bileşen UI render etmez — sadece side-effect'ler
  return null;
}
