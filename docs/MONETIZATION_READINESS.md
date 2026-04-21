# Monetization Readiness (AdSense + Sponsorlu Gelir)

## 1. AdSense Teknik Hazirlik
- `https://www.slaytim.com/ads.txt` yayinda olmali.
- `NEXT_PUBLIC_ADSENSE_ID` ve tum slot env degiskenleri dolu olmali.
- Reklam scripti sadece cerez izni verildiginde yuklenmeli.

## 2. Sponsorlu Icerik Kurallari
- Sponsorlu iceriklerde `isSponsored=true` olmadan yayin acilmamali.
- `sponsorName` zorunlu olmali.
- UI'da "Sponsorlu" etiketi ve disclosure metni gorunmeli.

## 3. Olcumleme
- Aksam eventleri:
  - `ad_impression`, `ad_click`
  - `sponsored_view`, `sponsored_click`
- Eventler hem GA4 hem backend ingest tarafinda kabul edilmeli.

## 4. Haftalik Operasyon Kontrol Listesi
- AdSense policy center ihlali var mi?
- ads.txt dogrulama uyarisi var mi?
- Sponsorlu iceriklerde etiket/disclosure eksigi var mi?
- CTR, RPM, sponsored click-through trendi normal mi?
- CLS/LCP regression var mi?

## 5. Acil Durum Plani
- Ad quality problemi olursa ilgili ad slot env gecici kapatilabilir.
- Sponsor kampanya bitisinde `isSponsored=false` + metadata temizleme uygulanir.
