const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { awardBadge, checkBadges } = require('../services/badge.service');
const { sendMail, resetPasswordHtml } = require('../services/mail.service');
const { AUTH_COOKIE_NAME } = require('../middleware/auth');
const { ensureCsrfToken } = require('../middleware/csrf');
const logger = require('../lib/logger');

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );

const normalizeSameSite = (value) => {
  const v = String(value || 'lax').trim().toLowerCase();
  if (v === 'strict' || v === 'none') return v;
  return 'lax';
};

const normalizeCookieDomain = (rawDomain) => {
  const domain = String(rawDomain || '').trim().toLowerCase();
  if (!domain) return undefined;
  if (domain === 'localhost') return undefined;
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

const getCookieOptions = (req) => {
  const isProd = process.env.NODE_ENV === 'production';
  const domain = normalizeCookieDomain(process.env.AUTH_COOKIE_DOMAIN);
  let sameSite = normalizeSameSite(process.env.AUTH_COOKIE_SAME_SITE);

  let secure;
  if (process.env.AUTH_COOKIE_SECURE === 'true') secure = true;
  else if (process.env.AUTH_COOKIE_SECURE === 'false') secure = false;
  else secure = isProd ? isSecureRequest(req) : false;

  // Browsers reject SameSite=None without Secure.
  if (sameSite === 'none' && !secure) sameSite = 'lax';

  return {
    httpOnly: true,
    sameSite,
    secure,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    ...(domain ? { domain } : {}),
  };
};

const setAuthCookie = (req, res, token) => {
  if (typeof res.cookie === 'function') {
    res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions(req));
  }
};

const clearAuthCookie = (req, res) => {
  if (typeof res.clearCookie === 'function') {
    res.clearCookie(AUTH_COOKIE_NAME, {
      ...getCookieOptions(req),
      maxAge: undefined,
    });
  }
};

const register = async (req, res) => {
  try {
    const { username, password } = req.body;
    const email = (req.body.email || '').trim().toLowerCase();

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, email, passwordHash },
    });

    const token = generateToken(user);

    checkBadges(user.id).catch(() => {});
    awardBadge(user.id, 'first_step').catch(() => {});
    const regHour = new Date().getHours();
    if (regHour >= 0 && regHour < 5) {
      awardBadge(user.id, 'hidden_night_owl').catch(() => {});
    }

    setAuthCookie(req, res, token);
    return res.status(201).json({
      token,
      user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl, isAdmin: user.isAdmin },
    });
  } catch (err) {
    logger.error('Registration failed', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = (req.body.email || '').trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.isBanned) return res.status(403).json({ error: 'Hesabınız askıya alındı' });

    const token = generateToken(user);
    setAuthCookie(req, res, token);
    return res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl, isAdmin: user.isAdmin },
    });
  } catch (err) {
    logger.error('Login failed', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Login failed' });
  }
};

const logout = async (req, res) => {
  clearAuthCookie(req, res);
  return res.json({ success: true });
};

const me = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.json({ authenticated: false, user: null });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, avatarUrl: true, bio: true, createdAt: true, isAdmin: true },
    });
    if (!user) return res.json({ authenticated: false, user: null });
    return res.json({ authenticated: true, user });
  } catch (err) {
    logger.error('Failed to fetch user (me)', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-posta gerekli' });

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (user) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } });
      const siteUrl = process.env.SITE_URL ||
        (process.env.NODE_ENV === 'production'
          ? (() => { throw new Error('SITE_URL env var is required in production'); })()
          : 'http://localhost:3000');
      const resetUrl = `${siteUrl}/reset-password/${token}`;
      sendMail({
        to: user.email,
        subject: 'Slaytim - Şifre Sıfırlama',
        html: resetPasswordHtml(resetUrl),
      }).catch((err) => logger.error('[mail] Şifre sıfırlama e-postası gönderilemedi', { error: err.message }));
    }

    res.json({ message: 'Eğer bu e-posta kayıtlıysa, sıfırlama bağlantısı gönderildi.' });
  } catch (err) {
    logger.error('forgotPassword failed', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'İşlem başarısız' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token ve şifre gerekli' });
    if (password.length < 8) return res.status(400).json({ error: 'Şifre en az 8 karakter olmalı' });

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Link geçersiz veya süresi dolmuş' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });

    res.json({ message: 'Şifren güncellendi. Giriş yapabilirsin.' });
  } catch (err) {
    logger.error('resetPassword failed', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'İşlem başarısız' });
  }
};

const getCsrfToken = async (req, res) => {
  const token = ensureCsrfToken(req, res);
  return res.json({ csrfToken: token });
};

module.exports = { register, login, logout, me, forgotPassword, resetPassword, getCsrfToken };

