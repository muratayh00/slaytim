'use client';

/**
 * AdUnit.tsx
 *
 * Google AdSense ad unit with:
 *  - Consent-gated rendering (advertising flag from Zustand store)
 *  - Lazy initialisation via IntersectionObserver (only push() when visible)
 *  - IAB viewability tracking (50 % visible for ≥ 1 s → GA4 event)
 *  - CLS prevention: placeholder reserves exact dimensions before consent
 *  - Size presets: leaderboard, rectangle, infeed, square
 */

import { useEffect, useRef, useCallback } from 'react';
import { useConsentStore } from '@/store/consent';
import { observeAdViewability, trackAdViewed } from '@/lib/adViewability';

const PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_ID;

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

/* ─── Size presets ───────────────────────────────────────────── */
export type AdSize =
  | 'leaderboard'   // 728 × 90  – desktop top/bottom banner
  | 'leaderboard-sm' // 320 × 50 – mobile leaderboard
  | 'rectangle'     // 300 × 250 – universal mid-content
  | 'infeed'        // fluid height – native in-feed
  | 'square'        // 250 × 250 – sidebar
  | 'custom';       // caller supplies className with exact dimensions

const SIZE_STYLES: Record<AdSize, string> = {
  leaderboard:   'h-[90px]  w-full max-w-[728px] mx-auto',
  'leaderboard-sm': 'h-[50px] w-full max-w-[320px] mx-auto',
  rectangle:     'h-[250px] w-full max-w-[300px]',
  infeed:        'w-full min-h-[100px]',
  square:        'h-[250px] w-[250px]',
  custom:        '',
};

const FORMAT_FOR_SIZE: Record<AdSize, string> = {
  leaderboard:   'horizontal',
  'leaderboard-sm': 'horizontal',
  rectangle:     'rectangle',
  infeed:        'fluid',
  square:        'rectangle',
  custom:        'auto',
};

/* ─── Props ──────────────────────────────────────────────────── */
type AdUnitProps = {
  slot: string;
  /** Placement label used in GA4 viewability events (e.g. "slide_detail_bottom") */
  placement?: string;
  size?: AdSize;
  /** Override className (only used when size="custom") */
  className?: string;
  /** data-ad-format override */
  format?: string;
  responsive?: boolean;
};

export default function AdUnit({
  slot,
  placement = 'unknown',
  size = 'infeed',
  className = '',
  format,
  responsive = true,
}: AdUnitProps) {
  const advertising = useConsentStore((s) => s.advertising);
  const decided = useConsentStore((s) => s.decided);

  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const viewabilityCleanup = useRef<(() => void) | null>(null);

  /* Push ad once element is visible (lazy init) */
  const initAd = useCallback(() => {
    if (initialized.current || !advertising || !decided || !PUBLISHER_ID) return;
    try {
      initialized.current = true;
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Script not ready yet — next IntersectionObserver tick will retry
      initialized.current = false;
    }
  }, [advertising, decided]);

  useEffect(() => {
    if (!advertising || !decided || !PUBLISHER_ID || !containerRef.current) return;

    // Lazy-init: only call push() when the ad slot enters the viewport
    const lazyObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          initAd();
          lazyObserver.disconnect();
        }
      },
      { rootMargin: '200px' }, // start loading 200 px before it scrolls into view
    );
    lazyObserver.observe(containerRef.current);

    // Viewability tracking (IAB: 50 % for ≥ 1 s)
    viewabilityCleanup.current = observeAdViewability(
      containerRef.current,
      slot,
      (slotId, visibleMs) => trackAdViewed(slotId, placement, visibleMs),
    );

    return () => {
      lazyObserver.disconnect();
      viewabilityCleanup.current?.();
    };
  }, [advertising, decided, initAd, slot, placement]);

  /* ── Consent not given or env missing → reserve space, show nothing ── */
  if (!decided || !advertising || !PUBLISHER_ID) {
    const sizeClass = size === 'custom' ? className : SIZE_STYLES[size];
    return (
      <div
        className={`${sizeClass} bg-muted/10 rounded-xl`}
        aria-hidden="true"
        data-ad-placeholder="true"
      />
    );
  }

  const resolvedFormat = format ?? FORMAT_FOR_SIZE[size];
  const sizeClass = size === 'custom' ? className : SIZE_STYLES[size];

  return (
    <div ref={containerRef} className={sizeClass}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '100%' }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={slot}
        data-ad-format={resolvedFormat}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}
