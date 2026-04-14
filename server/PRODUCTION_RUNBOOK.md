# Production Runbook

Bu doküman PostgreSQL tabanlı production işletim adımlarını kapsar.

## 1) CI/CD

- Workflow dosyası: `.github/workflows/ci.yml`
- Her PR için:
  - server test
  - client typecheck
  - client build

## 2) Staging parity

- Staging env örneği: `.env.staging.example`
- Production env örneği: `.env.production.example`
- Compose: `docker-compose.staging.yml`
- Çalıştır:
  - `npm run staging:up`
  - `npm run staging:down`

## 3) Redis + Worker

- Redis başlat:
  - `npm run redis:up`
- Redis doğrula:
  - `npm run redis:check`
- Worker (Redis mod):
  - `npm run worker:conversion:redis`

## 4) Rollback otomasyonu

- Yeni release işaretle:
  - `npm run release:mark -- <release-id>`
- Bir önceki release’e dön:
  - `npm run release:rollback`
- Durum dosyaları:
  - `release-state/active-release.json`
  - `release-state/release-history.json`

## 5) Conversion sandbox

- Opsiyonel docker sandbox:
  - `CONVERSION_SANDBOX_DOCKER=true`
  - `CONVERSION_SANDBOX_IMAGE=lscr.io/linuxserver/libreoffice:latest`
  - `CONVERSION_SANDBOX_SOFFICE=/usr/bin/soffice`

Not: Sandbox modu açılacaksa staging’de önce test edilmelidir.

## 6) Load test

- Smoke load test:
  - `npm run load:smoke`
- Özelleştirme:
  - `BASE_URL=http://localhost:5001`
  - `VUS=100`
  - `DURATION=120s`

## 7) İzleme

- Health endpointleri:
  - `/api/health`
  - `/api/health/conversion`
  - `/api/health/upload-pipeline`

Bu üç endpoint deploy sonrası smoke check’e dahil edilmelidir.

## 8) Supabase erişim güvenliği (backend-only)

Hedef:
- Frontend tarafında Supabase Data API/anon key kullanılmamalı.
- Veritabanına erişim sadece backend üzerinden yapılmalı.

Uygulanan korumalar:
- `server/src/config/env-validation.js`
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` set edilirse startup fail.
- `client/src/lib/env.ts`
  - `NEXT_PUBLIC_SUPABASE_*` değişkenleri varsa runtime fail.
- `scripts/guard-no-supabase-client.mjs`
  - Frontend kodunda Supabase client/Data API izi varsa build fail.

Supabase Dashboard tarafında zorunlu adımlar:
- Data API kullanımı yoksa Data API/Auth/Storage public endpointlerini uygulamada kullanmayın.
- DB password rotasyonu yapın (eski connection stringleri iptal edin).
- Mümkünse direct DB erişimini kapatın; yalnızca pooler üzerinden erişin.
- Supabase Network Restrictions/Firewall özelliği varsa allowlist'e sadece backend sunucu static egress IP'sini ekleyin.
- Backend dışında (lokal geliştirici makineleri dahil) production DB erişimini engelleyin.
- Connection stringleri sadece backend secret manager/env içinde tutun; frontend env dosyalarına koymayın.
