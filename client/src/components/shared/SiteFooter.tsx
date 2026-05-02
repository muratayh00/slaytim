'use client';

import Link from 'next/link';
import { Presentation } from 'lucide-react';
import { useConsentStore } from '@/store/consent';

const PRODUCT_LINKS = [
  { href: '/kesfet', label: 'Keşfet' },
  { href: '/slideo', label: 'Slideo' },
  { href: '/rooms', label: 'Odalar' },
  { href: '/kategori', label: 'Kategoriler' },
];

const COMPANY_LINKS = [
  { href: '/hakkinda', label: 'Hakkında' },
  { href: '/iletisim', label: 'İletişim' },
];

const LEGAL_LINKS = [
  { href: '/gizlilik', label: 'Gizlilik' },
  { href: '/kvkk', label: 'KVKK' },
  { href: '/cerez-politikasi', label: 'Çerez Politikası' },
  { href: '/kullanim-kosullari', label: 'Kullanım Koşulları' },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();
  const openPanel = useConsentStore((s) => s.openPanel);

  return (
    <footer className="border-t border-border/60 mt-12 bg-card/40">
      <div className="mx-auto max-w-6xl px-5 py-10">
        {/* Main footer grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
          {/* Brand column — full width on mobile, single column on desktop */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Presentation className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
              </div>
              <span className="font-extrabold text-[1.05rem] tracking-tight text-foreground">slaytim</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Sunumlardan kısa slaytlar oluştur, paylaş ve keşfet. Türkiye&apos;nin slayt keşif platformu.
            </p>
          </div>

          {/* Ürün */}
          <FooterColumn title="Ürün" links={PRODUCT_LINKS} />

          {/* Şirket */}
          <FooterColumn title="Şirket" links={COMPANY_LINKS} />

          {/* Yasal */}
          <FooterColumn title="Yasal" links={LEGAL_LINKS} />
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
          <p>© {year} Slaytim. Tüm hakları saklıdır.</p>
          <button
            type="button"
            onClick={openPanel}
            className="hover:text-foreground transition-colors text-left"
          >
            Çerez Tercihleri
          </button>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
        {title}
      </h4>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-foreground/80 hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
