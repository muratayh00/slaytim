const { Router } = require('express');
const rateLimit    = require('express-rate-limit');
const { optionalAuth } = require('../middleware/auth');
const { ingestBatch, ingestSessionSnapshot } = require('../controllers/analytics.controller');
const logger = require('../lib/logger');

const router = Router();

// ── POST /analytics/event — single-event realtime tracker ──────────────────
// Lighter than /batch: one event per call, used by AnalyticsTracker on the
// frontend.  No auth required (anonymous page views), user attached if cookie
// is present.  Rate-limited to 60 req/min per IP to prevent abuse.
const eventLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders:   false,
  skip: () => false,
  handler: (_req, res) => res.status(429).json({ error: 'Too many requests' }),
});

const REALTIME_EVENT_TYPES = new Set([
  'page_view', 'slideo_view', 'slideo_complete', 'slide_view',
  'signup', 'login', 'upload_start', 'upload_complete', 'search',
]);

// Lazy-load the realtime service to avoid circular deps at module init.
let _realtimeSvc = null;
function getRealtimeSvc() {
  if (!_realtimeSvc) {
    try { _realtimeSvc = require('../services/analytics-realtime.service'); } catch {}
  }
  return _realtimeSvc;
}

router.post('/event', eventLimiter, optionalAuth, async (req, res) => {
  // Respond immediately — never block the browser on analytics.
  res.status(200).json({ ok: true });

  try {
    const body      = req.body || {};
    const eventName = String(body.eventName || body.event_name || '').trim().toLowerCase().slice(0, 64);
    const sessionId = String(body.sessionId || body.session_id || '').trim().slice(0, 128);
    const page      = String(body.page || '').trim().slice(0, 500) || null;
    const metadata  = (body.metadata && typeof body.metadata === 'object') ? body.metadata : {};

    // Basic validation — silently drop invalid payloads (already responded 200)
    if (!eventName || !sessionId) return;
    if (!REALTIME_EVENT_TYPES.has(eventName)) return;

    // Bot / headless filter
    const ua = String(req.headers['user-agent'] || '').toLowerCase();
    if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider') || ua.includes('headless')) return;

    const svc = getRealtimeSvc();
    if (!svc) return;

    if (eventName === 'page_view') {
      await svc.recordPageView(sessionId, page);
    } else if (eventName === 'slideo_view') {
      await svc.recordSlideoView(sessionId);
    } else if (eventName === 'signup') {
      await svc.incrementToday('signups');
    } else if (eventName === 'upload_complete') {
      await svc.incrementToday('uploads');
    } else if (eventName === 'search') {
      await svc.incrementToday('searches');
    }
  } catch (err) {
    // Fire-and-forget: errors must never propagate (response already sent)
    logger.warn('[analytics/event] handler error', { message: err?.message });
  }
});

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

