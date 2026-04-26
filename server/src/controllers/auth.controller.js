const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { awardBadge, checkBadges } = require('../services/badge.service');
const { sendMail, verifyEmailHtml, resetPasswordHtml, magicLinkHtml } = require('../services/mail.service');
const { AUTH_COOKIE_NAME } = require('../middleware/auth');
const { ensureCsrfToken } = require('../middleware/csrf');
const logger = require('../lib/logger');

// ─── Token TTLs ───────────────────────────────────────────────────────────────

const TTL = {
  verify: 24 * 60 * 60 * 1000,  // 24 hours
  reset:  30 * 60 * 1000,        // 30 minutes
  magic:  15 * 60 * 1000,        // 15 minutes
};

const RESEND_COOLDOWN_MS = 60 * 1000; // 60 s between resends (same type, same user)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

const generateJwt = (user) =>
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

const getSiteUrl = () =>
  process.env.SITE_URL ||
  (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('SITE_URL env var is required in production'); })()
    : 'http://localhost:3000');

/**
 * Issue a new AuthToken for a user.
 * Deletes all existing tokens of the same type for this user first (single active token per type).
 * Returns the raw (unhashed) token to be sent to the user.
 */
async function issueAuthToken(userId, type) {
  const raw = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + TTL[type]);

  // Replace any existing tokens of this type for this user
  await prisma.authToken.deleteMany({ where: { userId, type } });
  await prisma.authToken.create({ data: { userId, tokenHash, type, expiresAt } });

  return raw;
}

/**
 * Check whether a user is still on cooldown for sending a given token type.
 * Looks for any token of this type created within RESEND_COOLDOWN_MS.
 */
async function isOnCooldown(userId, type) {
  const since = new Date(Date.now() - RESEND_COOLDOWN_MS);
  const recent = await prisma.authToken.findFirst({
    where: { userId, type, createdAt: { gte: since } },
  });
  return !!recent;
}

/**
 * Resolve and validate a raw token from the request.
 * Returns the AuthToken record or null.
 */
async function resolveToken(rawToken, type) {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const record = await prisma.authToken.findUnique({ where: { tokenHash } });
  if (!record) return null;
  if (record.type !== type) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;
  return record;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

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

    const token = generateJwt(user);

    checkBadges(user.id).catch(() => {});
    awardBadge(user.id, 'first_step').catch(() => {});
    const regHour = new Date().getHours();
    if (regHour >= 0 && regHour < 5) {
      awardBadge(user.id, 'hidden_night_owl').catch(() => {});
    }

    // Send email verification (fire-and-forget — don't block registration)
    issueAuthToken(user.id, 'verify')
      .then((rawToken) => {
        const verifyUrl = `${getSiteUrl()}/verify-email/${rawToken}`;
        return sendMail({
          to: user.email,
          subject: 'Slaytim - E-posta Adresini Doğrula',
          html: verifyEmailHtml(verifyUrl),
        });
      })
      .catch((err) => logger.warn('[mail] Verification email not sent after register', { error: err.message }));

    setAuthCookie(req, res, token);
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin,
        emailVerifiedAt: user.emailVerifiedAt ?? null,
      },
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

    const token = generateJwt(user);
    setAuthCookie(req, res, token);
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin,
        emailVerifiedAt: user.emailVerifiedAt ?? null,
      },
    });
  } catch (err) {
    if (err.isPrismaTimeout) {
      logger.warn('Login: DB query timed out');
      return res.status(503).json({ error: 'Sunucu meşgul, lütfen tekrar deneyin.' });
    }
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
      select: {
        id: true, username: true, email: true, avatarUrl: true,
        bio: true, createdAt: true, isAdmin: true, emailVerifiedAt: true,
      },
    });
    if (!user) return res.json({ authenticated: false, user: null });
    return res.json({ authenticated: true, user });
  } catch (err) {
    logger.error('Failed to fetch user (me)', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// ─── Email Verification ────────────────────────────────────────────────────────

/**
 * POST /auth/send-verification
 * Requires authentication. Sends (or resends) a verification email.
 */
const sendVerificationEmail = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Giriş yapmalısın' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    if (user.emailVerifiedAt) {
      return res.status(400).json({ error: 'E-posta adresin zaten doğrulanmış' });
    }

    // Cooldown check: don't allow resend if one was issued in the last 60s
    if (await isOnCooldown(userId, 'verify')) {
      return res.status(429).json({ error: 'Lütfen bir dakika bekleyip tekrar dene' });
    }

    const rawToken = await issueAuthToken(userId, 'verify');
    const verifyUrl = `${getSiteUrl()}/verify-email/${rawToken}`;

    sendMail({
      to: user.email,
      subject: 'Slaytim - E-posta Adresini Doğrula',
      html: verifyEmailHtml(verifyUrl),
    }).catch((err) => logger.error('[mail] Verify email send failed', { error: err.message }));

    return res.json({ message: 'Doğrulama e-postası gönderildi' });
  } catch (err) {
    logger.error('sendVerificationEmail failed', { error: err.message });
    return res.status(500).json({ error: 'İşlem başarısız' });
  }
};

/**
 * GET /auth/verify-email/:token
 * Verifies the user's email address.
 */
const verifyEmail = async (req, res) => {
  try {
    const rawToken = req.params.token;
    const record = await resolveToken(rawToken, 'verify');

    if (!record) {
      return res.status(400).json({ error: 'Link geçersiz veya süresi dolmuş' });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      prisma.authToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return res.json({ message: 'E-posta adresin doğrulandı' });
  } catch (err) {
    logger.error('verifyEmail failed', { error: err.message });
    return res.status(500).json({ error: 'İşlem başarısız' });
  }
};

// ─── Forgot Password / Reset Password ─────────────────────────────────────────

/**
 * POST /auth/forgot-password
 * Always returns the same response to prevent user enumeration.
 */
const forgotPassword = async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'E-posta gerekli' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      // Cooldown: one reset email per 60s
      if (!(await isOnCooldown(user.id, 'reset'))) {
        const rawToken = await issueAuthToken(user.id, 'reset');
        const resetUrl = `${getSiteUrl()}/reset-password/${rawToken}`;
        sendMail({
          to: user.email,
          subject: 'Slaytim - Şifre Sıfırlama',
          html: resetPasswordHtml(resetUrl),
        }).catch((err) => logger.error('[mail] Reset password email failed', { error: err.message }));
      } else {
        logger.info('[auth] forgotPassword cooldown active', { userId: user.id });
      }
    }

    // Always return same message (prevent email enumeration)
    return res.json({ message: 'Eğer bu e-posta kayıtlıysa, sıfırlama bağlantısı gönderildi.' });
  } catch (err) {
    logger.error('forgotPassword failed', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'İşlem başarısız' });
  }
};

/**
 * POST /auth/reset-password
 * Consumes an AuthToken of type 'reset' and updates the user's password.
 */
const resetPassword = async (req, res) => {
  try {
    const { token: rawToken, password } = req.body;
    if (!rawToken || !password) return res.status(400).json({ error: 'Token ve şifre gerekli' });
    if (password.length < 8) return res.status(400).json({ error: 'Şifre en az 8 karakter olmalı' });

    const record = await resolveToken(rawToken, 'reset');
    if (!record) {
      return res.status(400).json({ error: 'Link geçersiz veya süresi dolmuş' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    return res.json({ message: 'Şifren güncellendi. Giriş yapabilirsin.' });
  } catch (err) {
    logger.error('resetPassword failed', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'İşlem başarısız' });
  }
};

// ─── Magic Link Login ──────────────────────────────────────────────────────────

/**
 * POST /auth/magic-link
 * Sends a magic link to the given email address.
 * Only works for existing accounts (prevents account creation via magic link).
 * Always returns the same response to prevent email enumeration.
 */
const sendMagicLink = async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'E-posta gerekli' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Geçersiz e-posta' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.isBanned) {
      if (!(await isOnCooldown(user.id, 'magic'))) {
        const rawToken = await issueAuthToken(user.id, 'magic');
        const magicUrl = `${getSiteUrl()}/magic/${rawToken}`;
        sendMail({
          to: user.email,
          subject: "Slaytim - Giriş Bağlantısı",
          html: magicLinkHtml(magicUrl),
        }).catch((err) => logger.error('[mail] Magic link email failed', { error: err.message }));
      } else {
        logger.info('[auth] magic-link cooldown active', { userId: user.id });
      }
    }

    // Always return same message (prevent email enumeration)
    return res.json({ message: 'Eğer bu e-posta kayıtlıysa, giriş bağlantısı gönderildi.' });
  } catch (err) {
    logger.error('sendMagicLink failed', { error: err.message });
    return res.status(500).json({ error: 'İşlem başarısız' });
  }
};

/**
 * POST /auth/magic/:token
 * Validates the magic link token and logs the user in.
 */
const loginWithMagicLink = async (req, res) => {
  try {
    const rawToken = req.params.token;
    const record = await resolveToken(rawToken, 'magic');

    if (!record) {
      return res.status(400).json({ error: 'Link geçersiz veya süresi dolmuş' });
    }

    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    if (!user || user.isBanned) {
      return res.status(403).json({ error: 'Hesap kullanılamıyor' });
    }

    // Consume the token
    await prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });

    // If email not yet verified, mark it verified (magic link proves email ownership)
    if (!user.emailVerifiedAt) {
      await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    }

    const token = generateJwt(user);
    setAuthCookie(req, res, token);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      },
    });
  } catch (err) {
    logger.error('loginWithMagicLink failed', { error: err.message });
    return res.status(500).json({ error: 'İşlem başarısız' });
  }
};

// ─── CSRF ─────────────────────────────────────────────────────────────────────

const getCsrfToken = async (req, res) => {
  const token = ensureCsrfToken(req, res);
  return res.json({ csrfToken: token });
};

module.exports = {
  register,
  login,
  logout,
  me,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  sendMagicLink,
  loginWithMagicLink,
  getCsrfToken,
};
