/**
 * /slayt/[slug] — legacy Turkish URL alias.
 *
 * The Next.js config-level redirect (`next.config.js`) fires first for all
 * /slayt/* requests and sends a 308 to /slides/*. This page component exists
 * as a belt-and-suspenders fallback for any edge case where the config-level
 * redirect is bypassed (e.g. internal client-side navigation that skips the
 * edge). It always issues a permanent redirect to the canonical /slides/...
 * URL and never renders any UI.
 */
import { notFound, permanentRedirect } from 'next/navigation';
import { buildSlidePath, splitIdSlug } from '@/lib/url';
import { getApiBaseUrl } from '@/lib/api-origin';

const API_URL = getApiBaseUrl();

export const dynamic = 'force-dynamic';

async function fetchSlide(token: string) {
  if (!API_URL) return null;
  const decoded = decodeURIComponent(token || '');
  const parsed = splitIdSlug(decoded);
  const endpoint = parsed.id
    ? `/slides/${parsed.id}`
    : /^\d+$/.test(decoded)
      ? `/slides/${decoded}`
      : `/slides/slug/${encodeURIComponent(decoded)}`;

  try {
    const res = await fetch(`${API_URL}${endpoint}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function toQueryString(searchParams?: Record<string, string | string[] | undefined>) {
  if (!searchParams) return '';
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
      continue;
    }
    if (typeof value === 'string') query.set(key, value);
  }
  const str = query.toString();
  return str ? `?${str}` : '';
}

export default async function SlaytLegacyRedirectPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const slide = await fetchSlide(params.slug);
  if (!slide) notFound();

  // Always redirect to canonical /slides/... — never render.
  const canonicalPath = buildSlidePath({ id: slide.id, slug: slide.slug, title: slide.title });
  permanentRedirect(`${canonicalPath}${toQueryString(searchParams)}`);
}
