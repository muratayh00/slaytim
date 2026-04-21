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
  panelOpen: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  setConsent: (prefs: Partial<ConsentPreferences>) => void;
  setHasHydrated: (v: boolean) => void;
  openPanel: () => void;
  closePanel: () => void;
};

export const useConsentStore = create<ConsentStore>()(
  persist(
    (set) => ({
      functional: true, // Her zaman aktif
      analytics: false,
      advertising: false,
      decided: false,
      hasHydrated: false,
      panelOpen: false,

      setHasHydrated: (v) => set({ hasHydrated: v }),

      openPanel: () => set({ panelOpen: true }),
      closePanel: () => set({ panelOpen: false }),

      acceptAll: () =>
        set({ functional: true, analytics: true, advertising: true, decided: true, panelOpen: false }),

      rejectAll: () =>
        set({ functional: true, analytics: false, advertising: false, decided: true, panelOpen: false }),

      setConsent: (prefs) =>
        set((s) => ({ ...s, ...prefs, functional: true, decided: true, panelOpen: false })),
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
