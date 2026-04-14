'use client';

import { useEffect } from 'react';

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Main segment error:', error);
  }, [error]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Sayfa Hatasi</p>
        <h2 className="text-2xl font-extrabold mb-2">Bir seyler ters gitti</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Gecici bir baglanti veya sunucu sorunu olabilir. Sayfayi yeniden deneyebilirsin.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            Tekrar dene
          </button>
          <a
            href="/"
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-accent"
          >
            Ana sayfaya don
          </a>
        </div>
      </div>
    </div>
  );
}

