function warn(msg) {
  // eslint-disable-next-line no-console
  console.warn(`[security-env] ${msg}`);
}

function fail(msg) {
  throw new Error(`[security-env] ${msg}`);
}

function parseAllowedOrigins() {
  return String(process.env.CLIENT_URL || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function validateSecurityEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const sameSite = String(process.env.AUTH_COOKIE_SAME_SITE || 'lax').toLowerCase();
  const secure = String(process.env.AUTH_COOKIE_SECURE || '').toLowerCase();
  const trustProxy = String(process.env.TRUST_PROXY || '').toLowerCase();

  if (sameSite === 'none' && secure !== 'true') {
    warn('AUTH_COOKIE_SAME_SITE=none iken AUTH_COOKIE_SECURE=true olmalidir.');
  }

  if (isProd && !(trustProxy === '1' || trustProxy === 'true')) {
    warn('Production ortaminda TRUST_PROXY=1 onerilir (reverse proxy/X-Forwarded-Proto icin).');
  }

  if (isProd && secure !== 'true') {
    warn('Production ortaminda AUTH_COOKIE_SECURE=true onerilir.');
  }

  if (isProd && !process.env.JWT_SECRET) {
    warn('JWT_SECRET tanimli degil.');
  }
}

function assertProductionReadiness() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) return;

  const secure = String(process.env.AUTH_COOKIE_SECURE || '').toLowerCase();
  const trustProxy = String(process.env.TRUST_PROXY || '').toLowerCase();
  const sameSite = String(process.env.AUTH_COOKIE_SAME_SITE || 'lax').toLowerCase();
  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  const allowedOrigins = parseAllowedOrigins();
  const redisEnabled = String(process.env.REDIS_ENABLED || '').toLowerCase();
  const localFallback = String(process.env.CONVERSION_LOCAL_FALLBACK || '').toLowerCase();
  const clamRequired = String(process.env.CLAMAV_REQUIRED || '').toLowerCase();
  const libreRequired = String(process.env.LIBREOFFICE_REQUIRED || '').toLowerCase();

  if (!jwtSecret || jwtSecret.length < 32) {
    fail('Production icin JWT_SECRET zorunlu ve en az 32 karakter olmali.');
  }

  // Reject known development placeholder values — they ship in .env.example
  const knownWeakPatterns = [
    /^slaytim.*secret/i,
    /^change[_-]?me/i,
    /^replace[_-]?with/i,
    /^your[_-]?secret/i,
    /^secret$/i,
    /^test$/i,
    /^dev$/i,
    /^placeholder/i,
  ];
  if (knownWeakPatterns.some((re) => re.test(jwtSecret))) {
    fail('JWT_SECRET degeri bilinen bir gelistirme placeholder\'i. Production icin gercek rastgele bir deger kullan.');
  }

  if (!(trustProxy === '1' || trustProxy === 'true')) {
    fail('Production icin TRUST_PROXY=1 zorunlu (reverse proxy + secure cookie dogrulamasi).');
  }

  if (secure !== 'true') {
    fail('Production icin AUTH_COOKIE_SECURE=true zorunlu.');
  }

  if (sameSite === 'none' && secure !== 'true') {
    fail('AUTH_COOKIE_SAME_SITE=none kullaniliyorsa AUTH_COOKIE_SECURE=true olmali.');
  }

  if (allowedOrigins.length === 0) {
    fail('Production icin CLIENT_URL zorunlu (izinli origin listesi bos olamaz).');
  }

  if (String(process.env.DATABASE_URL || '').includes('file:')) {
    fail('Production icin sqlite yerine PostgreSQL kullanin (DATABASE_URL postgres olmali).');
  }

  if (redisEnabled !== 'true') {
    fail('Production icin REDIS_ENABLED=true zorunlu. Fallback mode ile canliya cikmayin.');
  }

  if (localFallback === 'true') {
    fail('Production icin CONVERSION_LOCAL_FALLBACK=false zorunlu.');
  }

  if (clamRequired !== 'true') {
    fail('Production icin CLAMAV_REQUIRED=true zorunlu.');
  }

  if (libreRequired !== 'true') {
    fail('Production icin LIBREOFFICE_REQUIRED=true zorunlu.');
  }
}

module.exports = { validateSecurityEnv, assertProductionReadiness };
