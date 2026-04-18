/**
 * Central media URL resolver.
 *
 * Returns an absolute URL string, or null when the input is missing/invalid.
 * Returning null (not '') lets callers use it as a render guard.
 */

import { getApiOrigin } from './api-origin';

const _serverBase = getApiOrigin();
const KNOWN_MEDIA_ROOTS = new Set(['thumbnails', 'pdfs', 'slides', 'avatars', 'originals']);

function toCanonicalUploadsPath(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const pathname = decodeURIComponent(parsed.pathname || '').replace(/^\/+/, '');
    if (!pathname) return null;

    const parts = pathname.split('/').filter(Boolean);
    if (!parts.length) return null;
    if (parts[0].toLowerCase() === 'uploads') {
      return `/${parts.join('/')}`;
    }
    if (parts.length < 2) return null;

    const first = parts[0].toLowerCase();
    const second = parts[1].toLowerCase();
    const looksBucketPrefix =
      first.includes('upload') || first.includes('bucket') || first.includes('slaytim');

    if (!looksBucketPrefix || !KNOWN_MEDIA_ROOTS.has(second)) return null;
    return `/uploads/${parts.slice(1).join('/')}`;
  } catch {
    return null;
  }
}

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Fix double /api/api/ path bug
  const cleaned = trimmed.replace(/\/api\/api\//g, '/api/');

  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    const canonicalPath = toCanonicalUploadsPath(cleaned);
    if (canonicalPath && _serverBase) {
      return `${_serverBase}${canonicalPath}`;
    }
    return cleaned;
  }

  // Relative path -> make absolute
  if (!_serverBase) return null; // misconfigured env -> fail safe
  return `${_serverBase}${cleaned.startsWith('/') ? cleaned : `/${cleaned}`}`;
}

export function isSignedMediaUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const value = url.toLowerCase();
  return (
    value.includes('x-amz-algorithm=')
    || value.includes('x-amz-signature=')
    || value.includes('x-id=getobject')
  );
}
