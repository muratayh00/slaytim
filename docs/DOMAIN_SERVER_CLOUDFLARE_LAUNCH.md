# Domain + Server + Cloudflare Launch Guide

## 1) DNS (Cloudflare)
Create records (proxied = orange cloud):
- A `@` -> `<SERVER_IP>` (proxied)
- CNAME `www` -> `@` (proxied)
- CNAME `api` -> `@` (proxied)

## 2) SSL/TLS
Cloudflare:
- SSL/TLS mode: `Full (strict)`
- Always Use HTTPS: `On`
- Automatic HTTPS Rewrites: `On`

Origin server:
- Install Cloudflare Origin Certificate (or Let's Encrypt)
- Configure nginx using `ops/nginx/slaytim.conf.example`

## 3) Canonical and redirects
Expected behavior:
- `http://slaytim.com/*` -> `https://slaytim.com/*`
- `https://www.slaytim.com/*` -> `https://slaytim.com/*`
- API stays at `https://api.slaytim.com/*`

## 4) Production env values
Server:
- `NODE_ENV=production`
- `CLIENT_URL=https://slaytim.com`
- `TRUST_PROXY=1`
- `AUTH_COOKIE_SECURE=true`
- `AUTH_COOKIE_SAME_SITE=strict`
- `REDIS_ENABLED=true`
- `CONVERSION_LOCAL_FALLBACK=false`
- `STORAGE_DRIVER=s3` or `r2`
- `CLAMAV_REQUIRED=true`
- `LIBREOFFICE_REQUIRED=true`
- `DATABASE_URL` = Supabase transaction pooler URL
- `DIRECT_URL` = Supabase session/direct URL

Client:
- `NEXT_PUBLIC_SITE_URL=https://slaytim.com`
- `NEXT_PUBLIC_API_URL=https://api.slaytim.com/api`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-...`

## 5) Preflight
Run from repo root:

```bash
node scripts/preflight-launch.mjs --url https://slaytim.com --api-url https://api.slaytim.com/api
```

Pass criteria:
- no FAIL
- canonical, og, sitemap, health all reachable

## 6) Strict local start (no Redis fallback)
Use `start-all.bat`.
It sets `STRICT_REDIS=true` and aborts startup if Redis is not ready.

## 7) Staging conversion proof
With docker stack up:

```bash
cd server
docker compose -f docker-compose.staging.e2e.yml up -d --build
node scripts/staging-proof.mjs
```

Output report:
- `scripts/staging-proof-report.json`

Report includes:
- single upload proof
- 5 concurrent upload proof
- restart proof (api + worker)
- delete smoke
