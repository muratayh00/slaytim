'use client';

/**
 * AdSlot.tsx — Ana reklam bileşeni.
 *
 * AdUnit'in üzerine oturur ve şunları ekler:
 *  - useAdEligibility ile kullanıcı/sayfa uygunluk kontrolü
 *  - useAdFrequencyStore ile frekans sınırı kontrolü
 *  - adConfig.slotIds'den otomatik slot ID çözümü
 *  - CLS'e yol açmayan placeholder (reklam gelmese bile alan reserve edilir)
 *  - Ad-blocker tespiti → premium upsell fallback
 *  - Tüm analytics event'leri (impression, viewable, error, blockDetected)
 *
 * Tüm sayfalarda AdUnit yerine bu bileşeni kullan.
 *
 * Kullanım:
 *   <AdSlot placement="TOP_BANNER" size="leaderboard" />
 *   <AdSlot placement="IN_FEED_NATIVE" size="infeed" index={6} />
 *   <AdSlot placement="RIGHT_RAIL_1" size="rectangle" />
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAdEligibility } from '@/hooks/useAdEligibility';
import { useAdContext } from '@/components/ads/AdProvider';
import { useAdFrequencyStore } from '@/lib/adFrequencyManager';
import { useConsentStore } from '@/store/consent';
import { useAuthStore } from '@/store/auth';
import { AD_CONFIG, type AdPlacementType } from '@/lib/adConfig';
import { adEvents, getDeviceType } from '@/lib/adEvents';
import { observeAdViewability } from '@/lib/adViewability';
import PremiumUpsellCard from '@/components/ads/PremiumUpsellCard';
import type { AdSize } from '@/components/shared/AdUnit';

const PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_ID;

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

// ── Boyut → Tailwind sınıfı ──────────────────────────────────────────────────

const SIZE_STYLES: Record<AdSize, string> = {
  leaderboard:      'h-[90px]  w-full max-w-[728px] mx-auto',
  'leaderboard-sm': 'h-[50px]  w-full max-w-[320px] mx-auto',
  rectangle:        'h-[250px] w-full max-w-[300px]',
  infeed:           'w-full min-h-[100px]',
  square:           'h-[250px] w-[250px]',
  custom:           '',
};

const FORMAT_FOR_SIZE: Record<AdSize, string> = {
  leaderboard:      'horizontal',
  'leaderboard-sm': 'horizontal',
  rectangle:        'rectangle',
  infeed:           'fluid',
  square:           'rectangle',
  custom:           'auto',
};

// ── Props ────────────────────────────────────────────────────────────────────

interface AdSlotProps {
  placement: AdPlacementType;
  size?: AdSize;
  /** Feed/liste içindeki 1-indexed pozisyon (analytics için) */
  index?: number;
  /** Boyut override (size="custom" ile birlikte) */
  className?: string;
  /** data-ad-format override */
  format?: string;
  responsive?: boolean;
  /** Reklam engellenirse premium upsell göster */
  showUpsellOnBlock?: boolean;
}

// ── Bileşen ──────────────────────────────────────────────────────────────────

export default function AdSlot({
  placement,
  size = 'infeed',
  index,
  className = '',
  format,
  responsive = true,
  showUpsellOnBlock = false,
}: AdSlotProps) {
  const { pageType, pageContext } = useAdContext();
  const { eligible } = useAdEligibility(pageType);
  const user = useAuthStore((s) => s.user);
  const advertising = useConsentStore((s) => s.advertising);
  const decided = useConsentStore((s) => s.decided);

  const {
    canShowAd,
    recordImpression,
    sessionAdCount,
    secondsSinceLastAd,
  } = useAdFrequencyStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const viewabilityCleanup = useRef<(() => void) | null>(null);
  const [adBlocked, setAdBlocked] = useState(false);
  const [adInitialized, setAdInitialized] = useState(false);

  const slotId = AD_CONFIG.slotIds[placement] || '';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const placementLabel = `${pageType}_${placement.toLowerCase()}`;

  // Kullanıcı tipi (analytics için)
  const userType = !user
    ? 'guest'
    : user.isAdmin
      ? 'admin'
      : (user as any)?.isPremium
        ? 'premium'
        : 'free';

  // Frekans kontrolü
  const frequencyOk = canShowAd({ isMobile });

  // Reklam gösterilmeli mi?
  const shouldShow = eligible && frequencyOk && Boolean(slotId) && Boolean(PUBLISHER_ID);

  // ── AdSense init ──────────────────────────────────────────────────────────

  const initAd = useCallback(() => {
    if (initialized.current || !advertising || !decided || !PUBLISHER_ID || !slotId) return;
    try {
      initialized.current = true;
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      setAdInitialized(true);
      recordImpression();

      // Analytics: impression
      adEvents.impression({
        ad_slot: slotId,
        placement: placementLabel,
        page_type: pageType,
        device_type: getDeviceType(),
        user_type: userType as any,
        placement_index: index,
        session_ad_count: sessionAdCount,
        time_since_last_ad: secondsSinceLastAd() ?? undefined,
        ...pageContext,
        category_id: pageContext.categoryId,
        topic_id: pageContext.topicId,
        slide_id: pageContext.slideId,
        room_id: pageContext.roomId,
      });
    } catch {
      initialized.current = false;
      adEvents.error({
        ad_slot: slotId,
        placement: placementLabel,
        page_type: pageType,
        device_type: getDeviceType(),
        user_type: userType as any,
        error_reason: 'push_failed',
      });
    }
  }, [
    advertising, decided, slotId, placementLabel, pageType,
    userType, index, sessionAdCount, secondsSinceLastAd,
    recordImpression, pageContext,
  ]);

  useEffect(() => {
    if (!shouldShow || !containerRef.current) return;

    // Lazy init: sadece viewport'a yaklaşınca push()
    const lazyObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          initAd();
          lazyObserver.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    lazyObserver.observe(containerRef.current);

    // IAB viewability tracking
    viewabilityCleanup.current = observeAdViewability(
      containerRef.current,
      slotId,
      (sid, visibleMs) => {
        adEvents.viewable({
          ad_slot: sid,
          placement: placementLabel,
          page_type: pageType,
          device_type: getDeviceType(),
          user_type: userType as any,
          visible_ms: visibleMs,
          placement_index: index,
          session_ad_count: sessionAdCount,
          ...pageContext,
          category_id: pageContext.categoryId,
          topic_id: pageContext.topicId,
          slide_id: pageContext.slideId,
          room_id: pageContext.roomId,
        });
      },
    );

    return () => {
      lazyObserver.disconnect();
      viewabilityCleanup.current?.();
    };
  }, [
    shouldShow, slotId, placementLabel, pageType, userType, index,
    sessionAdCount, initAd, pageContext,
  ]);

  // ── Ad-blocker tespiti ────────────────────────────────────────────────────
  // Reklam init edildikten 2.5 saniye sonra <ins> yüksekliğini kontrol et.
  // AdSense çalışıyorsa element dolmuş olmalı; 0 height = reklam engellendi.

  useEffect(() => {
    if (!adInitialized || !containerRef.current) return;
    const timer = setTimeout(() => {
      const ins = containerRef.current?.querySelector('ins.adsbygoogle');
      if (ins && ins.clientHeight === 0) {
        setAdBlocked(true);
        adEvents.blockDetected({
          ad_slot: slotId,
          placement: placementLabel,
          page_type: pageType,
          device_type: getDeviceType(),
          user_type: userType as any,
        });
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [adInitialized, slotId, placementLabel, pageType, userType]);

  // ── Render: uygun değil veya slot ID yok ─────────────────────────────────

  if (!shouldShow) {
    // Reklam alanını reserve et (CLS önlemi) — sadece consent verilmişse
    if (!eligible) return null;
    const sizeClass = size === 'custom' ? className : SIZE_STYLES[size];
    return (
      <div
        className={`${sizeClass} bg-muted/10 rounded-xl`}
        aria-hidden="true"
        data-ad-placeholder="true"
      />
    );
  }

  // ── Render: ad-blocker tespit edildi ─────────────────────────────────────

  if (adBlocked && showUpsellOnBlock) {
    return (
      <PremiumUpsellCard
        placement={placementLabel}
        trigger="ad_block"
      />
    );
  }

  // ── Render: AdSense unit ─────────────────────────────────────────────────

  const resolvedFormat = format || FORMAT_FOR_SIZE[size];
  const sizeClass = size === 'custom' ? className : SIZE_STYLES[size];

  return (
    <div ref={containerRef} className={sizeClass} data-ad-slot-wrapper={placement}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '100%' }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={slotId}
        data-ad-format={resolvedFormat}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}
