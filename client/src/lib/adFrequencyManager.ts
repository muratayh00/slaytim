/**
 * adFrequencyManager.ts
 *
 * Zustand store — oturum bazlı reklam frekans yönetimi.
 * Browser session boyunca yaşar (localStorage'a yazılmaz).
 *
 * Ne yönetir:
 *  - Sayfada kaç reklam gösterildi (sayfa değişince sıfırlanır)
 *  - Oturumda toplam kaç reklam gösterildi
 *  - Son reklamdan bu yana geçen süre (minimum aralık kontrolü için)
 *  - Slideo video reklam session sayacı ve 90s kuralı
 *  - Sticky bottom banner oturum limiti
 */

import { create } from 'zustand';
import { AD_CONFIG } from './adConfig';

// ── State & Actions arayüzü ──────────────────────────────────────────────────

interface AdFrequencyState {
  // ─ Session-level
  sessionAdCount: number;
  sessionVideoAdCount: number;
  lastAdTimestamp: number | null;
  lastVideoAdTimestamp: number | null;
  stickyShownCount: number;

  // ─ Page-level (pathname değişince sıfırlanır)
  pageAdCount: number;
  currentPageKey: string;

  // ─ Actions
  recordImpression: () => void;
  recordVideoImpression: () => void;
  recordStickyImpression: () => void;
  /** Sayfa geçişinde çağır — pageAdCount sıfırlanır */
  resetPageCount: (pageKey: string) => void;

  // ─ Guards
  canShowAd: (options?: { isMobile?: boolean }) => boolean;
  canShowVideoAd: () => boolean;
  canShowStickyAd: () => boolean;

  // ─ Telemetry helpers
  secondsSinceLastAd: () => number | null;
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useAdFrequencyStore = create<AdFrequencyState>((set, get) => ({
  sessionAdCount: 0,
  sessionVideoAdCount: 0,
  lastAdTimestamp: null,
  lastVideoAdTimestamp: null,
  stickyShownCount: 0,
  pageAdCount: 0,
  currentPageKey: '',

  // ── Actions ─────────────────────────────────────────────────────────────────

  recordImpression: () =>
    set((s) => ({
      sessionAdCount: s.sessionAdCount + 1,
      pageAdCount: s.pageAdCount + 1,
      lastAdTimestamp: Date.now(),
    })),

  recordVideoImpression: () =>
    set((s) => ({
      sessionAdCount: s.sessionAdCount + 1,
      pageAdCount: s.pageAdCount + 1,
      lastAdTimestamp: Date.now(),
      sessionVideoAdCount: s.sessionVideoAdCount + 1,
      lastVideoAdTimestamp: Date.now(),
    })),

  recordStickyImpression: () =>
    set((s) => ({ stickyShownCount: s.stickyShownCount + 1 })),

  resetPageCount: (pageKey: string) =>
    set((s) => {
      if (s.currentPageKey === pageKey) return {};
      return { pageAdCount: 0, currentPageKey: pageKey };
    }),

  // ── Guards ───────────────────────────────────────────────────────────────────

  canShowAd: ({ isMobile = false } = {}) => {
    const s = get();
    const maxPerPage = isMobile
      ? AD_CONFIG.mobile.maxAdsPerPage
      : AD_CONFIG.desktop.maxAdsPerPage;

    // Sayfa limitini kontrol et
    if (s.pageAdCount >= maxPerPage) return false;

    // Minimum aralık kontrolü
    if (s.lastAdTimestamp !== null) {
      const elapsedSeconds = (Date.now() - s.lastAdTimestamp) / 1000;
      if (elapsedSeconds < AD_CONFIG.global.minSecondsBetweenAds) return false;
    }

    return true;
  },

  canShowVideoAd: () => {
    const s = get();
    const cfg = AD_CONFIG.slideo;
    // Session limiti
    if (s.sessionVideoAdCount >= cfg.maxVideoAdsPerSession) return false;
    // 90 saniye minimum aralık
    if (s.lastVideoAdTimestamp !== null) {
      const elapsed = (Date.now() - s.lastVideoAdTimestamp) / 1000;
      if (elapsed < cfg.minSecondsBetweenVideoAds) return false;
    }
    return true;
  },

  canShowStickyAd: () => {
    const s = get();
    return s.stickyShownCount < AD_CONFIG.mobile.maxStickyPerSession;
  },

  // ── Telemetry ────────────────────────────────────────────────────────────────

  secondsSinceLastAd: () => {
    const { lastAdTimestamp } = get();
    if (lastAdTimestamp === null) return null;
    return (Date.now() - lastAdTimestamp) / 1000;
  },
}));
