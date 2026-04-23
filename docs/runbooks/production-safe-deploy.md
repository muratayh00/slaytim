# Slaytim Production Safe Deploy Runbook

Bu akis deploy sirasinda ChunkLoadError, _next/static 404 ve stale bundle kirilmalarini onlemek icin zorunlu siradir.

## 1) Guncel kodu cek

```bash
cd /root/slaytim
git fetch --all
git checkout main
git pull --ff-only
```

## 2) Client bagimlilik + build

```bash
cd /root/slaytim/client
npm ci
npm run build
```

## 3) Server bagimlilik + Prisma

```bash
cd /root/slaytim/server
npm ci
npx prisma generate
npx prisma migrate deploy
```

## 4) PM2 restart (atomik)

```bash
pm2 restart slaytim-api
pm2 restart slaytim-worker
pm2 restart worker-preview
pm2 save
```

## 5) Cache ve static dosya notlari

- Cloudflare varsa:
  - HTML icin Cache Everything acik olmamali.
  - `/_next/static/*` immutable cache alabilir.
  - Deploy sonrasi HTML purge yap.
- Nginx reverse proxy varsa:
  - `/_next/static/*` istekleri Next uygulamasina dogru iletilmeli.
  - JS dosyalari `text/plain` donmemeli (`nosniff` varken chunk kirilir).
- Release overlap (zorunlu):
  - Yeni release yayinlanirken bir onceki release'in `.next/static` dosyalari en az 10-15 dakika daha erisilebilir tutulmali.
  - Amac: eski HTML/chunk referansi tasiyan ziyaretcilerin tek yenilemeyle toparlanmasi.

## 6) Zorunlu sanity checks

```bash
curl -I https://www.slaytim.com/
curl -I https://www.slaytim.com/_next/static/
curl -I https://www.slaytim.com/robots.txt
curl -I https://www.slaytim.com/ads.txt
curl -I https://www.slaytim.com/sitemap.xml
curl -I https://www.slaytim.com/slideo
curl -I https://www.slaytim.com/slayt/1-test
```

Beklenenler:
- `https://www.slaytim.com/` -> 200
- `robots.txt`, `ads.txt`, `sitemap.xml` -> 200 + dogru content-type
- Slideo/slayt sayfalari 200 veya not-found ise 404 (asla chunk 404 + JS text/plain degil)

## 7) Uygulama seviyesi smoke

```bash
cd /root/slaytim/client
npm run seo:test
```

Deploy basarili sayilmasi icin:
- ChunkLoadError gorulmemeli
- `/_next/static/chunks/*` 404 patlamasi olmamali
- Slideo paylasim ve sayfa gecisleri calismali

## 8) Hizli rollback

Eger deploy sonrasi chunk kirilmasi gorulurse:

1. PM2 ile bir onceki bilinen stabil release'e don.
2. Cloudflare HTML cache purge yap.
3. Sanity checks'i tekrar calistir.
