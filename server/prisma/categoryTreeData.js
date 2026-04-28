// 8 ana kategori — Slaytim'in arama / picker / homepage / sitemap'inde
// görünen "main" set. Eski 13'lü ağaç (Bilim, Saglik, Sanat-Kultur, Yazilim
// Gelistirme, Sunum Iletisim) `migrate-categories-2026-04.js` ile demote edildi
// (isMain:false) — içerik kaybolmaz, slug'lar canlı, sadece picker'dan çıkar.
//
// Slug'lar bilinçli olarak yeniden adlandırılmadı — eski URL'leri korumak için.
// Display "name" alanları yeni branding'e göre güncellendi (örn. "Pazarlama" →
// "Pazarlama & Satış") ama slug = "pazarlama" olarak kaldı.
const categoryTreeData = [
  {
    name: 'Eğitim',
    slug: 'egitim',
    sortOrder: 10,
    children: [
      { name: 'YKS Hazırlık', slug: 'yks-hazirlik', sortOrder: 10 },
      { name: 'LGS Hazırlık', slug: 'lgs-hazirlik', sortOrder: 20 },
      { name: 'KPSS', slug: 'kpss', sortOrder: 30 },
      { name: 'DGS', slug: 'dgs-hazirlik', sortOrder: 40 },
      { name: 'ALES', slug: 'ales-hazirlik', sortOrder: 50 },
      { name: 'Üniversite Dersleri', slug: 'universite-dersleri', sortOrder: 60 },
      { name: 'Dil Öğrenme', slug: 'yabanci-dil', sortOrder: 70 },
      { name: 'Öğretmen Sunumları', slug: 'ogretmen-sunumlari', sortOrder: 80 },
    ],
  },
  {
    name: 'İş & Girişim',
    slug: 'is-girisimcilik',
    sortOrder: 20,
    children: [
      { name: 'Pitch Deck', slug: 'pitch-deck', sortOrder: 10 },
      { name: 'İş Planı', slug: 'is-plani', sortOrder: 20 },
      { name: 'Pazar Araştırması', slug: 'pazar-arastirmasi', sortOrder: 30 },
      { name: 'Rakip Analizi', slug: 'rakip-analizi', sortOrder: 40 },
      { name: 'Şirket Tanıtımı', slug: 'sirket-tanitimi', sortOrder: 50 },
      { name: 'Yatırımcı Sunumu', slug: 'yatirimci-sunumu', sortOrder: 60 },
    ],
  },
  {
    name: 'Pazarlama & Satış',
    slug: 'pazarlama',
    sortOrder: 30,
    children: [
      { name: 'Google Ads', slug: 'google-ads', sortOrder: 10 },
      { name: 'Meta Ads', slug: 'meta-ads', sortOrder: 20 },
      { name: 'SEO', slug: 'seo', sortOrder: 30 },
      { name: 'Sosyal Medya', slug: 'sosyal-medya', sortOrder: 40 },
      { name: 'Satış Sunumu', slug: 'satis-sunumu', sortOrder: 50 },
      { name: 'Marka Stratejisi', slug: 'marka-stratejisi', sortOrder: 60 },
      { name: 'İçerik Pazarlaması', slug: 'icerik-pazarlamasi', sortOrder: 70 },
      { name: 'Pazarlama Planı', slug: 'pazarlama-plani', sortOrder: 80 },
    ],
  },
  {
    name: 'Teknoloji & Yazılım',
    slug: 'teknoloji',
    sortOrder: 40,
    children: [
      { name: 'Frontend', slug: 'frontend', sortOrder: 10 },
      { name: 'Backend', slug: 'backend', sortOrder: 20 },
      { name: 'Yapay Zeka', slug: 'yapay-zeka', sortOrder: 30 },
      { name: 'Python', slug: 'python', sortOrder: 40 },
      { name: 'JavaScript', slug: 'javascript', sortOrder: 50 },
      { name: 'DevOps', slug: 'devops', sortOrder: 60 },
      { name: 'Siber Güvenlik', slug: 'siber-guvenlik', sortOrder: 70 },
      { name: 'Veri Analizi', slug: 'veri-analizi', sortOrder: 80 },
    ],
  },
  {
    name: 'Finans & Yatırım',
    slug: 'finans',
    sortOrder: 50,
    children: [
      { name: 'Bütçe Planlama', slug: 'butce-planlama', sortOrder: 10 },
      { name: 'Kripto', slug: 'kripto', sortOrder: 20 },
      { name: 'Borsa', slug: 'borsa', sortOrder: 30 },
      { name: 'Finansal Rapor', slug: 'finansal-rapor', sortOrder: 40 },
      { name: 'Gelir-Gider Analizi', slug: 'gelir-gider-analizi', sortOrder: 50 },
      { name: 'Yatırım Sunumu', slug: 'yatirim-sunumu', sortOrder: 60 },
    ],
  },
  {
    name: 'Tasarım & Sunum',
    slug: 'tasarim',
    sortOrder: 60,
    children: [
      { name: 'PowerPoint Tasarımı', slug: 'powerpoint-tasarimi', sortOrder: 10 },
      { name: 'Canva Sunumları', slug: 'canva-sunumlari', sortOrder: 20 },
      { name: 'Google Slides', slug: 'google-slides', sortOrder: 30 },
      { name: 'Sunum Teknikleri', slug: 'sunum-teknikleri', sortOrder: 40 },
      { name: 'İnfografik', slug: 'infografik', sortOrder: 50 },
      { name: 'PowerPoint Şablonları', slug: 'powerpoint-sablonlari', sortOrder: 60 },
    ],
  },
  {
    name: 'Kariyer & CV',
    slug: 'kariyer',
    sortOrder: 70,
    children: [
      { name: 'CV Hazırlama', slug: 'cv-hazirlama', sortOrder: 10 },
      { name: 'Portfolyo', slug: 'portfolyo', sortOrder: 20 },
      { name: 'Mülakat', slug: 'mulakat', sortOrder: 30 },
      { name: 'LinkedIn', slug: 'linkedin', sortOrder: 40 },
      { name: 'Kariyer Planı', slug: 'kariyer-plani', sortOrder: 50 },
      { name: 'Staj Sunumları', slug: 'staj-sunumlari', sortOrder: 60 },
    ],
  },
  {
    name: 'Kişisel Gelişim',
    slug: 'kisisel-gelisim',
    sortOrder: 80,
    children: [
      { name: 'Zaman Yönetimi', slug: 'zaman-yonetimi', sortOrder: 10 },
      { name: 'Not Tutma', slug: 'not-tutma', sortOrder: 20 },
      { name: 'İletişim', slug: 'kisisel-iletisim', sortOrder: 30 },
      { name: 'Hikaye Anlatımı', slug: 'hikaye-anlatimi', sortOrder: 40 },
      { name: 'İkna Teknikleri', slug: 'ikna-teknikleri', sortOrder: 50 },
      { name: 'Verimlilik', slug: 'verimlilik', sortOrder: 60 },
    ],
  },
];

module.exports = { categoryTreeData };
