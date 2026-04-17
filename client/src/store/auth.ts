import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
  bio?: string | null;
  isAdmin: boolean;
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

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    set({ user: data.user, token: null });
  },

  register: async (username, email, password) => {
    const { data } = await api.post('/auth/register', { username, email, password });
    set({ user: data.user, token: null });
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch (err) {
      console.error('[auth] logout request failed:', err);
    }
    set({ user: null, token: null });
  },

  hydrate: async () => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const { data } = await api.get('/auth/me');
        const resolvedUser = data?.user ?? (data?.id ? data : null);
        set({ user: resolvedUser, token: null, isLoading: false });
        return;
      } catch (err: any) {
        const isNetworkIssue = !err?.response;
        if (!isNetworkIssue || attempt === 3) {
          set({ user: null, token: null, isLoading: false });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      }
    }
  },
}));
