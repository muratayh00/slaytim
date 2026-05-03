const crypto = require('crypto');
const { AUTH_COOKIE_NAME, parseCookieHeader } = require('./auth');

const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'slaytim_csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const normalizeSameSite = (value) => {
  const v = String(value || 'lax').trim().toLowerCase();
  if (v === 'strict' || v === 'none') return v;
  return 'lax';
};

const normalizeCookieDomain = (rawDomain) => {
  const domain = String(rawDomain || '').trim().toLowerCase();
  if (!domain || domain === 'localhost') return undefined;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return undefined;
  return domain;
};

const isSecureRequest = (req) => {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  return Boolean(req.secure || forwardedProto === 'https');
};

const getCsrfCookieOptions = (req) => {
  const isProd = process.env.NODE_ENV === 'production';
  const domain = normalizeCookieDomain(process.env.AUTH_COOKIE_DOMAIN);
  let sameSite = normalizeSameSite(process.env.AUTH_COOKIE_SAME_SITE);

  let secure;
  if (process.env.AUTH_COOKIE_SECURE === 'true') secure = true;
  else if (process.env.AUTH_COOKIE_SECURE === 'false') secure = false;
  else secure = isProd ? isSecureRequest(req) : false;

  if (sameSite === 'none' && !secure) sameSite = 'lax';

  return {
    httpOnly: false,
    sameSite,
    secure,
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
    ...(domain ? { domain } : {}),
  };
};

const readCookies = (req) => parseCookieHeader(req.headers.cookie || '');

const ensureCsrfToken = (req, res) => {
  const cookies = readCookies(req);
  const token = cookies[CSRF_COOKIE_NAME] || crypto.randomBytes(24).toString('hex');
  if (!cookies[CSRF_COOKIE_NAME] && typeof res.cookie === 'function') {
    res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions(req));
  }
  return token;
};

const shouldBypass = (req) => {
  const path = req.path || '';
  const authBypassPaths = new Set([
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/csrf',
    '/api/analytics/batch',
    '/api/analytics/session-snapshot',
    '/api/analytics/event',          // realtime tracker — no CSRF token in sendBeacon
    '/api/analytics/preview-metric', // sendBeacon, no token
    '/api/recommendation/events',
  ]);
  return authBypassPaths.has(path);
};

const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (shouldBypass(req)) return next();

  const cookies = readCookies(req);
  const hasAuthCookie = Boolean(cookies[AUTH_COOKIE_NAME]);
  if (!hasAuthCookie) return next();

  const cookieToken = cookies[CSRF_COOKIE_NAME];
  const headerToken =
    req.headers['x-csrf-token'] ||
    req.headers['x-xsrf-token'] ||
    req.body?._csrf;

  if (!cookieToken || !headerToken || String(cookieToken) !== String(headerToken)) {
    return res.status(403).json({ error: 'CSRF token mismatch' });
  }
  return next();
};

module.exports = {
  CSRF_COOKIE_NAME,
  ensureCsrfToken,
  csrfProtection,
};
