const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { getRecommendationFlags } = require('../services/feature-flag.service');
const logger = require('../lib/logger');

const withQueryTimeout = (promise, ms, fallback) =>
  Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(fallback), ms))]);

const ALLOWED_REC_EVENT_TYPES = new Set([
  'impression',
  'open',
  'view_start',
  'view_progress',
  'view_complete',
  'like',
  'save',
  'share',
  'comment',
  'search',
  'follow_user',
  'follow_category',
  'skip',
  'swipe',
]);

const toInt = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const ingestRecommendationEvents = async (req, res) => {
  try {
    const bodyEvents = Array.isArray(req.body?.events) ? req.body.events : [];
    if (!bodyEvents.length) return res.json({ ok: true, inserted: 0, deduped: 0 });

    const sessionId = String(req.body?.sessionId || req.headers['x-rec-session'] || '').trim().slice(0, 128)
      || `anon:${req.ip || 'na'}`.slice(0, 128);

    const normalized = bodyEvents
      .map((event, idx) => ({
        eventType: String(event?.eventType || '').trim().toLowerCase(),
        targetType: String(event?.targetType || '').trim().toLowerCase() || 'unknown',
        targetId: toInt(event?.targetId, 0),
        value: Number.isFinite(Number(event?.value)) ? Number(event.value) : 1,
        payload: event?.payload && typeof event.payload === 'object' ? event.payload : {},
        sequence: Math.max(0, toInt(event?.sequence, idx)),
        eventId: String(event?.eventId || '').trim().slice(0, 128) || `rec-${crypto.randomUUID()}`,
      }))
      .filter((x) => ALLOWED_REC_EVENT_TYPES.has(x.eventType))
      .slice(0, 500);

    if (!normalized.length) return res.json({ ok: true, inserted: 0, deduped: bodyEvents.length });

    let inserted = 0;
    for (const item of normalized) {
      try {
        await prisma.analyticsEvent.create({
          data: {
            eventId: item.eventId,
            sessionId,
            sequence: item.sequence,
            eventType: `rec_${item.eventType}`,
            payload: JSON.stringify({
              targetType: item.targetType,
              targetId: item.targetId,
              value: item.value,
              userId: req.user?.id || null,
              ...item.payload,
            }),
          },
        });
        inserted += 1;
      } catch (err) {
        if (err?.code === 'P2002') continue;
      }
    }

    return res.json({ ok: true, inserted, deduped: normalized.length - inserted });
  } catch {
    // telemetry must not break product flow
    return res.json({ ok: true, inserted: 0, deduped: 0, degraded: true });
  }
};

const getRecommendationRuntimeFlags = async (req, res) => {
  try {
    const surface = String(req.query?.surface || 'slideo_feed').trim();
    const flags = getRecommendationFlags(req, surface);
    return res.json({ ok: true, flags });
  } catch (err) {
    logger.error('Failed to get recommendation flags', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to get recommendation flags' });
  }
};

const getShadowEvaluationStats = async (req, res) => {
  try {
    const days = Math.max(1, Math.min(30, toInt(req.query?.days, 7)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await withQueryTimeout(
      prisma.analyticsEvent.findMany({
        where: {
          eventType: 'rec_shadow_eval',
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: 2000,
        select: { createdAt: true, payload: true },
      }),
      7000,
      []
    );

    let overlapTotal = 0;
    let overlapCount = 0;
    let samples = 0;

    for (const row of rows) {
      if (!row?.payload) continue;
      try {
        const payload = JSON.parse(row.payload);
        const overlap = Number(payload?.overlapAt10);
        if (Number.isFinite(overlap)) {
          overlapTotal += overlap;
          overlapCount += 1;
        }
        samples += 1;
      } catch {
        // ignore malformed rows
      }
    }

    const avgOverlapAt10 = overlapCount ? Number((overlapTotal / overlapCount).toFixed(4)) : 0;

    return res.json({
      ok: true,
      days,
      samples,
      avgOverlapAt10,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Failed to get shadow evaluation stats', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to get shadow evaluation stats' });
  }
};

module.exports = {
  ingestRecommendationEvents,
  getRecommendationRuntimeFlags,
  getShadowEvaluationStats,
};
