export type SeoPageConfig = {
  slug: string;
  /** H1 tag */
  h1: string;
  /** <meta name="description"> */
  metaDescription: string;
  /** Short intro / guide paragraph shown below H1 */
  guideText: string;
  /** Displayed as clickable tag badges at the top */
  popularTags: string[];
  /** Breadcrumb label (shorter than H1) */
  breadcrumbLabel: string;
  /** og:title override (defaults to h1 + " | Slaytim") */
  ogTitle?: string;
};

export const SEO_PAGES: SeoPageConfig[] = [
  {
    slug: 'pitch-deck',
    h1: 'Pitch Deck Sunumları',
    metaDescription:
      'Yatırımcıları ikna eden pitch deck örnekleri ve şablonları. Girişimini anlatmak için en iyi pitch deck sunumlarını keşfet, kendi sunumunu paylaş.',
    guideText:
      'Pitch deck, girişimini yatırımcılara tanıtmak için kullandığın en kritik araçtır. Problem, çözüm, pazar büyüklüğü, iş modeli ve ekip slaytlarından oluşan etkili bir yapıyla yatırımcı ilgisini çekebilirsin. Aşağıda Slaytim topluluğunun paylaştığı en iyi pitch deck örneklerini bulabilirsin.',
    popularTags: ['Startup', 'Yatırım', 'Girişim', 'İş Planı', 'MVP', 'B2B', 'SaaS'],
    breadcrumbLabel: 'Pitch Deck',
  },
  {
    slug: 'sirket-tanitimi',
    h1: 'Şirket Tanıtım Sunumları',
    metaDescription:
      'Kurumsal şirket tanıtım sunumu örnekleri ve şablonları. Profesyonel şirket profili, kurumsal kimlik ve marka tanıtım sunumları.',
    guideText:
      'Şirket tanıtım sunumu, potansiyel müşterilere, ortaklara ve yatırımcılara kurumunuzu ilk saniyeden itibaren doğru aktarmanın yoludur. Misyon, vizyon, hizmetler ve referanslar bölümlerini içeren kapsamlı şirket tanıtım sunumları için aşağıdaki örneklere göz atın.',
    popularTags: ['Kurumsal', 'B2B', 'Marka', 'Referans', 'Hizmetler', 'About Us'],
    breadcrumbLabel: 'Şirket Tanıtımı',
  },
  {
    slug: 'satis-sunumu',
    h1: 'Satış Sunumu Örnekleri',
    metaDescription:
      'Satış artıran sunum teknikleri, örnekler ve şablonlar. Ürün ve hizmet satış sunumları için ilham al, dönüşüm oranını yükselt.',
    guideText:
      'Etkili bir satış sunumu müşteriyi doğru anda doğru mesajla buluşturur. Müşteri ihtiyacını anlayan, değer önerisini net koyan ve güçlü bir CTA ile biten satış sunumları en yüksek dönüşüm oranını sağlar. Aşağıda topluluğumuzun en beğenilen satış sunumlarını bulabilirsin.',
    popularTags: ['Sales', 'Satış', 'Ürün', 'Dönüşüm', 'B2B Satış', 'Demo'],
    breadcrumbLabel: 'Satış Sunumu',
  },
  {
    slug: 'pazarlama-plani',
    h1: 'Pazarlama Planı Sunumları',
    metaDescription:
      'Dijital pazarlama planı örnekleri ve şablonları. Marka stratejisi, içerik planı, sosyal medya ve büyüme stratejisi sunumları.',
    guideText:
      'Pazarlama planı sunumu; hedef kitle analizi, rekabet araştırması, kanal stratejisi ve ölçülebilir hedefleri bir arada sunar. İyi bir pazarlama planı sunumu ekibi hizalar, bütçeyi meşrulaştırır ve yönetimi ikna eder. En iyi örneklere aşağıdan ulaşabilirsin.',
    popularTags: ['Dijital Marketing', 'İçerik Stratejisi', 'SEO', 'Sosyal Medya', 'Growth', 'KPI'],
    breadcrumbLabel: 'Pazarlama Planı',
  },
  {
    slug: 'seo',
    h1: 'SEO Sunumları ve Raporları',
    metaDescription:
      'Arama motoru optimizasyonu sunumu örnekleri. Müşteriye veya yönetime sunmak için hazırlanmış SEO rapor ve strateji sunumları.',
    guideText:
      'SEO sunum ve raporları; organik trafik büyümesini, anahtar kelime sıralamalarını ve teknik iyileştirmeleri somut verilerle aktarır. Müşteriyi veya yönetimi ikna etmek için görsel destekli, sade ve net bir SEO sunumu şarttır. Topluluğun en iyi SEO sunum örnekleri aşağıda.',
    popularTags: ['Anahtar Kelime', 'Backlink', 'Teknik SEO', 'Core Web Vitals', 'SERP', 'Organik Trafik'],
    breadcrumbLabel: 'SEO Sunumları',
  },
  {
    slug: 'google-ads',
    h1: 'Google Ads Sunum ve Raporları',
    metaDescription:
      'Google Ads kampanya performans raporları ve dijital reklam sunumları. Müşterilere yönelik profesyonel PPC sunum örnekleri.',
    guideText:
      'Google Ads sunumu; tıklama maliyeti, dönüşüm oranı ve reklam harcaması getirisi gibi metrikleri görsel olarak aktarır. Ajanslar ve pazarlama ekipleri için hazırlanmış en iyi Google Ads rapor sunumları aşağıda seni bekliyor.',
    popularTags: ['PPC', 'CPC', 'ROAS', 'Display Ads', 'Remarketing', 'Conversion'],
    breadcrumbLabel: 'Google Ads',
  },
  {
    slug: 'yapay-zeka',
    h1: 'Yapay Zeka Sunumları',
    metaDescription:
      'Yapay zeka ve makine öğrenmesi sunum örnekleri. AI, ChatGPT, LLM ve veri bilimi konularında hazırlanmış etkileyici sunumlar.',
    guideText:
      "Yapay zeka teknolojileri iş dünyasını hızla dönüştürüyor. Bu değişimi yöneticilere, müşterilere veya sınıfa aktarmak için hazırlanmış kapsamlı yapay zeka sunumlarını aşağıda bulabilirsin. ChatGPT'den derin öğrenmeye, otomasyon senaryolarına kadar geniş bir içerik yelpazesi seni bekliyor.",
    popularTags: ['ChatGPT', 'LLM', 'Derin Öğrenme', 'Otomasyon', 'Veri Bilimi', 'Generative AI'],
    breadcrumbLabel: 'Yapay Zeka',
  },
  {
    slug: 'python',
    h1: 'Python Programlama Sunumları',
    metaDescription:
      'Python programlama dili sunum örnekleri. Veri analizi, veri bilimi, makine öğrenmesi ve web geliştirme Python sunumları.',
    guideText:
      "Python; veri bilimi, otomasyon ve web geliştirme alanlarında en çok kullanılan programlama dillerinden biridir. Slaytim'de paylaşılan Python sunum ve eğitim materyalleri ile hem öğren hem de kendi bilgini toplulukla paylaş.",
    popularTags: ['Pandas', 'NumPy', 'Matplotlib', 'FastAPI', 'Django', 'Jupyter'],
    breadcrumbLabel: 'Python Sunumları',
  },
  {
    slug: 'cv-portfolyo',
    h1: 'CV ve Portfolyo Sunumları',
    metaDescription:
      'Profesyonel CV, özgeçmiş ve portfolyo sunum şablonları. İş başvurularında öne çıkmak için tasarlanmış etkileyici sunum örnekleri.',
    guideText:
      'Sıradan bir PDF özgeçmişinin ötesine geç. Slayt formatında hazırlanmış görsel CV ve portfolyo sunumları işe alım uzmanlarının dikkatini çeker. En iyi tasarım, yazılım ve mühendislik portfolyo sunum örneklerine aşağıdan ulaşabilirsin.',
    popularTags: ['Kariyer', 'İş Başvurusu', 'UX Portfolio', 'Design Portfolio', 'LinkedIn', 'Mülakat'],
    breadcrumbLabel: 'CV & Portfolyo',
  },
  {
    slug: 'finansal-rapor',
    h1: 'Finansal Rapor Sunumları',
    metaDescription:
      'Şirket finansal rapor ve bütçe sunum örnekleri. Gelir tablosu, bilanço, nakit akışı ve yatırım analizlerini sunum formatında paylaş.',
    guideText:
      'Finansal raporların karmaşık rakamları anlaşılır sunumlara dönüştürülmesi yönetim kurulları ve yatırımcılar için büyük önem taşır. Topluluğumuzun paylaştığı en iyi finansal rapor sunum örneklerine aşağıdan göz atabilirsin.',
    popularTags: ['Bilanço', 'Gelir Tablosu', 'EBITDA', 'Nakit Akışı', 'ROI', 'Bütçe Planı'],
    breadcrumbLabel: 'Finansal Raporlar',
  },
  {
    slug: 'powerpoint-sablonlari',
    h1: 'PowerPoint Sunum Şablonları',
    metaDescription:
      'Hazır sunum şablonları ve PowerPoint alternatifleri. Hızlıca profesyonel sunum hazırlamak için kullanabileceğin ücretsiz şablonlar.',
    guideText:
      'Sıfırdan sunum tasarlamak için zaman harcamak zorunda değilsin. Slaytim topluluğunun paylaştığı profesyonel sunum şablonları ile hızlıca etkileyici sunumlar hazırlayabilirsin. Aşağıdaki örnekleri kaydet ve kendi içeriğinle özelleştir.',
    popularTags: ['Şablon', 'Template', 'Minimal', 'Dark Theme', 'Infografik', 'Flat Design'],
    breadcrumbLabel: 'Şablonlar',
  },
  {
    slug: 'ogretmen-sunumlari',
    h1: 'Öğretmen ve Eğitim Sunumları',
    metaDescription:
      'Öğretmenler için ders planı ve eğitim sunumu örnekleri. Sınıf içi etkinlik, ders anlatım ve öğrenci sunum şablonları.',
    guideText:
      "Öğrencilerin dikkatini çeken etkileşimli ders sunumları öğrenmeyi kolaylaştırır. Slaytim'de öğretmenler ve eğitimciler tarafından hazırlanmış ders planı, konu anlatım ve sınıf içi etkinlik sunumlarını keşfedebilirsin.",
    popularTags: ['Ders Planı', 'Eğitim', 'Okul', 'Lise', 'Üniversite', 'Sınıf İçi'],
    breadcrumbLabel: 'Öğretmen Sunumları',
  },
];

export const SEO_PAGE_SLUGS = SEO_PAGES.map((p) => p.slug);

export function getSeoPageConfig(slug: string): SeoPageConfig | null {
  return SEO_PAGES.find((p) => p.slug === slug) ?? null;
}

/** How many content items must exist for the page to be indexable. */
export const SEO_INDEX_THRESHOLD = 6;
