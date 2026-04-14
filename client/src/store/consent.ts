'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ConsentPreferences = {
  functional: boolean; // Zorunlu - kapatılamaz
  analytics: boolean; // Google Analytics vb.
  advertising: boolean; // Google AdSense vb.
};

type ConsentStore = ConsentPreferences & {
  decided: boolean;
  hasHydrated: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  setConsent: (prefs: Partial<ConsentPreferences>) => void;
  setHasHydrated: (v: boolean) => void;
};

export const useConsentStore = create<ConsentStore>()(
  persist(
    (set) => ({
      functional: true, // Her zaman aktif
      analytics: false,
      advertising: false,
      decided: false,
      hasHydrated: false,

      setHasHydrated: (v) => set({ hasHydrated: v }),

      acceptAll: () =>
        set({ functional: true, analytics: true, advertising: true, decided: true }),

      rejectAll: () =>
        set({ functional: true, analytics: false, advertising: false, decided: true }),

      setConsent: (prefs) =>
        set((s) => ({ ...s, ...prefs, functional: true, decided: true })),
    }),
    {
      name: 'slaytim-consent',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ({
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
          length: 0,
          clear: () => {},
          key: () => null,
        } as unknown as Storage)
      ),
    }
  )
);

if (typeof window !== 'undefined') {
  const markHydrated = () => useConsentStore.setState({ hasHydrated: true });
  if (useConsentStore.persist.hasHydrated()) {
    markHydrated();
  }
  useConsentStore.persist.onFinishHydration(markHydrated);
}
