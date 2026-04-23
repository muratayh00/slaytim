import Link from 'next/link';
import { notFound } from 'next/navigation';
import TopicCard from '@/components/shared/TopicCard';
import SlideCard from '@/components/shared/SlideCard';
import { getApiBaseUrl } from '@/lib/api-origin';

const API_URL = getApiBaseUrl();
export const dynamic = 'force-dynamic';

type TagPayload = {
  tag: { slug: string; label: string };
  totals: { topics: number; slides: number; all: number };
  seo?: { indexable?: boolean };
  topics: any[];
  slides: any[];
};

async function fetchTag(slug: string): Promise<TagPayload | null> {
  if (!API_URL || !slug) return null;
  try {
    const res = await fetch(`${API_URL}/tags/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as TagPayload;
  } catch {
    return null;
  }
}

export default async function TagPage({ params }: { params: { slug: string } }) {
  const slug = String(params.slug || '');
  const data = await fetchTag(slug);
  if (!data || Number(data?.totals?.all || 0) <= 0) notFound();

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs text-muted-foreground mb-2">Etiket</p>
        <h1 className="text-2xl font-extrabold mb-2">#{data.tag.label}</h1>
        <p className="text-sm text-muted-foreground">
          {data.totals.all} sonuc - {data.totals.topics} konu - {data.totals.slides} slayt
        </p>
      </section>

      {data.topics.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">Konular</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.topics.map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        </section>
      )}

      {data.slides.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">Slaytlar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {data.slides.map((slide) => (
              <SlideCard key={slide.id} slide={slide} />
            ))}
          </div>
        </section>
      )}

      {data.totals.all === 0 && (
        <div className="text-sm text-muted-foreground">
          Bu etiket icin icerik yok.{' '}
          <Link href="/kesfet" className="text-primary">
            Kesfet sayfasina don
          </Link>
          .
        </div>
      )}
    </div>
  );
}
