'use client';

import Link from 'next/link';
import { useConsentStore } from '@/store/consent';

export default function SiteFooter() {
  const year = new Date().getFullYear();
  const openPanel = useConsentStore((s) => s.openPanel);

  return (
    <footer className="border-t border-border/60 mt-10 bg-card/50">
      <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-xs text-muted-foreground">
        <p>© {year} Slaytim. Tum haklari saklidir.</p>
        <nav className="flex flex-wrap gap-3 md:gap-4">
          <Link href="/hakkinda" className="hover:text-foreground transition-colors">Hakkinda</Link>
          <Link href="/iletisim" className="hover:text-foreground transition-colors">Iletisim</Link>
          <Link href="/kullanim-kosullari" className="hover:text-foreground transition-colors">Kullanim Kosullari</Link>
          <Link href="/gizlilik" className="hover:text-foreground transition-colors">Gizlilik</Link>
          <Link href="/kvkk" className="hover:text-foreground transition-colors">KVKK</Link>
          <Link href="/cerez-politikasi" className="hover:text-foreground transition-colors">Cerez Politikasi</Link>
          <button type="button" onClick={openPanel} className="hover:text-foreground transition-colors">
            Cerez Tercihleri
          </button>
        </nav>
      </div>
    </footer>
  );
}
