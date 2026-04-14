const { Router } = require('express');
const upload = require('../middleware/upload');
const { validateMagicBytes } = require('../middleware/upload');
const {
  getFeed, evaluateFeed, getFeedExperimentStats, getOne, getMine, remove, trackView, trackShare, trackCompletion, toggleLike, toggleSave, getBySlide, getRelated,
} = require('../controllers/slideo.controller');
const { createSession } = require('../controllers/slideo-v3.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { spamGuard } = require('../middleware/spam');
const adminGuard = require('../middleware/admin');
const { validateNumericParam } = require('../middleware/route-validation');
const {
  likeActionLimiter,
  shareAndCompletionLimiter,
  metricEventLimiter,
} = require('../middleware/abuse-rate-limit');
const { skipBotMetrics } = require('../middleware/traffic-guard');

const router = Router();

const adaptLegacyQuickUploadPayload = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') {
    req.body = {};
  }
  if (!req.body.slideTitle && req.body.title) req.body.slideTitle = req.body.title;
  if (!req.body.topicTitle && req.body.topic) req.body.topicTitle = req.body.topic;
  if (!req.body.topicTitle && req.body.topicName) req.body.topicTitle = req.body.topicName;
  if (!req.body.categoryId && req.body.category) req.body.categoryId = req.body.category;
  next();
};

// Backward-compatible endpoint for older clients.
// New flow should use /api/slideo-v3/session.
router.post(
  '/quick-upload',
  authenticate,
  spamGuard,
  upload.single('file'),
  validateMagicBytes,
  adaptLegacyQuickUploadPayload,
  createSession
);

router.get('/feed', optionalAuth, getFeed);
router.post('/feed/evaluate', optionalAuth, evaluateFeed);
router.get('/feed/experiment-stats', authenticate, adminGuard, getFeedExperimentStats);
router.get('/me', authenticate, getMine);
router.get('/by-slide/:slideId', validateNumericParam('slideId'), optionalAuth, getBySlide);
router.get('/:id/related', validateNumericParam('id'), optionalAuth, getRelated);
router.get('/:id', validateNumericParam('id'), optionalAuth, getOne);
router.delete('/:id', validateNumericParam('id'), authenticate, remove);
router.post('/:id/view', validateNumericParam('id'), skipBotMetrics, metricEventLimiter, trackView);
router.post('/:id/share', validateNumericParam('id'), authenticate, shareAndCompletionLimiter, trackShare);
router.post('/:id/complete', validateNumericParam('id'), authenticate, shareAndCompletionLimiter, trackCompletion);
router.post('/:id/like', validateNumericParam('id'), authenticate, likeActionLimiter, toggleLike);
router.post('/:id/save', validateNumericParam('id'), authenticate, likeActionLimiter, toggleSave);

module.exports = router;
