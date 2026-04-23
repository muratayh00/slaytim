#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/root/slaytim}"
CLIENT_DIR="$APP_ROOT/client"
SERVER_DIR="$APP_ROOT/server"

echo "[1/7] Pull latest code"
cd "$APP_ROOT"
git fetch --all
git checkout main
git pull --ff-only

echo "[preflight] Validate AdSense publisher id"
if [[ -z "${NEXT_PUBLIC_ADSENSE_ID:-}" ]]; then
  echo "ERROR: NEXT_PUBLIC_ADSENSE_ID is missing. Refusing production deploy."
  exit 1
fi
if [[ "${NEXT_PUBLIC_ADSENSE_ID}" == *"XXXXXXXXXXXXXXXX"* ]]; then
  echo "ERROR: NEXT_PUBLIC_ADSENSE_ID placeholder detected. Refusing production deploy."
  exit 1
fi

echo "[2/7] Install + build client"
cd "$CLIENT_DIR"
npm ci
npm run build

echo "[3/7] Install server dependencies"
cd "$SERVER_DIR"
npm ci

echo "[4/7] Prisma generate + migrate deploy"
npx prisma generate
npx prisma migrate deploy

echo "[5/7] Restart PM2 processes"
pm2 restart slaytim-api
pm2 restart slaytim-worker
pm2 restart worker-preview
pm2 save

echo "[6/7] Health checks"
curl -fsS https://www.slaytim.com/robots.txt >/dev/null
curl -fsS https://www.slaytim.com/sitemap.xml >/dev/null
curl -fsS https://www.slaytim.com/ads.txt >/dev/null
curl -fsS https://api.slaytim.com/api/health >/dev/null

echo "[7/7] SEO smoke test"
cd "$CLIENT_DIR"
npm run seo:test

echo "Deploy completed safely."
