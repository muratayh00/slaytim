import type { Metadata } from 'next';
import Script from 'next/script';
import { buildProfilePath, buildTopicPath } from '@/lib/url';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

type RouteParams = { id?: string; slug?: string };

function getRouteKey(params: RouteParams): string | null {
  return params.id ?? params.slug ?? null;
}

async function fetchTopic(paramValue: string) {
  const key = decodeURIComponent(paramValue);
  const isNumeric = /^\d+$/.test(key);
  const endpoint = isNumeric ? `/topics/${key}` : `/topics/slug/${encodeURIComponent(key)}`;
  const res = await fetch(`${API_URL}${endpoint}`, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  try {
    const key = getRouteKey(params);
    if (!key) return { title: 'Konu Bulunamadi' };

    const topic = await fetchTopic(key);
    if (!topic) return { title: 'Konu Bulunamadi' };

    const title = topic.title as string;
    const description = topic.description
      ? (topic.description as string).slice(0, 155)
      : `${topic._count?.slides || 0} slayt iceren "${title}" konusunu kesfet.`;
    const url = `${BASE_URL}${buildTopicPath({ id: topic.id, slug: topic.slug, title: topic.title })}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        type: 'article',
        siteName: 'Slaytim',
      },
      twitter: { card: 'summary', title, description },
      alternates: { canonical: url },
    };
  } catch {
    return { title: 'Konu' };
  }
}

export default async function TopicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: RouteParams;
}) {
  let jsonLd: object | null = null;

  try {
    const key = getRouteKey(params);
    if (key) {
      const topic = await fetchTopic(key);
      if (topic) {
        const url = `${BASE_URL}${buildTopicPath({ id: topic.id, slug: topic.slug, title: topic.title })}`;
        jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: topic.title,
          description: topic.description || `${topic._count?.slides || 0} slayt iceren konu.`,
          url,
          author: {
            '@type': 'Person',
            name: topic.user?.username || 'Slaytim Kullanicisi',
            url: topic.user?.username ? `${BASE_URL}${buildProfilePath(topic.user.username)}` : BASE_URL,
          },
          publisher: { '@type': 'Organization', name: 'Slaytim', url: BASE_URL },
          datePublished: topic.createdAt,
          mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        };
      }
    }
  } catch {
    // ignore JSON-LD failures
  }

  return (
    <>
      {jsonLd && (
        <Script
          id="topic-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
