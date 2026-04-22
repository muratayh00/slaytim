import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <p className="text-8xl font-bold text-primary/20 mb-4">404</p>
      <h1 className="text-2xl font-bold mb-2">Sayfa Bulunamadı</h1>
      <p className="text-muted-foreground mb-8">Aradığın sayfa mevcut değil.</p>
      <Link href="/" className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition">
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}
