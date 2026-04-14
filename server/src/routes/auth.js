const { Router } = require('express');
const { register, login, logout, me, forgotPassword, resetPassword, getCsrfToken } = require('../controllers/auth.controller');
const { optionalAuth } = require('../middleware/auth');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', optionalAuth, me);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/csrf', getCsrfToken);

module.exports = router;
