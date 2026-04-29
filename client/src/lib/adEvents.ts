/**
 * adEvents.ts — Kapsamlı reklam analytics event helpers.
 *
 * Tüm event'ler fire-and-forget'tir, hiçbir zaman UI'ı bloke etmez.
 * analytics.ts ile aynı gtag() kanalını kullanır.
 *
 * Event'ler hem GA4'e (gtag) hem de isteğe bağlı backend'e gönderilir.
 * Backend entegrasyonu için sendBeacon kullanılır (navigation'ı bloke etmez).
 */

export type DeviceType = 'mobile' | 'desktop' | 'tablet';
export type UserType = 'guest' | 'free' | 'premium' | 'admin';

// ── Temel event context ──────────────────────────────────────────────────────

export interface AdEventContext {
  /** AdSense slot ID */
  ad_slot: string;
  /** Placement label (e.g. "home_top_banner", "slide_detail_right_rail_1") */
  placement: string;
  /** Hangi sayfa tipinde */
  page_type: string;
  device_type?: DeviceType;
  user_type?: UserType;
  /** Feed/liste içindeki 0-indexed pozisyon */
  placement_index?: number;
  is_premium_user?: boolean;
  /** Bu oturumda kaç reklam gösterildi */
  session_ad_count?: number;
  /** Son reklamdan bu yana geçen saniye */
  time_since_last_ad?: number;
  /** İçerik context'i */
  category_id?: number;
  topic_id?: number;
  slide_id?: number;
  room_id?: number;
}

// ── Yardımcı ────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function gtagEvent(name: string, params: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.gtag) return;
  try {
    window.gtag('event', name, params);
  } catch {
    // gtag henüz hazır değil — yoksay
  }
}

/** Tarayıcı genişliğine göre device type belirle */
export function getDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

// ── Ad event helpers ─────────────────────────────────────────────────────────

export const adEvents = {
  /**
   * Reklam viewport'a girdi (lazy-load tetiklendi).
   * Her reklam slotu için yalnızca bir kez ateşlenir.
   */
  impression: (ctx: AdEventContext) =>
    gtagEvent('ad_impression', {
      ...ctx,
      device_type: ctx.device_type ?? getDeviceType(),
    }),

  /**
   * Reklam IAB viewability eşiğini geçti (50% görünür, ≥1 saniye).
   * Bu event gelir optimizasyonunun ana sinyalidir.
   */
  viewable: (ctx: AdEventContext & { visible_ms: number }) =>
    gtagEvent('ad_viewable', {
      ...ctx,
      device_type: ctx.device_type ?? getDeviceType(),
    }),

  /**
   * Kullanıcı reklama tıkladı.
   * Not: AdSense gerçek tıkları kendi içinde yönetir; bu best-effort.
   */
  click: (ctx: AdEventContext) =>
    gtagEvent('ad_click', { ...ctx }),

  /**
   * Kullanıcı geçilebilir video reklamı geçti.
   */
  skipped: (ctx: AdEventContext & { watched_seconds: number }) =>
    gtagEvent('ad_skipped', { ...ctx }),

  /**
   * Video reklam sonuna kadar izlendi.
   */
  completed: (ctx: AdEventContext & { duration_seconds: number }) =>
    gtagEvent('ad_completed', { ...ctx }),

  /**
   * Kullanıcı reklamı kapattı / dismiss etti.
   */
  closed: (ctx: AdEventContext) =>
    gtagEvent('ad_closed', { ...ctx }),

  /**
   * Reklam yüklenemedi veya render hatası aldı.
   */
  error: (ctx: AdEventContext & { error_reason: string }) =>
    gtagEvent('ad_error', { ...ctx }),

  /**
   * Bu slot için reklam engelleyici tespit edildi.
   * Fallback (premium upsell vb.) gösterildiğinde de ateşlenir.
   */
  blockDetected: (ctx: AdEventContext) =>
    gtagEvent('ad_block_detected', { ...ctx }),

  /**
   * Kullanıcı rewarded ad'e opt-in yaptı ve reklam başladı.
   */
  rewardedStarted: (ctx: AdEventContext) =>
    gtagEvent('rewarded_ad_started', { ...ctx }),

  /**
   * Rewarded ad sonuna kadar izlendi — ödül verildi.
   */
  rewardedCompleted: (ctx: AdEventContext & { reward_type: string }) =>
    gtagEvent('rewarded_ad_completed', { ...ctx }),

  /**
   * Premium upsell kartı görünür oldu.
   */
  premiumUpsellView: (params: {
    placement: string;
    page_type: string;
    trigger?: 'ad_block' | 'premium_gate' | 'download_cta' | 'inline';
  }) => gtagEvent('premium_upsell_view', { ...params }),

  /**
   * Kullanıcı premium upsell CTA'ya tıkladı.
   */
  premiumUpsellClick: (params: {
    placement: string;
    page_type: string;
    cta_text?: string;
  }) => gtagEvent('premium_upsell_click', { ...params }),
};
