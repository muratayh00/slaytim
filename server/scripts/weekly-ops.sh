#!/bin/bash
# weekly-ops.sh
# Haftalık operasyonel rutin — her Pazartesi çalıştır.
# Kullanım: bash scripts/weekly-ops.sh
# Öneri: crontab -e  →  0 9 * * 1 cd /path/to/server && bash scripts/weekly-ops.sh >> logs/weekly-ops.log 2>&1
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${SERVER_DIR}/logs/weekly-ops-$(date '+%Y%m%d').log"
mkdir -p "$(dirname "$LOG_FILE")"

echo "=== Haftalık Operasyon Raporu ==="
echo "Tarih   : $(date '+%Y-%m-%d %H:%M:%S')"
echo "Sunucu  : $(hostname)"
echo "Log     : $LOG_FILE"
echo ""

# ── 1. PM2 Sağlık Kontrolü ────────────────────────────────────────────────────
echo "--- PM2 Süreç Sağlığı ---"
if command -v pm2 &>/dev/null; then
  bash "${SCRIPT_DIR}/pm2-health-check.sh" || echo "⚠️  PM2 sağlık sorunu var — yukarıdaki çıktıya bak"
else
  echo "⚠️  PM2 bulunamadı — kontrol atlandı"
fi
echo ""

# ── 2. Disk Kullanımı ─────────────────────────────────────────────────────────
echo "--- Disk Kullanımı ---"
df -h "${SERVER_DIR}" 2>/dev/null || df -h / 2>/dev/null || echo "  df komutu başarısız"
echo ""

# ── 3. Preview Backfill Raporu ────────────────────────────────────────────────
echo "--- Preview Durumu ---"
if [ -n "${DATABASE_URL:-}" ]; then
  bash "${SCRIPT_DIR}/preview-backfill-report.sh" 2>/dev/null || echo "⚠️  Preview raporu başarısız"
else
  echo "  DATABASE_URL tanımlı değil — preview raporu atlandı"
  echo "  Çalıştırmak için: source .env && bash scripts/weekly-ops.sh"
fi
echo ""

# ── 4. Backup & Tutarlılık Kontrolü ──────────────────────────────────────────
echo "--- Backup Kontrolü ---"
if [ -n "${DATABASE_URL:-}" ]; then
  bash "${SCRIPT_DIR}/backup-check.sh" 2>/dev/null | head -30 || echo "⚠️  Backup kontrol başarısız"
else
  echo "  DATABASE_URL tanımlı değil — backup kontrolü atlandı"
fi
echo ""

# ── 5. Log Boyutları ──────────────────────────────────────────────────────────
echo "--- Log Dosya Boyutları ---"
LOG_DIR="${SERVER_DIR}/logs"
if [ -d "$LOG_DIR" ]; then
  du -sh "${LOG_DIR}"/*.log 2>/dev/null | sort -rh | head -15 || echo "  Log dosyası yok"

  # 100 MB'tan büyük logları uyar
  LARGE_LOGS=$(find "$LOG_DIR" -name "*.log" -size +100M 2>/dev/null || true)
  if [ -n "$LARGE_LOGS" ]; then
    echo "  ⚠️  100 MB'tan büyük log dosyaları:"
    echo "$LARGE_LOGS"
  fi
else
  echo "  logs/ dizini yok"
fi
echo ""

# ── 6. Güvenlik Kontrolü (hızlı) ─────────────────────────────────────────────
echo "--- Güvenlik Özeti ---"
if [ -f "${SERVER_DIR}/.env" ]; then
  # .env dosyasındaki eksik kritik değişkenleri kontrol et
  REQUIRED_VARS=("JWT_SECRET" "DATABASE_URL" "SESSION_SECRET")
  for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${var}=" "${SERVER_DIR}/.env" 2>/dev/null; then
      echo "  ✅ ${var} mevcut"
    else
      echo "  ❌ ${var} eksik"
    fi
  done
else
  echo "  ⚠️  .env dosyası bulunamadı"
fi
echo ""

# ── 7. Node.js / PM2 Versiyonu ────────────────────────────────────────────────
echo "--- Versiyon Bilgisi ---"
echo "  Node.js : $(node --version 2>/dev/null || echo 'bulunamadı')"
echo "  npm     : $(npm --version 2>/dev/null || echo 'bulunamadı')"
echo "  PM2     : $(pm2 --version 2>/dev/null || echo 'bulunamadı')"
echo ""

# ── 8. Preview Backfill Tetikle (sadece ≥50 eksik varsa) ─────────────────────
if [ -n "${DATABASE_URL:-}" ] && [ -n "${AUTO_BACKFILL:-}" ]; then
  echo "--- Otomatik Backfill (AUTO_BACKFILL mod) ---"
  cd "${SERVER_DIR}"
  node scripts/backfill-preview-assets.js --dry-run 2>/dev/null | grep '^\[backfill\]' | head -3 || true
  echo ""
fi

echo "=== Haftalık rapor tamamlandı — $(date '+%Y-%m-%d %H:%M:%S') ==="
echo ""
echo "Önerilen aksiyon kontrol listesi:"
echo "  [ ] PM2 dump güncel mi? → pm2 save"
echo "  [ ] Disk %80+ dolu mu? → Log rotate / eski dosya sil"
echo "  [ ] Preview backfill tamamlandı mı? → npm run preview:backfill:top"
echo "  [ ] Supabase backup PITR aktif mi? → Dashboard > Database > Backups"
echo "  [ ] Hata loglarında kritik satır var mı? → pm2 logs --lines 200"
