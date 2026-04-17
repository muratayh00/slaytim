const PROD_DEFAULT_API_BASE_URL = 'https://api.slaytim.com/api';
const DEV_DEFAULT_API_BASE_URL = 'http://localhost:5001/api';

const toDefaultApiBase = () =>
  process.env.NODE_ENV === 'production' ? PROD_DEFAULT_API_BASE_URL : DEV_DEFAULT_API_BASE_URL;

const trimDots = (value: string) => value.replace(/^\.+/, '');

function normalizeApiBaseUrl(input?: string | null): string {
  const fallback = toDefaultApiBase();
  let candidate = String(input || process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (!candidate) candidate = fallback;

  candidate = candidate
    .replace(/\/api\/api(\/|$)/gi, '/api$1')
    .replace(/\/+$/, '');

  if (!/^https?:\/\//i.test(candidate)) {
    if (candidate.startsWith('//')) {
      candidate = `https:${candidate}`;
    } else if (candidate.startsWith('/')) {
      const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || '').trim();
      if (siteUrl) {
        try {
          candidate = new URL(candidate, siteUrl).toString();
        } catch {
          candidate = fallback;
        }
      } else {
        candidate = fallback;
      }
    } else {
      const hostCandidate = trimDots(candidate);
      if (/^[a-z0-9.-]+(?::\d+)?(\/.*)?$/i.test(hostCandidate)) {
        candidate = `https://${hostCandidate}`;
      } else {
        candidate = fallback;
      }
    }
  }

  try {
    const parsed = new URL(candidate);
    parsed.hostname = trimDots(parsed.hostname.toLowerCase());

    let pathname = (parsed.pathname || '/').replace(/\/{2,}/g, '/');

    // Defensive cleanup for malformed values like "/.slaytim.com/api/api".
    if (/\/[^/]*\.[^/]*\/api/i.test(pathname)) pathname = '/api';

    const apiIndex = pathname.toLowerCase().lastIndexOf('/api');
    pathname = apiIndex >= 0 ? pathname.slice(0, apiIndex + 4) : '/api';

    parsed.pathname = pathname;
    parsed.search = '';
    parsed.hash = '';

    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return fallback;
  }
}

export const API_BASE_URL = normalizeApiBaseUrl();
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/i, '');

export const getApiBaseUrl = () => API_BASE_URL;
export const getApiOrigin = () => API_ORIGIN;

