'use client';
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AppError]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4 px-4">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Sayfa yuklenemedi</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {process.env.NODE_ENV !== 'production' ? error.message : 'Beklenmedik bir hata olustu.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}
