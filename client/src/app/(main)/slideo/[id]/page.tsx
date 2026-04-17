import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import SlideoDetailPreview from '@/components/slideo/SlideoDetailPreview';
import { buildSlidePath, buildSlideoPath, buildTopicPath, splitIdSlug } from '@/lib/url';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';
const SERVER_BASE = API_URL.replace(/\/api$/, '');

type SlideoDetail = {
  id: number;
  title: string;
  description?: string | null;
  pageIndices: number[];
  coverPage: number;
  viewsCount: number;
  likesCount: number;
  savesCount: number;
  createdAt: string;
  user: { id: number; username: string; avatarUrl?: string | null };
  slide: {
    id: number;
    title: string;
    pdfUrl?: string | null;
    conversionStatus?: string;
    thumbnailUrl?: string | null;
    topic?: { id: number; slug?: string; title: string; category?: { name: string; slug: string } | null } | null;
  };
};

function resolveUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return path.startsWith('http') ? path : `${SERVER_BASE}${path}`;
}

async function fetchSlideo(id: number): Promise<SlideoDetail | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  try {
    const res = await fetch(`${API_URL}/slideo/${id}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const parsed = splitIdSlug(params.id);
  const slideo = await fetchSlideo(parsed.id || 0);
  if (!slideo) return { title: 'Slideo Bulunamadi' };

  const title = slideo.title;
  const description = slideo.description
    ? slideo.description.slice(0, 155)
    : `"${title}" slideo ozetini incele ve tam sunuma gec.`;
  const canonical = `${BASE_URL}${buildSlideoPath({ id: slideo.id, title: slideo.title })}`;
  const image = resolveUrl(slideo.slide?.thumbnailUrl);

  return {
    title,
    description,
    openGraph: {
      type: 'article',
      siteName: 'Slaytim',
      title,
      description,
      url: canonical,
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    alternates: { canonical },
  };
}

export default async function SlideoDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const parsed = splitIdSlug(params.id);
  const slideo = await fetchSlideo(parsed.id || 0);
  if (!slideo) notFound();
  const expectedPath = buildSlideoPath({ id: slideo.id, title: slideo.title });
  if (`/slideo/${params.id}` !== expectedPath) {
    const pageValue = searchParams?.page;
    const page = Array.isArray(pageValue) ? pageValue[0] : pageValue;
    const query = page ? `?page=${encodeURIComponent(page)}` : '';
    permanentRedirect(`${expectedPath}${query}`);
  }

  const pageCount = Array.isArray(slideo.pageIndices) ? slideo.pageIndices.length : 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Slideo ?nizleme
        </p>
        <h1 className="mb-3 text-2xl font-extrabold leading-tight sm:text-3xl">{slideo.title}</h1>

        {slideo.description && (
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground sm:text-base">{slideo.description}</p>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border px-2.5 py-1">{pageCount} sayfa</span>
          <span className="rounded-full border border-border px-2.5 py-1">{slideo.likesCount} begeni</span>
          <span className="rounded-full border border-border px-2.5 py-1">{slideo.savesCount} kaydetme</span>
          <span className="rounded-full border border-border px-2.5 py-1">{slideo.viewsCount} goruntuleme</span>
          <span className="rounded-full border border-border px-2.5 py-1">@{slideo.user.username}</span>
        </div>

        <div className="mb-6">
          <SlideoDetailPreview
            slideoId={slideo.id}
            slideId={slideo.slide.id}
            pageIndices={slideo.pageIndices}
            conversionStatus={slideo.slide.conversionStatus}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/slideo?focus=${slideo.id}`}
            prefetch={false}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            Slideo akista ac
          </Link>
          <Link
            href={buildSlidePath({ id: slideo.slide.id, title: slideo.slide.title })}
            className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-accent"
          >
            Tam sunuma git
          </Link>
          {slideo.slide.topic?.id && (
            <Link
              href={buildTopicPath({
                id: slideo.slide.topic.id,
                slug: slideo.slide.topic.slug,
                title: slideo.slide.topic.title,
              })}
              className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-accent"
            >
              Konuya git
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
