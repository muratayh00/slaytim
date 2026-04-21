/**
 * adViewability.ts
 *
 * Viewability tracking (IAB standard: 50% visible for 1 continuous second)
 * and scroll-depth tracking for ad revenue optimisation.
 *
 * All events are fire-and-forget and never block the UI thread.
 */

import { analytics } from '@/lib/analytics';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    adsbygoogle: unknown[];
  }
}

/* ─── Viewability ────────────────────────────────────────────── */

type ViewabilityCallback = (slotId: string, visibleMs: number) => void;

const VIEWABILITY_THRESHOLD = 0.5; // 50% visible (IAB standard)
const VIEWABILITY_MIN_MS = 1000;   // 1 continuous second

/**
 * Attach an IntersectionObserver to an ad container element.
 * Fires `onViewed` once the slot has been 50% visible for ≥1 second.
 * Returns a cleanup function — call it when the component unmounts.
 */
export function observeAdViewability(
  el: Element,
  slotId: string,
  onViewed: ViewabilityCallback,
): () => void {
  let enterTime: number | null = null;
  let fired = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (fired) return;

      if (entry.isIntersecting && entry.intersectionRatio >= VIEWABILITY_THRESHOLD) {
        enterTime = Date.now();
        timer = setTimeout(() => {
          if (!fired) {
            fired = true;
            const elapsed = Date.now() - (enterTime || Date.now());
            onViewed(slotId, elapsed);
          }
        }, VIEWABILITY_MIN_MS);
      } else {
        if (timer) { clearTimeout(timer); timer = null; }
        enterTime = null;
      }
    },
    { threshold: VIEWABILITY_THRESHOLD },
  );

  observer.observe(el);

  return () => {
    observer.disconnect();
    if (timer) clearTimeout(timer);
  };
}

/* ─── GA4 event helpers ──────────────────────────────────────── */

function gtagEvent(name: string, params: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.gtag) return;
  try {
    window.gtag('event', name, params);
  } catch {
    // gtag not ready — ignore
  }
}

/** Fire when an ad slot enters viewability threshold */
export function trackAdViewed(slotId: string, placementLabel: string, visibleMs: number) {
  analytics.adImpression({
    slot_id: slotId,
    placement: placementLabel,
    visible_ms: visibleMs,
  });
  gtagEvent('ad_viewed', {
    slot_id: slotId,
    placement: placementLabel,
    visible_ms: visibleMs,
  });
}

/** Fire when a user clicks on an ad container (best-effort, AdSense manages real clicks) */
export function trackAdClicked(slotId: string, placementLabel: string) {
  analytics.adClick({ slot_id: slotId, placement: placementLabel });
  gtagEvent('ad_clicked', { slot_id: slotId, placement: placementLabel });
}

/* ─── Scroll depth ───────────────────────────────────────────── */

type ScrollDepthCallback = (depth: 25 | 50 | 75 | 100) => void;

const DEPTH_MILESTONES = [25, 50, 75, 100] as const;

/**
 * Track scroll depth for the current page.
 * Fires `onMilestone` once per milestone (25, 50, 75, 100%).
 * Returns cleanup function.
 */
export function trackScrollDepth(onMilestone: ScrollDepthCallback): () => void {
  const fired = new Set<number>();

  function check() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    const pct = Math.round((scrollTop / docHeight) * 100);

    for (const milestone of DEPTH_MILESTONES) {
      if (!fired.has(milestone) && pct >= milestone) {
        fired.add(milestone);
        onMilestone(milestone);
      }
    }
  }

  window.addEventListener('scroll', check, { passive: true });
  return () => window.removeEventListener('scroll', check);
}

/** Send scroll milestone to GA4 */
export function trackScrollMilestone(depth: number, page: string) {
  gtagEvent('scroll_depth', { depth_percent: depth, page_label: page });
}
