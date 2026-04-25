const { Router } = require('express');
const { register, login, logout, me, forgotPassword, resetPassword, getCsrfToken } = require('../controllers/auth.controller');
const { optionalAuth } = require('../middleware/auth');

const router = Router();

// Timeout guard for login/register — DB slowness should not cause 30s hangs.
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

router.post('/register', authTimeout, register);
router.post('/login', authTimeout, login);
router.post('/logout', logout);
router.get('/me', optionalAuth, me);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/csrf', getCsrfToken);

module.exports = router;
