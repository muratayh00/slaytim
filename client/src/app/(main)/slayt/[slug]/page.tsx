import { Suspense } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import SlideDetailClientPage from '../../slides/[id]/page';
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

export default async function SlideCanonicalPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const slide = await fetchSlide(params.slug);
  if (!slide) notFound();

  const canonicalPath = buildSlidePath({ id: slide.id, slug: slide.slug, title: slide.title });
  const currentPath = `/slayt/${decodeURIComponent(params.slug)}`;
  if (currentPath !== canonicalPath) {
    permanentRedirect(`${canonicalPath}${toQueryString(searchParams)}`);
  }

  // SlideDetailClientPage calls useSearchParams() — in Next.js 14, any client
  // component that uses useSearchParams() must be wrapped in <Suspense> when
  // rendered from a server component, otherwise Next.js bails out of SSR for
  // the entire subtree and the page returns no <h1> in the initial HTML.
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="skeleton h-8 w-48 mb-6 rounded-xl" />
        <div className="skeleton aspect-video rounded-2xl mb-6" />
        <div className="skeleton h-10 w-2/3 rounded-xl mb-4" />
        <div className="skeleton h-5 w-full rounded-xl mb-2" />
        <div className="skeleton h-5 w-3/4 rounded-xl" />
      </div>
    }>
      <SlideDetailClientPage initialSlide={slide} />
    </Suspense>
  );
}
