export type SeoEvergreenSection = {
  heading: string;
  body: string;
};

export type SeoFaq = {
  q: string;
  a: string;
};

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
  /** 400–800 word evergreen guide shown when contentCount === 0 */
  evergreenSections: SeoEvergreenSection[];
  /** FAQ items rendered as FAQPage JSON-LD + visible accordion */
  faqs: SeoFaq[];
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
    evergreenSections: [
      {
        heading: 'Pitch Deck Nedir, Neden Bu Kadar Önemlidir?',
        body: 'Pitch deck; bir girişimin fikrinden finansman hedefine uzanan yolculuğunu yatırımcılara aktaran, genellikle 10–20 slayttan oluşan görsel sunum belgesidir. Problem, çözüm, pazar büyüklüğü, iş modeli, ekip ve finansal ihtiyaç gibi temel bölümleri kapsar. İyi bir pitch deck\'in asıl hedefi yatırımı anında güvence altına almak değil, bir sonraki toplantıyı kazanmaktır. Yatırımcılar her hafta onlarca pitch deck incelediğinden sunumun ilk 60 saniyede dikkat çekecek kadar net ve özgün olması hayati önem taşır. Araştırmalar, VC fonlarının bir pitch deck\'e ortalama yalnızca 3–4 dakika ayırdığını göstermektedir; bu nedenle her slayt tek bir güçlü mesajı taşımalı, gereksiz detaylardan arındırılmış olmalıdır.',
      },
      {
        heading: 'Etkili Pitch Deck Yapısı: Slayt Sırasının Önemi',
        body: 'Sektörde en çok kabul gören pitch deck yapısı şu sırayla ilerler: (1) Güçlü bir kapak ve 30 saniyelik elevator pitch, (2) Problemi somut verilerle tanımlayan bir veya iki slayt, (3) Ürünün çözümü nasıl sunduğunu gösteren demo veya ekran görüntüleri, (4) TAM-SAM-SOM analizini içeren pazar büyüklüğü slaydı, (5) Gelir modeli ve fiyatlandırma, (6) Büyüme metrikleri ve traction kanıtları, (7) Rekabet haritası ile differentiator\'lar, (8) Ekip ve danışman kadrosu, (9) Finansal projeksiyon ve talep edilen yatırım miktarı ile kullanım alanı. Bu yapıya sadık kalmak hem yatırımcıya tanıdık bir deneyim sunar hem de hikayenin mantıksal akışını güvence altına alır.',
      },
      {
        heading: 'Pitch Deck Hazırlarken Yapılan Kritik Hatalar',
        body: 'En yaygın hata, sunumun hikaye yerine ürün özelliklerine odaklanmasıdır. Yatırımcı ürünün ne yaptığını değil, neden şimdi ve neden bu ekiple başarılı olacağını anlamak ister. Kaynak gösterilmemiş TAM rakamları, "rakibimiz yok" iddiası ve ekip slaydının sona konulması en sık karşılaşılan kırmızı bayraklardır. Ayrıca kullanılan font büyüklüğü okunabilirliği doğrudan etkiler; 18 punto altında metin içeren slaytlar arka sıradaki izleyiciler için görünmez hale gelir. Son olarak, pitch deck\'in iki versiyonunu hazırlamak iyi bir pratiktir: e-posta ile gönderilen, kendi kendine okunacak detaylı PDF versiyonu ile toplantıda sunulan, sözlü anlatıma destek veren görsel ağırlıklı slayt versiyonu.',
      },
    ],
    faqs: [
      {
        q: 'Pitch deck kaç slayt olmalıdır?',
        a: 'İdeal pitch deck 10–15 slayt arasındadır. Yatırımcının dikkat süresi genellikle 4–6 dakikayla sınırlıdır; bu nedenle 20 slaytı aşmak yerine her sayfayı maksimum etkiyle doldurmak önerilir.',
      },
      {
        q: 'Pitch deck ile iş planı arasındaki fark nedir?',
        a: 'İş planı; iş modelinin tüm ayrıntılarını, finansal tablolarını ve operasyonel süreçlerini içeren 20–50 sayfalık kapsamlı bir belgedir. Pitch deck ise bu bilgilerin en kritik parçalarını görsel ve özlü biçimde 10–15 slayta sıkıştıran, yatırımcıyı hızlıca ikna etmeye odaklanan sunumdur.',
      },
      {
        q: 'Pitch deck\'te finansal projeksiyon gerekli midir?',
        a: 'Evet. Seri A ve sonrası yatırım turlarında 3–5 yıllık gelir projeksiyonu, brüt marj ve burn rate verileri beklenir. Pre-seed aşamasında ise temel varsayımları gösteren tek bir slayt genellikle yeterlidir.',
      },
      {
        q: 'Pitch deck hangi araçlarla hazırlanır?',
        a: 'PowerPoint, Google Slides, Canva ve Figma en yaygın araçlardır. Slaytim\'de topluluk tarafından paylaşılmış pitch deck şablonlarını indirip kendi içeriğinizle özelleştirebilirsiniz.',
      },
    ],
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
    evergreenSections: [
      {
        heading: 'Şirket Tanıtım Sunumu Neden Şarttır?',
        body: 'Potansiyel bir müşteri veya iş ortağıyla ilk toplantıya girdiğinizde kurumunuzu tanıtmak için yalnızca birkaç dakikanız olur. Şirket tanıtım sunumu, bu kısa sürede markanın değerini, hizmetlerini ve güvenilirliğini profesyonelce aktarmanın en etkili yoludur. Bir web sitesi genel kitlelere hitap ederken şirket tanıtım sunumu, spesifik bir hedef kitleye — yani o toplantının karşı tarafına — özelleştirilmiş bir anlatı sunar. Güçlü bir kurumsal sunum marka bilinirliğini artırır, satış süreçlerini kısaltır ve şirketin ciddi bir paydaş olduğu izlenimini pekiştirir.',
      },
      {
        heading: 'Kurumsal Tanıtım Sunumunun Temel Bölümleri',
        body: 'Etkili bir şirket tanıtım sunumu şu temel bölümleri içermelidir: Hakkımızda (kuruluş yılı, vizyon, misyon), Sunulan Hizmetler veya Ürünler, Neden Biz (rekabet avantajları ve USP), Referanslar ve Müşteri Logoları, Ekip ve Uzmanlık, İletişim Bilgileri. Misyon ve vizyon bölümlerini soyut ifadelerle doldurmak yerine somut rakamlar ve başarı hikayeleriyle desteklemek ikna edicilik gücünü önemli ölçüde artırır. Müşteri logolarından oluşan bir "sosyal kanıt" sayfası, güven oluşturmanın en hızlı yollarından biridir.',
      },
      {
        heading: 'Sektöre Göre Şirket Tanıtım Sunumu Nasıl Farklılaşır?',
        body: 'Teknoloji şirketi ile üretim firmasının tanıtım sunumu yapı olarak benzer olsa da dil, görsel ton ve vurgulanan metrikler açısından büyük farklılıklar taşır. B2B hizmet şirketleri için vaka çalışmaları ve müşteri referansları ön plana çıkarılmalıyken, B2C markalar ürün deneyimini ve müşteri memnuniyet verilerini vurgular. Her toplantı öncesinde sunumun karşı tarafın sektörüne ve ihtiyacına göre özelleştirilmesi — örneğin finans sektörü müşterisine finans referanslarının eklenmesi — dönüşüm oranını anlamlı biçimde artırır.',
      },
    ],
    faqs: [
      {
        q: 'Şirket tanıtım sunumu kaç slayt olmalı?',
        a: 'Genellikle 10–20 slayt yeterlidir. Toplantı süresine göre kısa (10 dakika) ve uzun (30 dakika) versiyonlar hazırlamak pratik bir yaklaşımdır.',
      },
      {
        q: 'Şirket tanıtım sunumuna fiyat bilgisi eklenmeli mi?',
        a: 'İlk tanıtım aşamasında fiyat bilgisi paylaşmak genellikle önerilmez. Sunumun amacı fiyatlandırma müzakeresi değil, yeterli ilgiyi oluşturarak bir sonraki adıma geçmektir.',
      },
      {
        q: 'Şirket tanıtım sunumu PDF mi, PowerPoint mi olmalı?',
        a: 'Her ikisi de hazırlanmalıdır. Toplantıda PowerPoint kullanılırken e-posta ile gönderilecek versiyon, font kaymasını önlemek için PDF\'e aktarılmalıdır.',
      },
      {
        q: 'Her müşteriye aynı sunum mu gönderilmeli?',
        a: 'Temel şablon aynı kalsa da sunum, karşı tarafın sektörüne ve ihtiyacına göre özelleştirilmelidir. Müşteriye özel referanslar ve sektöre uygun vaka çalışmaları eklemek dönüşüm oranını artırır.',
      },
    ],
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
    evergreenSections: [
      {
        heading: 'Satış Sunumu Neden Rakibinizden Sizi Ayırır?',
        body: 'Satış sunumu; bir ürün veya hizmetin potansiyel müşteriye değerini somut biçimde aktarmak için kullanılan yapılandırılmış bir slayt deneyimidir. Başarılı satış sunumları müşterinin sorununu merkeze alır, ürünü bir çözüm olarak konumlandırır ve satın alma kararını kolaylaştıracak güçlü bir eylem çağrısıyla son bulur. Satış sunumu ile şirket tanıtımı arasındaki temel fark odaktır: şirket tanıtımı "biz kimiz" derken satış sunumu "senin sorunun şu ve biz onu şöyle çözüyoruz" mesajını taşır. İkna edici bir sunum, uzun satış döngülerini kısaltır ve karar vericilerin zihinsel direncini azaltır.',
      },
      {
        heading: 'Kanıtlanmış Satış Sunumu Yapısı',
        body: 'Etkili bir satış sunumu şu akışla kurgulanmalıdır: (1) Müşterinin mevcut durumu — durumu özetleyin ve empati kurun, (2) Sorun — yaptıkları işin neden maliyetli olduğunu somutlaştırın, (3) Etki — sorun çözülmezse ne olacağını rakamlarla gösterin, (4) Çözüm — ürün veya hizmetinizin bu sorunu nasıl çözdüğünü net bir dille aktarın, (5) Kanıt — vaka çalışması, müşteri yorumu veya canlı demo, (6) CTA — net bir sonraki adım belirleyin. Bu yapı SPIN Selling ve Challenger Sale metodolojileriyle uyumludur ve B2B satış süreçlerinde yüksek etkinliği kanıtlanmıştır.',
      },
      {
        heading: 'Satış Sunumunda Yapılan En Yaygın Hatalar',
        body: 'En yaygın hata, sunumun müşteri değil ürün odaklı olmasıdır. "Ürünümüz şunları yapıyor" yerine "müşterimiz bu özellik sayesinde %30 maliyet düşürdü" çerçevesi ikna gücünü dramatik biçimde artırır. Aşırı kalabalık slaytlar, küçük punto metinler ve "her şeye yarıyor" mesajı satışı sekteye uğratan başlıca unsurlardır. Başarılı satış sunumları kısa, görsel ve müşterinin dilinde konuşan; rakip sorulara hazırlıklı bir yapıyla desteklenen sunumlardır.',
      },
    ],
    faqs: [
      {
        q: 'Satış sunumu ile demo arasındaki fark nedir?',
        a: 'Satış sunumu stratejik değer önerisini ve karar çerçevesini kurarken demo, ürünün nasıl çalıştığını gösterir. İkisi birlikte kullanıldığında en yüksek etki elde edilir; önce sunum değer çerçevesi kurar, sonra demo bunu somutlaştırır.',
      },
      {
        q: 'Satış sunumunda kaç vaka çalışması kullanmalıyım?',
        a: '2–3 güçlü vaka çalışması, 10 zayıf referanstan daha etkilidir. Seçilen vakalar, karşınızdaki müşterinin sektörüne ve sorununa mümkün olduğunca yakın olmalıdır.',
      },
      {
        q: 'Satış sunumu ne kadar sürmeli?',
        a: 'B2B satış toplantıları için 20–30 dakika ideal sunum süresidir; geriye soru-cevap için en az 15 dakika bırakılmalıdır. Müşterinin soru sormadan susup dinlediği bir sunum genellikle ilgisizliğin işaretidir.',
      },
      {
        q: 'Online satış sunumu yüz yüze sunumdan farklı hazırlanmalı mı?',
        a: 'Evet. Online sunumlarda dikkat dağılması çok daha kolaydır. Slayt başına tek mesaj ilkesi, daha büyük fontlar ve her 5 dakikada bir katılımcıyı konuşmaya davet eden sorular eklenmesi önerilir.',
      },
    ],
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
    evergreenSections: [
      {
        heading: 'Pazarlama Planı Sunumu Neden Gereklidir?',
        body: 'Pazarlama planı sunumu; bir markanın veya ürünün pazar payını büyütmek için izlenecek stratejiyi, öncelikleri ve bütçeyi yönetim veya ekiple paylaşmanın en yapılandırılmış yoludur. Yalnızca bir belge olmaktan öte, bu sunum pazarlama ekibinin yıl boyunca doğru önceliklere odaklanmasını sağlayan bir hizalama aracıdır. İyi bir pazarlama planı sunumu; hedef kitle tanımından kanal stratejisine, içerik takvimine ve ölçüm metriklerine kadar tüm bileşenleri tek bir uyumlu hikayede birleştirir ve yönetim onayını kolaylaştırır.',
      },
      {
        heading: 'Pazarlama Planı Sunumunun Temel Bölümleri',
        body: 'Kapsamlı bir pazarlama planı sunumunda şu bölümler yer alır: Durum Analizi (SWOT veya PESTLE), Hedef Kitle ve Persona Tanımları, Pazarlama Hedefleri (SMART formatında), Kanal Stratejisi (SEO, sosyal medya, e-posta, ücretli reklamlar), İçerik Planı ve Takvim, Bütçe Dağılımı, Ölçüm ve KPI Çerçevesi. Her bölüm somut verilerle desteklenmeli; soyut pazarlama jargonu yerine ulaşılabilir hedefler ve net metrikler kullanılmalıdır.',
      },
      {
        heading: 'Dijital ve Geleneksel Pazarlama Planı Farkları',
        body: 'Dijital pazarlama planı; SEO, içerik pazarlaması, sosyal medya, e-posta otomasyonu ve ücretli dijital reklamları kapsar ve sonuçları anlık ölçülebilir. Geleneksel pazarlama planı ise TV, radyo, açıkhava ve baskılı medyayı içerir; etki ölçümü daha uzun sürer. Günümüzde en etkili pazarlama planları her iki kanalı da içeren entegre yapılardır. Hangi kanalı seçerseniz seçin, başarı için hedef kitleyi en iyi tanıyan, mesajı en net ileten ve bütçeyi en verimli kullanan plan kazanır.',
      },
    ],
    faqs: [
      {
        q: 'Pazarlama planı sunumu ne kadar sürmeli?',
        a: 'Yönetim kuruluna yapılan üst düzey sunumlar için 15–20 dakika, ekip içi aylık sunum güncellemeleri için 30–45 dakika uygundur. Uzun sunumlarda yönetici özeti slaydı eklemeyi ihmal etmeyin.',
      },
      {
        q: 'Pazarlama planında bütçe nasıl sunulmalı?',
        a: '"Sosyal medyaya 50.000 TL harcayacağız" yerine "sosyal medya bütçemizle önümüzdeki çeyrekte 300 yeni lead hedefliyoruz" çerçevesi yönetim onayını kolaylaştırır. Bütçeyi her zaman beklenen ROI ile birlikte sunun.',
      },
      {
        q: 'Pazarlama planına rekabet analizi eklenmeli mi?',
        a: 'Kesinlikle evet. Rakiplerin güçlü ve zayıf yönlerini gösteren bir slayt, kendi stratejinizi doğrulamak açısından kritik önem taşır. Rekabet analizi olmadan hazırlanan pazarlama planı, bağlamdan yoksun bir strateji izlenimi verir.',
      },
      {
        q: 'Yıllık mı çeyreklik pazarlama planı mı daha etkilidir?',
        a: 'Yıllık plan büyük resmi ve öncelikleri belirler; çeyreklik planlar ise bu büyük resmi uygulanabilir, ölçülebilir parçalara böler. İkisini birlikte kullanmak en sağlıklı yaklaşımdır.',
      },
    ],
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
    evergreenSections: [
      {
        heading: 'SEO Sunumu Nedir ve Kime Sunulur?',
        body: 'SEO sunumu; bir web sitesinin organik arama performansını, yapılan optimizasyonların etkisini ve gelecekteki stratejiyi yöneticilere, müşterilere veya yatırımcılara aktarmak için hazırlanan görsel rapordur. Ajanslar müşteri toplantılarında aylık performans raporlarını, kurumsal SEO ekipleri ise yönetim kurullarında strateji sunumlarını bu format üzerinden gerçekleştirir. İyi bir SEO sunumu soyut teknik terimleri iş etkisine çevirir; örneğin "organik trafik %40 arttı" yerine "bu büyüme aylık 100.000 ek ziyaretçiye ve tahminen 1,2 milyon TL ek gelire karşılık geliyor" şeklinde konuşur.',
      },
      {
        heading: 'SEO Rapor Sunumunun Temel Bölümleri',
        body: 'Kapsamlı bir SEO sunum raporunda şu bölümler yer alır: Özet (geçen aya göre trafik, sıralama, dönüşüm değişimleri), Organik Trafik Trendi (Google Analytics ve Search Console verileri), Anahtar Kelime Performansı (kazanılan, kaybedilen ve hedef sıralamalar), Teknik SEO Durumu (Core Web Vitals, crawl hataları, index oranı), Bağlantı Profili (kazanılan ve kaybedilen backlinkler), Yapılan Çalışmalar ile Bir Sonraki Dönem Planı, ROI Hesaplaması. Her bölümde veri kaynağını belirtmek güvenilirlik açısından zorunludur.',
      },
      {
        heading: 'Teknik Olmayan Yöneticilere SEO Nasıl Anlatılır?',
        body: 'Canonicalization, hreflang veya log file analizi gibi teknik SEO terimleri yöneticiler için anlamsız gürültüye dönüşebilir. Bu kitleye sunum yaparken her teknik konuyu iş etkisiyle ilişkilendirin: "Sayfa hızını 3 saniyeden 1,5 saniyeye indirdik" yerine "sayfa hızı optimizasyonu mobil dönüşüm oranını %12 artırdı" ifadesi çok daha ikna edicidir. Slaytim topluluğundaki SEO sunum örnekleri, teknik içeriği iş diline çevirme konusunda somut şablonlar sunar.',
      },
    ],
    faqs: [
      {
        q: 'SEO rapor sunumu ne sıklıkla yapılmalı?',
        a: 'Ajans-müşteri ilişkilerinde aylık sunum standarttır. Kurumsal ekipler için haftalık kısa güncelleme + aylık kapsamlı rapor kombinasyonu önerilir. Site göçü veya algoritma güncellemesi sonrasında haftalık izleme sunumları yapılmalıdır.',
      },
      {
        q: 'SEO sunumunda hangi araçların verisi kullanılmalı?',
        a: 'Google Search Console ve Google Analytics temel araçlardır. Bunlara ek olarak Ahrefs, SEMrush veya Sistrix gibi ücretli araçlar rekabet analizi ve backlink profili için kullanılabilir. Kullanılan tüm araçları sunumun başında belirtmek şeffaflık yaratır.',
      },
      {
        q: 'SEO çalışmalarının etkisi nasıl ölçülür?',
        a: 'Yıldan yıla (YoY) karşılaştırma en sağlıklı yöntemdir; mevsimsellik etkisini izole eder. Belirli sayfalarda yapılan optimizasyonların trafiğe etkisini Google Search Console üzerinden segment bazında takip edebilirsiniz.',
      },
      {
        q: 'SEO sunumuna teknik konular ne kadar detaylı eklenmeli?',
        a: 'Hedef kitleye göre değişir. Yöneticiler için "ne yaptık ve ne kazandık" yeterlidir; teknik ekipler için tam hata listesi ve öneri detayları ayrı bir ek slayt veya teknik rapor olarak sunulabilir.',
      },
    ],
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
    evergreenSections: [
      {
        heading: 'Google Ads Sunum ve Raporları Neden Önemlidir?',
        body: 'Google Ads kampanya verisi; tıklama sayısı, gösterim, dönüşüm oranı ve ROAS gibi onlarca metrikten oluşur. Ham veriyi müşteriye veya yönetim kuruluna doğrudan iletmek anlam üretmez; bu verileri anlamlı bir sunuma dönüştürmek, yapılan çalışmanın değerini ve bir sonraki adımı açıkça ortaya koymak gerekir. İyi bir Google Ads sunumu; kampanyanın hedeflere ulaşıp ulaşmadığını, bütçenin nerede en verimli kullanıldığını ve optimizasyon fırsatlarını net bir hikayeyle aktararak müşteri güvenini ve sözleşme yenileme oranını artırır.',
      },
      {
        heading: 'Google Ads Rapor Sunumunun Temel Metrik ve Bölümleri',
        body: 'Etkili bir Google Ads rapor sunumunda şu bölümler yer alır: Kampanya Performans Özeti (harcama, tıklama, gösterim, CTR), Dönüşüm Metrikleri (dönüşüm sayısı, dönüşüm başı maliyet, ROAS), Anahtar Kelime Performansı (en iyi ve en kötü performans gösterenler), Reklam Metni A/B Test Sonuçları, Hedef Kitle ve Demografik Analiz, Bütçe Kullanımı ve Öneri, Bir Sonraki Dönem Optimizasyon Planı. Her metriği bir önceki dönemle karşılaştırmalı (delta) olarak sunmak ilerlemeyi anında görünür kılar.',
      },
      {
        heading: 'Google Ads Sunumunu Daha İkna Edici Yapmanın Yolları',
        body: 'Müşteri veya yönetim, reklam metnini değil sonuçları görmek ister. Dönüşüm verilerini iş değeriyle ilişkilendirin: "CPA\'yı 180 TL\'den 120 TL\'ye düşürdük" yerine "aynı bütçeyle %50 daha fazla müşteri kazandık" çerçevesi çok daha güçlüdür. Veri görselleştirme — trend grafikler ve karşılaştırmalı tablolar — sunumun anlaşılırlığını artırır. Düşük performanslı kampanyaları saklamak yerine nedenini ve çözüm planını şeffaflıkla sunmak uzun vadeli güven inşa eder.',
      },
    ],
    faqs: [
      {
        q: 'Google Ads rapor sunumu ne kadar sıklıkla yapılmalı?',
        a: 'Küçük bütçeli kampanyalar için aylık, büyük bütçeli veya sürekli optimize edilen kampanyalar için haftalık kısa güncelleme + aylık kapsamlı rapor kombinasyonu önerilir.',
      },
      {
        q: 'Google Ads sunumunda ROAS mı yoksa ROI mi kullanılmalı?',
        a: 'İkisi farklı şeyleri ölçer. ROAS reklam gelirini reklam harcamasına bölerken, ROI daha geniş bir kâr hesabıdır. E-ticaret için ROAS, B2B için lead maliyeti (CPL) ve kapanış oranı genellikle daha anlamlıdır.',
      },
      {
        q: 'Düşük performanslı kampanyalar raporda nasıl sunulmalı?',
        a: 'Şeffaflık güven inşa eder. Zayıf performansı saklamak yerine nedenini ve yapılacakları açıkça sunun. "Bu kampanya beklentinin altında kaldı; şu değişikliklerle düzelteceğiz" yaklaşımı müşteri güvenini artırır.',
      },
      {
        q: 'Google Ads sunumuna rakip analizi eklenmeli mi?',
        a: 'Evet. Google Ads Açık Artırma Analizini sunuma ekleyin. Rakiplerin gösterim payı ve teklif rekabeti, strateji kararlarını meşrulaştırmak için güçlü bir bağlam sağlar.',
      },
    ],
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
    evergreenSections: [
      {
        heading: 'Yapay Zeka Sunumu Neden Bu Kadar Popüler?',
        body: 'Yapay zeka teknolojileri; iş süreçlerini otomatikleştirme, veri analizi ve müşteri deneyimini kişiselleştirme kapasitesiyle her sektörü dönüştürüyor. Bu dönüşümü yöneticilere, müşterilere veya öğrencilere anlatmak için yapay zeka sunumları kritik bir araç haline gelmiştir. ChatGPT\'nin yaygınlaşmasıyla birlikte "AI sunum" araması son iki yılda on kat arttı; kurumlar yapay zekanın ne olduğunu, ne yapabileceğini ve nasıl uygulanacağını görsel olarak açıklamayı öncelikli bir ihtiyaç olarak görüyor.',
      },
      {
        heading: 'Yapay Zeka Sunumu Nasıl Yapılandırılır?',
        body: 'Etkili bir yapay zeka sunumu için önce hedef kitleyi belirleyin: teknik bir ekip mi yoksa teknik olmayan yöneticiler mi? Teknik kitleye model mimarisi, fine-tuning yöntemleri ve benchmark karşılaştırmaları sunulabilirken; genel yönetime "AI bize ne kazandıracak?" sorusuna odaklanmak daha işlevseldir. Her iki durumda da gerçek kullanım senaryoları ve somut ROI tahminleri içeren slaytlar en fazla etkiyi yaratır. LLM, RAG, vektör veritabanı gibi teknik terimleri dahili sunumlara saklayıp dışarıya yönelik sunumlarda sade ve anlaşılır bir dil kullanmak önerilir.',
      },
      {
        heading: 'Kurumsal AI Sunumunda Dikkat Edilmesi Gereken Noktalar',
        body: 'Üretken yapay zekayı sunarken "her şeyi yapabilir" abartısından kaçının; hallucination riski, veri gizliliği kaygıları ve etik sınırlamaları dürüstçe aktarın. Yöneticiler teknolojiye yatırım kararı verirken riskleri de görmek ister. Buna karşın AI\'ın üretkenlik artışı, maliyet düşürme ve karar destek kapasitesini somut örneklerle gösterdiğinizde ikna çok daha kolay olur. Slaytim topluluğunun yapay zeka sunumlarında hem teknik hem de iş odaklı yaklaşımları bir arada gözlemleyebilirsiniz.',
      },
    ],
    faqs: [
      {
        q: 'Yapay zeka sunumuna teknik terimler ne kadar eklenmelidir?',
        a: 'Tamamen hedef kitleye bağlıdır. Mühendis ekiplerine teknik derinlik şarttır; yöneticilere ise teknik terimleri iş sonuçlarıyla ilişkilendirerek sunmak daha etkilidir. Tek sunum yerine kitleye göre iki versiyon hazırlamayı düşünün.',
      },
      {
        q: 'Yapay zeka sunumunda hangi modeller öne çıkarılmalı?',
        a: 'GPT-4, Claude, Gemini gibi büyük dil modellerini karşılaştırmalı olarak sunabilirsiniz. Ancak araç yarışına girmek yerine "bu araç şu sorunu şöyle çözüyor" çerçevesi daha ikna edicidir.',
      },
      {
        q: 'Kurumsal AI sunumunda veri güvenliği nasıl anlatılmalı?',
        a: 'Veri gizliliği ve siber güvenlik konularını açıkça ele almak güven inşa eder. Hangi verilerin modele gönderildiği, verilerin nerede işlendiği ve GDPR/KVKK uyumluluğu bu bölümde açıklanmalıdır.',
      },
      {
        q: 'Yapay zeka sunumu hazırlamak için özel bir araca gerek var mı?',
        a: 'Hayır. PowerPoint, Google Slides veya Canva gibi standart sunum araçları yeterlidir. Önemli olan araç değil; net bir hikaye yapısı, görsel kullanım senaryoları ve gerçekçi ROI verileridir.',
      },
    ],
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
    evergreenSections: [
      {
        heading: 'Python Sunumları Neden Bu Kadar Yaygın?',
        body: 'Python, veri bilimi, makine öğrenmesi, web geliştirme ve otomasyon alanlarında dünyanın en çok kullanılan programlama dilleri arasında yer alır. Bu yaygınlık, Python konusunda hazırlanmış akademik sunum, kurs materyali, teknik konferans slaydı ve iş dünyasına yönelik ürün tanıtım sunumu sayısını her geçen yıl katlamaktadır. İster üniversitede veri bilimi dersi anlatan bir akademisyen olun, ister kurumunuzdaki Python geçişini yönetime sunan bir mühendis; doğru yapılandırılmış bir Python sunumu karmaşık kavramları anlaşılır ve eyleme geçirilebilir kılar.',
      },
      {
        heading: 'Python Sunumlarının Türleri ve Kullanım Senaryoları',
        body: 'Python sunumları birkaç farklı kategoriye ayrılır: (1) Eğitim sunumları — bootcamp materyalleri ve "Python\'a Giriş" kursları; (2) Teknik konferans sunumları — yeni kütüphane veya framework tanıtımı (FastAPI, Polars, Pydantic gibi); (3) Veri analizi raporları — Pandas, Matplotlib ve Seaborn kullanılarak oluşturulan görselleştirmeler; (4) Proje tanıtımları — Python ile geliştirilen bir ürün veya iç aracın iş birimine sunulması. Her kategorinin dili, görsel stili ve teknik derinliği birbirinden farklıdır.',
      },
      {
        heading: 'Etkili Python Sunumu Hazırlamak için İpuçları',
        body: 'Python sunumlarında kod blokları göstermek güçlüdür ancak dikkatli kullanılmalıdır. Çok fazla satır içeren kod ekranları dinleyicinin dikkatini dağıtabilir. En etkili yaklaşım; kısa ve sürpriz yaratan snippet\'lar kullanmak, ardından sonucu iş değeriyle ilişkilendirmektir. Jupyter Notebook ekran görüntüleri ve terminal çıktısı görselleştirmeleri sunumu zenginleştirir. Sunum sırasında canlı kod çalıştırmak ise güçlü bir etki yaratır ancak bağlantı veya ortam sorunlarına karşı önceden hazırlıklı olunmalıdır.',
      },
    ],
    faqs: [
      {
        q: 'Python öğrenmek için sunum materyalleri yeterli midir?',
        a: 'Sunumlar iyi bir başlangıç ve tekrar materyali olarak işlevseldir; ancak Python öğrenmek için pratik yapmak şarttır. Sunumları kavramsal çerçeve kurmak için kullanın, ardından gerçek projeler üzerinde kod yazarak öğrenimi pekiştirin.',
      },
      {
        q: 'Python sunum materyali hazırlarken hangi araçları kullanmalıyım?',
        a: 'Jupyter Notebook ve Google Colab, hem kod çalıştırmanıza hem de not eklemenize olanak tanır. Slayt formatı için Jupyter\'ın RISE eklentisi veya standart PowerPoint/Google Slides kullanılabilir.',
      },
      {
        q: 'Python ile veri görselleştirme sunumları nasıl hazırlanır?',
        a: 'Matplotlib, Seaborn ve Plotly kütüphaneleriyle oluşturulan grafikler doğrudan sunuma eklenebilir. Plotly\'nin interaktif grafikleri HTML formatında kaydedilip tarayıcıda sunulabilir, bu da canlı demo etkisi yaratır.',
      },
      {
        q: 'Python sunumunda hangi konuları ele almalıyım?',
        a: 'Hedef kitleye göre değişir. Başlangıç için değişkenler ve döngüler; orta seviye için Pandas ve NumPy; ileri seviye için makine öğrenmesi, API geliştirme veya asenkron programlama konuları ele alınabilir.',
      },
    ],
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
    evergreenSections: [
      {
        heading: 'CV Sunumu Neden Standart PDF Özgeçmişten Üstündür?',
        body: 'İşe alım uzmanları yüzlerce klasik PDF özgeçmiş incelediği günümüzde görsel ve etkileşimli bir CV sunumu ciddi bir ayırt edici güç taşır. Slayt formatındaki bir özgeçmiş; becerilerinizi görsel örneklerle desteklemenize, projelerinize doğrudan bağlantı vermenize ve kendinizi çok daha bütünsel bir anlatıyla sunmanıza olanak tanır. Tasarım, yazılım, mühendislik, pazarlama ve UX gibi yaratıcı veya teknik alanlarda portfolyo sunumu neredeyse bir standart haline gelmiştir.',
      },
      {
        heading: 'CV Sunumunun Temel Bölümleri',
        body: 'Etkili bir CV sunumu genellikle şu bölümlerden oluşur: Kapak sayfası (isim, unvan, kısa elevator pitch cümlesi), Deneyim (kronolojik veya etki odaklı), Yetenekler ve Teknolojiler (görsel beceri haritası), Seçilmiş Projeler (ekran görüntüsü veya bağlantı içeren), Eğitim ve Sertifikalar, İletişim ve Profil Linkleri. Her bölümde somut metrikler kullanmak güçlü bir izlenim yaratır: "proje yönettim" yerine "8 kişilik ekiple 6 ayda teslim ettim" gibi ifadeler çok daha ikna edicidir.',
      },
      {
        heading: 'Online Portfolyo mu, Sunum Portfolyosu mu?',
        body: 'Online portfolyo (kişisel web sitesi) ile sunum formatındaki portfolyo farklı senaryolara hizmet eder. Web siteniz Google\'da keşfedilmenizi sağlarken, sunum formatındaki portfolyo birebir müzakere toplantılarında öne çıkarmanıza yardımcı olur. İdeal yaklaşım her ikisini de hazırlamak ve bağlantılı kılmaktır. Slaytim\'de paylaşabileceğiniz portfolyo sunumunuz hem sosyal kanıt hem de iş başvurularında güçlü bir referans belgesi işlevi görür.',
      },
    ],
    faqs: [
      {
        q: 'CV sunumu kaç sayfa olmalı?',
        a: '5–12 slayt arası ideal bir uzunluktur. Sayfaları doldurmak için gereksiz içerik eklemek yerine az ama güçlü örnek seçin; her slayt tek bir güçlü fikri veya projeyi göstermelidir.',
      },
      {
        q: 'CV sunumunu LinkedIn ile nasıl entegre edebilirim?',
        a: 'Slaytim\'e yüklediğiniz sunum profilinizde görünür hale gelir; bu linki LinkedIn "Öne Çıkan" bölümüne ekleyebilirsiniz. Sunum içinde LinkedIn profilinize ve GitHub/Behance gibi platformlara bağlantı verin.',
      },
      {
        q: 'Hangi renk ve tasarım tarzı CV sunumunda etkilidir?',
        a: 'Sektöre göre değişir. Finans ve hukuk gibi alanlarda minimalist ve kurumsal tasarım önerilirken; tasarım, reklamcılık ve teknoloji girişimlerinde daha yaratıcı stiller kabul görür. Her durumda okunabilirlik öncelikli olmalıdır.',
      },
      {
        q: 'CV sunumunu iş başvurusunda nasıl kullanmalıyım?',
        a: 'Slaytim üzerinden paylaşılabilir link olarak e-posta ile gönderin veya mülakat davetine cevap verirken PDF versiyonunu eke ekleyin. Özellikle yaratıcı roller için bu sunum, standart CV\'ye göre çok daha güçlü bir ilk izlenim yaratır.',
      },
    ],
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
    evergreenSections: [
      {
        heading: 'Finansal Rapor Sunumu Neden Kritik Önem Taşır?',
        body: 'Ham finansal veriler — gelir tabloları, bilançolar, nakit akış tabloları — tek başına yönetim kurullarını veya yatırımcıları harekete geçirmez. Bu verilerin anlamlı bir görsel sunuma dönüştürülmesi, karar alıcıların şirketin finansal sağlığını hızla kavramasını ve doğru aksiyonları almasını sağlar. İyi bir finansal rapor sunumu sadece rakam aktarmaz; trendleri görünür kılar, riskleri önceden işaret eder ve büyüme fırsatlarını somutlaştırır. Yönetim kurulu güvenini kazanmanın ve bütçe onayı almanın en etkili yolu budur.',
      },
      {
        heading: 'Finansal Rapor Sunumunun Temel Bölümleri',
        body: 'Kapsamlı bir finansal rapor sunumunda şu bölümler yer alır: Yönetici Özeti (en önemli metriklerin kısa özeti), Gelir Tablosu Analizi (ciro, brüt kâr, EBITDA), Bilanço Değerlendirmesi (varlık/yükümlülük dengesi, likidite), Nakit Akışı Analizi (operasyonel, yatırım ve finansman faaliyetleri), Bütçe Gerçekleşme Karşılaştırması, Segment veya Ürün Bazlı Performans, Öngörü ve Risk Faktörleri. Her bölümde önceki dönemle karşılaştırmalı delta göstergeler kullanmak eğilimi hızla anlaşılır kılar.',
      },
      {
        heading: 'Finansal Verileri Görsel Olarak Sunmanın Püf Noktaları',
        body: 'Pasta grafik yerine waterfall grafik, EBITDA köprüleri ve bullet chart gibi ileri veri görselleştirme yöntemleri finansal verileri çok daha güçlü biçimde aktarır. Renk kodlaması tutarlı olmalıdır: kırmızı negatif sapmayı, yeşil pozitif sapmayı göstermeli ve bu kodlama sunum boyunca hiç değişmemelidir. Her slayta tek bir mesaj yerleştirmek, karmaşık verilerde bile odağı korur.',
      },
    ],
    faqs: [
      {
        q: 'Finansal rapor sunumu kaç slayt olmalı?',
        a: 'Yönetim kurulu sunumları için 15–25 slayt uygundur. Özet, gelir, nakit akışı, bilanço ve öngörü bölümlerini içermelidir. Destekleyici detaylar ek slaytlara taşınabilir.',
      },
      {
        q: 'Finansal verileri sunarken ne tür grafikler kullanılmalı?',
        a: 'Trend verileri için çizgi grafik, kategorik karşılaştırma için çubuk grafik, sapmalar için waterfall grafik önerilir. Tek slayta çok fazla grafik sığdırmaktan kaçının.',
      },
      {
        q: 'Yatırımcılara finansal rapor sunarken odak noktası ne olmalı?',
        a: 'Yatırımcılar üç şeye odaklanır: büyüme hızı, kârlılık yolu ve nakit durumu (runway). Sunumu bu üç eksende kurgulayıp destekleyici metrikleri ikincil konuma alın.',
      },
      {
        q: 'CFO olmayan biri finansal rapor sunumu yapabilir mi?',
        a: 'Evet. Temel finansal kavramları anlayan herhangi bir yönetici veya analist, doğru şablon ve veri kaynaklarıyla güçlü bir finansal sunum hazırlayabilir. Slaytim topluluğunun paylaştığı örnekler bu konuda pratik bir başlangıç noktası sunar.',
      },
    ],
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
    evergreenSections: [
      {
        heading: 'Hazır Sunum Şablonu Kullanmanın Avantajları',
        body: 'Sıfırdan sunum tasarlamak hem zaman alır hem de görsel tasarım kararları vermeyi gerektirir. Renk paleti, tipografi hiyerarşisi ve slayt düzeni gibi kararlar pek çok profesyonelin zamanını çalar. Hazır sunum şablonları bu problemi ortadan kaldırır: tasarım altyapısı kurulmuş, boşluklara içerik doldurmak yeterlidir. Kurumsal ortamlarda marka tutarlılığını korumak için şablonlar özellikle vazgeçilmezdir; her çalışanın farklı görsel dilde hazırladığı sunumlar markanın tutarlılığını zedeler.',
      },
      {
        heading: 'İyi Bir Sunum Şablonunun Özellikleri',
        body: 'Kaliteli bir sunum şablonu şu özellikleri taşır: Tutarlı renk paleti (en fazla 3–4 ana renk), net tipografi hiyerarşisi (başlık, alt başlık ve gövde metni için farklı boyutlar), çeşitli yerleşim seçenekleri (metin ağırlıklı, görsel ağırlıklı, veri slaytları), düzenlenebilir placeholder\'lar ve yüksek çözünürlüklü grafik seti. Şablonu seçerken sektörünüzün görsel diline uygunluğuna ve renk paletinin marka kimliğinizle örtüşmesine dikkat edin.',
      },
      {
        heading: 'Şablonu Özelleştirirken Yapılan Yaygın Hatalar',
        body: 'Hazır şablonu kullananların en sık düştüğü tuzak, şablonun tasarım mantığını bozmaktır: belirlenen renkler dışına çıkmak, font karıştırmak veya yerleşim gridini görmezden gelmek bütünlüğü bozar. Şablonu özelleştirirken yalnızca içeriği, renkleri ve görselleri değiştirin; ana yerleşim yapısını ve tipografik hiyerarşiyi olduğu gibi koruyun. Böylece tutarlı, profesyonel görünümü korurken içeriği tamamen kendi markanıza uyarlayabilirsiniz.',
      },
    ],
    faqs: [
      {
        q: 'PowerPoint ile Google Slides şablonları arasındaki fark nedir?',
        a: 'İşlev olarak çok benzerler. Google Slides tamamen tarayıcı tabanlı çalışır ve gerçek zamanlı işbirliğine olanak tanır. PowerPoint yerel uygulama olduğundan daha fazla tasarım özelliği sunar. Şablonlar her iki formatta da kullanılabilir.',
      },
      {
        q: 'Sunum şablonlarını nereden bulabilirim?',
        a: 'Slaytim topluluğu, indirip özelleştirebileceğiniz sunum şablonları paylaşmaktadır. Bunun yanı sıra Canva, Google Slides Şablon Galerisi ve SlidesCarnival ücretsiz şablonlar sunar.',
      },
      {
        q: 'Kurumsal marka şablonu nasıl oluşturulur?',
        a: 'Marka renklerini ve logosunu slayt masterına ekleyin, kurumsal yazı tiplerini yükleyin ve tüm çalışanların kullanabileceği kapak, içindekiler, metin ve kapanış slayt düzenlerini hazırlayın.',
      },
      {
        q: 'Sunum şablonu seçerken nelere dikkat etmeliyim?',
        a: 'Önce amacınızı belirleyin: yatırımcı sunumu için profesyonel ve minimal, eğitim sunumu için daha renkli ve etkileşimli, satış sunumu için ürün görsellerini ön plana çıkaran bir şablon tercih edin.',
      },
    ],
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
    evergreenSections: [
      {
        heading: 'Öğretmen Sunumları Öğrenmeyi Neden Kolaylaştırır?',
        body: 'Araştırmalar, görsel destekli ders anlatımının bilgiyi yalnızca sözel anlatıma kıyasla çok daha kalıcı kıldığını göstermektedir. Düz not yazmak yerine yapılandırılmış bir slayt sunumu; konuyu mantıksal bölümlere ayırır, anahtar kavramları görsel olarak vurgular ve öğrencinin dikkatini yönlendirir. Öğretmenler için iyi hazırlanmış bir sunum hem sınıf yönetimini kolaylaştırır hem de ders saatini daha verimli kullanmayı sağlar. Slaytim\'de öğretmenler tarafından hazırlanmış ders planı, konu anlatım ve etkinlik sunumlarını keşfederek kendi derslerinize ilham alabilirsiniz.',
      },
      {
        heading: 'Etkili Öğretmen Sunumu Nasıl Hazırlanır?',
        body: 'İyi bir ders sunumu için şu ilkeleri gözetmek önemlidir: Her slayta tek bir öğrenme hedefi yerleştirin, metin ağırlıklı değil görsel ağırlıklı slaytlar hazırlayın, gerçek yaşam örnekleri ve hikayeleştirme kullanın, kritik kavramları soru-cevap veya kısa testlerle pekiştirin. Öğrenci seviyesine uygun dil ve görsel karmaşıklık seçimi de kritik önemdedir: ilkokul sunumunda büyük font ve basit görseller işlevsel olurken üniversite sunumunda daha akademik bir ton beklenir.',
      },
      {
        heading: 'Dijital Eğitim Çağında Sunum Teknolojileri',
        body: 'Uzaktan eğitim ve hibrit sınıf modelleriyle birlikte sunum araçları da evrildi. Google Slides, Canva for Education ve Nearpod gibi platformlar öğrencilerin sunuma gerçek zamanlı katılımına olanak tanır. Slaytim\'e yüklenen eğitim sunumları öğrencilerle kolayca paylaşılabilir; böylece sunum hem ders materyali hem de tekrar kaynağı işlevi görür. Anket soruları, alıştırmalar ve tartışma soruları içeren etkileşimli slaytlar öğrenci katılımını ve anlık geri bildirimi güçlendirir.',
      },
    ],
    faqs: [
      {
        q: 'Ders sunumunda kaç slayt kullanılmalı?',
        a: '50 dakikalık bir ders için 15–25 slayt genellikle yeterlidir. Her slayta ortalama 2 dakika harcamayı planlayın; soru-cevap ve etkinlikler için de süre bırakın.',
      },
      {
        q: 'Öğrenciler sunum materyaline nasıl erişebilir?',
        a: 'Slaytim\'e yüklediğiniz sunumu paylaşılabilir link üzerinden öğrencilerinizle paylaşabilirsiniz. Öğrenciler bu materyali ders sonrası tekrar için kullanabilir.',
      },
      {
        q: 'Öğretmen sunumunda telif hakkı olan görseller kullanılabilir mi?',
        a: 'En güvenli yaklaşım Creative Commons lisanslı veya kamu malı görseller kullanmaktır. Unsplash, Pixabay ve Wikimedia Commons bu konuda güvenli kaynaklardır.',
      },
      {
        q: 'Sınıf sunumu ile öğrenci sunumu arasındaki fark nedir?',
        a: 'Öğretmen sunumu bilgiyi aktarmaya odaklanırken, öğrenci sunumu araştırma bulgularını veya proje sonuçlarını paylaşmaya hizmet eder. Öğrenci sunumlarında kaynak gösterme ve sunum becerileri değerlendirme kriterleri arasına eklenebilir.',
      },
    ],
  },
];

export const SEO_PAGE_SLUGS = SEO_PAGES.map((p) => p.slug);

export function getSeoPageConfig(slug: string): SeoPageConfig | null {
  return SEO_PAGES.find((p) => p.slug === slug) ?? null;
}

/** How many content items must exist for the page to be indexable. */
export const SEO_INDEX_THRESHOLD = 3;
