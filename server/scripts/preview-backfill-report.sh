#!/bin/bash
# preview-backfill-report.sh
# Preview üretim durumunu raporlar.
# Kullanım: bash scripts/preview-backfill-report.sh
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "⚠️  DATABASE_URL tanımlı değil."
  exit 1
fi

echo "=== Preview Backfill Raporu — $(date '+%Y-%m-%d %H:%M') ==="
echo ""

psql "$DATABASE_URL" << 'SQL'
-- Genel durum
SELECT
  preview_status                          AS "Preview Durumu",
  COUNT(*)                                AS "Sayı",
  AVG(views_count)::int                   AS "Ort. Görüntülenme",
  MAX(views_count)                        AS "Maks. Görüntülenme",
  MIN(preview_generated_at)::date         AS "İlk Üretim",
  MAX(preview_generated_at)::date         AS "Son Üretim"
FROM slides
WHERE conversion_status = 'done'
  AND deleted_at IS NULL
GROUP BY preview_status
ORDER BY "Sayı" DESC;

-- En çok görüntülenen preview'sız 10 slide
SELECT
  id                                      AS "ID",
  LEFT(title, 40)                         AS "Başlık",
  views_count                             AS "Görüntülenme",
  preview_status                          AS "Durum",
  created_at::date                        AS "Oluşturma"
FROM slides
WHERE conversion_status = 'done'
  AND preview_status != 'ready'
  AND deleted_at IS NULL
ORDER BY views_count DESC
LIMIT 10;

-- Toplam asset sayısı
SELECT
  COUNT(*)                                AS "Toplam Preview Asset",
  COUNT(DISTINCT slide_id)               AS "Benzersiz Slide",
  AVG(file_size_bytes)::int / 1024       AS "Ort. Boyut (KB)",
  SUM(file_size_bytes) / 1024 / 1024     AS "Toplam Boyut (MB)"
FROM slide_preview_assets;
SQL

echo ""
echo "=== İşlem Komutları ==="
echo "Tüm eksik preview'ları kuyruğa al:"
echo "  cd server && npm run preview:backfill"
echo ""
echo "Sadece top-100 yüksek trafikli:"
echo "  cd server && npm run preview:backfill:top"
echo ""
echo "Dry-run (önizleme):"
echo "  cd server && npm run preview:backfill:dry"
