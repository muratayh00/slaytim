# Slaytim.com — Kurulum Kılavuzu

## Gereksinimler

| Araç | Minimum Sürüm | Notlar |
|---|---|---|
| Node.js | 18+ | LTS önerilir |
| npm | 9+ | Node ile birlikte gelir |
| Redis | 6+ | Dönüşüm kuyruğu (BullMQ) için gerekli |
| LibreOffice | 7+ | PPTX → PDF dönüşümü için gerekli |

---

## 1. Ortam Değişkenleri

### Backend (`server/.env`)

```env
# Veritabanı (development + production: PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/slaytim_db?schema=public"
DIRECT_URL="postgresql://postgres:postgres123@localhost:5432/slaytim_db?schema=public"

# JWT imza anahtarı — üretimde mutlaka değiştir
JWT_SECRET="slaytim_super_secret_key_change_in_production"

# Server portu
PORT=5001

# Frontend adresi (CORS ve e-posta linkleri için)
CLIENT_URL="http://localhost:3000"

# LibreOffice çalıştırılabilir dosyası (PPTX → PDF)
# Windows: C:\Program Files\LibreOffice\program\soffice.exe
# Linux:   /usr/bin/soffice
LIBREOFFICE_PATH="C:\Program Files\LibreOffice\program\soffice.exe"

# ── Redis (BullMQ conversion queue) ─────────────────────────
REDIS_URL="redis://127.0.0.1:6379"
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379
REDIS_PASSWORD=""
REDIS_DB=0

# ── Dönüşüm kuyruğu ─────────────────────────────────────────
CONVERSION_QUEUE_NAME="slide-conversion"
CONVERSION_ATTEMPTS=5
CONVERSION_BACKOFF_MS=5000
CONVERSION_WORKER_CONCURRENCY=2
CONVERSION_LOCK_DURATION_MS=120000
CONVERSION_LOCAL_FALLBACK=true

# ── Dosya depolama (development: local, production: s3/r2) ───
STORAGE_DRIVER=""           # Boş bırakılırsa local uploads/ kullanılır
ALLOW_LOCAL_STORAGE_DEV=true
# STORAGE_BUCKET=""
# STORAGE_REGION="auto"
# STORAGE_ENDPOINT=""
# STORAGE_ACCESS_KEY_ID=""
# STORAGE_SECRET_ACCESS_KEY=""

# ── E-posta — Resend (resend.com) ────────────────────────────
# Kayıt doğrulama, şifre sıfırlama ve magic link e-postaları için.
# API anahtarını https://resend.com/api-keys adresinden alabilirsin.
RESEND_API_KEY="REPLACE_WITH_YOUR_RESEND_API_KEY"
EMAIL_FROM="Slaytim <hello@slaytim.com>"

# ── Hata takibi (opsiyonel) ──────────────────────────────────
# SENTRY_DSN=""
```

### Frontend (`client/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Google AdSense (opsiyonel)
# NEXT_PUBLIC_ADSENSE_ID=ca-pub-XXXXXXXXXXXXXXXX
# NEXT_PUBLIC_ADSENSE_SLOT_HOME_MID=1234567890
# NEXT_PUBLIC_ADSENSE_SLOT_SLIDE_DETAIL=1234567890
# NEXT_PUBLIC_ADSENSE_SLOT_TOPIC_DETAIL=1234567890

# Embed iframe izin listesi (boşlukla ayrıl)
# NEXT_PUBLIC_EMBED_ALLOWED_PARENTS=https://slaytim.com

# Sentry (opsiyonel)
# NEXT_PUBLIC_SENTRY_DSN=
# SENTRY_ORG=
# SENTRY_PROJECT=
```

---

## 2. Backend Kurulumu

```bash
cd server
npm install
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js          # Temel kategorileri yükler
npm run dev                  # API → http://localhost:5001
```

---

## 3. Frontend Kurulumu

```bash
cd client
npm install
npm run dev                  # Uygulama → http://localhost:3000
```

---

## 4. Dönüşüm Worker'ı (PPTX → PDF)

PPTX yüklemelerinin PDF'e dönüştürülmesi için Redis çalışıyor olmalı ve worker ayrı bir süreçte başlatılmalıdır:

```bash
# Terminalde 1 — Redis (lokal kurulum varsayımıyla)
redis-server

# Terminalde 2 — Backend API
cd server && npm run dev

# Terminalde 3 — Conversion worker
cd server && npm run worker:conversion

# Terminalde 4 — Frontend
cd client && npm run dev
```

> **Not:** Redis kurulu değilse `.env`'de `CONVERSION_LOCAL_FALLBACK=true` bırakın. Bu durumda dönüşüm senkron olarak çalışır (kuyruk olmadan), ancak üretimde önerilmez.

---

## 5. Klasör Yapısı

```
slaytim.com/
├── client/                        # Next.js 14 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/            # Login, Register, Şifre sıfırlama
│   │   │   ├── (main)/            # Ana sayfalar (topics, slides, profil…)
│   │   │   ├── (legal)/           # KVKK, Gizlilik, Çerez
│   │   │   └── embed/             # Iframe embed sayfaları
│   │   ├── components/
│   │   │   ├── shared/            # Navbar, SlideViewer, Modal, Card…
│   │   │   └── slideo/            # Slideo-özel bileşenler
│   │   ├── lib/                   # api.ts, pdfRenderer.ts, utils.ts…
│   │   └── store/                 # Zustand (auth, consent, recentTopics)
│   ├── public/
│   └── next.config.js
│
└── server/                        # Express.js backend
    ├── prisma/
    │   ├── schema.prisma          # 24 model, tam ilişki şeması
    │   ├── seed.js                # Başlangıç verileri
    │   └── migrations/            # 19 migration (otomatik)
    ├── src/
    │   ├── controllers/           # İş mantığı (20 controller)
    │   ├── routes/                # API rotaları (20 dosya)
    │   ├── middleware/            # auth, upload, csrf, spam, admin
    │   ├── services/              # badge, conversion, mail, notification…
    │   ├── workers/               # conversion.worker.js (BullMQ)
    │   └── lib/                   # slug, sanitize, storage adaptörü…
    └── uploads/                   # Lokal dosya deposu (dev)
```

---

## 6. Desteklenen Dosya Türleri

| Uzantı | Açıklama |
|---|---|
| `.pptx` | PowerPoint (modern format) — otomatik PDF dönüşümü |
| `.ppt` | PowerPoint (eski format) — otomatik PDF dönüşümü |
| `.pdf` | Doğrudan yükleme — dönüşüm gerekmez |

Maksimum dosya boyutu: **50 MB**

---

## 7. Ana API Endpoint'leri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/register` | Kayıt ol |
| POST | `/api/auth/login` | Giriş yap |
| POST | `/api/auth/logout` | Çıkış yap |
| GET | `/api/auth/me` | Mevcut kullanıcı |
| POST | `/api/auth/forgot-password` | Şifre sıfırlama e-postası |
| GET | `/api/categories` | Tüm kategoriler |
| GET | `/api/topics` | Konu listesi (sayfalama, filtre) |
| POST | `/api/topics` | Konu aç |
| GET | `/api/topics/:id` | Konu detayı |
| GET | `/api/topics/trending` | Trend konular |
| GET | `/api/slides/topic/:id` | Konuya ait slaytlar |
| POST | `/api/slides` | Slayt yükle (multipart/form-data) |
| GET | `/api/slides/:id` | Slayt detayı |
| GET | `/api/slides/popular` | Popüler slaytlar |
| GET | `/api/slides/:id/status` | Dönüşüm durumu |
| POST | `/api/likes/topic/:id` | Konu beğen / geri al |
| POST | `/api/likes/slide/:id` | Slayt beğen / geri al |
| POST | `/api/saves/slide/:id` | Slayt kaydet / geri al |
| POST | `/api/follows/user/:id` | Kullanıcı takip et |
| POST | `/api/follows/category/:id` | Kategori takip et |
| GET | `/api/users/:username` | Profil |
| GET | `/api/users/:username/details` | Profil detayları (beğeniler, kayıtlar…) |
| GET | `/api/notifications` | Bildirimler |
| GET | `/api/notifications/stream` | Gerçek zamanlı bildirim (SSE) |
| GET | `/api/collections` | Koleksiyonlar |
| POST | `/api/collections` | Koleksiyon oluştur |
| GET | `/api/rooms` | Odalar |
| POST | `/api/rooms` | Oda oluştur |
| GET | `/api/slideo` | Slideo akışı |
| GET | `/api/reports` | Raporlar (admin) |
| GET | `/api/admin/stats` | Admin istatistikleri |
| GET | `/api/badges` | Rozetler |

---

## 8. Test

```bash
# Backend unit testleri
cd server && npm test

# Frontend E2E testleri (Playwright)
cd client && npx playwright test
```

---

## 9. Üretim Notları

- **Veritabanı:** PostgreSQL standarttır. `DATABASE_URL` (pool) ve `DIRECT_URL` (migration/direct) birlikte tanımlı olmalıdır.
- **Supabase geçiş rehberi:** `server/POSTGRES_MIGRATION_GUIDE_SUPABASE.md`
- **Storage:** `STORAGE_DRIVER=s3` (AWS S3) veya `r2` (Cloudflare R2) ile bulut deposuna geç.
- **Redis:** Üretimde Redis zorunludur (`CONVERSION_LOCAL_FALLBACK=false` yap).
- **JWT_SECRET:** Üretimde uzun ve rastgele bir değer kullan.
- **HTTPS:** `AUTH_COOKIE_SECURE=true` ve `AUTH_COOKIE_SAME_SITE=strict` yap.
