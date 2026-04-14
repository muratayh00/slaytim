# SQLite -> Supabase PostgreSQL Migration Guide

Bu rehber Slaytim/Slideo projesini SQLite'dan Supabase PostgreSQL'e production-safe şekilde taşımak içindir.

## 1) Ön koşullar

- Supabase projesi oluşturulmuş olmalı.
- DB şifreniz hazır olmalı (`<SUPABASE_DB_PASSWORD>`).
- `server/.env` dosyasında PostgreSQL URL'leri tanımlı olmalı.

Onerilen Supabase ayari (production-safe):

```env
DATABASE_URL="postgresql://postgres.jzofovpvgenicknaqfim:<SUPABASE_DB_PASSWORD>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?schema=public&pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://postgres.jzofovpvgenicknaqfim:<SUPABASE_DB_PASSWORD>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?schema=public&pgbouncer=true&sslmode=require"
```

Not:
- Runtime icin `DATABASE_URL` -> Transaction Pooler (`:6543`) kullanin.
- `DIRECT_URL` icin oncelik direct endpointtir; IPv4-only ortamlarda Session Pooler (`:5432`) fallback kullanilabilir.
- Her iki URL'de de `sslmode=require` kullanin.

## 2) Prisma schema/doğrulama

Datasource PostgreSQL olmalı:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Doğrulama:

```bash
cd server
npx prisma validate
npx prisma generate
```

## 3) Şema migrasyonu

Mevcut migration'ları PostgreSQL'e deploy edin:

```bash
cd server
npm run db:migrate:deploy
```

İlk kurulumda boş veritabanı için yeterlidir.

## 4) SQLite verisini PostgreSQL'e taşıma (opsiyonel)

Eski SQLite verisini aktarmak için:

```bash
cd server
npm run db:migrate:sqlite-to-postgres:dry
npm run db:migrate:sqlite-to-postgres
```

Not:
- Kaynak dosya `SQLITE_MIGRATION_URL` ile belirlenir.
- Bu script sadece one-time data migration içindir.

## 5) Seed

```bash
cd server
npm run db:seed
```

## 6) Test ve build doğrulama

```bash
cd server
npm test -- --runInBand

cd ../client
npm run build
```

## 7) CI/CD uyumu

CI pipeline PostgreSQL service kullanacak şekilde güncellenmiştir:
- `.github/workflows/ci.yml` içinde `postgres:16-alpine` service
- `DATABASE_URL` + `DIRECT_URL` env'leri PostgreSQL DSN

## 8) Production checklist

- `DATABASE_URL` ve `DIRECT_URL` gerçek değerlerle set edildi.
- URL'lerde `sslmode=require` var.
- `JWT_SECRET` en az 32 karakter.
- `AUTH_COOKIE_SECURE=true`, `TRUST_PROXY=1`.
- `npm run db:migrate:deploy` production deploy sırasında çalışıyor.
- Backup/restore planı hazır.

## 9) Geri dönüş (rollback) stratejisi

- Uygulama kodu rollback: son stabil release'e dön.
- DB rollback: destructive migration olmadığı sürece gerekmez.
- Veri problemi durumunda Supabase PITR/backup restore kullanın.
