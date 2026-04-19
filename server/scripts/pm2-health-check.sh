#!/bin/bash
# pm2-health-check.sh
# Tüm gerekli PM2 süreçlerinin online olduğunu doğrular.
# Kullanım: bash scripts/pm2-health-check.sh
set -euo pipefail

REQUIRED_APPS=("slaytim-api" "slaytim-worker" "worker-preview")
ALL_OK=true

echo "=== PM2 Süreç Kontrolü ==="
for app in "${REQUIRED_APPS[@]}"; do
  STATUS=$(pm2 jlist 2>/dev/null | node -e "
    let data = '';
    process.stdin.on('data', d => data += d);
    process.stdin.on('end', () => {
      try {
        const list = JSON.parse(data);
        const a = list.find(p => p.name === '${app}');
        console.log(a ? a.pm2_env.status : 'NOT_FOUND');
      } catch { console.log('PARSE_ERROR'); }
    });
  " 2>/dev/null || echo "ERROR")

  if [ "$STATUS" = "online" ]; then
    echo "  ✅ ${app} → online"
  else
    echo "  ❌ ${app} → ${STATUS}"
    ALL_OK=false
  fi
done

echo ""
echo "=== PM2 Startup Kayıt Kontrolü ==="
if pm2 list 2>/dev/null | grep -q "online"; then
  DUMP_FILE="${HOME}/.pm2/dump.pm2"
  if [ -f "$DUMP_FILE" ]; then
    echo "  ✅ pm2 dump mevcut ($(date -r "$DUMP_FILE" '+%Y-%m-%d %H:%M' 2>/dev/null || echo 'tarih alınamadı'))"
  else
    echo "  ⚠️  pm2 dump.pm2 bulunamadı — çalıştır: pm2 save"
    ALL_OK=false
  fi
else
  echo "  ⚠️  pm2 list çıktısı boş"
  ALL_OK=false
fi

echo ""
if [ "$ALL_OK" = "true" ]; then
  echo "✅ Tüm PM2 süreçleri çalışıyor"
  exit 0
else
  echo "❌ Bazı süreçler eksik veya çökmüş"
  echo ""
  echo "Düzeltme:"
  echo "  pm2 start ecosystem.config.js --env production"
  echo "  pm2 save"
  echo "  pm2 startup  # verilen komutu root ile çalıştır"
  exit 1
fi
