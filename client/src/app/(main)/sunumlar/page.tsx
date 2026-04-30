import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Upload, LayoutGrid } from 'lucide-react';
import { SEO_PAGES } from '@/lib/programmaticSeoPages';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

export const metadata: Metadata = {
  title: 'Sunum Kategorileri | Slaytim',
  description:
    'Pitch deck, şirket tanıtımı, satış sunumu, eğitim slaytları ve daha fazlası. Alanına göre en iyi sunum örneklerini keşfet.',
  alternates: { canonical: `${BASE_URL}/sunumlar` },
  openGraph: {
    title: 'Sunum Kategorileri | Slaytim',
    description: 'Pitch deck, şirket tanıtımı, satış sunumu ve daha fazlası.',
    url: `${BASE_URL}/sunumlar`,
    siteName: 'Slaytim',
    type: 'website',
  },
};

const BREADCRUMB_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: BASE_URL },
    { '@type': 'ListItem', position: 2, name: 'Sunumlar', item: `${BASE_URL}/sunumlar` },
  ],
};

export default function SunumlarPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSON_LD) }}
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground transition-colors">Ana Sayfa</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Sunumlar</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Sunum Kategorileri
          </h1>
          <p className="text-muted-foreground text-[15px] leading-relaxed max-w-2xl">
            Pitch deck&apos;ten eğitim materyallerine, finansal rapordan CV&apos;ye — ihtiyacına göre en iyi
            sunum örneklerini keşfet ve kendi sunumunu topluluğa ekle.
          </p>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {SEO_PAGES.map((page) => (
            <Link
              key={page.slug}
              href={`/sunumlar/${page.slug}`}
              className="group block p-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-card transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <LayoutGrid className="w-4 h-4 text-primary" />
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
              </div>
              <h2 className="font-bold text-base group-hover:text-primary transition-colors mb-1.5">
                {page.h1}
              </h2>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {page.metaDescription}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {page.popularTags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-primary/10 via-violet-500/8 to-indigo-500/5 border border-primary/15 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-lg">Sunumunu paylaş</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Kendi sunumunu yükle, binlerce kişiye ulaş ve topluluğa katkı sağla.
            </p>
          </div>
          <Link
            href="/konu/yeni"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-button hover:shadow-button-hover hover:-translate-y-0.5 transition-all shrink-0"
          >
            <Upload className="w-4 h-4" />
            Sunum Yükle
          </Link>
        </div>
      </div>
    </>
  );
}
