const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { optionalAuth } = require('../middleware/auth');
const { ingestContentEvent } = require('../controllers/events.controller');

const router = Router();

const eventLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Cok fazla event gonderildi. Lutfen tekrar deneyin.' },
});

router.post('/content', optionalAuth, eventLimiter, ingestContentEvent);

module.exports = router;
