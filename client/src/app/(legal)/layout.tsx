import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="text-lg font-bold text-primary hover:opacity-80 transition-opacity">
            Slaytim
          </Link>
          <span className="text-muted-foreground/40 select-none">|</span>
          <span className="text-sm text-muted-foreground">Yasal ve Güven Sayfaları</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 md:py-14">{children}</main>

      <footer className="border-t border-border/50 mt-12">
        <div className="max-w-3xl mx-auto px-6 py-6 flex flex-wrap gap-4 justify-between items-center text-xs text-muted-foreground">
          <span>© {year} Slaytim. Tüm hakları saklıdır.</span>
          <nav className="flex gap-4 flex-wrap">
            <Link href="/hakkinda" className="hover:text-foreground transition-colors">Hakkında</Link>
            <Link href="/iletisim" className="hover:text-foreground transition-colors">İletişim</Link>
            <Link href="/kullanim-kosullari" className="hover:text-foreground transition-colors">Kullanım Koşulları</Link>
            <Link href="/kvkk" className="hover:text-foreground transition-colors">KVKK</Link>
            <Link href="/cerez-politikasi" className="hover:text-foreground transition-colors">Çerez Politikası</Link>
            <Link href="/gizlilik" className="hover:text-foreground transition-colors">Gizlilik</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
