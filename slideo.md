Fikir sağlam mı?

Evet. Çünkü kısa dikey akış mantığında insanlar tek tek karar vermek yerine alt alta tüketir. TikTok’un “For You” mantığı da öneri sisteminin kullanıcı etkileşimlerine göre içerik göstermesi üzerine kurulu; takip, beğeni ve diğer etkileşimler kişiselleştirmede kullanılıyor. Instagram da Reels ve Explore gibi yüzeylerde kullanıcı etkinliği, beğeni, kaydetme, paylaşım gibi sinyallerle sıralama yaptığını açıkça anlatıyor.

Ama senin ürünün video değil. O yüzden birebir Reels kopyası değil, “slayt tabanlı kısa bilgi akışı” olmalı.

Ben buna şu mantığı verirdim:

Slideo nedir?

Uzun bir sunumun, hızlı tüketilen kısa versiyonu.

Örnek:

normal sunum: “İngiltere hakkında 30 sayfa”
SlaytReels: bunun içinden en vurucu 3–5 sayfa
kullanıcı dikey akışta bunu görür
sağa/sola değil, alt alta yeni Slideo gelir
isterse “tam sunuma git” der

Yani:
Slideo = keşif aracı
Tam sunum = derin içerik

Bu ayrım çok önemli.

En kritik matematik

Burada başarıyı belirleyen şey sadece özellik değil, puanlama sistemi.

Sen “çok iyi matematik yapmalıyız” demişsin ya, aynen öyle. Çünkü yanlış sıralama olursa:

kötü içerik öne çıkar
insanlar 2–3 kaydırmadan sonra çıkar
yükleyenler motivasyon kaybeder

O yüzden ilk sürümde çok karmaşık AI yapma.
Önce basit ama akıllı skor sistemi kur.

1) İlk gösterim skoru

Yeni yüklenen bir SlaytReels için başlangıç puanı:

Başlangıç Skoru =

tazelik puanı
içerik kalite puanı
kapak/ilk slayt puanı
kategori ilgisi
yükleyici güven puanı

Mesela mantık şöyle olabilir:

feed_score =
0.30 * recency_score +
0.25 * completion_score +
0.15 * like_rate +
0.15 * save_rate +
0.10 * full_presentation_click_rate +
0.05 * creator_quality_score

Bu ilk sürüm için gayet yeterli.

2) En önemli metrik: completion

Video tarafında watch time neyse, sende o:

SlaytReels tamamlama oranı

Örnek:

4 slaytlık bir SlaytReels var
kullanıcı 4 slaydın hepsini geçtiyse = completion yüksek
slaytta çıktıysa = kötü sinyal

TikTok ve Instagram’ın resmi açıklamalarında da öneri mantığı kullanıcının etkileşimi ve değer bulma ihtimalini tahmin etmeye dayanıyor; senin ürününde bunun karşılığı completion olacak.

Ben olsam en önemli 3 metriği şunlar yaparım:

Completion rate
Save rate
Full deck click rate

Çünkü beğeni kolaydır.
Ama:

kaydetme = değer buldu
sonuna kadar izleme = akış tuttu
tam sunuma gitme = merak oluştu

Bunlar daha güçlü sinyaller.

SlaytReels için ideal yapı
Kaç sayfa olmalı?

Benim önerim:

minimum: 3
ideal: 4–6
maksimum: 7

Neden?
Çok kısa olursa değer vermez.
Çok uzun olursa Reels hissi bozulur.

Instagram tarafında önerilen kısa içeriklerin keşif için daha uygun olduğu, ayrıca artık 3 dakikaya kadar öneriye açıldığı belirtiliyor; bu da kısa ama yeterli bilgi yoğunluğunun önemli olduğunu gösteriyor. Senin slayt tarafında bunun karşılığı 3–6 ekranlık mikro içerik olur.

Her SlaytReels’in yapısı

Ben standardı böyle koyardım:

Hook slide
“İngiltere hakkında şaşırtıcı 3 gerçek”
Bilgi slide 1
Bilgi slide 2
Bilgi slide 3
CTA slide
“Tam 30 sayfalık sunuma git”

Bu sayede akış sadece tüketim değil, ana içeriğe trafik getiren motor olur.

Kullanıcı akışı nasıl olmalı?
Ana keşif

Kullanıcı uygulamaya girer:

ana ekranda klasik grid/list
ayrıca bir sekmede SlaytReels
aşağı kaydırdıkça yeni kısa slayt akışı gelir
SlaytReels kartında olmalı:
başlık
kategori
kaç slayt
creator adı
beğen
kaydet
paylaş
“tam sunuma git”
Etkileşim mantığı

Kullanıcı:

son slayda geldiyse otomatik “tam sunuma git” önerisi görsün
2 kez aynı üreticiyi sonuna kadar izlediyse, o üreticiyi daha çok öner
aynı kategoride 3 kez save yaptıysa, o kategori ağırlığını artır

Bu, TikTok ve Instagram’ın açıkladığı kişiselleştirme mantığıyla uyumlu: sistem, kullanıcı davranışından ilgi alanı çıkarır.

Feed matematiği nasıl kurulmalı?

İlk versiyonda sana önerdiğim sade formül bu:

İçerik kalite skoru
quality_score =
0.35 * completion_rate +
0.20 * save_rate +
0.15 * like_rate +
0.15 * share_rate +
0.15 * full_deck_click_rate
Kullanıcı ilgi skoru
interest_score =
0.40 * category_affinity +
0.25 * creator_affinity +
0.20 * topic_similarity +
0.15 * recent_interaction_weight
Son feed puanı
final_score =
0.55 * quality_score +
0.35 * interest_score +
0.10 * freshness_score

Bu kadar yeter.
İlk sürümde AI kasmana gerek yok.

Çok önemli: spam ve çöp içerik sorunu

Bu sistemin en büyük riski şu:
İnsanlar hızlı görüntülenmek için düşük kaliteli clickbait slaytlar yükler.

Bunu önlemek için:

aynı başlık tarzına limit
ilk slaytta aşırı clickbait yasak
düşük completion alanları geri it
çok gösterilip az etkileşim alanı düşür
raporlanan içerikleri bastır
tekrar eden şablonları algıla

TikTok ve Instagram tarafında da güvenlik ve uygunluk, öneri sistemlerinden ayrı düşünülmüyor; uygun olmayan içerikler öneri eligibility’sini etkileyebiliyor.

Bu özelliği güçlü yapan şey ne olur?
1. “Hook” zorunluluğu

İlk slayt çok güçlü olmalı.

Örnek:

“İngiltere hakkında bilmediğin 3 şey”
“1 dakikada İngiltere özeti”
“İngiltere’de yaşamanın artıları/eksileri”

NN/g’nin scroll araştırması eski ama hâlâ önemli bir şeyi gösteriyor: kullanıcılar aşağı inse de ilk görülen alan en fazla dikkati alıyor. Sende bunun karşılığı ilk slayt.

2. Her SlaytReels bir konuda tek fikir taşımalı

Karışık olmamalı:

“İngiltere tarihi + ekonomisi + dili + gezilecek yerler” değil
“İngiltere’de yaşam maliyeti 3 maddede” gibi olmalı
3. Son slayt CTA taşımalı
tam sunuma git
kaydet
benzerlerini izle
bu kullanıcıyı takip et
Bu özellik neden çok tutabilir?

Çünkü sen iki ihtiyacı aynı anda çözüyorsun:

1. Hızlı tüketim
İnsan sıkılmadan gezer.

2. Derinleşme
İsterse tam sunuma gider.

Bu ikili model çok güçlü.
Normal kullanıcı kısa içerikle bağlanır, ciddi kullanıcı tam deck’e geçer.

Ben olsam ilk sürümde şunları yaparım
Zorunlu
3–6 slaytlık SlaytReels yükleme
dikey swipe feed
beğen / kaydet / paylaş
tam sunuma git
kategori etiketi
creator adı
completion tracking
İkinci aşama
takip ettiğin üreticiler
ilgi alanına göre feed
trend SlaytReels
rozet sistemi
haftanın en iyi SlaytReels’leri
SlaytReels Özelliği – README
Genel Bakış

SlaytReels, video olmayan ama video gibi akıcı tüketilen bir içerik formatıdır.
Kullanıcılar klasik PPT/PPTX/PDF sunumlarının tamamını değil, o sunumdan seçilmiş kısa bir bölümü “mikro slayt akışı” olarak paylaşır.

Örnek:

Tam sunum: İngiltere hakkında 10 şey – 30 sayfa
SlaytReels: bunun içinden seçilmiş 3–5 sayfalık kısa versiyon

Kullanıcı akışı:

Kullanıcı SlaytReels ekranına girer
Ekranda tek bir SlaytReels görünür
İçerik içinde sağ/sol oklarla slaytlar arasında geçer
Her slayt için altta 5 saniyelik progress bar çalışır
Kullanıcı basılı tutarsa sayaç durur
Son slayt bitince otomatik olarak bir sonraki SlaytReels’e geçilir
Kullanıcı isterse aşağı kaydırarak da bir sonraki SlaytReels’e geçebilir

Bu özellik, klasik sunum görüntüleme ile sosyal medya tipi hızlı keşif deneyimini birleştirir. Sonsuz akış tipi yapılar, sürekli ve birbirine yakın önemde içerik akışlarında kullanıcıyı daha az kesintiye uğrattığı için özellikle keşif yüzeylerinde uygundur.

Amaç

Bu özelliğin amacı:

kullanıcıyı sitede daha uzun tutmak
sunumları daha hızlı keşfedilebilir hale getirmek
uzun sunumlara trafik taşımak
“ilk bakışta değer” hissi oluşturmak
içerik üreticilerine yeni bir paylaşım formatı sunmak

SlaytReels, ana ürünün yerine geçmez.
Tam sunum ana içeriktir.
SlaytReels ise keşif ve giriş noktasıdır.

Temel Konsept

SlaytReels bir video değildir.

Bu yapı:

video oynatıcı mantığında olmayacak
gerçek slayt sayfaları gösterecek
her sayfa statik içerik olacak
geçişler zamanlayıcı + kullanıcı etkileşimi ile çalışacak

Arayüz mantığı:

tek ekranda tek SlaytReels
her SlaytReels içinde 3–5 slayt
üstte başlık/kategori/kullanıcı bilgisi
ortada slayt
sağ ve solda gezinme okları
altta progress segmentleri
sağ altta beğen, kaydet, paylaş
son slaytta “Tam sunuma git” CTA
Ürün Mantığı
Neden video değil?

Çünkü bu proje video platformu değil, sunum platformu.

Bu yüzden:

orijinal sunum kimliği korunur
içerik bilgi odaklı kalır
kullanıcı “video izliyorum” değil, “özet sunum görüyorum” hissi yaşar
Neden 5 saniye?

5 saniye, bir slaytı hızlı tüketmek için iyi bir başlangıç süresidir.
Ama bu süre ileride A/B test ile değiştirilebilir.

Önerilen başlangıç:

metin yoğun slayt: 6–7 sn
normal slayt: 5 sn
görsel ağırlıklı slayt: 4–5 sn

İlk sürümde tüm slaytlara standart 5 saniye verilmesi önerilir.

Kullanıcı Deneyimi Kuralları
İzleme davranışı
Sayfa açılınca ilk slayt otomatik başlar
Alttaki progress bar aktif slayt için ilerler
5 saniye dolunca bir sonraki slayta geçer
Son slayt tamamlanınca bir sonraki SlaytReels açılır
Kullanıcı kontrolleri
Sağ ok → sonraki slayt
Sol ok → önceki slayt
Basılı tut → süre durur
Aşağı kaydır → sonraki SlaytReels
Yukarı kaydır → önceki SlaytReels
Tam sunuma git → ilgili uzun sunumun detay sayfasına yönlendir
Basılı tutma davranışı

Kullanıcı içerikte detay okumak isterse:

mouse down / touch start ile sayaç durur
mouse up / touch end ile sayaç devam eder

Bu davranış, hikâye/stories benzeri etkileşim mantığıyla uyumludur ve kullanıcıya kontrol hissi verir.

İçerik Kuralları
SlaytReels formatı

Bir SlaytReels:

minimum 3 slayt
ideal 4–5 slayt
maksimum 7 slayt

İlk sürüm için önerilen sınır:

min: 3
max: 5
İçerik türleri

Uygun içerikler:

ülke bilgileri
tarih özetleri
matematik kısa anlatımlar
iş dünyası ipuçları
pitch deck özeti
sınav çalışması
yabancı dil mini dersleri
“5 maddede” tarzı öğretici içerikler

Uygun olmayan içerikler:

düzensiz belge parçaları
sadece reklam
rastgele PDF sayfaları
alakasız broşür
okunamayacak kadar yoğun sayfalar
Kalite kuralları

Her SlaytReels:

tek bir ana fikir taşımalı
ilk slaytta güçlü bir giriş yapmalı
son slaytta yönlendirme içermeli

Örnek yapı:

Hook / giriş
Bilgi
Bilgi
Bilgi
CTA / tam sunuma git
Arayüz Bileşenleri
1. Viewer Container

Tek bir SlaytReels’i tam ekran ya da büyük dikey alan içinde gösterir.

2. Slide Area

Aktif slaytın gösterildiği ana alan.

3. Navigation Arrows
sol ok
sağ ok
4. Progress Segments

Üstte ya da altta segmentli ilerleme çubuğu:

her slayt için 1 segment
aktif segment dolar
biten segment dolu görünür
sıradaki segment boş görünür
5. Reel Meta
başlık
kategori
kullanıcı adı
toplam slayt sayısı
6. Action Buttons
beğen
kaydet
paylaş
tam sunuma git
7. Feed Navigation

Kullanıcı alt alta SlaytReels’ler arasında geçer.

Sürekli tüketim odaklı akışlarda infinite scroll mantığı kullanıcıyı daha az keser; ancak yön hissini kaybetmemesi için belirgin içerik sınırları ve net kontrol noktaları gerekir.

Kullanım Senaryosu
Senaryo 1 – Hızlı izleme
Kullanıcı SlaytReels sekmesine girer
İlk içerik otomatik açılır
Kullanıcı 3–5 slaytı izler
Son slaytta “Tam sunuma git” görür
İlgilenirse tam sunuma gider, ilgilenmezse aşağı kaydırır
Senaryo 2 – Detay okumak
Kullanıcı bir slaytta durmak ister
Ekrana basılı tutar
Progress durur
İçeriği okur
Parmağını/mouse’u bırakır
Sayaç kaldığı yerden devam eder
Senaryo 3 – Geri gitmek
Kullanıcı önceki slaytı tekrar görmek ister
Sol oka basar
Önceki slayta döner
Progress yeniden başlar
Teknik Gereksinimler
Frontend

Önerilen stack:

Next.js / React
Tailwind CSS
Zustand veya Context API
Framer Motion (yumuşak geçişler için)
Backend

Önerilen stack:

Node.js
Express
Prisma
PostgreSQL veya başlangıçta SQLite
Dosya Yapısı

Desteklenecek içerikler:

PPT
PPTX
PDF

SlaytReels için sistem şu mantıkla çalışabilir:

kullanıcı tam sunum yükler
içerikten seçili slaytlar işaretlenir
sistem bu seçili slaytları SlaytReels kaydı olarak saklar

Alternatif:

kullanıcı ayrıca doğrudan SlaytReels oluşturur
Veri Modeli Önerisi
Presentation

Tam sunum kaydı

Alanlar:

id
userId
title
description
categoryId
fileUrl
fileType
pageCount
createdAt
PresentationSlide

Tam sunumdaki slaytlar

Alanlar:

id
presentationId
slideIndex
imageUrl veya previewUrl
textExtract (opsiyonel)
SlideReel

Kısa format içerik

Alanlar:

id
presentationId
userId
title
description
coverSlideIndex
status
createdAt
SlideReelItem

SlaytReels içindeki slaytlar

Alanlar:

id
slideReelId
slideIndex
orderIndex
durationMs
SlideReelEngagement

Etkileşim verileri

Alanlar:

id
slideReelId
userId
liked
saved
shared
completed
fullPresentationClicked
watchedSlidesCount
createdAt
Zamanlama Mantığı

Her slayt için varsayılan süre:

5000 ms

Mantık:

viewer açıldığında timer başlar
timer progress yüzdesi üretir
süre dolunca nextSlide()
son slaytsa nextReel()
Pause Mantığı

Aşağıdaki durumlarda timer durur:

kullanıcı basılı tutuyorsa
sekme görünür değilse
modal açıksa
menü açıksa
Resume Mantığı

Aşağıdaki durumda timer devam eder:

kullanıcı basmayı bıraktığında
sekme tekrar aktif olduğunda
Feed Mantığı

Slideo ana akışı:

en yeni içerikler
trend içerikler
kişiye göre önerilen içerikler

İlk sürümde basit sıralama yeterli:

yeni içerikler
yüksek kaydetme oranı
yüksek tamamlama oranı
yüksek tam sunuma geçiş oranı

İleride gelişmiş öneri sistemi eklenebilir.

Ölçülmesi Gereken Metrikler
Temel metrikler
görüntülenme
beğeni oranı
kaydetme oranı
paylaşım oranı
tamamlama oranı
tam sunuma geçiş oranı
Kritik metrikler
ilk slaytta çıkış oranı
üçüncü slayta ulaşma oranı
son slayta ulaşma oranı
CTA tıklama oranı
ortalama Slideo tüketim sayısı / oturum
Başarı sinyalleri

İyi bir Slideo  :

sonuna kadar izlenir
kaydedilir
tam sunuma trafik gönderir
Moderasyon Kuralları

Sistem şu içerikleri bastırmalı veya reddetmeli:

spam
tekrar yüklenmiş aynı içerik
aşırı clickbait ilk slaytlar
okunaksız slaytlar
kategori dışı içerik
telif ihlali riski taşıyan yüklemeler
Moderasyon sinyalleri
düşük tamamlama oranı
yüksek gösterim + düşük etkileşim
raporlanan içerik
tekrar eden şablonlar
Tasarım İlkeleri

Ana hedef:

sade
hızlı
dikkat dağıtmayan
kontrollü
bağımlılık hissi veren ama kaotik olmayan

İyi bir ana sayfa ve keşif yüzeyi:

sitenin ne sunduğunu hızlı anlatmalı
örnek içerikleri doğrudan göstermeli
kullanıcıyı net aksiyonlara yönlendirmeli
gereksiz karmaşadan kaçınmalı.
Tasarım önerileri
koyu arka plan + net beyaz alanlar
slayt kartına odaklı merkez yerleşim
progress bar ince ama belirgin
butonlar büyük değil, temiz
CTA son slaytta güçlü görünmeli
MVP Kapsamı

İlk sürümde olacaklar:

SlaytReels oluşturma
3–5 slayt seçme
sağ/sol ok ile gezinme
5 saniyelik otomatik ilerleme
basılı tutunca durdurma
aşağı kaydırınca sonraki SlaytReels
beğen
kaydet
tam sunuma git
görüntülenme ve tamamlama takibi

İlk sürümde olmayacaklar:

AI öneri motoru
otomatik kısa özet çıkarma
ses/müzik
yorum overlay
canlı yayın benzeri özellikler
karmaşık editör