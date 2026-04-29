'use client';

/**
 * usePageAdRules.ts
 *
 * Sayfa tipine göre adConfig.ts'den placement kurallarını döner.
 * `shouldInsertInFeedAd(index)` helper'ı feed/liste bileşenlerinde kullanılır.
 *
 * index = 1-indexed kart/entry pozisyonu (ilk kart = 1).
 */

import { useCallback, useMemo } from 'react';
import { AD_CONFIG, type PageType } from '@/lib/adConfig';

type DeviceKind = 'mobile' | 'desktop';

export function usePageAdRules(pageType: PageType, device: DeviceKind = 'desktop') {
  const pageRules = useMemo(
    () => (AD_CONFIG.pages as Record<string, any>)[pageType] ?? null,
    [pageType],
  );
  const deviceRules: Record<string, any> = useMemo(
    () => pageRules?.[device] ?? {},
    [pageRules, device],
  );

  /**
   * Bu feed pozisyonuna native in-feed reklam eklenmeli mi?
   * @param index  1-indexed kart/entry pozisyonu
   */
  const shouldInsertInFeedAd = useCallback(
    (index: number): boolean => {
      if (!pageRules) return false;

      // 1. Explicit pozisyon listesi (örn: explore masaüstü [6, 14, 24])
      const positions = deviceRules.inFeedPositions as number[] | undefined;
      if (Array.isArray(positions)) {
        return positions.includes(index);
      }

      // 2. "Her N kartta bir" (inFeedEvery)
      const every = deviceRules.inFeedEvery as number | undefined;
      if (every && every > 0) {
        const startAfter =
          (deviceRules.firstAdAfterCard as number | undefined) ??
          (deviceRules.firstAdAfterEntry as number | undefined) ??
          every;
        if (index < startAfter) return false;
        return (index - startAfter) % every === 0;
      }

      // 3. Mobil first / second explicit pozisyon
      if (device === 'mobile') {
        const first =
          (deviceRules.firstAdAfterCard as number | undefined) ??
          (deviceRules.firstAdAfterEntry as number | undefined) ??
          (deviceRules.firstAdAfterResult as number | undefined);
        const second =
          (deviceRules.secondAdAfterCard as number | undefined) ??
          (deviceRules.secondAdAfterEntry as number | undefined) ??
          (deviceRules.secondAdAfterResult as number | undefined);
        if (first !== undefined && index === first) return true;
        if (second !== undefined && index === second) return true;
      }

      // 4. Desktop first / second result (search)
      if (device === 'desktop') {
        const first = deviceRules.firstAdAfterResult as number | undefined;
        const second = deviceRules.secondAdAfterResult as number | undefined;
        if (first !== undefined && index === first) return true;
        if (second !== undefined && index === second) return true;
      }

      return false;
    },
    [pageRules, deviceRules, device],
  );

  /**
   * Bu feed pozisyonu için hangi positioned slot kullanılmalı?
   * (related feeds, grid vb. için her N kartta bir)
   */
  const shouldInsertRelatedAd = useCallback(
    (index: number, every: number): boolean => {
      if (every <= 0) return false;
      return index > 0 && index % every === 0;
    },
    [],
  );

  return { pageRules, deviceRules, shouldInsertInFeedAd, shouldInsertRelatedAd };
}
