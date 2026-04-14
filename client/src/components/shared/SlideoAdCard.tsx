'use client';

/**
 * SlideoAdCard.tsx
 *
 * Native in-feed ad that renders inside the Slideo vertical scroll.
 * Styled identically to a Slideo item so it feels contextual, not jarring.
 *
 * Architecture rationale:
 *  - Renders a Google AdSense "infeed / fluid" unit that blends with content
 *  - The card takes up one full slideo-h slot (same snap-point as real slideos)
 *  - Labeled "Sponsorlu" in the top-left corner (legal / AdSense policy)
 *  - Falls back to invisible placeholder when consent not given
 *
 * Frequency: 1 ad per SLIDEO_AD_EVERY items (default: every 5th).
 * Placement label: "slideo_infeed" for GA4 viewability events.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useConsentStore } from '@/store/consent';
import { observeAdViewability, trackAdViewed } from '@/lib/adViewability';

const PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_ID;
const SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT_SLIDEO_INFEED || '0000000000';
const PLACEMENT = 'slideo_infeed';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export default function SlideoAdCard() {
  const advertising = useConsentStore((s) => s.advertising);
  const decided = useConsentStore((s) => s.decided);

  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const viewabilityCleanup = useRef<(() => void) | null>(null);

  const initAd = useCallback(() => {
    if (initialized.current || !advertising || !decided || !PUBLISHER_ID) return;
    try {
      initialized.current = true;
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      initialized.current = false;
    }
  }, [advertising, decided]);

  useEffect(() => {
    if (!advertising || !decided || !PUBLISHER_ID || !containerRef.current) return;

    const lazyObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          initAd();
          lazyObserver.disconnect();
        }
      },
      { threshold: 0.4 }, // fire when 40 % of the card is visible
    );
    lazyObserver.observe(containerRef.current);

    viewabilityCleanup.current = observeAdViewability(
      containerRef.current,
      SLOT,
      (slotId, visibleMs) => trackAdViewed(slotId, PLACEMENT, visibleMs),
    );

    return () => {
      lazyObserver.disconnect();
      viewabilityCleanup.current?.();
    };
  }, [advertising, decided, initAd]);

  /* No consent → invisible spacer (keeps snap scroll consistent) */
  if (!decided || !advertising || !PUBLISHER_ID) {
    return <div className="snap-start shrink-0 slideo-h bg-black" aria-hidden="true" />;
  }

  return (
    <div
      ref={containerRef}
      className="snap-start shrink-0 slideo-h bg-black flex flex-col items-center justify-center relative"
    >
      {/* Sponsorlu label — AdSense policy requires disclosure */}
      <span className="absolute top-3 left-4 z-10 text-[10px] font-bold text-white/50 tracking-widest uppercase select-none">
        Sponsorlu
      </span>

      {/* AdSense fluid / native unit */}
      <div className="w-full h-full flex items-center justify-center px-4">
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', height: '100%' }}
          data-ad-client={PUBLISHER_ID}
          data-ad-slot={SLOT}
          data-ad-format="fluid"
          data-ad-layout-key="-fb+5w+4e-db+86" // vertical content ad layout
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
