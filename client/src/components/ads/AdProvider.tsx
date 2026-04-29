'use client';

/**
 * AdProvider.tsx
 *
 * Sayfa bazlı reklam metadata'sını React context aracılığıyla taşır.
 * Her sayfa bileşenini bu provider ile sarmala; tüm alt AdSlot'lar
 * otomatik olarak doğru page_type ve context'i okur.
 *
 * Kullanım:
 *   <AdProvider pageType="slide_detail" context={{ slideId: 123, topicId: 5 }}>
 *     <SlideDetailPage />
 *   </AdProvider>
 */

import { createContext, useContext, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import type { PageType } from '@/lib/adConfig';
import { useAdFrequencyStore } from '@/lib/adFrequencyManager';

// ── Context tipi ─────────────────────────────────────────────────────────────

export interface AdPageContext {
  categoryId?: number;
  topicId?: number;
  slideId?: number;
  roomId?: number;
}

interface AdContextValue {
  pageType: PageType;
  pageContext: AdPageContext;
}

const AdContext = createContext<AdContextValue>({
  pageType: 'unknown',
  pageContext: {},
});

// ── Provider ─────────────────────────────────────────────────────────────────

export function AdProvider({
  children,
  pageType,
  context = {},
}: {
  children: React.ReactNode;
  pageType: PageType;
  context?: AdPageContext;
}) {
  const pathname = usePathname();
  const resetPageCount = useAdFrequencyStore((s) => s.resetPageCount);

  // Sayfa değişince page-level ad sayacını sıfırla
  useEffect(() => {
    resetPageCount(pathname);
  }, [pathname, resetPageCount]);

  const value = useMemo(
    () => ({ pageType, pageContext: context }),
    [pageType, context],
  );

  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAdContext(): AdContextValue {
  return useContext(AdContext);
}
