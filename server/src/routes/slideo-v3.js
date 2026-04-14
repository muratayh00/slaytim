const { Router } = require('express');
const upload = require('../middleware/upload');
const { validateMagicBytes } = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');
const { spamGuard } = require('../middleware/spam');
const {
  createSession,
  getSessionStatus,
  getSessionPreviewMeta,
  publishSession,
  createFromSlide,
} = require('../controllers/slideo-v3.controller');

const router = Router();

// Session-based upload pipeline
router.post('/session', authenticate, spamGuard, upload.single('file'), validateMagicBytes, createSession);
router.get('/session/:id/status', authenticate, getSessionStatus);
router.get('/session/:id/preview-meta', authenticate, getSessionPreviewMeta);
router.post('/session/:id/publish', authenticate, spamGuard, publishSession);

// Create slideo from an already-converted slide (no new upload required)
router.post('/from-slide', authenticate, spamGuard, createFromSlide);

module.exports = router;
