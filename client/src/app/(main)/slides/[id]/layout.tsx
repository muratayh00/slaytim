import type { Metadata } from 'next';
import Script from 'next/script';
import { Suspense } from 'react';
import { buildProfilePath, buildSlidePath, buildTopicPath, splitIdSlug } from '@/lib/url';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';
const SERVER_BASE = API_URL.replace('/api', '');

function resolveUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return path.startsWith('http') ? path : `${SERVER_BASE}${path}`;
}

async function fetchSlide(id: string) {
  const res = await fetch(`${API_URL}/slides/${id}`, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  return res.json();
}

function getParamId(params: { id?: string; slug?: string }): string {
  const raw = String(params.id || params.slug || '');
  const parsed = splitIdSlug(raw);
  return String(parsed.id || raw);
}

export async function generateMetadata({ params }: { params: { id?: string; slug?: string } }): Promise<Metadata> {
  try {
    const slide = await fetchSlide(getParamId(params));
    if (!slide) return { title: 'Slayt Bulunamadı' };

    const title = slide.title as string;
    const description = slide.description
      ? (slide.description as string).slice(0, 155)
      : `"${title}" sunumunu görüntüle ve indir.`;
    const url = `${BASE_URL}${buildSlidePath({ id: slide.id, slug: slide.slug, title: slide.title })}`;
    const image = resolveUrl(slide.thumbnailUrl);

    const isPending = slide.conversionStatus === 'pending' || slide.conversionStatus === 'processing';

    return {
      title,
      description,
      ...(isPending ? { robots: { index: false, follow: false } } : {}),
      openGraph: {
        title,
        description,
        url,
        type: 'article',
        siteName: 'Slaytim',
        ...(image ? { images: [{ url: image, width: 1280, height: 720, alt: title }] } : {}),
      },
      twitter: {
        card: image ? 'summary_large_image' : 'summary',
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
      alternates: { canonical: url },
    };
  } catch {
    return { title: 'Slayt' };
  }
}

function SlideSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="skeleton h-8 w-48 mb-6 rounded-xl" />
      <div className="skeleton aspect-video rounded-2xl mb-6" />
      <div className="skeleton h-10 w-2/3 rounded-xl mb-4" />
      <div className="skeleton h-5 w-full rounded-xl mb-2" />
      <div className="skeleton h-5 w-3/4 rounded-xl" />
    </div>
  );
}

export default async function SlideLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id?: string; slug?: string };
}) {
  let jsonLd: object | null = null;
  try {
    const slide = await fetchSlide(getParamId(params));
    if (slide) {
      const url = `${BASE_URL}${buildSlidePath({ id: slide.id, slug: slide.slug, title: slide.title })}`;
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'PresentationDigitalDocument',
        name: slide.title,
        description: slide.description || `"${slide.title}" sunumu.`,
        url,
        author: {
          '@type': 'Person',
          name: slide.user?.username || 'Slaytim Kullanıcısı',
          url: slide.user?.username ? `${BASE_URL}${buildProfilePath(slide.user.username)}` : BASE_URL,
        },
        publisher: { '@type': 'Organization', name: 'Slaytim', url: BASE_URL },
        datePublished: slide.createdAt,
        thumbnailUrl: resolveUrl(slide.thumbnailUrl),
        interactionStatistic: [
          { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: slide.likesCount },
          { '@type': 'InteractionCounter', interactionType: 'https://schema.org/ViewAction', userInteractionCount: slide.viewsCount },
        ],
        isPartOf: slide.topic ? {
          '@type': 'Collection',
          name: slide.topic.title,
          url: `${BASE_URL}${buildTopicPath({
            id: slide.topic.id,
            slug: slide.topic.slug,
            title: slide.topic.title,
          })}`,
        } : undefined,
      };
    }
  } catch { /* silently skip */ }

  return (
    <>
      {jsonLd && (
        <Script
          id="slide-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {/* Suspense is required here because the page component uses useSearchParams() */}
      <Suspense fallback={<SlideSkeleton />}>
        {children}
      </Suspense>
    </>
  );
}
