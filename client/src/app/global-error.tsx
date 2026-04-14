'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global app error:', error);
  }, [error]);

  return (
    <html lang="tr">
      <body>
        <div style={{ maxWidth: 720, margin: '64px auto', padding: '0 16px' }}>
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 16,
              padding: 24,
              fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
            }}
          >
            <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Sistem Hatasi</p>
            <h2 style={{ fontSize: 28, margin: 0, marginBottom: 8 }}>Uygulama gecici olarak hata verdi</h2>
            <p style={{ color: '#6b7280', marginBottom: 16 }}>
              Sayfayi yenileyebilir veya biraz sonra tekrar deneyebilirsin.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  background: '#f97316',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Tekrar dene
              </button>
              <a
                href="/"
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  color: '#111827',
                }}
              >
                Ana sayfa
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

