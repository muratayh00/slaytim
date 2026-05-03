'use strict';

/**
 * Admin Analytics Controller — Control Tower endpoints
 *
 * All routes require admin access (checked via guard() in each handler).
 * Every handler is independently fault-tolerant: a DB/Redis error returns a
 * clean 500 JSON instead of crashing the process.
 */

const prisma    = require('../lib/prisma');
const logger    = require('../lib/logger');
const { hasAdminAccess } = require('../lib/rbac');
const realtime  = require('../services/analytics-realtime.service');

/* ── helpers ───────────────────────────────────────────────── */

const guard = (req, res) => {
  if (!hasAdminAccess(req.user)) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
};

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);

/* ── SSE: GET /api/admin/analytics/realtime ─────────────────
   Streams a JSON payload every 5 s with live counts.
   Protected by authenticate middleware in the router.
   ─────────────────────────────────────────────────────────── */
const realtimeSSE = async (req, res) => {
  if (!guard(req, res)) return;

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable Nginx proxy buffering

  if (res.flushHeaders) res.flushHeaders();

  const push = async () => {
    try {
      const [snapshot, pages] = await Promise.all([
        realtime.getRealtimeSnapshot(),
        realtime.getActivePages(6),
      ]);
      const payload = JSON.stringify({ ...snapshot, topPages: pages });
      res.write(`data: ${payload}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    } catch (err) {
      logger.warn('[admin-analytics] SSE push failed', { message: err.message });
    }
  };

  await push(); // immediate first event
  const timer = setInterval(push, 5_000);

  req.on('close', () => clearInterval(timer));
};

/* ── GET /api/admin/analytics/overview ─────────────────────── */
const getOverview = async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const today = daysAgo(0);
    today.setHours(0, 0, 0, 0);
    const week  = daysAgo(7);
    const month = daysAgo(30);

    const [
      usersTotal, usersToday, usersWeek, usersMonth,
      slidesTotal, slidesToday, slidesWeek,
      topicsTotal, topicsWeek,
      slideoViewsWeek, slideoCompletionsWeek,
      savesWeek, likesWeek,
      pendingReports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: week  } } }),
      prisma.user.count({ where: { createdAt: { gte: month } } }),

      prisma.slide.count({ where: { isHidden: false } }),
      prisma.slide.count({ where: { createdAt: { gte: today } } }),
      prisma.slide.count({ where: { createdAt: { gte: week  } } }),

      prisma.topic.count({ where: { isHidden: false } }),
      prisma.topic.count({ where: { createdAt: { gte: week  } } }),

      prisma.analyticsEvent.count({ where: { eventType: 'slideo_view',    createdAt: { gte: week } } }),
      prisma.analyticsEvent.count({ where: { eventType: 'slideo_complete', createdAt: { gte: week } } }),

      prisma.savedSlide.count({ where: { createdAt: { gte: week } } }),
      prisma.slideLike.count({ where:  { createdAt: { gte: week } } }),

      prisma.report.count({ where: { status: 'pending' } }),
    ]);

    res.json({
      users:   { total: usersTotal, today: usersToday, week: usersWeek, month: usersMonth },
      content: { slides: { total: slidesTotal, today: slidesToday, week: slidesWeek },
                 topics: { total: topicsTotal, week: topicsWeek } },
      engagement: {
        slideoViewsWeek,
        slideoCompletionsWeek,
        completionRatePct: slideoViewsWeek > 0
          ? Math.round(slideoCompletionsWeek / slideoViewsWeek * 1000) / 10 : 0,
        savesWeek,
        likesWeek,
      },
      moderation: { pendingReports },
    });
  } catch (err) {
    logger.error('[admin-analytics] getOverview error', { error: err.message });
    res.status(500).json({ error: 'Overview unavailable' });
  }
};

/* ── GET /api/admin/analytics/traffic?range=24h|7d|30d ──────── */
const getTraffic = async (req, res) => {
  if (!guard(req, res)) return;
  const range = ['24h', '7d', '30d'].includes(req.query.range) ? req.query.range : '7d';

  try {
    if (range === '24h') {
      // Bucket page_view events into hours
      const since = new Date(Date.now() - 24 * 3_600_000);
      const events = await prisma.analyticsEvent.findMany({
        where:   { eventType: 'page_view', createdAt: { gte: since } },
        select:  { createdAt: true },
        orderBy: { createdAt: 'asc' },
        take:    50_000,
      });
      const now = Date.now();
      const buckets = {};
      for (let i = 23; i >= 0; i--) {
        const h = new Date(now - i * 3_600_000);
        const k = h.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
        buckets[k] = 0;
      }
      events.forEach(e => {
        const k = e.createdAt.toISOString().slice(0, 13);
        if (k in buckets) buckets[k]++;
      });
      return res.json({
        range,
        points: Object.entries(buckets).map(([ts, count]) => ({
          ts: `${ts.replace('T', ' ')}:00`,
          count,
        })),
      });
    }

    // 7d / 30d — daily signups + uploads
    const days  = range === '30d' ? 30 : 7;
    const since = daysAgo(days);
    const [signupRows, uploadRows] = await Promise.all([
      prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.slide.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    ]);

    const now = Date.now();
    const buckets = {};
    for (let i = days - 1; i >= 0; i--) {
      const k = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
      buckets[k] = { date: k, signups: 0, uploads: 0 };
    }
    signupRows.forEach(u => {
      const k = u.createdAt.toISOString().slice(0, 10);
      if (buckets[k]) buckets[k].signups++;
    });
    uploadRows.forEach(s => {
      const k = s.createdAt.toISOString().slice(0, 10);
      if (buckets[k]) buckets[k].uploads++;
    });

    res.json({ range, points: Object.values(buckets) });
  } catch (err) {
    logger.error('[admin-analytics] getTraffic error', { error: err.message });
    res.status(500).json({ error: 'Traffic data unavailable' });
  }
};

/* ── GET /api/admin/analytics/search?days=7 ─────────────────── */
const getSearchIntelligence = async (req, res) => {
  if (!guard(req, res)) return;
  const days  = Math.min(90, Math.max(1, Number(req.query.days) || 7));
  const since = daysAgo(days);

  try {
    // Gracefully handle if the table doesn't exist yet (pre-migration)
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'search_queries'
      ) AS "exists"
    `.then(r => r[0]?.exists === true).catch(() => false);

    if (!tableExists) {
      return res.json({
        topQueries: [], zeroResultQueries: [],
        totalSearches: 0, uniqueQueries: 0,
        note: 'Run prisma migrate to activate search intelligence.',
      });
    }

    const [topQueries, zeroResults, totalSearches, uniqueRaw] = await Promise.all([
      prisma.searchQuery.groupBy({
        by: ['queryNorm'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      prisma.searchQuery.groupBy({
        by: ['queryNorm'],
        where: { createdAt: { gte: since }, resultCount: 0 },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      prisma.searchQuery.count({ where: { createdAt: { gte: since } } }),
      prisma.searchQuery.groupBy({
        by: ['queryNorm'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
      }).then(r => r.length),
    ]);

    res.json({
      days,
      topQueries:        topQueries.map(q  => ({ query: q.queryNorm || '', count: q._count.id })),
      zeroResultQueries: zeroResults.map(q => ({ query: q.queryNorm || '', count: q._count.id })),
      totalSearches,
      uniqueQueries: uniqueRaw,
    });
  } catch (err) {
    logger.error('[admin-analytics] getSearchIntelligence error', { error: err.message });
    res.status(500).json({ error: 'Search intelligence unavailable' });
  }
};

/* ── GET /api/admin/analytics/funnel?days=30 ────────────────── */
const getFunnel = async (req, res) => {
  if (!guard(req, res)) return;
  const days  = Math.min(90, Math.max(1, Number(req.query.days) || 30));
  const since = daysAgo(days);

  try {
    const [visits, signups, uploaders, savers] = await Promise.all([
      prisma.analyticsEvent.count({ where: { eventType: 'page_view', createdAt: { gte: since } } }),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      // distinct users who uploaded at least once
      prisma.slide.groupBy({ by: ['userId'], where: { createdAt: { gte: since } }, _count: { id: true } })
        .then(r => r.length),
      // distinct users who saved at least once
      prisma.savedSlide.groupBy({ by: ['userId'], where: { createdAt: { gte: since } }, _count: { id: true } })
        .then(r => r.length),
    ]);

    const steps = [
      { label: 'Sayfa Görüntüleme', value: visits,   pct: 100 },
      { label: 'Kayıt Olan',        value: signups,   pct: visits    > 0 ? +(signups   / visits    * 100).toFixed(1) : 0 },
      { label: 'Slayt Yükleyen',    value: uploaders, pct: signups   > 0 ? +(uploaders / signups   * 100).toFixed(1) : 0 },
      { label: 'Kaydeden Kullanıcı',value: savers,    pct: uploaders > 0 ? +(savers    / uploaders * 100).toFixed(1) : 0 },
    ];

    res.json({ days, steps });
  } catch (err) {
    logger.error('[admin-analytics] getFunnel error', { error: err.message });
    res.status(500).json({ error: 'Funnel data unavailable' });
  }
};

/* ── GET /api/admin/analytics/slideo?days=7 ─────────────────── */
const getSlideoMetrics = async (req, res) => {
  if (!guard(req, res)) return;
  const days  = Math.min(90, Math.max(1, Number(req.query.days) || 7));
  const since = daysAgo(days);

  try {
    const [topSlideos, views, completions, saves, likes] = await Promise.all([
      prisma.slideo.findMany({
        where:   { isHidden: false, createdAt: { gte: since } },
        select: {
          id: true, title: true, viewsCount: true, likesCount: true, savesCount: true,
          user:  { select: { username: true } },
          _count: { select: { completions: true } },
        },
        orderBy: { viewsCount: 'desc' },
        take:    10,
      }),
      prisma.analyticsEvent.count({ where: { eventType: 'slideo_view',    createdAt: { gte: since } } }),
      prisma.analyticsEvent.count({ where: { eventType: 'slideo_complete', createdAt: { gte: since } } }),
      prisma.slideoSave.count({ where: { createdAt: { gte: since } } }).catch(() => 0),
      prisma.slideoLike.count({ where: { createdAt: { gte: since } } }).catch(() => 0),
    ]);

    res.json({
      days,
      totals: {
        views, completions, saves, likes,
        completionRatePct: views > 0 ? +(completions / views * 100).toFixed(1) : 0,
        saveRatePct:       views > 0 ? +(saves       / views * 100).toFixed(1) : 0,
        likeRatePct:       views > 0 ? +(likes       / views * 100).toFixed(1) : 0,
      },
      topSlideos: topSlideos.map(s => ({
        id: s.id, title: s.title, author: s.user?.username,
        views: s.viewsCount, likes: s.likesCount, saves: s.savesCount,
        completions: s._count?.completions ?? 0,
      })),
    });
  } catch (err) {
    logger.error('[admin-analytics] getSlideoMetrics error', { error: err.message });
    res.status(500).json({ error: 'Slideo metrics unavailable' });
  }
};

/* ── GET /api/admin/analytics/content?days=7 ────────────────── */
const getContentIntelligence = async (req, res) => {
  if (!guard(req, res)) return;
  const days  = Math.min(90, Math.max(1, Number(req.query.days) || 7));
  const since = daysAgo(days);

  try {
    const [topSlides, topTopics, zeroViewUploads, topCategories] = await Promise.all([
      prisma.slide.findMany({
        where:   { isHidden: false },
        select: {
          id: true, title: true, slug: true,
          viewsCount: true, likesCount: true, savesCount: true,
          user:  { select: { username: true } },
          topic: { select: { title: true } },
        },
        orderBy: { viewsCount: 'desc' },
        take: 10,
      }),
      prisma.topic.findMany({
        where:   { isHidden: false },
        select: {
          id: true, title: true, slug: true, viewsCount: true, likesCount: true,
          category: { select: { name: true } },
          _count:   { select: { slides: true } },
        },
        orderBy: { viewsCount: 'desc' },
        take: 10,
      }),
      prisma.slide.findMany({
        where:   { isHidden: false, viewsCount: 0, createdAt: { gte: since } },
        select: {
          id: true, title: true, slug: true, createdAt: true,
          user: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.category.findMany({
        where:   { parentId: null },
        select: {
          id: true, name: true, slug: true,
          _count: { select: { topics: true } },
        },
        orderBy: { topics: { _count: 'desc' } },
        take: 12,
      }),
    ]);

    res.json({ days, topSlides, topTopics, zeroViewUploads, topCategories });
  } catch (err) {
    logger.error('[admin-analytics] getContentIntelligence error', { error: err.message });
    res.status(500).json({ error: 'Content intelligence unavailable' });
  }
};

module.exports = {
  realtimeSSE,
  getOverview,
  getTraffic,
  getSearchIntelligence,
  getFunnel,
  getSlideoMetrics,
  getContentIntelligence,
};
