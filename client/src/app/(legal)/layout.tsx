import type { Metadata } from 'next';
import Link from 'next/link';
import { Presentation } from 'lucide-react';

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

const legalLinks = [
  { href: '/hakkinda', label: 'Hakkında' },
  { href: '/iletisim', label: 'İletişim' },
  { href: '/kullanim-kosullari', label: 'Kullanım Koşulları' },
  { href: '/kvkk', label: 'KVKK' },
  { href: '/cerez-politikasi', label: 'Çerez Politikası' },
  { href: '/gizlilik', label: 'Gizlilik' },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border/50 sticky top-0 z-10 bg-background/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-5 py-3.5 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Presentation className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-foreground text-sm tracking-tight">slaytim</span>
          </Link>
          <div className="w-px h-4 bg-border/60 mx-1" />
          <nav className="flex gap-1 flex-wrap">
            {legalLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted/70"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-10 md:py-14">{children}</main>

      <footer className="border-t border-border/50 mt-8">
        <div className="max-w-4xl mx-auto px-5 py-6 flex flex-wrap gap-4 justify-between items-center">
          <span className="text-xs text-muted-foreground">© {year} Slaytim. Tüm hakları saklıdır.</span>
          <nav className="flex gap-4 flex-wrap">
            {legalLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
