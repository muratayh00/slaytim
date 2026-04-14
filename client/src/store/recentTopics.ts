import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface RecentTopic {
  id: number;
  title: string;
}

interface RecentTopicsStore {
  byUser: Record<string, RecentTopic[]>;
  addForUser: (userId: number, id: number, title: string) => void;
  clearForUser: (userId: number) => void;
}

export const useRecentTopics = create<RecentTopicsStore>()(
  persist(
    (set, get) => ({
      byUser: {},
      addForUser: (userId, id, title) => {
        const key = String(userId);
        const current = get().byUser[key] || [];
        const filtered = current.filter((t) => t.id !== id);
        set({
          byUser: {
            ...get().byUser,
            [key]: [{ id, title }, ...filtered].slice(0, 15),
          },
        });
      },
      clearForUser: (userId) => {
        const key = String(userId);
        const next = { ...get().byUser };
        delete next[key];
        set({ byUser: next });
      },
    }),
    {
      name: 'recent_topics',
      storage: createJSONStorage(() => {
        // SSR'da localStorage yok — boş bir storage döndür
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      skipHydration: true,
    }
  )
);
