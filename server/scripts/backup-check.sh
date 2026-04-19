#!/bin/bash
# backup-check.sh
# Supabase backup durumu ve storage tutarlılık kontrolü.
# Kullanım: bash scripts/backup-check.sh
set -euo pipefail

echo "=== Backup & Tutarlılık Kontrolü ==="
echo "Tarih: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ── DB bağlantısı ─────────────────────────────────────────────────────────────
if [ -z "${DATABASE_URL:-}" ]; then
  echo "⚠️  DATABASE_URL env değişkeni tanımlı değil."
  echo "   .env dosyasını kaynak alarak tekrar dene: source .env && bash scripts/backup-check.sh"
  exit 1
fi

echo "=== Orphan Preview Asset Kontrolü ==="
psql "$DATABASE_URL" << 'SQL'
SELECT
  'orphan_preview_assets' AS kontrol,
  COUNT(*) AS adet
FROM slide_preview_assets spa
LEFT JOIN slides s ON s.id = spa.slide_id
WHERE s.id IS NULL

UNION ALL

SELECT
  'tutarsiz_thumbnail' AS kontrol,
  COUNT(*) AS adet
FROM slides
WHERE thumbnail_url IS NOT NULL
  AND conversion_status != 'done'

UNION ALL

SELECT
  'preview_durumu_ozeti' AS kontrol,
  0 AS adet
FROM slides WHERE false;

SELECT
  preview_status,
  conversion_status,
  COUNT(*) AS adet
FROM slides
WHERE deleted_at IS NULL
GROUP BY preview_status, conversion_status
ORDER BY adet DESC
LIMIT 15;
SQL

echo ""
echo "=== Supabase Backup Notu ==="
echo "Dashboard kontrol adresi:"
echo "  https://supabase.com/dashboard/project/_/database/backups"
echo ""
echo "PITR (Point-in-Time Recovery) aktif olmalı. Pro plan gerektirir."
echo ""
echo "=== Restore Runbook ==="
cat << 'RUNBOOK'
1. Supabase Dashboard → Database → Backups → Restore to point
   - Hedef: olaydan 5 dk önce
   - Yeni proje oluşturulur (mevcut proje bozulmaz)

2. Yeni connection string al:
   - DATABASE_URL ve DIRECT_URL güncelle
   - pm2 restart all

3. Storage (R2/S3) etkilenmez — sadece DB pointer'ları restore edilir.

4. Orphan kontrolü çalıştır:
   bash scripts/backup-check.sh

5. Smoke test:
   npm run smoke:prod
RUNBOOK

echo "✅ Kontrol tamamlandı"
