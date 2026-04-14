const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'slaytim_auth';

const AUTH_USER_SELECT = {
  id: true,
  username: true,
  email: true,
  isAdmin: true,
  role: true,
  isBanned: true,
  isMuted: true,
};

const parseCookieHeader = (cookieHeader = '') => {
  const out = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return out;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(value || '');
  }
  return out;
};

const getTokenFromCookieHeader = (cookieHeader) => {
  const cookies = parseCookieHeader(cookieHeader || '');
  return cookies[AUTH_COOKIE_NAME] || null;
};

const getTokenFromRequest = (req) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.split(' ')[1];
  }
  return getTokenFromCookieHeader(req.headers.cookie);
};

const resolveUserFromToken = async (token) => {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  if (!payload?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: Number(payload.id) },
    select: AUTH_USER_SELECT,
  });

  if (!user || user.isBanned) return null;
  return user;
};

const authenticate = async (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = await resolveUserFromToken(token);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const optionalAuth = async (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) return next();
  try {
    const user = await resolveUserFromToken(token);
    if (user) req.user = user;
  } catch {}
  return next();
};

module.exports = {
  AUTH_COOKIE_NAME,
  parseCookieHeader,
  getTokenFromCookieHeader,
  getTokenFromRequest,
  authenticate,
  optionalAuth,
  resolveUserFromToken,
};
