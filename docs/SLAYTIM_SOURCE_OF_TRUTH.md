# SLAYTIM Single Source of Truth (2026-04-13)

## 1) Product Definition
Slaytim is a social slide-sharing platform:
- Topic-based publishing (`konu`)
- Slide uploads (`PDF`, `PPT`, `PPTX`)
- Slideo short format (3-7 selected pages)
- Social interactions (like, save, comment, follow, notifications)
- Rooms (public/private community spaces)
- Collections (public/private curated lists)

Primary goal:
- Turn long-form slide content into discoverable, social, and reusable learning content.

## 2) Core Features
- Auth: register/login/logout/reset password
- Topic lifecycle: create/list/detail/like/follow
- Slide lifecycle: upload/conversion/preview/like/save/download/delete
- Slideo lifecycle: create/list/detail/engagement/delete
- Social: comments, follow graph, notifications
- Community: rooms + room messages
- Moderation/Admin: reports, user controls, admin analytics surfaces

## 3) Architecture
Frontend:
- Next.js 14 (App Router), React 18, TypeScript, Tailwind, Zustand, Axios

Backend:
- Node.js + Express
- Prisma ORM
- JWT cookie auth + CSRF + rate limiting
- Redis + BullMQ conversion queue
- LibreOffice conversion pipeline

Database:
- PostgreSQL (Prisma datasource provider = `postgresql`)
- `DATABASE_URL` (pooler runtime) + `DIRECT_URL` (migrate/introspection)

Storage:
- Dev: local fallback permitted
- Production: remote object storage only (`s3` or `r2`)

## 4) URL Architecture (Public)
- `/`
- `/kesfet`
- `/slideo`
- `/slideo/:id-:slug`
- `/konu/:id-:slug`
- `/slayt/:id-:slug`
- `/@:username`
- `/kategori/:slug`
- `/etiket/:slug`

Rules:
- ID + slug hybrid routing
- DB lookup by ID only
- Slug mismatch -> canonical redirect

## 5) Production Infra Baseline
Domain split:
- App: `https://slaytim.com`
- API: `https://api.slaytim.com`

Cloudflare:
- SSL mode: Full (strict)
- HTTP -> HTTPS redirect on
- `www` -> apex canonical redirect

Server hardening baseline:
- `NODE_ENV=production`
- `TRUST_PROXY=1`
- `AUTH_COOKIE_SECURE=true`
- `REDIS_ENABLED=true`
- `CONVERSION_LOCAL_FALLBACK=false`
- `STORAGE_DRIVER=s3|r2`
- `CLAMAV_REQUIRED=true`
- strong `JWT_SECRET`

## 6) Launch Verification Commands
Preflight (domain/app/api/SEO):
```bash
node scripts/preflight-launch.mjs --url https://slaytim.com --api-url https://api.slaytim.com/api
```

Conversion proof (single + concurrent + restart + delete smoke):
```bash
cd server
npm run staging:proof
```

E2E smoke:
```bash
cd client
npm run test:e2e
```

## 7) Current Readiness Snapshot
Confirmed recently:
- Redis/BullMQ active, local fallback disabled in queue health
- Upload -> conversion -> thumbnail flow proven in staging-proof report
- Domain preflight passes with one warning: homepage canonical missing on live

Blocking to mark full GO:
1. Canonical tag warning must disappear in live preflight
2. Production env values must be set with real secrets and remote storage credentials
3. Final release gate run must pass: preflight + staging proof + e2e smoke

## 8) Document Policy
This file is the authoritative project status and launch reference.
The following files are historical/supporting:
- `readme.md`
- `PROJE.md`
- `SLAYTIM_FULL_SYSTEM_REPORT_2026-04-02.md`

If conflicts exist, trust this file and current code.
