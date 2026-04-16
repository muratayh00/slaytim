/**
 * media.ts — Centralised backend media URL resolver.
 *
 * Returns an absolute URL string, or null when the input is missing/invalid.
 * Returning null (not '') lets callers use it as a render guard:
 *
 *   const src = resolveMediaUrl(user.avatarUrl);
 *   {src && <Image src={src} ... />}
 *
 * Rules:
 *  1. Falsy / whitespace-only → null
 *  2. Already absolute http(s) URL → return as-is
 *  3. Relative path (/uploads/…) → prepend the API server origin
 *  4. Fix accidental double /api/api/ segment produced by some legacy helpers
 */

// Derive the server origin from the API URL env var.
// NEXT_PUBLIC_API_URL is expected to be "https://api.slaytim.com/api".
// Stripping the trailing /api gives us the upload-serving origin.
const _apiBase =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001/api');

const _serverBase = _apiBase.replace(/\/api$/, '');

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Fix double /api/api/ path bug
  const cleaned = trimmed.replace(/\/api\/api\//g, '/api/');

  // Already an absolute URL — trust it as-is
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) return cleaned;

  // Relative path — make absolute
  if (!_serverBase) return null; // misconfigured production env — bail safely
  return `${_serverBase}${cleaned.startsWith('/') ? cleaned : `/${cleaned}`}`;
}
