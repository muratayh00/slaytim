const categoryTreeData = [
  {
    name: 'Egitim',
    slug: 'egitim',
    sortOrder: 10,
    children: [
      { name: 'YKS Hazirlik', slug: 'yks-hazirlik', sortOrder: 10 },
      { name: 'LGS Hazirlik', slug: 'lgs-hazirlik', sortOrder: 20 },
      { name: 'Universite Dersleri', slug: 'universite-dersleri', sortOrder: 30 },
      { name: 'Yabanci Dil', slug: 'yabanci-dil', sortOrder: 40 },
    ],
  },
  {
    name: 'Teknoloji',
    slug: 'teknoloji',
    sortOrder: 20,
    children: [
      { name: 'Web Gelistirme', slug: 'web-gelistirme', sortOrder: 10 },
      { name: 'Yapay Zeka', slug: 'yapay-zeka', sortOrder: 20 },
      { name: 'Veri Bilimi', slug: 'veri-bilimi', sortOrder: 30 },
      { name: 'DevOps', slug: 'devops', sortOrder: 40 },
    ],
  },
  {
    name: 'Is ve Girisim',
    slug: 'is-girisimcilik',
    sortOrder: 30,
    children: [
      { name: 'Girisimcilik', slug: 'girisimcilik', sortOrder: 10 },
      { name: 'Is Pazarlamasi', slug: 'is-pazarlamasi', sortOrder: 20 },
      { name: 'Urun ve Strateji', slug: 'urun-ve-strateji', sortOrder: 30 },
      { name: 'Kariyer Planlama', slug: 'kariyer-planlama', sortOrder: 40 },
    ],
  },
  {
    name: 'Finans',
    slug: 'finans',
    sortOrder: 40,
    children: [
      { name: 'Kisisel Finans', slug: 'kisisel-finans', sortOrder: 10 },
      { name: 'Yatirim', slug: 'yatirim', sortOrder: 20 },
      { name: 'Sirketsel Finans', slug: 'sirketsel-finans', sortOrder: 30 },
    ],
  },
  {
    name: 'Pazarlama',
    slug: 'pazarlama',
    sortOrder: 50,
    children: [
      { name: 'Sosyal Medya', slug: 'sosyal-medya', sortOrder: 10 },
      { name: 'Performans Pazarlama', slug: 'performans-pazarlama', sortOrder: 20 },
      { name: 'Icerik Pazarlamasi', slug: 'icerik-pazarlamasi', sortOrder: 30 },
    ],
  },
  {
    name: 'Tasarim',
    slug: 'tasarim',
    sortOrder: 60,
    children: [
      { name: 'UI UX', slug: 'ui-ux', sortOrder: 10 },
      { name: 'Sunum Tasarimi', slug: 'sunum-tasarimi', sortOrder: 20 },
      { name: 'Grafik Tasarim', slug: 'grafik-tasarim', sortOrder: 30 },
    ],
  },
  {
    name: 'Yazilim Gelistirme',
    slug: 'yazilim-gelistirme',
    sortOrder: 70,
    children: [
      { name: 'Frontend', slug: 'frontend', sortOrder: 10 },
      { name: 'Backend', slug: 'backend', sortOrder: 20 },
      { name: 'Mobil', slug: 'mobil', sortOrder: 30 },
      { name: 'Test ve Kalite', slug: 'test-ve-kalite', sortOrder: 40 },
    ],
  },
  {
    name: 'Bilim',
    slug: 'bilim',
    sortOrder: 80,
    children: [
      { name: 'Fizik', slug: 'fizik', sortOrder: 10 },
      { name: 'Biyoloji', slug: 'biyoloji', sortOrder: 20 },
      { name: 'Kuantum', slug: 'kuantum', sortOrder: 30 },
    ],
  },
  {
    name: 'Sanat ve Kultur',
    slug: 'sanat-kultur',
    sortOrder: 90,
    children: [
      { name: 'Sanat Tarihi', slug: 'sanat-tarihi', sortOrder: 10 },
      { name: 'Muzik', slug: 'muzik', sortOrder: 20 },
      { name: 'Sinema', slug: 'sinema', sortOrder: 30 },
    ],
  },
  {
    name: 'Saglik',
    slug: 'saglik',
    sortOrder: 100,
    children: [
      { name: 'Beslenme', slug: 'beslenme', sortOrder: 10 },
      { name: 'Fitness', slug: 'fitness', sortOrder: 20 },
      { name: 'Psikoloji', slug: 'psikoloji', sortOrder: 30 },
    ],
  },
  {
    name: 'Kariyer',
    slug: 'kariyer',
    sortOrder: 110,
    children: [
      { name: 'Mulakat Hazirlik', slug: 'mulakat-hazirlik', sortOrder: 10 },
      { name: 'CV Portfoy', slug: 'cv-portfoy', sortOrder: 20 },
      { name: 'Mesleki Gelisim', slug: 'mesleki-gelisim', sortOrder: 30 },
    ],
  },
  {
    name: 'Sunum ve Iletisim',
    slug: 'sunum-iletisim',
    sortOrder: 120,
    children: [
      { name: 'Topluluk Onunde Konusma', slug: 'topluluk-onunde-konusma', sortOrder: 10 },
      { name: 'Hikaye Anlatimi', slug: 'hikaye-anlatimi', sortOrder: 20 },
      { name: 'Ikna Teknikleri', slug: 'ikna-teknikleri', sortOrder: 30 },
    ],
  },
  {
    name: 'Kisisel Gelisim',
    slug: 'kisisel-gelisim',
    sortOrder: 130,
    children: [
      { name: 'Verimlilik', slug: 'verimlilik', sortOrder: 10 },
      { name: 'Iletisim ve Sunum', slug: 'iletisim-ve-sunum', sortOrder: 20 },
      { name: 'Sinav Stratejileri', slug: 'sinav-stratejileri', sortOrder: 30 },
    ],
  },
];

module.exports = { categoryTreeData };
