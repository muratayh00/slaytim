'use client';

import Link from 'next/link';
import { useConsentStore } from '@/store/consent';

export default function SiteFooter() {
  const year = new Date().getFullYear();
  const openPanel = useConsentStore((s) => s.openPanel);

  return (
    <footer className="border-t border-border/60 mt-10 bg-card/50">
      <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-xs text-muted-foreground">
        <p>© {year} Slaytim. Tüm hakları saklıdır.</p>
        <nav className="flex flex-wrap gap-3 md:gap-4">
          <Link href="/hakkinda" className="hover:text-foreground transition-colors">Hakkında</Link>
          <Link href="/iletisim" className="hover:text-foreground transition-colors">İletişim</Link>
          <Link href="/kullanim-kosullari" className="hover:text-foreground transition-colors">Kullanım Koşulları</Link>
          <Link href="/gizlilik" className="hover:text-foreground transition-colors">Gizlilik</Link>
          <Link href="/kvkk" className="hover:text-foreground transition-colors">KVKK</Link>
          <Link href="/cerez-politikasi" className="hover:text-foreground transition-colors">Çerez Politikası</Link>
          <button type="button" onClick={openPanel} className="hover:text-foreground transition-colors">
            Çerez Tercihleri
          </button>
        </nav>
      </div>
    </footer>
  );
}
