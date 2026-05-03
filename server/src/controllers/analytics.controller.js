const crypto = require('crypto');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

const EVENT_TYPES = new Set([
  'page_view',
  'dwell',
  'scroll',
  'slide_page_view',
  'ab_exposure',
  'hover',
  'impression',
  'ad_viewed',
  'ad_clicked',
  'ad_impression',
  'ad_click',
  'sponsored_view',
  'sponsored_click',
  'session_summary',
]);

const toInt = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const safeJson = (value, fallback) => {
  try {
    return JSON.stringify(value ?? fallback);
  } catch {
    return JSON.stringify(fallback);
  }
};

const persistEventsBestEffort = async (normalized) => {
  const data = normalized.map((item) => ({
    eventId: item.eventId,
    sessionId: item.sessionId,
    sequence: item.sequence,
    eventType: item.eventType,
    payload: safeJson(item.payload, {}),
  }));

  try {
    const result = await prisma.analyticsEvent.createMany({
      data,
      skipDuplicates: true,
    });
    return Number(result?.count || 0);
  } catch (err) {
    // Fallback for environments where createMany/skipDuplicates behaves differently
    // or when analytics schema is temporarily unavailable.
    const code = err?.code;
    if (code === 'P2021' || code === 'P2022') {
      return 0;
    }

    let inserted = 0;
    for (const row of data) {
      try {
        await prisma.analyticsEvent.create({ data: row });
        inserted += 1;
      } catch (itemErr) {
        if (itemErr?.code === 'P2002') continue; // duplicate eventId
        if (itemErr?.code === 'P2021' || itemErr?.code === 'P2022') return inserted;
      }
    }
    return inserted;
  }
};

const ingestBatch = async (req, res) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    if (!events.length) return res.json({ ok: true, inserted: 0, deduped: 0 });

    const normalized = events
      .map((item) => ({
        eventId: String(item?.eventId || '').trim().slice(0, 128),
        sessionId: String(item?.sessionId || '').trim().slice(0, 128),
        sequence: Math.max(0, toInt(item?.sequence, 0)),
        eventType: String(item?.eventType || '').trim().toLowerCase(),
        payload: item?.payload ?? {},
      }))
      .filter((item) => item.eventId && item.sessionId && EVENT_TYPES.has(item.eventType))
      .slice(0, 500);

    if (!normalized.length) return res.json({ ok: true, inserted: 0, deduped: events.length });

    const inserted = await persistEventsBestEffort(normalized);
    res.json({ ok: true, inserted, deduped: normalized.length - inserted });

    // Fire-and-forget: push page_view events to Redis realtime counters.
    // Any error here must never bubble up or affect the response.
    const pageViews = normalized.filter(e => e.eventType === 'page_view');
    if (pageViews.length > 0) {
      const realtimeSvc = (() => {
        try { return require('../services/analytics-realtime.service'); } catch { return null; }
      })();
      if (realtimeSvc) {
        pageViews.forEach(e => {
          const page = (() => { try { const p = JSON.parse(e.payload || '{}'); return p?.page || null; } catch { return null; } })();
          realtimeSvc.recordPageView(e.sessionId, page).catch(() => {});
        });
      }
    }
    const slideoViews = normalized.filter(e => e.eventType === 'slideo_view');
    if (slideoViews.length > 0) {
      const realtimeSvc = (() => {
        try { return require('../services/analytics-realtime.service'); } catch { return null; }
      })();
      if (realtimeSvc) {
        slideoViews.forEach(e => realtimeSvc.recordSlideoView(e.sessionId).catch(() => {}));
      }
    }
  } catch (err) {
    logger.warn('[analytics] ingestBatch degraded', { code: err?.code, error: err?.message });
    // Never break UX for telemetry failures.
    res.json({ ok: true, inserted: 0, deduped: 0, degraded: true });
  }
};

const ingestSessionSnapshot = async (req, res) => {
  try {
    const body = req.body || {};
    const sessionId = String(body.sessionId || '').trim().slice(0, 128);
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const snapshotId = String(body.snapshotId || '').trim().slice(0, 128) || crypto.randomUUID();
    const topicId = body.topicId == null ? null : toInt(body.topicId, 0);
    const slideId = body.slideId == null ? null : toInt(body.slideId, 0);
    const durationMs = Math.max(0, Math.min(6 * 60 * 60 * 1000, toInt(body.durationMs, 0)));
    const maxScroll = Math.max(0, Math.min(100, toInt(body.maxScroll, 0)));
    const pagesViewed = Array.isArray(body.pagesViewed)
      ? [...new Set(body.pagesViewed.map((x) => toInt(x, 0)).filter((x) => x > 0))].sort((a, b) => a - b)
      : [];
    const interactions = body.interactions && typeof body.interactions === 'object' ? body.interactions : {};

    await prisma.sessionSnapshot.create({
      data: {
        snapshotId,
        sessionId,
        topicId: topicId > 0 ? topicId : null,
        slideId: slideId > 0 ? slideId : null,
        durationMs,
        maxScroll,
        pagesViewed: safeJson(pagesViewed, []),
        interactions: safeJson(interactions, {}),
      },
    });

    res.status(201).json({ ok: true, snapshotId });
  } catch (err) {
    if (err?.code === 'P2002') return res.json({ ok: true, deduped: true });
    res.status(500).json({ error: 'Failed to ingest session snapshot' });
  }
};

module.exports = {
  ingestBatch,
  ingestSessionSnapshot,
};
