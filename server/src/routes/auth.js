const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const {
  register, login, logout, me, forgotPassword, resetPassword,
  sendVerificationEmail, verifyEmail, sendMagicLink, loginWithMagicLink,
  loginWithMagicCode, getCsrfToken,
} = require('../controllers/auth.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = Router();

// ─── Timeout guard ────────────────────────────────────────────────────────────
// Prevents 30s hangs when DB is slow.

const authTimeout = (req, res, next) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({ error: 'Sunucu meşgul, lütfen tekrar deneyin.' });
    }
  }, 9000);
  res.on('finish', () => clearTimeout(timer));
  res.on('close', () => clearTimeout(timer));
  next();
};

// ─── Rate limiters ────────────────────────────────────────────────────────────

// Strict: email-sending endpoints (forgot-password, magic-link, resend verify)
// 5 requests per 15 minutes per IP — prevents brute-force email flooding.
const emailSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek. Lütfen 15 dakika bekleyip tekrar dene.' },
});

// Token consumption endpoints (verify-email, magic-login, reset-password)
// 10 per 15 minutes per IP — prevents token brute-force.
const tokenConsumeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek. Lütfen bekle.' },
});

// OTP code endpoint — tightest limiter (10 wrong guesses per 15 min per IP).
// Per-token attempt counter (MAX_CODE_ATTEMPTS=5) provides secondary layer.
const magicCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla yanlış deneme. Lütfen bekle.' },
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// Standard auth
router.post('/register', authTimeout, register);
router.post('/login', authTimeout, login);
router.post('/logout', logout);
router.get('/me', optionalAuth, me);
router.get('/csrf', getCsrfToken);

// Password reset
router.post('/forgot-password', emailSendLimiter, forgotPassword);
router.post('/reset-password', tokenConsumeLimiter, resetPassword);

// Email verification
router.post('/send-verification', emailSendLimiter, authenticate, sendVerificationEmail);
router.get('/verify-email/:token', tokenConsumeLimiter, verifyEmail);

// Magic-link login
router.post('/magic-link', emailSendLimiter, sendMagicLink);
router.post('/magic/:token', tokenConsumeLimiter, loginWithMagicLink);
router.post('/magic-code',  magicCodeLimiter,  loginWithMagicCode);

module.exports = router;
