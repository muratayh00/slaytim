/**
 * GA4 custom event helpers.
 * All calls are fire-and-forget and should never block UI.
 */

import { useConsentStore } from '@/store/consent';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Returns true only when the user has explicitly granted analytics consent
 * and the Zustand store has been hydrated from localStorage.
 *
 * Uses Zustand's `getState()` — works outside React components, always
 * returns the latest state without subscribing to updates.
 *
 * This gate prevents custom events from reaching gtag() when consent is
 * not yet granted, which in turn reduces the number of g/collect requests
 * that get blocked by AdBlock (and show as "POST failed" in console).
 */
function isAnalyticsGranted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const { analytics: analyticsConsent, decided, hasHydrated } = useConsentStore.getState();
    return hasHydrated && decided && analyticsConsent;
  } catch {
    return false; // store not ready
  }
}

function track(eventName: string, params?: Record<string, unknown>) {
  // Consent guard — skip silently if analytics not yet granted.
  // Reduces g/collect POST requests that AdBlock would block and log to console.
  if (!isAnalyticsGranted()) return;
  if (typeof window === 'undefined' || !window.gtag) return;
  try {
    window.gtag('event', eventName, params);
  } catch {
    // GA blocked by adblock/consent/network — silent fail, never crash UI
  }
}

export const analytics = {
  pageView: (pagePath: string) =>
    track('page_view', {
      page_path: pagePath,
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    }),

  viewContent: (params: { content_type: 'topic' | 'slide' | 'slideo'; content_id: number; title: string }) =>
    track('view_content', params),

  saveContent: (params: { content_type: 'slide' | 'slideo'; content_id: number }) =>
    track('save_content', params),

  likeContent: (params: { content_type: 'topic' | 'slide' | 'slideo'; content_id: number }) =>
    track('like_content', params),

  share: (params: { content_type: 'slide' | 'slideo'; content_id: number; method?: string }) =>
    track('share', params),

  slideoComplete: (params: { slideo_id: number; title: string }) =>
    track('slideo_complete', params),

  uploadComplete: (params: { slide_id: number; title: string }) =>
    track('upload_complete', params),

  search: (params: { search_term: string }) =>
    track('search', params),

  followUser: (params: { target_user_id: number }) =>
    track('follow_user', params),

  signUp: () => track('sign_up'),
  login: () => track('login'),

  slideoViewTrackFailure: (params: {
    slideo_id: number;
    source: 'viewer' | 'detail';
    status?: number;
    attempt: number;
  }) => track('slideo_view_track_failure', params),

  slideoViewTrackRetrySuccess: (params: {
    slideo_id: number;
    source: 'viewer' | 'detail';
    attempt: number;
  }) => track('slideo_view_track_retry_success', params),

  adImpression: (params: { slot_id: string; placement: string; visible_ms?: number }) =>
    track('ad_impression', params),

  adClick: (params: { slot_id: string; placement: string }) =>
    track('ad_click', params),

  adViewable: (params: { slot_id: string; placement: string; visible_ms: number }) =>
    track('ad_viewable', params),

  adSkipped: (params: { slot_id: string; placement: string; watched_seconds: number }) =>
    track('ad_skipped', params),

  adCompleted: (params: { slot_id: string; placement: string; duration_seconds: number }) =>
    track('ad_completed', params),

  adClosed: (params: { slot_id: string; placement: string }) =>
    track('ad_closed', params),

  adError: (params: { slot_id: string; placement: string; error_reason: string }) =>
    track('ad_error', params),

  adBlockDetected: (params: { slot_id: string; placement: string }) =>
    track('ad_block_detected', params),

  rewardedAdStarted: (params: { slot_id: string; placement: string }) =>
    track('rewarded_ad_started', params),

  rewardedAdCompleted: (params: { slot_id: string; placement: string; reward_type: string }) =>
    track('rewarded_ad_completed', params),

  premiumUpsellView: (params: { placement: string; page_type: string; trigger?: string }) =>
    track('premium_upsell_view', params),

  premiumUpsellClick: (params: { placement: string; page_type: string; cta_text?: string }) =>
    track('premium_upsell_click', params),

  sponsoredView: (params: {
    content_type: 'slide' | 'topic' | 'slideo';
    content_id: number;
    sponsor_name?: string;
    campaign_id?: string;
  }) => track('sponsored_view', params),

  sponsoredClick: (params: {
    content_type: 'slide' | 'topic' | 'slideo';
    content_id: number;
    sponsor_name?: string;
    campaign_id?: string;
  }) => track('sponsored_click', params),

  /**
   * Fires when the first visual (image or PDF page) is rendered for a slide.
   * Used to measure Time-to-First-Visual (TTFV) performance.
   * @param mode  'images' = WebP preview rendered | 'pdf' = PDF.js rendered
   * @param ttMs  Milliseconds from navigation start to first visual
   */
  previewFirstVisual: (params: {
    slide_id: number;
    mode: 'images' | 'pdf';
    tt_ms: number;
  }) => {
    track('preview_first_visual', params); // already consent-gated via track()
    // Also fire to our own backend for server-side aggregation.
    // Gate on the same analytics consent — this is behavioral tracking data.
    if (!isAnalyticsGranted() || typeof window === 'undefined') return;
    const body = JSON.stringify(params);
    // Use sendBeacon so it doesn't block navigation
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/preview-metric', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/analytics/preview-metric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => { /* fire and forget */ });
    }
  },
};
