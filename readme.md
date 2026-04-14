# Slaytim

Bu depodaki resmi ürün, mimari ve launch durumu dokümanı:

- `docs/SLAYTIM_SOURCE_OF_TRUTH.md`

## Hızlı Özet
- Ürün: Slayt paylaşım + sosyal etkileşim + Slideo kısa format
- Frontend: Next.js 14
- Backend: Express + Prisma
- Veritabanı: PostgreSQL
- Queue: Redis + BullMQ

## Launch Öncesi Ana Komutlar
```bash
node scripts/preflight-launch.mjs --url https://slaytim.com --api-url https://api.slaytim.com/api
cd server && npm run staging:proof
cd client && npm run test:e2e
```

## Not
`docs/SLAYTIM_SOURCE_OF_TRUTH.md` dışındaki eski raporlar tarihsel amaçlıdır.
Çelişki olursa tek doğru kaynak bu dosyadır.
