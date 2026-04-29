'use client';

/**
 * StickyBottomAd.tsx — Mobil sticky bottom banner.
 *
 * Kurallar (AD_CONFIG.mobile):
 *  - Sayfa yüklendikten stickyBottomDelaySeconds saniye sonra göster
 *  - Kullanıcı kapatabilir (X butonu)
 *  - Oturum başına maxStickyPerSession kez göster
 *  - Sadece mobilde render et
 *
 * Sayfa layout'unun en altına, BottomNav'ın üstüne ekle:
 *   <StickyBottomAd />
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { useAdEligibility } from '@/hooks/useAdEligibility';
import { useAdContext } from '@/components/ads/AdProvider';
import { useAdFrequencyStore } from '@/lib/adFrequencyManager';
import { useConsentStore } from '@/store/consent';
import { AD_CONFIG } from '@/lib/adConfig';
import { adEvents, getDeviceType } from '@/lib/adEvents';

const PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_ID;
const SLOT = AD_CONFIG.slotIds.STICKY_BOTTOM_MOBILE;

declare global {
  interface Window { adsbygoogle: unknown[]; }
}

export default function StickyBottomAd() {
  const { pageType } = useAdContext();
  const { eligible } = useAdEligibility(pageType);
  const advertising = useConsentStore((s) => s.advertising);
  const decided = useConsentStore((s) => s.decided);
  const { canShowStickyAd, recordStickyImpression, sessionAdCount } = useAdFrequencyStore();

  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const placementLabel = `${pageType}_sticky_bottom_mobile`;

  // Sadece mobil
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const shouldRender =
    eligible &&
    isMobile &&
    advertising &&
    decided &&
    Boolean(SLOT) &&
    Boolean(PUBLISHER_ID) &&
    !dismissed &&
    canShowStickyAd();

  const initAd = useCallback(() => {
    if (initialized.current || !PUBLISHER_ID || !SLOT) return;
    try {
      initialized.current = true;
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      recordStickyImpression();
      adEvents.impression({
        ad_slot: SLOT,
        placement: placementLabel,
        page_type: pageType,
        device_type: 'mobile',
        session_ad_count: sessionAdCount,
      });
    } catch {
      initialized.current = false;
    }
  }, [placementLabel, pageType, sessionAdCount, recordStickyImpression]);

  // Gecikme sonrası göster
  useEffect(() => {
    if (!shouldRender) return;
    const delay = AD_CONFIG.mobile.stickyBottomDelaySeconds * 1000;
    const timer = setTimeout(() => {
      setVisible(true);
      initAd();
    }, delay);
    return () => clearTimeout(timer);
  }, [shouldRender, initAd]);

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    adEvents.closed({
      ad_slot: SLOT || '',
      placement: placementLabel,
      page_type: pageType,
      device_type: 'mobile',
    });
  };

  if (!shouldRender || !visible) return null;

  return (
    <div
      className="fixed bottom-14 left-0 right-0 z-40 flex items-center justify-center px-2 pb-2 lg:hidden"
      data-sticky-ad="true"
    >
      <div ref={containerRef} className="relative w-full max-w-[320px]">
        {/* Kapat butonu */}
        <button
          onClick={handleDismiss}
          className="absolute -top-3 -right-1 z-10 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center shadow-sm hover:bg-muted transition-colors"
          aria-label="Reklamı kapat"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>

        {/* "Reklam" etiketi */}
        <span className="absolute -top-4 left-1 text-[9px] text-muted-foreground/40 font-bold tracking-widest uppercase">
          {AD_CONFIG.global.adLabel}
        </span>

        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '320px', height: '50px' }}
          data-ad-client={PUBLISHER_ID}
          data-ad-slot={SLOT}
          data-ad-format="horizontal"
          data-full-width-responsive="false"
        />
      </div>
    </div>
  );
}
