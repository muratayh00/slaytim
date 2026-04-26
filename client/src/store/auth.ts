import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
  bio?: string | null;
  isAdmin: boolean;
  emailVerifiedAt?: string | null;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password }, { timeout: 10_000 });
    // isLoading: false prevents a concurrent hydrate() from overwriting this user
    set({ user: data.user, token: null, isLoading: false });
  },

  register: async (username, email, password) => {
    const { data } = await api.post('/auth/register', { username, email, password }, { timeout: 10_000 });
    // isLoading: false prevents a concurrent hydrate() from overwriting this user
    set({ user: data.user, token: null, isLoading: false });
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch (err) {
      console.error('[auth] logout request failed:', err);
    }
    set({ user: null, token: null, isLoading: false });
  },

  hydrate: async () => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const { data } = await api.get('/auth/me');
        const resolvedUser = data?.user ?? (data?.id ? data : null);

        // Race-condition guard: if login() or register() completed while this
        // network request was in-flight, their state takes priority.
        // We detect this by checking that user is still null AND isLoading is
        // still true (both remain from the initial state until login/register
        // explicitly set isLoading:false).
        set((state) => {
          if (state.user !== null && !state.isLoading) {
            // login/register already set an authenticated user — don't overwrite
            return { isLoading: false };
          }
          return { user: resolvedUser, token: null, isLoading: false };
        });
        return;
      } catch (err: any) {
        const isNetworkIssue = !err?.response;
        if (!isNetworkIssue || attempt === 3) {
          set((state) => {
            // Same guard: never clobber a successfully logged-in user
            if (state.user !== null && !state.isLoading) return { isLoading: false };
            return { user: null, token: null, isLoading: false };
          });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      }
    }
  },
}));
