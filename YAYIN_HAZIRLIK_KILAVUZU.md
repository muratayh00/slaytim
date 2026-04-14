# Slaytim Yayın Hazırlık Kılavuzu

## 1) Veritabanı (Production)
- PostgreSQL 16+
- Ayrı `staging` ve `production` veritabanı
- Otomatik yedekleme + PITR açık
- SSL zorunlu

## 2) Backend (Production)
- Node.js 20 LTS
- Reverse proxy: Nginx / Caddy
- `NODE_ENV=production`
- `TRUST_PROXY=1`
- `AUTH_COOKIE_SECURE=true`
- `JWT_SECRET` en az 32 karakter

## 3) Queue / Conversion
- Redis zorunlu (`REDIS_ENABLED=true`)
- Local fallback kapalı (`CONVERSION_LOCAL_FALLBACK=false`)
- Worker ayrı process/container
- LibreOffice zorunlu (`LIBREOFFICE_REQUIRED=true`)

## 4) Storage
- Production'da local storage yok
- `STORAGE_DRIVER=s3|r2`
- `CLAMAV_REQUIRED=true`
- Upload, PDF ve thumbnail aynı object storage üzerinde tutulmalı

## 5) Domain / Cloudflare
- `slaytim.com` (app), `api.slaytim.com` (backend)
- Cloudflare SSL mode: `Full (strict)`
- HTTP -> HTTPS redirect
- `www` -> apex redirect

## 6) Frontend
- `NEXT_PUBLIC_SITE_URL=https://slaytim.com`
- `NEXT_PUBLIC_API_URL=https://api.slaytim.com/api`
- canonical + OG + sitemap + robots doğrulaması

## 7) Preflight
```bash
node scripts/preflight-launch.mjs --url https://slaytim.com --api-url https://api.slaytim.com/api
```

## 8) Staging Kanıt Testi
```bash
cd server
docker compose -f docker-compose.staging.e2e.yml up -d --build
node scripts/staging-proof.mjs
```

Rapor: `scripts/staging-proof-report.json`
