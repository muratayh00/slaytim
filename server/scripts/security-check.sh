#!/bin/bash
# security-check.sh
# Temel güvenlik konfigürasyon denetimi.
# Kullanım: bash scripts/security-check.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${SERVER_DIR}/.env"

echo "=== Güvenlik Denetimi ==="
echo "Tarih: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

ALL_OK=true

warn() { echo "  ⚠️  $1"; ALL_OK=false; }
ok()   { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; ALL_OK=false; }
info() { echo "  ℹ️  $1"; }

# ── 1. .env Dosyası ───────────────────────────────────────────────────────────
echo "--- .env Dosyası ---"
if [ ! -f "$ENV_FILE" ]; then
  warn ".env dosyası bulunamadı: ${ENV_FILE}"
else
  ok ".env mevcut"

  # .env izinleri — 600 veya 640 olmalı
  PERM=$(stat -c "%a" "$ENV_FILE" 2>/dev/null || stat -f "%OLp" "$ENV_FILE" 2>/dev/null || echo "unknown")
  if [ "$PERM" = "600" ] || [ "$PERM" = "640" ]; then
    ok ".env izinleri: ${PERM}"
  else
    warn ".env izinleri geniş: ${PERM} (öneri: chmod 600 .env)"
  fi

  check_var() {
    local var="$1"
    local min_len="${2:-20}"
    local val
    val=$(grep "^${var}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || true)
    if [ -z "$val" ]; then
      fail "${var} tanımlı değil"
    elif [ "${#val}" -lt "$min_len" ]; then
      warn "${var} çok kısa (${#val} karakter, min ${min_len} önerilir)"
    else
      ok "${var} mevcut ve yeterli uzunlukta"
    fi
  }

  check_var "JWT_SECRET" 32
  check_var "SESSION_SECRET" 32 2>/dev/null || true
  check_var "DATABASE_URL" 10

  # Default/placeholder değer kontrolü
  DANGEROUS_VALS=("your-secret" "changeme" "password123" "secret123" "12345" "development" "test123")
  for val in "${DANGEROUS_VALS[@]}"; do
    if grep -qi "=${val}" "$ENV_FILE" 2>/dev/null; then
      fail "Tehlikeli placeholder değer tespit edildi: '${val}'"
    fi
  done
  ok "Placeholder değer kontrolü temiz"
fi
echo ""

# ── 2. Kritik Dosyaların Git'e Eklenmemesi ───────────────────────────────────
echo "--- .gitignore Kontrolü ---"
GITIGNORE="${SERVER_DIR}/.gitignore"
ROOT_GITIGNORE="${SERVER_DIR}/../.gitignore"

check_gitignore() {
  local file="$1"
  local pattern="$2"
  if [ -f "$file" ] && grep -q "$pattern" "$file" 2>/dev/null; then
    ok "${pattern} .gitignore'da var"
  else
    warn "${pattern} .gitignore'da yok! (git'e eklenebilir)"
  fi
}

for gi in "$GITIGNORE" "$ROOT_GITIGNORE"; do
  if [ -f "$gi" ]; then
    check_gitignore "$gi" "\.env"
    check_gitignore "$gi" "node_modules"
    check_gitignore "$gi" "uploads"
    break
  fi
done

# .env git tracked mi?
if command -v git &>/dev/null && [ -d "${SERVER_DIR}/../.git" ]; then
  if git -C "${SERVER_DIR}" ls-files --error-unmatch .env &>/dev/null 2>&1; then
    fail ".env dosyası git'e eklenmiş! → git rm --cached .env"
  else
    ok ".env git'e eklenmemiş"
  fi
fi
echo ""

# ── 3. Açık Port Kontrolü ─────────────────────────────────────────────────────
echo "--- Port Kontrolü ---"
if command -v ss &>/dev/null; then
  LISTENING=$(ss -tlnp 2>/dev/null | grep LISTEN || true)
  # Redis normalde sadece localhost'ta dinlemeli
  if echo "$LISTENING" | grep -q "6379" && ! echo "$LISTENING" | grep "6379" | grep -q "127.0.0.1"; then
    warn "Redis (6379) dışarıya açık görünüyor — sadece localhost'ta olmalı"
  elif echo "$LISTENING" | grep -q "6379"; then
    ok "Redis (6379) yalnızca localhost'ta"
  fi

  # DB portu dışarıya açık mı?
  if echo "$LISTENING" | grep -q ":5432" && ! echo "$LISTENING" | grep ":5432" | grep -q "127.0.0.1"; then
    warn "PostgreSQL (5432) dışarıya açık — Firewall kontrolü yapın"
  fi
else
  info "ss komutu yok — port kontrolü atlandı"
fi
echo ""

# ── 4. npm Güvenlik Taraması ──────────────────────────────────────────────────
echo "--- npm Audit (hızlı) ---"
if command -v npm &>/dev/null; then
  cd "${SERVER_DIR}"
  # Sadece kritik/yüksek açıkları listele
  AUDIT_OUT=$(npm audit --audit-level=high --json 2>/dev/null || true)
  if [ -z "$AUDIT_OUT" ]; then
    info "npm audit çalıştırılamadı"
  else
    CRITICAL=$(echo "$AUDIT_OUT" | node -e "
      let d=''; process.stdin.on('data',c=>d+=c);
      process.stdin.on('end',()=>{
        try { const j=JSON.parse(d); console.log((j.metadata?.vulnerabilities?.critical||0)+' kritik, '+(j.metadata?.vulnerabilities?.high||0)+' yüksek'); }
        catch { console.log('parse hatası'); }
      });
    " 2>/dev/null || echo "bilinmiyor")
    if echo "$CRITICAL" | grep -q "^0 kritik, 0 yüksek"; then
      ok "npm audit: Kritik/Yüksek açık yok (${CRITICAL})"
    else
      warn "npm audit: ${CRITICAL} açık tespit edildi → npm audit fix"
    fi
  fi
else
  info "npm bulunamadı — audit atlandı"
fi
echo ""

# ── 5. uploads/ Dizin İzinleri ────────────────────────────────────────────────
echo "--- Uploads Dizini ---"
UPLOADS_DIR="${SERVER_DIR}/uploads"
if [ -d "$UPLOADS_DIR" ]; then
  # Yürütme izni olan dosya var mı?
  EXEC_FILES=$(find "$UPLOADS_DIR" -type f -perm /111 2>/dev/null | head -5 || true)
  if [ -n "$EXEC_FILES" ]; then
    warn "Yürütme izinli dosya(lar) tespit edildi:"
    echo "$EXEC_FILES"
    warn "  Düzeltmek için: find uploads/ -type f -chmod -x"
  else
    ok "uploads/ içinde yürütme izinli dosya yok"
  fi

  # .php, .sh, .py gibi tehlikeli uzantılar var mı?
  DANGEROUS_EXT=$(find "$UPLOADS_DIR" -type f \( -name "*.php" -o -name "*.sh" -o -name "*.py" -o -name "*.rb" -o -name "*.pl" \) 2>/dev/null | head -5 || true)
  if [ -n "$DANGEROUS_EXT" ]; then
    fail "Tehlikeli dosya uzantısı tespit edildi:"
    echo "$DANGEROUS_EXT"
  else
    ok "Tehlikeli dosya uzantısı yok"
  fi
else
  info "uploads/ dizini yok — kontrol atlandı"
fi
echo ""

# ── Sonuç ─────────────────────────────────────────────────────────────────────
if [ "$ALL_OK" = "true" ]; then
  echo "✅ Güvenlik denetimi tamamlandı — kritik sorun yok"
  exit 0
else
  echo "⚠️  Güvenlik denetimi tamamlandı — yukarıdaki sorunları gider"
  exit 1
fi
