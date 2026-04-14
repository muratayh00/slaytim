export type CategoryItem = {
  id: number;
  name: string;
  slug: string;
  _count?: { topics?: number };
};

type CategoryGroup = {
  key: string;
  title: string;
  description: string;
  matcher: (slug: string) => boolean;
};

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    key: 'sinav-hazirlik',
    title: 'Sinav Hazirlik',
    description: 'YKS, LGS, KPSS, ALES, YDS ve diger sinavlara yonelik konu anlatimlari ve slayt notlari.',
    matcher: (slug) =>
      slug.startsWith('yks-')
      || slug.startsWith('lgs-')
      || slug.startsWith('kpss-')
      || slug.startsWith('ales-')
      || slug.startsWith('dgs-')
      || slug.startsWith('yds-')
      || slug.startsWith('toefl-')
      || slug.startsWith('ielts-')
      || slug.startsWith('sat-')
      || slug.startsWith('gre-'),
  },
  {
    key: 'yazilim-teknoloji',
    title: 'Yazilim ve Teknoloji',
    description: 'Programlama, web gelistirme, sistem tasarimi, yapay zeka, veri ve bulut bilisim icerikleri.',
    matcher: (slug) =>
      slug.includes('yazilim')
      || slug.includes('web-')
      || slug.includes('frontend')
      || slug.includes('backend')
      || slug.includes('programlama')
      || slug.includes('nodejs')
      || slug.includes('nestjs')
      || slug.includes('react')
      || slug.includes('docker')
      || slug.includes('kubernetes')
      || slug.includes('linux')
      || slug.includes('network')
      || slug.includes('test-')
      || slug.includes('system-design')
      || slug.includes('ai-')
      || slug.includes('llm-')
      || slug.includes('data-')
      || slug.includes('sql')
      || slug.includes('bulut')
      || slug.includes('siber'),
  },
  {
    key: 'is-kariyer',
    title: 'Is, Kariyer ve Pazarlama',
    description: 'Girisimcilik, proje yonetimi, urun yonetimi, SEO, reklamcilik ve kariyer odakli sunumlar.',
    matcher: (slug) =>
      slug.includes('isletme')
      || slug.includes('yonetim')
      || slug.includes('girisim')
      || slug.includes('proje-')
      || slug.includes('product-')
      || slug.includes('growth')
      || slug.includes('pazarlama')
      || slug.includes('seo')
      || slug.includes('google-ads')
      || slug.includes('meta-ads')
      || slug.includes('kariyer')
      || slug.includes('mulakat')
      || slug.includes('cv-'),
  },
  {
    key: 'egitim-icerik',
    title: 'Egitim ve Icerik Uretimi',
    description: 'Ogretmenler, universite ogrencileri ve icerik ureticileri icin ders, not ve sunum odakli kategoriler.',
    matcher: (slug) =>
      slug.includes('egitim')
      || slug.includes('ogretmen')
      || slug.includes('universite')
      || slug.includes('tez-')
      || slug.includes('online-kurs')
      || slug.includes('sunum')
      || slug.includes('not')
      || slug.includes('hafiza'),
  },
  {
    key: 'tasarim-sanat',
    title: 'Tasarim ve Sanat',
    description: 'UI/UX, grafik tasarim, mimari ve sanat-kultur alaninda ilham veren sunumlar.',
    matcher: (slug) =>
      slug.includes('tasarim')
      || slug.includes('ui-ux')
      || slug.includes('grafik')
      || slug.includes('mimarlik')
      || slug.includes('sanat')
      || slug.includes('muzik'),
  },
  {
    key: 'finans-bilim',
    title: 'Finans, Bilim ve Diger',
    description: 'Finans, yatirim, saglik, bilim, hukuk ve farkli disiplinlerde konu bazli slayt arsivi.',
    matcher: (slug) =>
      slug.includes('finans')
      || slug.includes('yatirim')
      || slug.includes('kripto')
      || slug.includes('bilim')
      || slug.includes('saglik')
      || slug.includes('tip-')
      || slug.includes('hukuk')
      || slug.includes('psikoloji')
      || slug.includes('fizik')
      || slug.includes('kimya')
      || slug.includes('biyoloji')
      || slug.includes('matematik')
      || slug.includes('tarih')
      || slug.includes('cografya')
      || slug.includes('felsefe'),
  },
];

export function groupCategories(categories: CategoryItem[]) {
  const groups = CATEGORY_GROUPS.map((g) => ({ ...g, items: [] as CategoryItem[] }));
  const other = { key: 'diger', title: 'Diger Kategoriler', description: 'Tum kalan kategoriler.', items: [] as CategoryItem[] };

  for (const cat of categories) {
    const slug = String(cat.slug || '');
    const group = groups.find((g) => g.matcher(slug));
    if (group) {
      group.items.push(cat);
    } else {
      other.items.push(cat);
    }
  }

  const normalized: Array<{ key: string; title: string; description: string; items: CategoryItem[] }> = groups
    .filter((g) => g.items.length > 0)
    .map((g) => ({
    key: g.key,
    title: g.title,
    description: g.description,
    items: [...g.items].sort((a, b) => (b._count?.topics || 0) - (a._count?.topics || 0)),
  }));

  if (other.items.length > 0) {
    normalized.push({
      ...other,
      items: [...other.items].sort((a, b) => (b._count?.topics || 0) - (a._count?.topics || 0)),
    });
  }

  return normalized;
}

export function buildCategorySeoDescription(name: string) {
  return `${name} kategorisindeki en guncel slaytlar, konu anlatimlari ve ders notlarini Slaytim'de kesfet. ${name} icerikleriyle hizli ogren.`; 
}
