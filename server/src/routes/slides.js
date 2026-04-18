const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const {
  getByTopic,
  getOne,
  getBySlug,
  getMine,
  create,
  update,
  getPopular,
  incrementView,
  trackPageEvent,
  reactToPage,
  listSlideComments,
  createSlideComment,
  removeSlideComment,
  getPageStats,
  getCreatorInsights,
  remove,
  getRelated,
  retryConversion,
  trackDownload,
  getPreviewMeta,
  getPdfForPreview,
  updateThumbnail,
} = require('../controllers/slides.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validateMagicBytes } = require('../middleware/upload');
const { spamGuard } = require('../middleware/spam');
const { validateNumericParam } = require('../middleware/route-validation');
const {
  likeActionLimiter,
  commentCreateLimiter,
  metricEventLimiter,
} = require('../middleware/abuse-rate-limit');
const { skipBotMetrics } = require('../middleware/traffic-guard');

// IP-based upload rate limiter: max 20 uploads per IP per hour
const uploadIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Saatlik yukleme limitine ulastiniz. Lutfen daha sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    process.env.E2E_DISABLE_RATE_LIMIT === 'true'
    || (process.env.NODE_ENV !== 'production' && String(req.headers['x-staging-proof'] || '') === '1'),
});

const router = Router();

router.get('/popular', getPopular);
router.get('/my', authenticate, getMine);
router.get('/topic/:topicId', validateNumericParam('topicId'), getByTopic);
router.get('/slug/:slug', getBySlug);
router.get('/:id/page-stats', validateNumericParam('id'), getPageStats);
router.get('/:id/insights', validateNumericParam('id'), authenticate, getCreatorInsights);
router.get('/:id/comments', validateNumericParam('id'), listSlideComments);
router.get('/:id/related', validateNumericParam('id'), getRelated);
router.get('/:id/preview-meta', validateNumericParam('id'), optionalAuth, getPreviewMeta);
router.get('/:id/pdf', validateNumericParam('id'), optionalAuth, getPdfForPreview);
router.get('/:id', validateNumericParam('id'), getOne);
router.post('/:id/retry-conversion', validateNumericParam('id'), authenticate, retryConversion);
router.post('/:id/download', validateNumericParam('id'), optionalAuth, trackDownload);
router.post('/:id/view', validateNumericParam('id'), skipBotMetrics, metricEventLimiter, incrementView);
router.post('/:id/page-event', validateNumericParam('id'), optionalAuth, skipBotMetrics, metricEventLimiter, trackPageEvent);
router.post('/:id/page-reaction', validateNumericParam('id'), optionalAuth, metricEventLimiter, reactToPage);
router.post('/:id/comments', validateNumericParam('id'), authenticate, commentCreateLimiter, createSlideComment);
router.delete('/:id/comments/:commentId', validateNumericParam('id'), authenticate, removeSlideComment);
router.post('/', authenticate, spamGuard, uploadIpLimiter, upload.single('file'), validateMagicBytes, create);
router.patch('/:id', validateNumericParam('id'), authenticate, update);
router.patch('/:id/thumbnail', validateNumericParam('id'), authenticate, updateThumbnail);
router.delete('/:id', validateNumericParam('id'), authenticate, remove);

module.exports = router;
