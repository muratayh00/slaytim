'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import TopicCard from '@/components/shared/TopicCard';
import SlideCard from '@/components/shared/SlideCard';

type TagPayload = {
  tag: { slug: string; label: string };
  totals: { topics: number; slides: number; all: number };
  topics: any[];
  slides: any[];
};

export default function TagPage() {
  const params = useParams();
  const slug = String((params as Record<string, string>)?.slug || '');
  const [data, setData] = useState<TagPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/tags/${encodeURIComponent(slug)}`);
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (slug) load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-10 text-muted-foreground">Yukleniyor...</div>;
  }

  if (!data) {
    return <div className="max-w-6xl mx-auto px-4 py-10 text-muted-foreground">Etiket icerigi bulunamadi.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs text-muted-foreground mb-2">Etiket</p>
        <h1 className="text-2xl font-extrabold mb-2">#{data.tag.label}</h1>
        <p className="text-sm text-muted-foreground">
          {data.totals.all} sonuc • {data.totals.topics} konu • {data.totals.slides} slayt
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
          Bu etiket icin icerik yok. <Link href="/kesfet" className="text-primary">Kesfet sayfasina don</Link>.
        </div>
      )}
    </div>
  );
}
