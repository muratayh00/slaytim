const { Router } = require('express');
const { optionalAuth } = require('../middleware/auth');
const { ingestBatch, ingestSessionSnapshot } = require('../controllers/analytics.controller');
const logger = require('../lib/logger');

const router = Router();

router.post('/batch', optionalAuth, ingestBatch);
router.post('/session-snapshot', optionalAuth, ingestSessionSnapshot);

// Preview Time-to-First-Visual metric ingestion (unauthenticated, write-only)
router.post('/preview-metric', (req, res) => {
  try {
    const { slide_id, mode, tt_ms } = req.body || {};
    if (!slide_id || !mode || typeof tt_ms !== 'number') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    const validModes = ['images', 'pdf'];
    if (!validModes.includes(mode)) return res.status(400).json({ error: 'Invalid mode' });
    if (tt_ms < 0 || tt_ms > 120_000) return res.status(400).json({ error: 'tt_ms out of range' });

    logger.info('[preview-metric] first_visual', {
      slideId: Number(slide_id),
      mode,
      ttMs: Math.round(tt_ms),
      ip: req.ip,
    });
    // 204 No Content — sendBeacon doesn't read response body
    res.status(204).end();
  } catch {
    res.status(204).end(); // never crash on analytics
  }
});

module.exports = router;

