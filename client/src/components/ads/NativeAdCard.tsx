'use client';

/**
 * NativeAdCard.tsx — İçerik akışına uyum sağlayan native reklam kartı.
 *
 * SlideCard / TopicCard ile aynı görsel ağırlıkta.
 * AdSense "infeed / fluid" format kullanır — platformun içerik renk şemasına uyar.
 *
 * Kullanım:
 *   feed.map((item, i) => {
 *     if (shouldInsertInFeedAd(i + 1)) return <NativeAdCard key={`ad-${i}`} index={i + 1} />;
 *     return <SlideCard key={item.id} slide={item} />;
 *   })
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAdEligibility } from '@/hooks/useAdEligibility';
import { useAdContext } from '@/components/ads/AdProvider';
import { useAdFrequencyStore } from '@/lib/adFrequencyManager';
import { useConsentStore } from '@/store/consent';
import { AD_CONFIG } from '@/lib/adConfig';
import { adEvents, getDeviceType } from '@/lib/adEvents';
import { observeAdViewability } from '@/lib/adViewability';

const PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_ID;
const SLOT = AD_CONFIG.slotIds.IN_FEED_NATIVE;

declare global {
  interface Window { adsbygoogle: unknown[]; }
}

interface NativeAdCardProps {
  /** 1-indexed feed pozisyonu (analytics için) */
  index?: number;
  className?: string;
}

export default function NativeAdCard({ index, className = '' }: NativeAdCardProps) {
  const { pageType, pageContext } = useAdContext();
  const { eligible } = useAdEligibility(pageType);
  const advertising = useConsentStore((s) => s.advertising);
  const decided = useConsentStore((s) => s.decided);
  const { canShowAd, recordImpression, sessionAdCount, secondsSinceLastAd } = useAdFrequencyStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const viewabilityCleanup = useRef<(() => void) | null>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const placementLabel = `${pageType}_in_feed_native`;

  const shouldShow = eligible && canShowAd({ isMobile }) && Boolean(SLOT) && Boolean(PUBLISHER_ID);

  const initAd = useCallback(() => {
    if (initialized.current || !advertising || !decided || !PUBLISHER_ID || !SLOT) return;
    try {
      initialized.current = true;
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      recordImpression();
      adEvents.impression({
        ad_slot: SLOT,
        placement: placementLabel,
        page_type: pageType,
        device_type: getDeviceType(),
        placement_index: index,
        session_ad_count: sessionAdCount,
        time_since_last_ad: secondsSinceLastAd() ?? undefined,
        category_id: pageContext.categoryId,
        topic_id: pageContext.topicId,
        slide_id: pageContext.slideId,
        room_id: pageContext.roomId,
      });
    } catch {
      initialized.current = false;
    }
  }, [advertising, decided, placementLabel, pageType, index, sessionAdCount, secondsSinceLastAd, recordImpression, pageContext]);

  useEffect(() => {
    if (!shouldShow || !containerRef.current) return;

    const lazyObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          initAd();
          lazyObserver.disconnect();
        }
      },
      { rootMargin: '150px' },
    );
    lazyObserver.observe(containerRef.current);

    viewabilityCleanup.current = observeAdViewability(
      containerRef.current,
      SLOT,
      (sid, visibleMs) =>
        adEvents.viewable({
          ad_slot: sid,
          placement: placementLabel,
          page_type: pageType,
          device_type: getDeviceType(),
          visible_ms: visibleMs,
          placement_index: index,
          session_ad_count: sessionAdCount,
          category_id: pageContext.categoryId,
          topic_id: pageContext.topicId,
          slide_id: pageContext.slideId,
          room_id: pageContext.roomId,
        }),
    );

    return () => {
      lazyObserver.disconnect();
      viewabilityCleanup.current?.();
    };
  }, [shouldShow, placementLabel, pageType, index, sessionAdCount, initAd, pageContext]);

  // Uygun değil veya slot yok → alan sıfır (layout'u bozma)
  if (!shouldShow) return null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full min-h-[100px] rounded-2xl border border-border bg-card overflow-hidden ${className}`}
      data-ad-native="true"
    >
      {/* "Reklam" etiketi — yasal zorunluluk */}
      <span className="absolute top-2 right-2 z-10 text-[9px] font-bold text-muted-foreground/50 tracking-widest uppercase select-none">
        {AD_CONFIG.global.adLabel}
      </span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minHeight: 100 }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={SLOT}
        data-ad-format="fluid"
        data-ad-layout-key="-6t+ed+2i-1n-4w"
        data-full-width-responsive="true"
      />
    </div>
  );
}
