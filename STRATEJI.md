# SLAYTIM — ANTIGRAVITY GROWTH + SEO + SPEED + SLIDEO STRATEJİSİ

> Tarih: 29 Mart 2026
> Amaç: Slaytim'i klasik sunum deposundan **keşif odaklı kısa slayt ağına** dönüştürmek.

---

## İÇİNDEKİLER

1. [Executive Summary](#1-executive-summary)
2. [Kritik Kararlar](#2-kritik-kararlar)
3. [Ürün Konumlandırması](#3-ürün-konumlandırması)
4. [SEO Planı](#4-seo-planı)
5. [Speed Planı](#5-speed-planı)
6. [Slideo Sistemi](#6-slideo-sistemi)
7. [Ana Sayfa ve Keşif Mantığı](#7-ana-sayfa-ve-keşif-mantığı)
8. [İçerik Kalitesi ve Moderasyon](#8-içerik-kalitesi-ve-moderasyon)
9. [İlk İçerik Havuzu](#9-ilk-içerik-havuzu)
10. [Viral Dağıtım Sistemi](#10-viral-dağıtım-sistemi)
11. [Analitik ve Ölçüm](#11-analitik-ve-ölçüm)
12. [Monetization Roadmap](#12-monetization-roadmap)
13. [İlk 7 Gün Aksiyon Listesi](#13-ilk-7-gün-aksiyon-listesi)
14. [İlk 30 Gün Aksiyon Listesi](#14-ilk-30-gün-aksiyon-listesi)
15. [Anti-Pattern / Risk Listesi](#15-anti-pattern--risk-listesi)

---

## 1. Executive Summary

### Neredeyiz

Slaytim şu an fonksiyonel ama stratejisiz bir sunum deposu. Backend sağlam; algoritmalar, rozet sistemi, slideo formatı, admin paneli kurulu. Eksik olan: **neden bu platform, neden şimdi, neden bu kullanıcı** sorusuna net cevap.

### Nereye Gidiyoruz

Türkiye'de **"slayt bazlı kısa bilgi keşif platformu"** pazar boşluğu açık. Slideshare öldü. Noteshelf ve benzerleri PDF depolu. TikTok ve Shorts kısa bilgiyi video formatıyla sunuyor ama slayt formatı hâlâ sahipsiz.

**Slaytim'in fırsatı:** Türkçe içerikte, üniversite öğrencilerinden başlayarak, "öğren + paylaş + keşfet" döngüsünü slayt formatında inşa etmek.

### Büyüme Motoru

```
SEO → Organik trafik → Kayıt → İlk içerik → Slideo oluştur → Paylaş → Yeni kullanıcı
  ↑_______________________________________________________________|
```

**North Star Metric:** Haftalık aktif kayıt sayısı (hafta içinde en az 1 slideo izleyen)

### 3 Kritik Bahis

| # | Bahis | Beklenen Etki |
|---|-------|--------------|
| 1 | SEO-first içerik mimarisi | 3. ayda aylık 10k+ organik trafik |
| 2 | Slideo = viral birim | Paylaşım başına 3+ yeni kullanıcı |
| 3 | Hız ve modern deneyim | Bounce rate %55 → %35 |

---

## 2. Kritik Kararlar

### 2.1 Teknik Kritik (Önce Bunlar)

| Karar | Neden Kritik | Aksiyon |
|-------|-------------|---------|
| **CDN + nesne depolama** | Dosyalar şu an diskte. Sunucu çökerse her şey gider. SEO için hızlı TTFB zorunlu. | AWS S3 veya Cloudflare R2. |
| **PDF viewer lazy load** | İlk açılışta pdfjs-dist yüklemek ~800ms ekliyor. Bu bounce sebebi. | İlk ekranda kapak görseli, viewer scroll-down'da load. |
| **Slideo = ana içerik birimi** | Topic/slide ayrımı kullanıcıya karmaşık geliyor. Slideo akışı ana feed olmalı. | Ana sayfa = slideo feed. Topic/slide ikincil. |
| **URL slug'a geç** | `/topics/42` SEO'da değersiz. `/istatistik-ders-notu` değerli. | Topic + slide slug alanı, redirect mekanizması. |
| **PostgreSQL** | SQLite 50k+ kullanıcıda yazma darboğazı. Büyümeden önce taşı. | Prisma `datasource` değişimi yeterli. |

### 2.2 Ürün Kritik

| Karar | Açıklama |
|-------|----------|
| Slideo = viral birim | Slideo paylaşılabilir, indexlenebilir, bağımsız landing page |
| SEO slug URL | Her topic ve slide, anahtar kelime içeren URL'e sahip olmalı |
| İlk açılış hızı | 2 saniyenin üzeri = rakibe gidiyor |
| Onboarding barikatı kaldır | Ziyaretçi, kayıt olmadan içeriği görebilmeli |
| Kategori odağı | İlk 6 ay maks. 8 kategori. Dağılma. |

---

## 3. Ürün Konumlandırması

### Kimlik

```
DEĞİL:  "Sunum yükleme sitesi"
DEĞİL:  "PDF deposu"
DEĞİL:  "Türk Slideshare"

EVET:   "Kısa slayt keşif platformu"
EVET:   "Kaydırarak öğren"
EVET:   "Bilgiyi slayta sığdır"
EVET:   "Türkçe bilgi, kısa formatta"
```

---

### 10 Marka Mesajı

1. "Öğrenmek, kaydırmak kadar kolay olmalı."
2. "Bilgiyi kısa tut. Etkisini büyüt."
3. "PDF değil, akış."
4. "Her konu, birkaç slaytta."
5. "Kaydırarak öğren. Kaydederek büyü."
6. "Sunum paylaşmıyoruz — bilgi keşfediyoruz."
7. "En iyi ders notları, herkese açık."
8. "5 slayda sığmayan bilgi, 10 slayda sığar."
9. "Slayt yükle. Slideo oluştur. İz bırak."
10. "Türkçe içerik, küçük formatta, büyük değerde."

---

### 10 Hero Headline

1. "En iyi ders notları 5 slaytta."
2. "Konuyu slaytta keşfet. Saatler değil, dakikalar."
3. "Finale mi çalışıyorsun? Doğru yere geldin."
4. "1.000+ kısa slayt. Hepsi Türkçe. Hepsi ücretsiz."
5. "PDF değil akış — bilgi böyle paylaşılır."
6. "Slayt kaydır. Hızlı öğren. Hemen kaydet."
7. "Her konu. Kısa formatta. Hemen anla."
8. "Öğrenciler için öğrencilerden — kısa slayt keşfi."
9. "Ders notunu yükle. Topluluğuna katkı ver."
10. "Türkiye'nin slayt keşif platformu."

---

### 10 CTA Örneği

| CTA | Bağlam |
|-----|--------|
| "Konunu keşfet" | Ana sayfa hero |
| "5 slaytta gör" | Slideo card hover |
| "Slideo oluştur" | Profil / dashboard |
| "Kaydet ve devam et" | Slideo sonunda |
| "Ders notunu yükle" | Upload flow |
| "Ücretsiz başla" | Kayıt CTA |
| "Kategorini seç" | Onboarding |
| "Devamını gör" | Slideo son kartı |
| "Bu seriyi takip et" | Seri slideo |
| "Hepsini görüntüle" | Profil / koleksiyon |

---

### 5 Positioning Alternatifi

| # | Konum | Hedef Kitle | Risk |
|---|-------|------------|------|
| 1 | **Türkçe kısa slayt keşif platformu** | Öğrenciler, genel kamu | Dar başlangıç |
| 2 | **Ders notlarının Instagram'ı** | Üniversite öğrencileri | "Sosyal ağ" beklentisi yaratır |
| 3 | **Creator'lar için bilgi platformu** | İçerik üreticileri | Creator yokken boş hissettiriyor |
| 4 | **Slayt bazlı öğrenme ağı** | Eğitim odaklı | "Öğrenme" kelimesi EdTech'e çekiyor |
| 5 | **Türkçe bilgi hafızası** | Geniş kamu | Soyut; traction sonrası kullan |

> **Öneri:** Başlangıç için **#1** (somut, aranabilir) + **#3'e doğru evrilme** (traction sonrası).

---

## 4. SEO Planı

### 4.1 Mimari — 3 Katmanlı URL Yapısı

```
Katman 1: Hub / Kategori Sayfaları
/kategori/universite-ders-notlari
/kategori/kpss-ozet-slaytlari
/kategori/sunum-sablonlari

Katman 2: Topic / Konu Sayfaları
/konu/istatistik-ders-notu
/konu/makroiktisat-enflasyon-slaytlari
/konu/biyoloji-hucre-bolunmesi-pdf

Katman 3: Slayt / İçerik Sayfaları
/slayt/istatistik-1-vize-ozet-sunumu
/slayt/makro-iktisat-enflasyon-konu-anlatimi
/slayt/biyoloji-hucre-bolunmesi-sunum

+ Slideo Landing Sayfaları:
/slideo/standart-sapma-5-slaytta
/slideo/swot-analizi-kisa-ozet
```

**Mevcut durumdan geçiş:**
- `/topics/42` → `/konu/istatistik-ders-notu` (301 redirect)
- `/slides/87` → `/slayt/istatistik-vize-ozeti` (301 redirect)
- Slug alanı DB'ye eklenir, generate algoritması: başlık → lowercase → Türkçe normalize → tire → duplicate suffix

---

### 4.2 URL Naming Convention

```
Kural 1: Türkçe karakter yok (ş→s, ç→c, ü→u, ö→o, ğ→g, ı→i)
Kural 2: Boşluk → tire (-)
Kural 3: Maks. 60 karakter
Kural 4: Anahtar kelime öne al (/istatistik-ders-notu değil /ders-notu-istatistik)
Kural 5: Sayı suffix ile duplicate önle (/istatistik-ders-notu-2)
Kural 6: Stop word'leri kaldırma (SEO için "ve", "ile", "bir" içeren başlıklar olabilir)

DOĞRU:  /konu/istatistik-dagilim-ve-merkezi-egilim
YANLIŞ: /konu/istatistik%20da%C4%9Fl%C4%B1m
YANLIŞ: /konu/42
YANLIŞ: /konu/istatistik-dagilim-ve-merkezi-egilim-olcumleri-ve-hesaplama-yontemleri-tum-konular
```

---

### 4.3 Hedef Keyword Kümeleri

**Küme 1: Ders Notu Sorguları** (Hacim: Yüksek / Rekabet: Orta)
```
[ders adı] ders notu
[ders adı] ders notu pdf
[ders adı] özet
[ders adı] konu anlatımı
[ders adı] sunum
```

**Küme 2: Sınav / Final Sorguları** (Hacim: Yüksek / Rekabet: Düşük-Orta)
```
[ders adı] final soruları özet
[ders adı] final hazırlık notu
[ders adı] vize özeti
[ders adı] kısa özet pdf
[ders adı] hızlı tekrar
```

**Küme 3: Dosya Formatı Sorguları** (Hacim: Orta / Rekabet: Düşük)
```
[konu] ppt indir
[konu] pptx
[konu] sunum dosyası
[konu] pdf sunum
[konu] slayt indir
```

**Küme 4: Uzun Kuyruk — Yüksek Niyetli**
```
"standart sapma nedir 5 slaytta"
"swot analizi hazır sunum şablonu"
"motivasyon mektubu nasıl yazılır sunum"
"iktisat 1 vize konuları özet"
```

---

### 4.4 50 SEO İçerik Başlığı

> Bunlar topic/slide title örnekleri — seed içerik + üretim rehberi olarak kullan.

**Üniversite Dersleri**
1. İstatistik 1 — Dağılım Ölçüleri Konu Özeti
2. Makroekonomi — Enflasyon ve Para Politikası Slayt Özeti
3. Mikro İktisat — Talep ve Arz Eğrileri Sunum
4. Finans Matematiği — Faiz Hesaplamaları PDF
5. Muhasebe — Bilanço ve Gelir Tablosu Hazır Sunum
6. Pazarlama Yönetimi — 4P Analizi Kısa Özet
7. İnsan Kaynakları Yönetimi — Performans Değerlendirme Sunum
8. Örgütsel Davranış — Motivasyon Teorileri Özeti
9. Hukuka Giriş — Hukuk Kaynakları Slayt Notu
10. Türk Dili — Yazım Kuralları Özet Sunum

**Fen / Mühendislik**
11. Fizik 1 — Kinematik Formüller Hızlı Özet
12. Kimya — Mol Kavramı ve Stokiyometri Sunum
13. Biyoloji — Hücre Bölünmesi Mitoz-Mayoz Slaytlar
14. Matematik — Türev Kuralları Özet Kartları
15. Diferansiyel Denklemler — Çözüm Yöntemleri PDF
16. Termodinamik — Entropi ve Entropi Değişimi Sunum
17. Elektrik Devreleri — Kirchhoff Yasaları Özeti
18. Veri Yapıları — Ağaç ve Graf Algoritmaları Sunum
19. Algoritma Analizi — Big-O Notasyonu Hızlı Rehber
20. Bilgisayar Ağları — OSI Modeli 7 Katman Özeti

**İş / Kariyer**
21. CV Hazırlama — ATS Uyumlu Özgeçmiş Şablonu
22. İş Görüşmesi — Sık Sorulan 10 Soru ve Cevap Stratejisi
23. LinkedIn Profil Optimizasyonu — Adım Adım Rehber
24. Girişimcilik — Business Model Canvas Doldurma Kılavuzu
25. Proje Yönetimi — Scrum ve Agile Temel Kavramlar
26. SWOT Analizi — Hazır Şablon ve Örnek Uygulama
27. Porter'ın 5 Gücü — Sektör Analizi Özet Sunum
28. Sunum Hazırlama — Etkili Slayt Tasarım Kuralları
29. Zaman Yönetimi — Eisenhower Matrisi Kullanım Rehberi
30. Uzaktan Çalışma — Verimli Home Office Kurulum Kılavuzu

**KPSS / Sınav Hazırlığı**
31. KPSS Tarih — Osmanlı Dönemi Islahat Hareketleri Özeti
32. KPSS Coğrafya — Türkiye İklim Bölgeleri Hızlı Özet
33. KPSS Anayasa — Temel Hak ve Özgürlükler Özet
34. KPSS Vatandaşlık — Cumhurbaşkanlığı Sistemi Slayt
35. DGS Matematik — Sayma ve Olasılık Hızlı Özet
36. YKS Kimya — Organik Bileşikler Formül Tablosu
37. YKS Fizik — Optik Konusu Özet Sunum
38. YKS Biyoloji — Ekosistem ve Biyoçeşitlilik Notları
39. IELTS Kelime — B2 Seviyesi Akademik Kelimeler Sunum
40. TYT Türkçe — Paragraf Soru Tipleri Çözüm Teknikleri

**Genel Kültür / Kişisel Gelişim**
41. Yapay Zeka 101 — GPT Nedir Nasıl Çalışır Sunum
42. Blockchain — Temel Kavramlar Hızlı Özet
43. Yatırım Araçları — Borsa Tahvil Fon Karşılaştırma
44. Kişisel Finans — Bütçe Oluşturma Adım Adım
45. Sağlıklı Beslenme — Makro Besinler Özet Rehberi
46. Mindfulness — Stres Yönetimi Teknikler Sunum
47. Dijital Pazarlama — SEO Temel Kavramlar Sunum
48. Sosyal Medya — Algoritma Mantığı Kısa Özet
49. Excel Kısayolları — İş Hayatında En Çok Kullanılan 20 Formül
50. Python'a Giriş — Temel Sözdizimi Hızlı Rehber

---

### 4.5 20 Kategori / Hub Sayfa Başlığı

> URL: `/kategori/{slug}` — Her biri ayrı indexlenebilir landing page

| # | Hub Sayfa Başlığı | URL Slug | Hedef Sorgu |
|---|------------------|----------|-------------|
| 1 | Üniversite Ders Notları | universite-ders-notlari | "üniversite ders notu" |
| 2 | KPSS Özet Slaytlar | kpss-ozet-slaytlar | "kpss özet" |
| 3 | Sunum Şablonları | sunum-sablonlari | "sunum şablonu" |
| 4 | PDF Ders Slaytları | pdf-ders-slaytlari | "ders slayt pdf" |
| 5 | Final Çalışma Notları | final-calisma-notlari | "final özeti" |
| 6 | İş ve Kariyer Sunumları | is-kariyer-sunumlari | "iş sunumu" |
| 7 | Mühendislik Ders Notları | muhendislik-ders-notlari | "mühendislik ders notu" |
| 8 | İktisat Sunumları | iktisat-sunumlari | "iktisat sunum" |
| 9 | Girişimcilik ve Startup | girisimcilik-sunum | "girişimcilik sunum" |
| 10 | Kişisel Gelişim Slaytları | kisisel-gelisim-slaytlari | "kişisel gelişim pdf" |
| 11 | Yapay Zeka ve Teknoloji | yapay-zeka-teknoloji-sunumlari | "yapay zeka sunum" |
| 12 | Lise Konu Anlatımları | lise-konu-anlatimlari | "lise özet" |
| 13 | Sağlık ve Tıp Notları | saglik-tip-ders-notlari | "tıp ders notu" |
| 14 | Hukuk Ders Notları | hukuk-ders-notlari | "hukuk ders notu" |
| 15 | Tasarım ve Yaratıcılık | tasarim-sunum-ornekleri | "tasarım sunumu" |
| 16 | Yabancı Dil Notları | yabanci-dil-calisma-notlari | "İngilizce ders notu" |
| 17 | Muhasebe ve Finans | muhasebe-finans-sunumlari | "muhasebe sunum" |
| 18 | Eğitim Materyalleri | egitim-materyalleri | "eğitim sunumu" |
| 19 | Sınav Hazırlık Setleri | sinav-hazirlik-slaytlari | "sınav özet" |
| 20 | Açık Kaynak Ders Notları | acik-kaynak-ders-notlari | "ücretsiz ders notu" |

---

### 4.6 20 Slideo Landing Page Başlığı

> URL: `/slideo/{slug}` — Slayt içeriğinden otomatik üretilebilir landing page

| # | Slideo Landing Başlığı | URL Slug |
|---|----------------------|----------|
| 1 | Standart Sapma 5 Slaytta Anlatım | standart-sapma-5-slaytta |
| 2 | SWOT Analizi 4 Slaytta Özet | swot-analizi-4-slaytta-ozet |
| 3 | Porter'ın 5 Gücü Kısa Sunum Özeti | porter-5-guc-kisa-ozet |
| 4 | Business Model Canvas 6 Slaytta | business-model-canvas-6-slaytta |
| 5 | Finale 5 Slaytta Hızlı Tekrar | finale-5-slaytta-hizli-tekrar |
| 6 | Faiz Hesabı 3 Slaytta Formüller | faiz-hesabi-3-slaytta |
| 7 | Türev Kuralları Tek Sayfada | turev-kurallari-tek-sayfada |
| 8 | Motivasyon Mektubu 4 Adımda | motivasyon-mektubu-4-adimda |
| 9 | Agile Metodoloji 5 Slaytta | agile-metodoloji-5-slaytta |
| 10 | OSI Modeli 7 Katman Hızlı Özet | osi-modeli-7-katman-ozet |
| 11 | Bütçe Planı 3 Slaytta Yapma | butce-plani-3-slaytta |
| 12 | CV Yazımı 5 Kuralda | cv-yazimi-5-kuralda |
| 13 | Python For Döngüsü 4 Örnekle | python-for-dongusu-4-ornekle |
| 14 | Hücre Bölünmesi 6 Slaytta Anlatım | hucre-bolunmesi-6-slaytta |
| 15 | Osmanlı Dönemi 5 Islahat 1 Slayta | osmanli-islahatlari-5-madde |
| 16 | Pazarlama 4P 4 Slaytta | pazarlama-4p-4-slaytta |
| 17 | Blockchain Nedir 4 Slaytta | blockchain-nedir-4-slaytta |
| 18 | Stres Yönetimi 5 Teknik | stres-yonetimi-5-teknik |
| 19 | Excel VLOOKUP 3 Adımda | excel-vlookup-3-adimda |
| 20 | Sunum Tasarımı 5 Altın Kural | sunum-tasarimi-5-altin-kural |

---

### 4.7 Title / Meta Description Şablonları

```
TOPIC SAYFASI:
Title:    {Başlık} — Slayt Özeti | Slaytim
          Örn: "İstatistik Dağılım Ölçüleri — Slayt Özeti | Slaytim"
Meta:     {Başlık} konusunu {sayfa sayısı} slayta sıkıştırdık.
          {Kategori} ders notu, özet ve sunum örnekleri için Slaytim'e gel.
          (Maks. 155 karakter)

SLIDE SAYFASI:
Title:    {Başlık} PDF Sunum | {Kategori} | Slaytim
          Örn: "İstatistik 1 Vize Özeti PDF Sunum | Üniversite | Slaytim"
Meta:     {Başlık} — {sayfa sayısı} sayfa {format} sunum.
          {Kısa açıklama ya da ilk 120 karakter içerik}.

SLIDEO LANDING:
Title:    {Başlık} — {N} Slaytta Hızlı Özet | Slaytim
          Örn: "SWOT Analizi — 4 Slaytta Hızlı Özet | Slaytim"
Meta:     {Başlık} konusunu {N} slaytta özetledik. Kaydır, öğren, kaydet.
          Slaytim'de binlerce kısa özet seni bekliyor.

KATEGORİ SAYFASI:
Title:    {Kategori Adı} Ders Notları ve Sunumları | Slaytim
          Örn: "Üniversite Ders Notları ve Sunumları | Slaytim"
Meta:     {Kategori Adı} için en iyi ders notları, kısa özetler ve sunum PDF'leri.
          Slaytim'de Türkçe içerikle öğren.
```

---

### 4.8 Sayfa Şablonu — Slayt Detay Sayfası (Zorunlu SEO Unsurları)

Her slayt sayfasında **olmak zorunda** olan unsurlar:

```
[ H1 ] — Slayt başlığı (anahtar kelime içermeli)

[ Meta bilgiler ] — Sayfa sayısı · Dosya türü · Kategori · Yüklenme tarihi

[ Breadcrumb ] — Ana sayfa > Kategori > Konu > Slayt
                  (Her breadcrumb crawlable <a href> olmalı)

[ Kısa Açıklama ] — 100-200 kelime, özgün, ilk paragraf indexlenir
                    "Bu sunumda ne var?" sorusunu cevapla

[ "Bu İçerikte Ne Var?" Listesi ]
  ✓ Konu X
  ✓ Konu Y
  ✓ Formül Z
  (5-8 madde)

[ PDF Viewer ] — Lazy load (scroll veya "Görüntüle" tıklaması ile)

[ İlgili Etiketler ] — Crawlable link'ler
[ Benzer Slaytlar ] — Aynı kategori + konu, en az 6 öneri
[ Yorum Alanı ] — Kullanıcı yorumları (fresh content sinyali)
[ Paylaşım Alanı ] — Social share + copy link
[ Canonical URL ] — <link rel="canonical" href="https://slaytim.com/slayt/slug" />
```

---

### 4.9 Teknik SEO Checklist

#### URL ve Routing
- [ ] Her topic + slide için benzersiz slug alanı DB'ye eklenir
- [ ] `/topics/42` → `/konu/slug` 301 redirect kurulur
- [ ] `/slides/87` → `/slayt/slug` 301 redirect kurulur
- [ ] Filtre/sıralama parametreleri (`?sort=popular`) `noindex` veya canonical ile işaretlenir
- [ ] Sayfalama: `?page=2` formatı; `/page/2` değil
- [ ] `<a href>` ile erişilebilir tüm linkler (JS `onClick` ile açılan sayfalar crawl edilemez)

#### Canonical
- [ ] Her slayt sayfası: `<link rel="canonical" href="mutlak-URL" />`
- [ ] Embed sayfası: canonical → asıl slayt sayfasına işaret eder
- [ ] Filtre sayfaları: canonical → filtresiz ana sayfaya işaret eder

#### Structured Data (JSON-LD)
- [ ] Topic sayfası: `Article` veya `WebPage` schema
- [ ] Slide sayfası: `LearningResource` + `MediaObject` (PDF) schema
- [ ] Slideo sayfası: `VideoObject`'e benzer `ImageGallery` schema
- [ ] Breadcrumb: `BreadcrumbList` schema
- [ ] Arama sayfası: `SearchResultsPage` schema

#### Sitemap Genişletme
```xml
<!-- Mevcut: sadece topic ve profiller -->
<!-- Eklenecek: -->
<url> /slayt/{slug} — changefreq: monthly </url>
<url> /slideo/{slug} — changefreq: weekly </url>
<url> /kategori/{slug} — changefreq: weekly </url>
```

#### Thin Content Engeli
- [ ] Açıklama boş slaytlar `noindex` veya minimum 50 kelime açıklama şartı
- [ ] Dönüşüm bekleyen slaytlar (`conversionStatus: pending`) `noindex`
- [ ] Gizlenen içerikler (`isHidden: true`) sitemap'ten çıkarılır

#### Performance / Crawl Budget
- [ ] Statik varlıklar (uploads/) sitemap'e dahil edilmez
- [ ] Admin paneli robotstxt'e `Disallow: /admin` eklenir
- [ ] API endpoint'leri robotstxt'e `Disallow: /api/` eklenir

---

### 4.10 Internal Linking Planı

```
Hub Sayfası (Kategori)
    │
    ├─── Topic Sayfaları (Aynı Kategoride)
    │         │
    │         ├── Slayt Detay Sayfaları
    │         │        │
    │         │        └── Slideo Landing Sayfaları
    │         │
    │         └── "İlgili Konular" (aynı kategoride)
    │
    └─── "Bu Kategorinin En İyileri"

Slayt Detay → 6 Benzer Slayt (aynı topic + kategori)
Slideo → Kaynak Slayt Sayfasına Link ("Tüm slaytı gör")
Profil Sayfası → Kullanıcının slideo ve slaytlarına
Ana Sayfa → Hub sayfaları (kategori blokları)
```

**Footer Linkleri:**
- Her kategori hub sayfasına footer'dan link
- KVKK, Çerez, Gizlilik sayfaları footer'da

---

### 4.11 Information Architecture

```
slaytim.com/
├── /                              ← Ana sayfa (slideo feed + trend)
├── /kategori/                     ← Kategori listesi
│   └── /kategori/{slug}           ← Hub sayfası
├── /konu/                         ← Topic listesi
│   └── /konu/{slug}               ← Topic detayı
├── /slayt/{slug}                  ← Slayt detayı (SEO landing)
├── /slideo/                       ← Slideo feed
│   └── /slideo/{id}               ← Slideo landing (SEO)
├── /arama?q=                      ← Arama (noindex)
├── /profil/{username}             ← Kullanıcı profili
├── /koleksiyon/{id}               ← Koleksiyon
└── /(legal)                       ← KVKK, Çerez, Gizlilik
```

---

## 5. Speed Planı

### 5.1 Mevcut Durum vs. Hedef

| Sayfa | Mevcut Tahmin | Hedef |
|-------|--------------|-------|
| Ana sayfa (mobil, 3G) | ~3-4s LCP | < 2s |
| Slideo feed ilk kart | ~2s | < 1s |
| Slayt detayı (PDF açılış) | ~3-5s | < 2s (kapak) / PDF lazy |
| Tıklama sonrası etkileşim | ~500ms | < 100ms |

---

### 5.2 Homepage Performance Planı

**Problem:** Ana sayfa her yüklemede feed API + PDF thumbnail isteği yapıyor.

**Çözüm:**
```
1. Static Shell + Dynamic Feed
   - Navbar, hero, kategori blokları: Static HTML (RSC)
   - Feed: Client-side fetch (Suspense boundary ile)

2. Skeleton First
   - Feed yüklenene kadar 6 SlideCard skeleton
   - LCP = skeleton, gerçek içerik sonra gelir
   - Böylece Google LCP = ~0.8s

3. Preconnect
   <link rel="preconnect" href="https://CDN_URL">
   <link rel="preconnect" href="https://API_URL">
   <link rel="dns-prefetch" href="https://CDN_URL">

4. Kategori Blokları: Server Component
   - Next.js Server Component ile SSR; JS bundle'a girmez
   - Kategori listesi statik veya ISR (revalidate: 3600)

5. Hero: Minimal JS
   - Hero metni ve CTA: saf HTML/CSS; Framer Motion kullanma
   - Animasyon sadece "above the fold" değil elementi için
```

**Kabul Kriteri:**
- [ ] Lighthouse Mobile Performance > 75
- [ ] LCP < 2.5s (mobil, 3G)
- [ ] CLS < 0.1
- [ ] FID < 100ms

---

### 5.3 Slayt Detay Performans Planı

**Mevcut sorun:** Sayfa açılınca pdfjs-dist hemen yükleniyor. Bu ~800ms-1.5s ek yük.

**Çözüm: İki Aşamalı Render**

```
AŞAMA 1 — Anında Göster (< 1s):
┌────────────────────────────────────┐
│  [H1 Başlık]                       │
│  [Meta: 24 sayfa · PDF · Eğitim]   │
│  [Kapak Görseli — WebP/AVIF]       │
│  [Açıklama]                        │
│  [CTA: "Slaytı Görüntüle" butonu]  │
│  [İlgili Slaytlar]                 │
│  [Yorumlar]                        │
└────────────────────────────────────┘

AŞAMA 2 — PDF Yükleme (kullanıcı tetikler):
Kullanıcı "Slaytı Görüntüle" butonuna tıklayınca
VEYA sayfanın ortasına scroll edince:
→ pdfjs-dist dynamic import()
→ PDF yükleme başlar
→ Loading skeleton göster
→ PDF render
```

**Kod Değişikliği Noktası:** `SlideViewer` bileşenine `lazy={true}` prop ekle.

```typescript
// Şu an:
<SlideViewer pdfUrl={slide.pdfUrl} />

// Olması gereken:
<LazySlideViewer pdfUrl={slide.pdfUrl} triggerOnScroll={true} />
// → Intersection Observer ile PDF viewer yüklenir
```

**Kapak Görseli Pipeline:**
```
PDF → (sunucu tarafı) → sayfa 1'in PNG → WebP/AVIF dönüşümü → CDN
Boyut: 400×300px (liste), 800×600px (detay)
Blur placeholder: base64 10×7px
```

---

### 5.4 Slideo Feed Performans Planı

**Slideo feed özel gereksinim:** Hızlı kaydırma deneyimi. TikTok benzeri akış hissi.

```
1. Image-First Strateji
   - Her slideo kartı = kapak görseli (WebP)
   - PDF render YOK feed'de
   - Sadece tıklanınca tam viewer açılır

2. Virtualized List
   react-virtual veya @tanstack/react-virtual kullan
   → DOM'da sadece görünür kartlar (tipik: 5-8 kart)
   → Memory leak yok, scroll smooth

3. Prefetch on Hover
   - Kullanıcı bir karta hover edince PDF URL'sini prefetch et
   - Tıklayınca PDF viewer neredeyse hazır

4. Sayfalama (SEO uyumlu)
   /slideo?page=2 → sunucu tarafında sayfayı render et
   Infinite scroll = UX için JavaScript
   Sayfalı URL'ler = bot crawl için erişilebilir
```

---

### 5.5 Image Pipeline Önerisi

```
Upload Flow:
PPT/PPTX/PDF → dönüştürme → PDF
                            ↓
                    [Thumbnail Service]
                            ↓
             PNG extraction (sayfa 1, opsiyonel 2-3)
                            ↓
                    Sharp / Squoosh
                  (WebP + AVIF dönüşümü)
                            ↓
                     CDN'e yükle
                   (R2 veya S3 + CloudFront)
                            ↓
              Boyutlar: 400w, 800w, 1200w (responsive)
              Blur placeholder: 10px base64
```

**Mevcut sorun:** `thumbnailUrl` alanı var ama thumbnail sunucu tarafında üretilmiyor. Frontend üretiyor.
**Çözüm:** `conversion.service.js`'e thumbnail üretimi ekle (pdfjs-dist veya Playwright Chromium).

---

### 5.6 Bundle Optimizasyon Önerileri

```
1. pdfjs-dist → dynamic import
   const { getDocument } = await import('pdfjs-dist')
   → bundle'a girmiyor, sadece lazily yükleniyor

2. framer-motion → lazy import
   Animasyonlar above-the-fold değilse defer et
   AnimatePresence → sadece modal/drawer'da kullan

3. Server Components'a geç
   Navbar: statik kısımları RSC
   Sidebar kategori listesi: RSC (API call yok)
   TopicCard meta bilgiler: RSC

4. next/bundle-analyzer çalıştır
   npm install @next/bundle-analyzer
   → Hangi paket ne kadar yer kaplıyor görülür
   → Hedef: First Load JS < 150kB

5. Radix UI tree-shaking
   import * from '@radix-ui/react-dialog' değil
   import { Dialog, DialogContent } from '@radix-ui/react-dialog'
```

---

### 5.7 Caching Stratejisi

```
CDN (Cloudflare veya CloudFront):
├── /uploads/pdfs/      → 1 yıl (immutable, hash'li isim)
├── /uploads/slides/    → 1 yıl (immutable)
├── /uploads/thumbs/    → 1 yıl (immutable)
└── /api/*              → NO cache (dinamik)

Next.js ISR (Incremental Static Regeneration):
├── /kategori/{slug}    → revalidate: 3600 (1 saat)
├── /konu/{slug}        → revalidate: 1800 (30 dk)
├── /slayt/{slug}       → revalidate: 3600 (1 saat)
└── /profil/{username}  → revalidate: 600 (10 dk)

Redis (gelecek):
├── trending topics      → 5 dakika TTL
├── slideo hot feed      → 2 dakika TTL
└── kategori istatistik → 10 dakika TTL
```

---

### 5.8 Core Web Vitals İyileştirme Listesi

| Metrik | Sorun | Çözüm | Öncelik |
|--------|-------|-------|---------|
| **LCP** | Büyük kapak görseli geç yükleniyor | CDN + WebP + `priority` prop | 🔴 Kritik |
| **LCP** | pdfjs-dist başta yükleniyor | Dynamic import + lazy viewer | 🔴 Kritik |
| **CLS** | Görsel boyutu belirtilmemiş | `width` + `height` attr. | 🟡 Yüksek |
| **CLS** | Font yüklemesi kayma yaratıyor | `font-display: swap` + preload | 🟡 Yüksek |
| **FID/INP** | Büyük JS bundle tıklamayı geciktiriyor | Code splitting + lazy | 🟡 Yüksek |
| **TTFB** | API sunucusu yavaş yanıt | Redis cache + CDN edge | 🟡 Yüksek |

---

## 6. Slideo Sistemi

### 6.1 Stratejik Rol

Slideo = Slaytim'in **viral birimi**.

```
Her slideo:
- Bağımsız indexlenebilir landing page
- Sosyal paylaşım için optimize kart
- "Devamı içerikte" ile kaynak slayta traffic pump
- Creator'ın portföyü
```

**Hedef:** Her slideo = 3+ yeni kullanıcı getiren paylaşım birimi.

---

### 6.2 Altın Format Kuralları

```
Slide 1  = TOKAT (şok, merak, soru, şaşırtıcı istatistik)
Slide 2-N = NET DEĞER (liste, formül, adım, karşılaştırma)
Son Slide = CTA ("Devamı içerikte", "Seriyi takip et", "Kaydettim?")
```

**Uzunluk kuralı:**
- Minimum: 3 sayfa
- Maksimum: 7 sayfa
- Optimal: 4-5 sayfa

---

### 6.3 10 Slideo Format Türü

| # | Format | İlk Slide Formülü | Örnek |
|---|--------|------------------|-------|
| 1 | **Problem → Çözüm** | "Neden [X] işe yaramıyor?" | "Neden klasik not alma yöntemi işe yaramıyor?" |
| 2 | **Liste** | "En önemli [N] [şey]" | "Finale hazırlanırken en önemli 5 teknik" |
| 3 | **Şok Giriş** | "[Şaşırtıcı istatistik veya gerçek]" | "Öğrencilerin %73'ü notlarını 48 saat sonra unutuyor." |
| 4 | **Önce Sonuç** | "İşte sana vaat ettiğim [X]" | "Bu 4 adımla vizeye 1 günde hazırlanabilirsin." |
| 5 | **Eğitim / Ders** | "Bugün [X] öğreniyoruz" | "Türev nedir? 3 slaytta kavrayacaksın." |
| 6 | **Kariyer / İş** | "[Pozisyon] için bilmen gereken [X]" | "Junior developer mülakatında en çok sorulan 4 soru." |
| 7 | **Seri Formatı** | "Seri: [N]/[Toplam] — [Konu]" | "İstatistik Serisi 1/5 — Ortalama ve Medyan" |
| 8 | **Hata → Doğru Yöntem** | "Bu hatayı yapıyor olabilirsin." | "Sunum tasarımında yapılan 3 ölümcül hata." |
| 9 | **Hızlı Özet** | "[X] dakikada [Y] konusu" | "5 dakikada SWOT analizi." |
| 10 | **Kıyaslama** | "[A] mı, [B] mi?" | "Agile mi, Waterfall mi? 4 slaytta karar ver." |

---

### 6.4 30 Slideo Script Şablonu

Her şablon: **Slide sayısı · Format · Konu**

```
[1] 4 Sayfa · Şok Giriş · Finans
Slide 1: "Türkiye'deki çalışanların %68'i maaşının yetmediğini söylüyor."
Slide 2: "Ama bütçe yapmayan sayısı daha da fazla."
Slide 3: "50/30/20 kuralı: Gelirini 3 kova'ya böl."
Slide 4: "Detaylı bütçe tablosu bir sonraki slaytta →"

[2] 5 Sayfa · Liste · KPSS
Slide 1: "KPSS Tarih'te en çok sorulan 5 konu."
Slide 2: "1. Tanzimat Dönemi Reformları"
Slide 3: "2. Meşrutiyet İlanları ve Sonuçları"
Slide 4: "3. Kurtuluş Savaşı Cepheleri"
Slide 5: "4-5. için tam ders notuna bak →"

[3] 3 Sayfa · Hızlı Özet · Matematik
Slide 1: "Türev kuralları kafanı karıştırıyor mu?"
Slide 2: "3 temel kural: Kuvvet, Çarpım, Zincir"
Slide 3: "Formüller tablosu ve örnekler içerikte →"

[4] 4 Sayfa · Problem-Çözüm · Kariyer
Slide 1: "Neden CV'n geri dönüş almıyor?"
Slide 2: "ATS sistemi anahtar kelime okuyor — sen genel yazıyorsun."
Slide 3: "Çözüm: İş ilanını analiz et, CV'yi ona göre yaz."
Slide 4: "ATS uyumlu CV şablonu ve kontrol listesi içerikte →"

[5] 5 Sayfa · Eğitim · Biyoloji
Slide 1: "Mitoz ve mayoz bölünmeyi 4 farkla ayrıştır."
Slide 2: "Fark 1: Hücre sayısı — Mitoz 2, Mayoz 4"
Slide 3: "Fark 2: Genetik çeşitlilik — Mitoz yok, Mayoz var"
Slide 4: "Fark 3-4: Kullanım yeri ve aşama sayısı"
Slide 5: "Tam karşılaştırma tablosu ve test soruları içerikte →"

[6] 4 Sayfa · Kıyaslama · Teknoloji
Slide 1: "Python mı, JavaScript mı öğrenmeli?"
Slide 2: "Python: Veri bilimi, yapay zeka, otomasyon"
Slide 3: "JavaScript: Web, frontend, full-stack"
Slide 4: "Kariyer hedefine göre karar ver — rehber içerikte →"

[7] 5 Sayfa · Önce Sonuç · Üretkenlik
Slide 1: "Bu teknikle 1 saatlik konuyu 10 dakikada tekrar edebilirsin."
Slide 2: "Adım 1: Konuyu 3 ana başlığa böl"
Slide 3: "Adım 2: Her başlığı 1 slayta indir"
Slide 4: "Adım 3: Son slayta özet formülleri koy"
Slide 5: "Tam tekrar sistemi şablonu içerikte →"

[8] 4 Sayfa · Hata · Sunum
Slide 1: "Sunumun neden sıkıcı geliyor biliyor musun?"
Slide 2: "Hata 1: İlk slaytta hiçbir şey söylemiyorsun."
Slide 3: "Hata 2: Metni okuyorsun, anlatmıyorsun."
Slide 4: "3. hata ve düzeltme yolları içerikte →"

[9] 3 Sayfa · Şok Giriş · Sağlık
Slide 1: "8 saatlik uyku her zaman doğru değil."
Slide 2: "Uyku döngüleri 90 dakika — buna göre uyan."
Slide 3: "İdeal uyku takvimi ve hesaplama aracı içerikte →"

[10] 5 Sayfa · Seri · İstatistik
Slide 1: "İstatistik Serisi 1/5 — Merkezi Eğilim Ölçüleri"
Slide 2: "Ortalama: Tüm değerlerin toplamı / n"
Slide 3: "Medyan: Ortadaki değer"
Slide 4: "Mod: En çok tekrar eden değer"
Slide 5: "2. seri: Dağılım Ölçüleri'ne geç →"

[11] 4 Sayfa · Liste · Pazarlama
Slide 1: "4P Pazarlama Karması 4 soruda."
Slide 2: "Product: Ne satıyorsun? · Price: Kaça satıyorsun?"
Slide 3: "Place: Nerede satıyorsun? · Promotion: Nasıl duyuruyorsun?"
Slide 4: "Örnek vaka analizi ve şablon içerikte →"

[12] 5 Sayfa · Eğitim · Hukuk
Slide 1: "Sözleşme hukuku 4 temel unsur."
Slide 2: "1. İrade beyanı uyuşması"
Slide 3: "2. Ehliyet şartı"
Slide 4: "3. Konu ve sebep"
Slide 5: "4. Şekil şartları ve istisnalar içerikte →"

[13] 3 Sayfa · Problem-Çözüm · Verimlilik
Slide 1: "Sabah verimsiz başlayan günü kurtaramazsın."
Slide 2: "Çözüm: İlk 90 dakika için üç kural."
Slide 3: "90 dakika plan şablonu içerikte →"

[14] 4 Sayfa · Hızlı Özet · Fizik
Slide 1: "Kinematik formüller 1 sayfada."
Slide 2: "v = v₀ + at | x = v₀t + ½at²"
Slide 3: "v² = v₀² + 2ax | Serbest düşüş: a = g = 9.8"
Slide 4: "Tam formül seti ve çözümlü örnek içerikte →"

[15] 5 Sayfa · Kariyer · İş
Slide 1: "İlk iş görüşmesine girmeden bilmen gereken 4 şey."
Slide 2: "1. Şirketi araştır — son 6 ay ne yaptılar?"
Slide 3: "2. STAR metoduyla örnek hazırla"
Slide 4: "3. 3 güçlü soru sor"
Slide 5: "4. Son 24 saat checklist'i içerikte →"

[16] 4 Sayfa · Önce Sonuç · Yazarlık
Slide 1: "Motivasyon mektubu yazan çoğu kişi reddediliyor. Neden?"
Slide 2: "Çünkü 'Ben şirketinize katkı sağlamak istiyorum' yazıyorlar."
Slide 3: "Şu cümleyi yaz: '[Problem] çözdüm, kanıtım [X].'"
Slide 4: "Hazır şablon ve 5 gerçek örnek içerikte →"

[17] 3 Sayfa · Şok Giriş · Teknoloji
Slide 1: "ChatGPT hafızanı değiştiriyor. Nasıl mı?"
Slide 2: "Beyin yeni bilgiyi artık 'daha sonra sorgularım' diye işliyor."
Slide 3: "Yapay zekayı verimli kullanma rehberi içerikte →"

[18] 4 Sayfa · Liste · Girişimcilik
Slide 1: "Startup fikri var ama nereden başlayacağını bilmiyor musun?"
Slide 2: "Adım 1: Problem teyidi — 10 kişiyle konuş"
Slide 3: "Adım 2: MVP tanımı — 1 özellik, 2 hafta"
Slide 4: "Adım 3-5 için Lean Canvas şablonu içerikte →"

[19] 5 Sayfa · Eğitim · Kimya
Slide 1: "Mol hesabı neden zor geliyor?"
Slide 2: "Çünkü kavramı değil formülü ezberledin."
Slide 3: "Kavram: 1 mol = 6.02×10²³ parçacık"
Slide 4: "Formül: n = m/M | Örnek çözüm"
Slide 5: "Çözümlü 10 soru seti içerikte →"

[20] 4 Sayfa · Kıyaslama · Finans
Slide 1: "Fon mu, hisse mi, altın mı?"
Slide 2: "Risk / Getiri: Hisse > Fon > Altın > Bono"
Slide 3: "Zaman ufku: Kısa < 1 yıl → Altın/Bono; Uzun > 3 yıl → Hisse"
Slide 4: "Kendi portföy planı şablonu içerikte →"

[21] 3 Sayfa · Hata · Akademik
Slide 1: "Literatür taramasında yapılan en büyük hata."
Slide 2: "Hata: Her makaleyi okumaya çalışmak."
Slide 3: "Yöntem: Abstract + Sonuç bölümlerini oku. Tam rehber içerikte →"

[22] 5 Sayfa · Liste · Python
Slide 1: "Python'da en çok kullanılan 5 kütüphane."
Slide 2: "1. pandas — veri işleme"
Slide 3: "2. numpy — sayısal hesap"
Slide 4: "3. matplotlib — görselleştirme"
Slide 5: "4-5 + kurulum rehberi içerikte →"

[23] 4 Sayfa · Önce Sonuç · Sağlık
Slide 1: "Sınavdan önce iyi uyumak istiyorsun. İşte yöntem."
Slide 2: "Saat 22:00: Ekran kapat"
Slide 3: "Saat 22:30: 4-7-8 nefes tekniği uygula"
Slide 4: "Tam uyku protokolü içerikte →"

[24] 3 Sayfa · Hızlı Özet · Muhasebe
Slide 1: "Bilanço ve gelir tablosu farkı 1 slaytta."
Slide 2: "Bilanço: Anlık fotoğraf (varlık = borç + öz kaynak)"
Slide 3: "Gelir Tablosu: Film (dönem gelir - gider = kâr). Tam tablo içerikte →"

[25] 5 Sayfa · Seri · Örgütsel Davranış
Slide 1: "Motivasyon Teorileri Serisi 1/3 — Maslow"
Slide 2: "5 basamak: Fizyolojik → Güvenlik → Ait olma → Saygı → Kendini gerçekleştirme"
Slide 3: "İş yerinde nasıl uygulanır?"
Slide 4: "Maslow'un eleştirisi: Basamaklar zorunlu değil"
Slide 5: "Seri 2/3: Herzberg'e geç →"

[26] 4 Sayfa · Problem-Çözüm · Tasarım
Slide 1: "Slaytın kötü görünüyor ama nedeni tasarım değil."
Slide 2: "Problem: Çok renk, çok font, çok metin."
Slide 3: "Kural: 2 renk, 1 font, 1 mesaj per slayt."
Slide 4: "Hazır renk paleti ve font kombinasyonları içerikte →"

[27] 3 Sayfa · Şok Giriş · Dijital
Slide 1: "Instagram'da 1000 takipçi 5 yıl önce önemliydi."
Slide 2: "Şimdi önemli olan: Paylaşımların kaydetme oranı."
Slide 3: "Algoritma değişikliği ve yeni strateji içerikte →"

[28] 4 Sayfa · Liste · Excel
Slide 1: "Herkesin bilmesi gereken 4 Excel formülü."
Slide 2: "1. VLOOKUP / DÜŞEYARA — tablolarda arama"
Slide 3: "2. SUMIF / EĞERSAY — koşullu toplam"
Slide 4: "3-4 formül + kullanım örnekleri içerikte →"

[29] 5 Sayfa · Eğitim · Hukuk
Slide 1: "Kira hukuku: Kiracının hakları 4 maddede."
Slide 2: "1. Depozito maks. 3 kira"
Slide 3: "2. Kiracı çıkarılamaz, kontrat bitmeden"
Slide 4: "3-4 hak + şikâyet yolları içerikte →"

[30] 4 Sayfa · Kariyer · İletişim
Slide 1: "Toplantılarda söz almak isteyip alamıyor musun?"
Slide 2: "Teknik 1: Öncesinde fikrin var mı? 30 saniyede hazırla."
Slide 3: "Teknik 2: 'X'e katılıyorum + ama şunu da düşünelim.'"
Slide 4: "Etkili toplantı iletişimi rehberi içerikte →"
```

---

### 6.5 Slideo Creation UX

**Mevcut akış:** Upload → Slideo seç → 3-7 sayfa seç → Başlık yaz → Oluştur

**Önerilen geliştirilmiş akış:**

```
Adım 1: Başlangıç
  "Ne oluşturmak istiyorsun?"
  [ Slaydımdan Slideo Oluştur ] [ Hazır Şablonla Başla ]

Adım 2: Format Seç (Şablon Yolu)
  Hangi format?
  ○ Problem → Çözüm   ○ Liste   ○ Şok Giriş
  ○ Hızlı Özet        ○ Seri    ○ Kıyaslama

Adım 3: Slayt Seç (Slaydım Yolu)
  → PDF preview: her sayfanın küçük thumbnail'i
  → Sürükle-bırak veya tıkla ile 3-7 sayfa seç
  → Seçilen sayfalar sıralanabilir

Adım 4: Meta
  [ Başlık ] — Format önerisi: "X konusu Y slaytta"
  [ Açıklama ] — Opsiyonel
  Kapak: [ Otomatik (ilk sayfa) ] [ Manuel seç ]

Adım 5: Önizleme + Paylaş
  → Slideo'yu gör
  → "Yayınla" → Paylaşım kartı oluştur
  → "Direkt Paylaş" → Twitter/Instagram link kopyala
```

---

### 6.6 Slideo Analytics

Her slideo için toplanması gereken metrikler:

```
view_count          — Kaç kez görüntülendi
like_count          — Kaç beğeni
save_count          — Kaç kaydetme
share_count         — Kaç kez paylaşıldı (yeni alan)
completion_rate     — Sonuncu sayfaya kadar kaç kişi gitti (%)
click_through_rate  — Son CTA'ya kaç kişi tıkladı
source_breakdown    — Nereden geliyor (organik, share, direct)
```

**DB değişikliği:** `slideos` tablosuna `shareCount` alanı eklenir.

---

### 6.7 Seri İçerik Mantığı

```
DB değişikliği:
slideos tablosuna ekle:
  seriesId      Int?    (FK → slideo_series)
  seriesOrder   Int?

slideo_series tablosu:
  id            Int (PK)
  title         String   ("İstatistik Serisi")
  userId        Int
  createdAt     DateTime

UI:
Slideo kartında: "Seri: 2/5"
Son slaytta otomatik CTA: "Serinin devamı →"
Seri tamamlanınca rozet: engage_series_follower
```

---

### 6.8 CTA Kütüphanesi

```
Standart Son Slayt CTA'ları:

TYPE 1 — Devam Odaklı
"Devamı için tüm slayta bak →"
"Tam sunum içerikte →"
"Kaynak dosyayı indir →"

TYPE 2 — Seri Odaklı
"Serinin 2. bölümü yüklendi →"
"[Konu] Serisi: 1/5 tamamlandı. Devama →"
"Seriyi takip et, kaçırma."

TYPE 3 — Kayıt Odaklı
"Kaydettim, sonra açarım? Kaydet butonu solda."
"Koleksiyonuna ekle →"
"Benzer slaytları gör →"

TYPE 4 — Sosyal Odaklı
"Faydalı geldiyse paylaş →"
"Arkadaşına gönder, beraber öğren."
"@slaytim'i etiketle."
```

---

## 7. Ana Sayfa ve Keşif Mantığı

### 7.1 Blok Sıralaması

**Logged-OUT kullanıcı için (SEO + Conversion odaklı):**

```
┌─────────────────────────────────────┐
│  HERO                               │  ← H1, 1 cümle değer önerisi
│  "Türkiye'nin kısa slayt keşif      │     CTA: "Keşfet" + "Yükle"
│   platformu."                       │     Arama kutusu
│  [Keşfet] [Slayt Yükle]            │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  TREND SLİDEO'LAR                   │  ← 6 slideo kartı
│  "Şu an herkes izliyor"             │     Horizontal scroll (mobil)
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  KATEGORİLER                        │  ← 6-8 ikon + isim
│  Hızlı erişim                       │     Static (RSC)
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  POPÜLER DERS NOTLARI               │  ← 6 slide kartı
│  "Bu hafta en çok kaydedilen"       │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  YENİ EKLENENLER                    │  ← 6 slide kartı
│  "Taze içerik"                      │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  NASIL ÇALIŞIR                      │  ← 3 adım (yükle, slideo yap, paylaş)
│  Onboarding mikro-anlatısı         │     Static (RSC)
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  ÖZEL ÜRETICILER                    │  ← 4-6 profil kartı
│  "En aktif içerik üreticileri"      │
└─────────────────────────────────────┘
```

---

**Logged-IN kullanıcı için (Retention odaklı):**

```
┌─────────────────────────────────────┐
│  KALDİĞIN YERDEN DEVAM ET          │  ← Son bakılan içerik
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  SENİN İÇİN (Kişiselleştirilmiş)   │  ← Algo-2 feed
│  Takip ettiklerine göre             │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  TREND SLİDEO'LAR                   │  ← Algo-5 hot feed
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  TAKİP ETTİKLERİNDEN YENİLER       │  ← Takip ettiği kullanıcıların yüklemeleri
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  KEŞİF MODU                        │  ← Hiç bakılmamış kategorilerden
└─────────────────────────────────────┘
```

---

### 7.2 Mobil vs. Desktop Farkları

| Blok | Desktop | Mobil |
|------|---------|-------|
| Hero | 2 sütun (metin sol, görsel sağ) | Tek sütun, görsel gizli |
| Slideo feed | Grid (3 sütun) | Horizontal scroll (snap) |
| Kategori blokları | Satır (8 ikon) | Grid 4×2 |
| Slide kartları | Grid (3 sütun) | Liste (1 sütun) |
| Navigation | Sidebar | Bottom nav (4 sekme) |

---

### 7.3 Keşif Algoritması Önerileri

**Yeni Algo önerisi — "Karışım Feed"**

```javascript
buildDiscoveryFeed(userId) {
  return [
    ...personalizedTopics(userId, 8),      // Algo-2: Takip bazlı
    ...trendingSlideo(6),                  // Algo-5: Hot score
    ...recentUnseen(userId, 6),            // Hiç bakılmamış yeniler
    ...categoryDiversity(userId, 4),       // Az ilgilenilen kategorilerden
  ]
  // Shuffle ve score ile mix
}
```

---

## 8. İçerik Kalitesi ve Moderasyon

### 8.1 Upload Sırasında Yönlendirici UX

```
BAŞLIK YAZARKEN:
  → Karakter sayacı (min 10, max 80)
  → Öneri: "Anahtar kelimeyle başla: 'İstatistik...'"
  → Kötü örnek uyarısı: "Slayt 1", "Ödev", "Dosya" gibi başlıklar
  → "Başlık kalite skoru" göstergesi (toy ama etkili)

KATEGORİ SEÇİMİNDE:
  → "Bu konuyla en çok eşleşen kategori: [Öneri]"
  → Zorunlu alan — kategori seçilmeden yükleme yok

AÇIKLAMA:
  → 50 karakter minimum (şu an yok — eksiklik)
  → "Bu sunumda ne var? Kısaca anlat." placeholder

THUMBNAIL:
  → Dönüşüm bitmeden "İşleniyor" göster
  → Kapak seçimi: "Hangi sayfayı kapak yapalım?"
```

---

### 8.2 İçerik Kalite Politikası

**Upload Red Kriterleri:**
- Başlık uzunluğu < 10 karakter → RED
- Dosya boyutu > 50MB → RED (zaten mevcut)
- Magic byte uyuşmazlığı → RED (zaten mevcut)
- Hesap yaşı < 1 saat → RED (zaten mevcut)

**Soft Warning Kriterleri (kullanıcıya göster):**
- Açıklama boş → "Açıklama eklemeden devam edebilirsin ama içeriğin keşfedilmesi zorlaşır."
- Kategori = "Diğer" → "Daha spesifik bir kategori seçersen görünürlüğün artar."
- Başlık = slayt dosya adı gibi görünüyorsa → "Bu başlık özgün değil gibi görünüyor. Değiştirmek ister misin?"

**Moderasyon Sinyalleri (Admin paneline ekle):**
- Düşük kalite skor: views > 100 ama save < 2 (insanlar bakıyor ama kaydetmiyor)
- Spam sinyal: 24 saatte 10+ upload
- Duplicate şüphesi: Aynı kullanıcıdan çok benzer başlıklar
- Keyword stuffing: Başlık 10+ farklı konu içeriyorsa

---

### 8.3 Duplicate Detection Mantığı

```javascript
// Upload anında çalışır
async detectDuplicate(userId, title, topicId) {
  const normalized = normalize(title)  // Türkçe normalize

  // 1. Aynı kullanıcı + benzer başlık (son 7 gün)
  const userDuplicate = await db.slides.findFirst({
    where: {
      userId,
      createdAt: { gte: sevenDaysAgo },
      title: { contains: normalized.slice(0, 20) }
    }
  })

  // 2. Aynı topic'e çok benzer başlık (farklı kullanıcı)
  const topicDuplicate = await db.slides.findFirst({
    where: {
      topicId,
      title: { contains: normalized.slice(0, 15) }
    }
  })

  // Uyarı ver ama engelleme
  return { userDuplicate, topicDuplicate }
}
```

---

## 9. İlk İçerik Havuzu

### 9.1 300 İçerik Planı

**Dağılım:**

| Kategori | Tip | Adet | SEO / Viral / Retention |
|----------|-----|------|------------------------|
| Üniversite Ders Notları | Slide | 60 | SEO |
| KPSS Hazırlık | Slide | 30 | SEO |
| İş / Kariyer | Slide | 30 | Viral |
| Kişisel Gelişim | Slide | 20 | Viral |
| Teknoloji / YZ | Slide | 20 | Viral |
| Finans / Yatırım | Slide | 20 | Retention |
| Slayt Şablonları | Slide | 20 | SEO |
| **Kısa Slideo** | Slideo | 100 | Viral |
| **Toplam** | | **300** | |

---

### 9.2 Kategori Öncelik Sırası

**İlk Hafta (0-7 gün):**
```
1. İstatistik, Matematik, Fizik, Kimya (arama hacmi yüksek)
2. KPSS Tarih, Coğrafya, Vatandaşlık (mevsimsel yüksek talep)
3. 20 adet viral slideo (paylaşımda öncü)
```

**İkinci Hafta (7-14 gün):**
```
4. İş/Kariyer sunumları (CV, mülakat, iş hayatı)
5. Teknoloji/YZ içerikleri (evergreen, viral)
6. Sunum şablonları (arama hacmi sürekli)
```

**Üçüncü-Dördüncü Hafta:**
```
7. Kalan ders notu kategorileri
8. Finans ve kişisel gelişim
9. Niş: Sağlık, Hukuk, Muhasebe
```

---

### 9.3 SEO / Viral / Retention Ayrımı

| İçerik Türü | Amaç | Metrik |
|-------------|------|--------|
| **SEO içeriği** | Google'dan trafik çek | Arama sıralaması, organik trafik |
| **Viral içerik** | Sosyal paylaşım, yeni kullanıcı getir | Share sayısı, yeni kayıt |
| **Retention içeriği** | Kullanıcıyı geri getir, kayıt yaptır | Return visit, save rate |

**SEO içeriği tanımı:**
- Uzun kuyruklu arama sorgusuyla başlayan başlık
- Ders notu, formül, özet, konu anlatımı içerikler

**Viral içerik tanımı:**
- "Bunu arkadaşına göndermek istersin" kıvamında
- Şok giriş, liste format, kariyer/finans konuları
- 3-5 sayfa kısa slideo formatı

**Retention içeriği tanımı:**
- Seri formatı (devamı var, geri gelme sebebi)
- Koleksiyon kurmayı tetikleyen içerikler
- "Bu setiyi kaydet" kıvamında setler

---

## 10. Viral Dağıtım Sistemi

### 10.1 Slideo Paylaşım Kartı

Her slideo için otomatik üretilecek paylaşım kartı:

```
Boyutlar:
├── 9:16 (1080×1920) — TikTok, Reels, Hikaye
├── 1:1 (1080×1080) — Instagram post, Twitter
└── 16:9 (1200×630) — Twitter card, LinkedIn

Kart İçeriği:
┌──────────────────────┐
│  @slaytim            │  ← Sol üst logo
│                      │
│  [KAPAK SAYFASI]     │  ← Slayt ilk sayfası
│                      │
│  "SWOT Analizi       │  ← Başlık
│   4 Slaytta"         │
│                      │
│  "Devamı slaytim.com │  ← CTA
│   /slideo/swot-..."  │
└──────────────────────┘
```

**Teknik:** Vercel OG Image API veya `@vercel/og` ile dinamik oluşturma.

---

### 10.2 Share Kit

Slideo sayfasında "Paylaş" butonu açıldığında:

```
[ Instagram Hikayesi için İndir (9:16) ]
[ Tweet Olarak Paylaş — Otomatik metin ]
[ LinkedIn'de Paylaş ]
[ Linki Kopyala ]
[ Embed Kodu ]

Tweet Otomatik Metni:
"{Başlık} konusunu 4 slaytta özetledim 🎯
Kaydırarak öğren → slaytim.com/slideo/{slug}
#slaytim #{kategori}"
```

---

### 10.3 Growth Loop Tasarımı

```
DÖNGÜ 1 — SEO Loop
Google arama → Slayt sayfası → Slideo görüntüle → Kayıt ol → İçerik yükle → Google indexler → Tekrar başa

DÖNGÜ 2 — Viral Loop
Kullanıcı slideo oluşturur
  → "Paylaş" tıklar
  → Instagram/Twitter'da paylaşır
  → Takipçileri linke tıklar
  → Slaytim'i keşfeder
  → Kayıt olur
  → Kendi slideo'sunu oluşturur
  → BAŞA DÖNER

DÖNGÜ 3 — Retention Loop
Kullanıcı seriyi başlatır
  → Seri bitmemiş (devam var)
  → Bildirim: "Serinin 2. bölümü yüklendi"
  → Geri döner
  → Seriyi takip eder
  → BAŞA DÖNER
```

---

### 10.4 TikTok / Reels / Shorts Uyumlu Plan

Slideo formatı, sosyal medya video içeriğine çevrilebilir:

```
Slideo → Video Dönüşümü (gelecek özellik):
  Her sayfa = 3-5 saniye
  Geçiş animasyonu (kaydırma efekti)
  Otomatik altyazı
  Müzik seçimi
  → MP4 export

Mevcut için kısa vadeli çözüm:
  Kullanıcıya "Bu slideo'yu video içerik için kullan" rehberi ver
  Her sayfa görseli indirilebilir yap (PNG/JPG export)
```

---

## 11. Analitik ve Ölçüm

### 11.1 North Star Metric

**Haftalık Aktif Kaydedici (HAK):**
> "Son 7 gün içinde en az 1 slayt veya slideo kaydeden benzersiz kullanıcı sayısı"

**Neden bu?**
- Kaydetme = en güçlü niyet sinyali (algoritmalarda da 5x ağırlıklı)
- Sadece izlemek değil, değer algılaması gerektirir
- Ölçülmesi kolay, manipüle edilmesi zor

---

### 11.2 Event Taxonomy (GA4 Özel Eventler)

```javascript
// Arama
gtag('event', 'search', {
  search_term: query,
  results_count: count,
  result_type: 'slides' | 'topics'
})

// İçerik Görüntüleme
gtag('event', 'view_content', {
  content_type: 'slide' | 'slideo' | 'topic',
  content_id: id,
  content_category: category,
  source: 'feed' | 'search' | 'direct' | 'share'
})

// Slideo Tamamlama
gtag('event', 'slideo_complete', {
  slideo_id: id,
  pages_viewed: N,
  total_pages: M,
  completion_rate: N/M
})

// Kaydetme
gtag('event', 'save_content', {
  content_type: 'slide' | 'slideo',
  content_id: id,
  category: category
})

// Paylaşım
gtag('event', 'share', {
  method: 'link_copy' | 'twitter' | 'instagram' | 'embed',
  content_type: 'slideo',
  content_id: id
})

// Upload
gtag('event', 'upload_complete', {
  file_type: 'pdf' | 'pptx' | 'ppt',
  file_size_mb: size,
  category: category
})

// CTA Tıklaması (Slideo son sayfası)
gtag('event', 'slideo_cta_click', {
  slideo_id: id,
  cta_type: 'full_slide' | 'series_next' | 'save'
})

// Kayıt Dönüşümü
gtag('event', 'sign_up', {
  method: 'email',
  source: 'slideo_view' | 'slide_view' | 'direct' | 'share'
})
```

---

### 11.3 Dashboard Yapısı

**Günlük Operasyonel Dashboard:**

```
[ YENİ KULLANICILAR: 47 ] [ AKTIF: 312 ] [ UPLOAD: 23 ] [ RAPORLAR: 2 ]

┌─ Bugünkü Büyüme ─────────────────────────────────────────┐
│  Kayıt: +47 | Upload: +23 | Slideo: +61 | Kayıt: +189    │
└──────────────────────────────────────────────────────────┘

┌─ Trend İçerikler (24 saat) ──┐ ┌─ Düşük Performans ──────┐
│ 1. İstatistik Özeti  892 view │ │ Dönüşüm bekleyen: 12    │
│ 2. CV Şablonu        734 view │ │ 0 save alan içerik: 34  │
│ 3. Python 5 Kural    621 view │ │ Şikayet: 3              │
└──────────────────────────────┘ └─────────────────────────┘
```

---

### 11.4 Haftalık Growth Review Şablonu

```markdown
## Haftalık Growth Review — [Tarih]

### Metrikler
| Metrik | Bu Hafta | Geçen Hafta | Değişim |
|--------|----------|-------------|---------|
| HAK (Haftalık Aktif Kaydedici) | - | - | - |
| Yeni Kayıt | - | - | - |
| Upload | - | - | - |
| Slideo Oluşturma | - | - | - |
| Organik Trafik | - | - | - |
| Save Rate (izleme/kaydetme) | - | - | - |
| Share Rate | - | - | - |

### SEO
- Hangi keyword'den trafik geldi?
- Hangi sayfa en çok trafik aldı?
- Index durumu (Search Console)

### Slideo
- En çok izlenen slideo
- Tamamlama oranı ortalaması
- En çok paylaşılan format

### Aksiyon
- Geçen haftadan devam edenler
- Bu haftanın öncelikleri
- Test edilecek 1 şey
```

---

### 11.5 Kurulum Öneri Listesi

| Araç | Amaç | Kurulum |
|------|------|---------|
| Google Search Console | Organik trafik, indexleme, keyword | search.google.com (site doğrulama) |
| GA4 | Kullanıcı davranışı, event tracking | `gtag.js` veya Google Tag Manager |
| Sentry (mevcut) | Hata takibi | Kurulu |
| PageSpeed Insights / CrUX | Core Web Vitals gerçek veri | search.google.com |
| Clarity (Microsoft) | Session replay, heatmap (ücretsiz) | `<script>` ekleme |
| Plausible (opsiyonel) | Privacy-safe analytics, KVKK dostu | Self-host veya SaaS |

---

## 12. Monetization Roadmap

### Öncelik: Büyüme Önce, Para Sonra

```
AŞAMA 0 (0-3 ay): BÜYÜME MODU
├── Hiçbir şey ücretli değil
├── Reklam: AdSense aktif (mevcut)
└── Hedef: 1.000 aktif kullanıcı, 10.000 kayıtlı içerik

AŞAMA 1 (3-6 ay): HAFİF MONETİZASYON
├── AdSense optimize et (placement iyileştir)
├── Slideo'da watermark kaldırma (kolay quick win)
└── Hedef: Aylık 10k organik trafik

AŞAMA 2 (6-12 ay): CREATOR ECONOMY TEMELI
├── Creator dashboard (analitik, paylaşım araçları)
├── "Öne Çıkar" özelliği (ücretli görünürlük boost)
└── Hedef: 10k aktif kullanıcı

AŞAMA 3 (12-18 ay): PREMIUM KATMAN
└── Hedef tetik metrikler (aşağıda)

AŞAMA 4 (18-24 ay): B2B
└── Kurumsal hesaplar, sınıf yönetimi
```

---

### Premium Açılma Tetik Metrikleri

Premium özellikler **ancak** şu metrikler karşılandığında açılır:

| Tetik Metrik | Eşik | Ölçüm Sıklığı |
|-------------|------|---------------|
| Aylık aktif kullanıcı | > 5.000 | Aylık |
| Kayıtlı içerik sayısı | > 20.000 | Aylık |
| Kullanıcı başına ortalama kayıt | > 3 slayt | Haftalık |
| Organik trafik | > 15.000 / ay | Aylık |
| Return rate (30 gün) | > %30 | Aylık |

---

### Premium Özellik Adayları

| Özellik | Ücretli Mi? | Öncelik |
|---------|------------|---------|
| Temel upload | ❌ Ücretsiz (her zaman) | — |
| Slideo oluşturma | ❌ Ücretsiz (her zaman) | — |
| Analitik dashboard (basit) | ❌ Ücretsiz | — |
| Reklam kaldırma | ✅ Premium | Yüksek |
| Gelişmiş analitik (kaynak, funnel) | ✅ Premium | Yüksek |
| Özel domain embed | ✅ Premium | Orta |
| Slideo watermark kaldırma | ✅ Premium | Yüksek |
| Toplu upload (10+ aynı anda) | ✅ Premium | Orta |
| PDF export | ✅ Premium | Orta |
| Koleksiyon paylaşım özelleştirme | ✅ Premium | Düşük |
| Öncelikli destek | ✅ Premium | Düşük |

---

### Creator Economy Hazırlık

```
Aşama 2'de kurulacak altyapı:

1. Creator Dashboard
   - İçerik performansı (view, save, share breakdown)
   - Takipçi büyümesi
   - En çok kazandıran slideo'lar

2. Creator Badge + Rozet
   - "Verified Creator" rozeti
   - Aylık top-10 öne çıkarma

3. Creator Fund (uzun vade)
   - Aylık en değer yaratan 10 creator'a ödül
   - Kriter: Save + share kombinasyonu

4. B2B Temel
   - Okul/kurum hesabı
   - Öğrenci paylaşım alanı
   - Özel koleksiyon yönetimi
```

---

## 13. İlk 7 Gün Aksiyon Listesi

### Gün 1-2: Altyapı

| # | Görev | Öncelik | Efor |
|---|-------|---------|------|
| 1 | CDN kur (Cloudflare R2 + Cloudflare CDN) | 🔴 Kritik | 1 gün |
| 2 | PDF viewer lazy load yap (Intersection Observer) | 🔴 Kritik | 2-3 saat |
| 3 | `slug` alanını topics ve slides tablosuna ekle | 🔴 Kritik | 2 saat |
| 4 | Slug generate fonksiyonu yaz (Türkçe normalize dahil) | 🟡 Yüksek | 2 saat |
| 5 | `robots.txt` dosyasını oluştur (admin + api disallow) | 🟡 Yüksek | 30 dk |

### Gün 3-4: SEO Temelleri

| # | Görev | Öncelik | Efor |
|---|-------|---------|------|
| 6 | `/konu/{slug}` URL yapısını implement et + 301 redirect | 🔴 Kritik | 4 saat |
| 7 | `/slayt/{slug}` URL yapısını implement et + 301 redirect | 🔴 Kritik | 4 saat |
| 8 | Breadcrumb bileşeni + BreadcrumbList JSON-LD | 🟡 Yüksek | 3 saat |
| 9 | Canonical tag her slayt sayfasına ekle | 🟡 Yüksek | 1 saat |
| 10 | Sitemap'e `/slayt/*` ve `/slideo/*` ekle | 🟡 Yüksek | 1 saat |

### Gün 5-6: İçerik ve Slideo

| # | Görev | Öncelik | Efor |
|---|-------|---------|------|
| 11 | İlk 20 slideo'yu yükle (yukarıdaki script'lerden) | 🔴 Kritik | 1 gün |
| 12 | İlk 30 ders notu slide'ını yükle (SEO içerik) | 🟡 Yüksek | 1 gün |
| 13 | Slideo landing page şablonunu oluştur (`/slideo/[id]`) | 🟡 Yüksek | 3 saat |
| 14 | Slideo paylaşım linki + kopyala butonu | 🟡 Yüksek | 1 saat |

### Gün 7: Analytics

| # | Görev | Öncelik | Efor |
|---|-------|---------|------|
| 15 | Google Search Console'a site ekle (doğrulama) | 🔴 Kritik | 30 dk |
| 16 | GA4 kur, temel event'leri ekle (view, save, share) | 🟡 Yüksek | 2 saat |
| 17 | PageSpeed Insights ile mevcut skor al | 🟡 Yüksek | 30 dk |

---

## 14. İlk 30 Gün Aksiyon Listesi

### Hafta 1 (bkz. yukarıdaki 7 gün)

---

### Hafta 2

| # | Görev | Öncelik |
|---|-------|---------|
| 18 | Hub/Kategori sayfaları oluştur (8 kategori, SEO title/meta) | 🔴 Kritik |
| 19 | Slayt detay sayfasına "Bu İçerikte Ne Var?" bölümü ekle | 🟡 Yüksek |
| 20 | Slayt açıklaması minimum 50 karakter zorunluluğu (upload UX) | 🟡 Yüksek |
| 21 | Slideo paylaşım kartı (OG image) oluştur | 🟡 Yüksek |
| 22 | İlk 50 SEO içeriği yükle (ders notları + slideo) | 🟡 Yüksek |
| 23 | PostgreSQL migrasyonunu başlat (staging ortamında) | 🟡 Yüksek |
| 24 | Thumbnail sunucu tarafında üret (conversion service'e ekle) | 🟡 Yüksek |
| 25 | `noindex` ekle: dönüşüm bekleyen slaytlara | 🟡 Yüksek |

---

### Hafta 3

| # | Görev | Öncelik |
|---|-------|---------|
| 26 | Bundle analyzer çalıştır, büyük paketleri tespit et | 🟡 Yüksek |
| 27 | pdfjs-dist dynamic import (zaten kısmen var, tam lazy yapısı) | 🟡 Yüksek |
| 28 | Virtualized list (slideo feed) için react-virtual ekle | 🟡 Yüksek |
| 29 | ISR implement et: kategori + topic + slide sayfaları | 🟡 Yüksek |
| 30 | Seri içerik altyapısı DB değişikliği | 🟢 Orta |
| 31 | Ana sayfa hero metnini yeniden yaz (yeni positioning) | 🟡 Yüksek |
| 32 | İkinci 100 içerik yükle (viral + retention içerik) | 🟡 Yüksek |

---

### Hafta 4

| # | Görev | Öncelik |
|---|-------|---------|
| 33 | PostgreSQL migrasyonunu production'a al | 🔴 Kritik |
| 34 | Yapısal veri (JSON-LD) slide + topic + breadcrumb için | 🟡 Yüksek |
| 35 | Slideo analytics eklentisi (tamamlama oranı) | 🟡 Yüksek |
| 36 | İçerik kalite skoru admin panelinde aktifleştir | 🟢 Orta |
| 37 | Kullanıcı upload UX iyileştirmeleri (başlık rehberi) | 🟢 Orta |
| 38 | İlk Lighthouse audit — hedef skorları ile karşılaştır | 🟡 Yüksek |
| 39 | İlk SEO growth review toplantısı | 🟡 Yüksek |
| 40 | 300 içerik hedefine ulaş | 🔴 Kritik |

---

## 15. Anti-Pattern / Risk Listesi

### 15.1 Teknik Anti-Pattern'ler

| Anti-Pattern | Risk | Önleyici Çözüm |
|-------------|------|----------------|
| **PDF viewer = ilk açılış** | LCP 3-5s → Google sıralama kaybı, bounce artışı | Lazy load; kapak görsel önce |
| **Her şey client component** | JS bundle şişer, SEO crawl sorunu | Server components'a geç |
| **Infinite scroll ama URL yok** | Bot sayfaları crawl edemez, SEO değeri yok | `?page=N` URL'leri de oluştur |
| **SQLite production'da** | 50k+ kullanıcıda yazma kilidi → site donuyor | PostgreSQL'e geç |
| **Dosyalar diskte** | Sunucu göçü = veri kaybı, TTFB yüksek | CDN + nesne depolama |
| **console.log ile loglama** | Production hata teşhisi imkânsız | Sentry (mevcut) + structured logging |
| **Token blacklist yok** | Çalınan token 7 gün geçerli | Redis + blacklist veya kısa token ömrü |

---

### 15.2 SEO Anti-Pattern'ler

| Anti-Pattern | Risk | Önleyici Çözüm |
|-------------|------|----------------|
| **`/topics/42` URL** | Google için değersiz URL, keyword yok | Slug URL + 301 redirect |
| **Filtre URL'leri indexleniyor** | Duplicate content cezası | `noindex` veya canonical |
| **Thin content** | "Az içerik" penaltısı | Min. 50 karakter açıklama zorunlu |
| **Duplicate başlıklar** | Hangisini indexleyeceğini bilmiyor | Canonical + unique başlık kuralı |
| **Embed sayfası asıl URL** | `/embed/slides/42` indexlenebilir | Embed sayfasına canonical → asıl slayt |
| **Slayt dosya adı = başlık** | "slayt_final_v2.pptx" gibi başlıklar SEO'da sıfır değer | Upload UX'te başlık validasyonu |
| **Kategori patlaması** | 50 kategori → authority dağılır | İlk 6 ay maks. 8 kategori |

---

### 15.3 Büyüme Anti-Pattern'leri

| Anti-Pattern | Risk | Önleyici Çözüm |
|-------------|------|----------------|
| **Erken paywall** | Büyümeyi boğar, SEO'yu engeller | Önce 5.000 aktif kullanıcı, sonra premium |
| **"Slideshare alternatifi" dili** | Mevcut ölü markaya yapışmak | Kendi pozisyonu: "kısa slayt keşif" |
| **Düşük kalite içerikle açılış** | İlk izlenim kötü, geri dönüş yok | İlk 300 içerik özenle seçilmiş olmalı |
| **Her şeyi aynı anda yapmak** | Odak kaybolur, hiçbir şey tamamlanmaz | Önce SEO, sonra viral, sonra retention |
| **Metriksiz büyüme** | Neyin işe yaradığı bilinmiyor | GA4 + Search Console ilk haftada |
| **Sosyal medya olmadan içerik** | Viral döngü kurulmuyor | Her slideo için paylaşım altyapısı önce |

---

### 15.4 Ürün Anti-Pattern'leri

| Anti-Pattern | Risk | Önleyici Çözüm |
|-------------|------|----------------|
| **Topic/Slide/Slideo karmaşası** | Kullanıcı ne yükleyeceğini anlamıyor | Ana akış = slideo. Topic ikincil. |
| **Onboarding barikatı** | Kayıt olmadan içerik gösterme | Ziyaretçi her şeyi görmeli |
| **Bildirim spam** | Kullanıcı bildirimleri kapatır | Sadece değer yaratan bildirimler |
| **Her özelliği erkenden eklemek** | Karmaşık UX, ağır kod | MVP önce, özellik sonra |
| **Feedback'i görmezden gelmek** | Ürün yanlış yönde gelişir | feedbacks.jsonl haftalık okunmalı |

---

> **Son Not:** Bu belge bir teori değil, uygulanabilir aksiyonlar listesidir.
> Her görev için "neden", "nasıl", "beklenen etki", "kabul kriteri" yazılmıştır.
> Sırayı takip et. Kritik olanları önce yap. Ölçmeden devam etme.

---

*Slaytim STRATEJI.md — 29 Mart 2026*
