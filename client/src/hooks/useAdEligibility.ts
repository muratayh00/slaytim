'use client';

/**
 * useAdEligibility.ts
 *
 * Mevcut kullanıcı/sayfa için reklam gösterilip gösterilmeyeceğini kontrol eder.
 *
 * Kontroller (sırayla):
 *  1. Consent karar verildi mi?
 *  2. Bu sayfa tipi devre dışı mı?
 *  3. Admin kullanıcı mı?
 *  4. Premium kullanıcı mı?
 *  5. Advertising consent verilmiş mi?
 */

import { useAuthStore } from '@/store/auth';
import { useConsentStore } from '@/store/consent';
import { AD_CONFIG, type PageType } from '@/lib/adConfig';

export interface AdEligibilityResult {
  eligible: boolean;
  /**
   * Neden gösterilmediğinin kısa açıklaması.
   * Analytics ve debug için kullanılır; kullanıcıya gösterilmez.
   */
  reason?: string;
}

export function useAdEligibility(pageType: PageType): AdEligibilityResult {
  const user = useAuthStore((s) => s.user);
  const advertising = useConsentStore((s) => s.advertising);
  const decided = useConsentStore((s) => s.decided);

  // 1. Consent henüz verilmedi — placeholder space'i koru, reklam gösterme
  if (!decided) {
    return { eligible: false, reason: 'consent_pending' };
  }

  // 2. Devre dışı sayfa tipi (auth, admin, legal, notifications, private chat, upload)
  if ((AD_CONFIG.global.disabledPages as readonly string[]).includes(pageType)) {
    return { eligible: false, reason: `disabled_page:${pageType}` };
  }

  // 3. Admin kullanıcı
  if (AD_CONFIG.global.disabledForAdmin && user?.isAdmin) {
    return { eligible: false, reason: 'admin_user' };
  }

  // 4. Premium kullanıcı — isPremium alanı ileride User modeline eklenecek
  if (AD_CONFIG.global.disabledForPremium && (user as any)?.isPremium) {
    return { eligible: false, reason: 'premium_user' };
  }

  // 5. Advertising consent verilmemiş
  if (!advertising) {
    return { eligible: false, reason: 'no_advertising_consent' };
  }

  return { eligible: true };
}
