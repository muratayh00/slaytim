import { notFound, permanentRedirect } from 'next/navigation';
import TopicDetailClientPage from '../../topics/[id]/page';
import { buildTopicPath, splitIdSlug } from '@/lib/url';
import { getApiBaseUrl } from '@/lib/api-origin';

const API_URL = getApiBaseUrl();

export const dynamic = 'force-dynamic';

async function fetchTopic(token: string) {
  if (!API_URL) return null;
  const decoded = decodeURIComponent(token || '');
  const parsed = splitIdSlug(decoded);
  const endpoint = parsed.id
    ? `/topics/${parsed.id}`
    : /^\d+$/.test(decoded)
      ? `/topics/${decoded}`
      : `/topics/slug/${encodeURIComponent(decoded)}`;

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

export default async function TopicCanonicalPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const topic = await fetchTopic(params.slug);
  if (!topic) notFound();

  const canonicalPath = buildTopicPath({ id: topic.id, slug: topic.slug, title: topic.title });
  const currentPath = `/konu/${decodeURIComponent(params.slug)}`;
  if (currentPath !== canonicalPath) {
    permanentRedirect(`${canonicalPath}${toQueryString(searchParams)}`);
  }

  return <TopicDetailClientPage />;
}
