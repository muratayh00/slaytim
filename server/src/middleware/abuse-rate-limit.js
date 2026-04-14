const rateLimit = require('express-rate-limit');

const skipLimiterForE2E = () => process.env.E2E_DISABLE_RATE_LIMIT === 'true';

const keyByUserOrIp = (req) => {
  if (req.user?.id) return `u:${req.user.id}`;
  return `ip:${req.ip || 'na'}`;
};

const likeActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  keyGenerator: keyByUserOrIp,
  message: { error: 'Çok sık işlem yapıyorsunuz. Lütfen kısa süre bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipLimiterForE2E,
});

const commentCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  keyGenerator: keyByUserOrIp,
  message: { error: 'Yorum limiti aşıldı. Lütfen bir dakika bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipLimiterForE2E,
});

const shareAndCompletionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: keyByUserOrIp,
  message: { error: 'Çok fazla paylaşım/tamamlama işlemi. Lütfen bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipLimiterForE2E,
});

const metricEventLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: keyByUserOrIp,
  message: { error: 'Metrik istek limiti aşıldı. Lütfen kısa süre bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipLimiterForE2E,
});

module.exports = {
  likeActionLimiter,
  commentCreateLimiter,
  shareAndCompletionLimiter,
  metricEventLimiter,
};

