/**
 * GA4 custom event helpers.
 * All calls are fire-and-forget and should never block UI.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function track(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', eventName, params);
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
};

