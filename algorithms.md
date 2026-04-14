1. Hot / trending sıralama algoritması

Bu en kritiklerden biri. Ana sayfada, kategori sayfalarında ve başlıklarda “şu an yükselen” içerikleri göstermek için kullanılır. Reddit ve Hacker News gibi sistemlerde temel mantık etkileşim + zaman çürümesidir; yani yeni içerik hızlı etkileşim alıyorsa yükselir, yaşlandıkça geri düşer.

Senin sitede basit ama çok iş görecek formül şu olabilir:

hot_score = (like_weight + save_weight + comment_weight + upload_velocity_weight) / (age_hours + 2)^gravity

Önerdiğim ağırlıklar:

like = 1
save = 3
topic’e yeni slayt eklenmesi = 4
paylaşım / profile click = 2
gravity = 1.4–1.8

Burada en önemli fikir şu:
save, like’tan daha değerli olsun. Çünkü kaydetmek daha güçlü niyet sinyali.

2. Personalized feed algoritması

Kullanıcı herkese aynı ana sayfayı görmemeli. YouTube da kişiye göre öneri yaparken izleme alışkanlığı, cihaz, zaman ve geçmiş davranış gibi bağlamsal sinyalleri kullandığını söylüyor.

Senin sistemde kullanıcıya özel akış için puan şöyle kurulabilir:

personal_score = category_affinity + creator_affinity + topic_similarity + saved_behavior + recent_visit_boost

Burada:

kullanıcı hangi kategorileri takip ediyor
hangi kullanıcıları takip ediyor
neleri kaydetmiş
hangi konularda uzun kalmış
hangi tip Slideo’ları tamamlamış

bunlar skora girer.

Yani örnek:

finans takip ediyorsa finans içerikleri yukarı çıkar
girişimcilik slaytlarını kaydediyorsa benzer pitch deck’ler yükselir
bir kullanıcıyı çok ziyaret ediyorsa onun yeni içerikleri daha görünür olur
3. Collaborative filtering algoritması

Bu daha ileri seviye ama çok değerlidir. Collaborative filtering, benzer kullanıcı davranışlarına göre öneri yapar; öneri sistemlerinde temel tekniklerden biridir. 2025 tarihli karşılaştırmalı çalışmalarda KNN tabanlı CF, SVD/SVD++ gibi matrix factorization yöntemleri ve daha gelişmiş modeller yaygın teknikler olarak ele alınıyor.

Slaytim için ilk aşamada şunu yap:

“bu slaytı kaydedenler şunları da kaydetti”
“bu konuyu beğenenler bunlara da baktı”
“benzer kullanıcıların sevdiği slaytlar”

Başlangıç için:

item-item similarity
cosine similarity
implicit feedback tabanlı öneri

yeterli olur.

İleri aşamada:

SVD / implicit matrix factorization
LightGCN benzeri graph tabanlı modeller

düşünülebilir. Ama ilk etapta şart değil.

4. Content-based recommendation algoritması

Bu, içeriğin kendisine bakarak öneri üretir. Özellikle senin gibi yeni bir sitede cold start sorununu çözmek için çok işe yarar; çünkü başta kullanıcı verisi az olur. Collaborative filtering veri ister, content-based daha erken çalışır.

Senin sitede hangi verilerden beslenir:

slayt başlığı
açıklama
etiketler
kategori
konu başlığı
slayt içinden çıkarılan metin
kapak görseli / görsel tema

Bununla:

benzer slayt öner
benzer konu öner
aynı vibe’daki Slideo’ları öner
aynı kategori altındaki kaliteli içerikleri yüzeye çıkar

Başlangıçta TF-IDF + cosine similarity bile yeterli olabilir. Sonra embedding’e geçersin.

5. Slideo sıralama algoritması

Bu ayrı bir algoritma olmalı. Çünkü kısa akış mantığı normal forum akışından farklıdır. Kısa içerikte ilk saniyelerde tutma, tamamlama oranı ve sonraki aksiyonlar çok önemlidir; kısa video tarafındaki en güçlü pratikler de retention ve satisfaction tarafına dayanıyor.

Senin Slideo için önemli sinyaller:

ilk 2 saniyede swipe edilmedi mi
tamamlandı mı
tekrar izlendi mi
tam slayta tıklandı mı
profile gidildi mi
kaydedildi mi
aynı seriden başka Slideo izlendi mi
“ilgilenmiyorum” benzeri negatif sinyal var mı

Örnek puan:
slideo_score = completion_rate * 3 + rewatch_rate * 2 + full_slide_click * 4 + save_rate * 5 - early_swipe_penalty

Burada en değerli olay:
tam slayta geçiş. Çünkü bu, kısa içerikten gerçek değere geçtiğini gösterir.

6. Explore vs exploit için bandit algoritması

Bu çok işine yarar. Multi-armed bandit algoritmaları, sistemin hem iyi çalışan içerikleri göstermesi hem de yeni şeyleri denemesi için kullanılır; temel problem “exploration vs exploitation” dengesidir. Epsilon-greedy, UCB ve Thompson Sampling en bilinen yaklaşımlardır.

Senin sitede kullanım alanı:

yeni konu mu gösterelim, kanıtlanmış iyi konu mu
yeni kullanıcıyı mı öne çıkaralım, eski star hesabı mı
hangi kapak türü daha iyi çalışıyor
hangi Slideo formatı daha çok tamamlama alıyor

Ben olsam burada:

MVP’de basit epsilon-greedy
sonra Thompson Sampling

kullanırdım.

Bu, sistemin hep aynı büyük hesapları öne çıkarmasını engeller.

7. Spam / abuse / kalite filtreleme algoritması

Bu olmazsa ürün çöker. OWASP hem rate limiting/resource abuse hem de spamming tarafını özellikle risk olarak gösteriyor. Kullanıcı içerikli platformlarda spam, SEO çöplüğü ve otomasyon çok hızlı kaliteyi bozar.

Sende olması gerekenler:

rate limit
yeni hesapların aksiyon sınırı
aynı başlığa çok hızlı içerik yükleme tespiti
duplicate açıklama / duplicate slayt hash kontrolü
aşırı link içeren içerik cezaları
bot benzeri davranış puanı

Basit spam skoru örneği:

hesap yaşı çok düşük
peş peşe çok upload
çok kısa sürede çok like isteği
aynı metin tekrarları
aynı görsel hash
rapor oranı yüksek

Bunlara göre içerik:

görünürlüğü düşür
moderasyon kuyruğuna at
doğrudan silme yerine önce limit uygula
8. Search ranking algoritması

Arama da ayrı algoritma ister. İnsanlar “güzel bir pitch deck”, “osmanlı sunumu”, “girişimcilik slaytı” diye aradığında sadece metin eşleşmesi yetmez.

Başlangıçta:

BM25 / full-text search
başlık alanına daha yüksek ağırlık
etiketlere yüksek ağırlık
kaydetme ve beğeniyi ek skor olarak kullan

Örnek:
search_score = text_relevance + quality_score + freshness_score + personalization_boost

Burada şunu özellikle yap:

başlık eşleşmesi > açıklama eşleşmesi
save_count > like_count
kullanıcının takip ettiği kategoriye boost
9. Graph algoritmaları

Senin sistem aslında bir graph ürünü:

user → follows → user
user → likes → slide
user → saves → slide
slide → belongs_to → topic
topic → belongs_to → category

Bu yüzden zamanla graph tabanlı öneri çok iyi çalışır. 2025 karşılaştırmalı öneri sistemi çalışmalarında graph/neural collaborative yaklaşımlar da modern seçenekler arasında yer alıyor.

Kullanım alanı:

benzer kullanıcı bulma
benzer slayt bulma
en etkili üreticileri bulma
kategori topluluklarını keşfetme

MVP için şart değil ama büyüdükçe çok iş yapar.

10. Kalite skoru algoritması

Bence bu senin için altın özellik. Çünkü sadece popüler olanı değil, gerçekten işe yarayanı öne çıkarmak istersin. YouTube’un da anlattığı gibi sistem sadece ham tüketimi değil, memnuniyet sinyallerini de dikkate alıyor.

Senin kalite skorun şöyle olabilir:

save rate
full-slide open rate
return visit rate
profile click rate
same-user-follow conversion
low report rate
dwell time
Slideo’dan tam içeriğe geçiş

Yani:
çok tıklanan ama kimsenin kaydetmediği içerik ile
az tıklanan ama çok kaydedilen içerik aynı muamele görmesin.

Sana en çok iş yapacak algoritma seti

Ben senin yerinde olsam bunu 3 aşamada kurarım:

MVP
Hot ranking
Personalized feed (basit)
Search ranking
Spam scoring
Slideo retention scoring
2. aşama
Collaborative filtering
Content-based recommendation
Trend detection by velocity
Quality score
3. aşama
Bandit optimization
Graph recommendation
Advanced abuse detection
Creator / topic reputation score
Sana direkt önerdiğim formül seti

En pratik olanlar bunlar:

Ana sayfa

hot_score + personalization_boost

Kategori sayfası

freshness + velocity + quality_score

Slideo

completion + rewatch + full_slide_click + save

Arama

text relevance + save_count + personalization

Moderasyon

spam_score + report_rate + account_trust
En kritik 5 algoritma

Gerçekten en çok iş yapacak 5 tanesi:

Hot/trending ranking
Personalized feed scoring
Slideo retention ranking
Search ranking
Spam / abuse scoring