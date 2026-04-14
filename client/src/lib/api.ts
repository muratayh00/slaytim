import axios from 'axios';
import toast from 'react-hot-toast';

// In production the env var must be set. In development fall back to localhost
// so `npm run dev` works without extra configuration.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('NEXT_PUBLIC_API_URL env var is required in production'); })()
    : 'http://localhost:5001/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30_000,
});

const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);
let csrfToken: string | null = null;
let csrfPromise: Promise<string | null> | null = null;

const ensureCsrfToken = async (): Promise<string | null> => {
  if (csrfToken) return csrfToken;
  if (!csrfPromise) {
    csrfPromise = api
      .get('/auth/csrf')
      .then((res) => {
        csrfToken = res?.data?.csrfToken || null;
        return csrfToken;
      })
      .catch(() => null)
      .finally(() => {
        csrfPromise = null;
      });
  }
  return csrfPromise;
};

api.interceptors.request.use(async (config) => {
  const method = String(config.method || 'get').toLowerCase();
  if (!UNSAFE_METHODS.has(method)) return config;

  const token = await ensureCsrfToken();
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers['x-csrf-token']) {
      config.headers['x-csrf-token'] = token;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = Number(err?.response?.status || 0);
    const retryableHttp = status === 408 || status === 425 || status === 429 || status === 502 || status === 503 || status === 504;
    if (!err.response || retryableHttp) {
      const original: any = err.config || {};
      const method = String(original.method || 'get').toLowerCase();
      if (method === 'get' && (original.__networkRetryCount || 0) < 2) {
        original.__networkRetryCount = (original.__networkRetryCount || 0) + 1;
        const waitMs = 250 * original.__networkRetryCount;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        return api.request(original);
      }
    }
    if (err.response?.status === 403 && String(err.response?.data?.error || '').toLowerCase().includes('csrf')) {
      csrfToken = null;
      const original: any = err.config || {};
      if (!original.__csrfRetry) {
        original.__csrfRetry = true;
        const token = await ensureCsrfToken();
        if (token) {
          original.headers = original.headers || {};
          original.headers['x-csrf-token'] = token;
          return api.request(original);
        }
      }
    }
    if (err.response?.status === 429) {
      toast.error('Çok fazla istek, lütfen bekleyin');
    } else if (err.response?.status === 503) {
      toast.error('Sunucu geçici olarak kullanılamıyor');
    } else if (!err.response && err.code !== 'ERR_CANCELED') {
      // Network error (no response at all) — log it
      console.error('[api] Network error:', err.message);
    }

    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const reqUrl = String(err.config?.url || '');
      const isAuthProbe = reqUrl.includes('/auth/me') || reqUrl.includes('/auth/login') || reqUrl.includes('/auth/register');
      if (!isAuthProbe) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export default api;
