const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { getHotFeedPage, invalidateHotFeedCache } = require('../services/slideo-feed-cache.service');
const { getAssignedVariant, trackFeedEvents, getFeedEvaluation } = require('../services/slideo-feed-experiment.service');
const { getRecommendationFlags } = require('../services/feature-flag.service');
const { runSlideoShadowEvaluation } = require('../services/recommendation-shadow.service');
const ttlCache = require('../lib/ttl-cache');
const { normalizeMediaUrls } = require('../lib/media-normalize');

const dedup = require('../lib/dedup');
const isPrismaCode = (err, code) => err && typeof err === 'object' && err.code === code;
const logSoftError = (scope, err) => {
  logger.warn(`[slideo.controller] ${scope}`, { error: err?.message, stack: err?.stack });
};

const withQueryTimeout = (promise, ms, fallback) =>
  Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(fallback), ms))]);

const slideoSelect = {
  id: true,
  title: true,
  description: true,
  pageIndices: true,
  coverPage: true,
  viewsCount: true,
  likesCount: true,
  savesCount: true,
  shareCount: true,
  isHidden: true,
  createdAt: true,
  user: { select: { id: true, username: true, avatarUrl: true } },
  slide: {
    select: {
      id: true,
      title: true,
      pdfUrl: true,
      thumbnailUrl: true,
      conversionStatus: true,
      topic: { select: { id: true, slug: true, title: true, category: { select: { id: true, name: true, slug: true } } } },
    },
  },
};

const getViewDedupKey = (req, slideoId) => {
  const userPart = req.user?.id ? `u:${req.user.id}` : `ip:${req.ip || 'na'}`;
  const sessionPart = req.headers['x-view-session']
    ? `s:${String(req.headers['x-view-session'])}`
    : `ua:${(req.headers['user-agent'] || 'na').slice(0, 64)}`;
  return `${slideoId}|${userPart}|${sessionPart}`;
};

const fmt = (s, likedIds = new Set(), savedIds = new Set()) => ({
  ...s,
  pageIndices: JSON.parse(s.pageIndices || '[]'),
  isLiked: likedIds.has(s.id),
  isSaved: savedIds.has(s.id),
});

// Batch-enrich isLiked / isSaved for a list
async function enrich(slideos, userId) {
  if (!userId || slideos.length === 0) return slideos.map(s => fmt(s));
  const ids = slideos.map(s => s.id);
  const [likes, saves] = await Promise.all([
    prisma.slideoLike.findMany({ where: { userId, slideoId: { in: ids } }, select: { slideoId: true } }),
    prisma.slideoSave.findMany({ where: { userId, slideoId: { in: ids } }, select: { slideoId: true } }),
  ]);
  const likedIds = new Set(likes.map(l => l.slideoId));
  const savedIds = new Set(saves.map(s => s.slideoId));
  return slideos.map(s => fmt(s, likedIds, savedIds));
}

// GET /api/slideo/feed?page=1&limit=10&sort=new|popular|hot
const getFeed = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
    const ALLOWED_SLIDEO_SORTS = new Set(['new', 'popular', 'hot']);
    const sort = ALLOWED_SLIDEO_SORTS.has(req.query.sort) ? req.query.sort : undefined;
    const assignment = await getAssignedVariant(req);
    const feedVariant = assignment.variant;
    const recFlags = getRecommendationFlags(req, 'slideo_feed');
    const userPart = req.user?.id ? `u:${req.user.id}` : 'u:anon';
    const sortPart = sort || 'auto';
    const cacheKey = `${userPart}|p:${page}|l:${limit}|sort:${sortPart}|v:${feedVariant}|shadow:${recFlags.shadowEnabled ? 1 : 0}|serve:${recFlags.serveEnabled ? 1 : 0}`;
    const cached = ttlCache.get('slideo-feed', cacheKey);
    if (cached) return res.json(normalizeMediaUrls(cached));

    const runShadowAsync = (items, appliedSort) => {
      if (!recFlags.shadowEnabled) return;
      setImmediate(() => {
        runSlideoShadowEvaluation({
          req,
          subjectKey: assignment.subjectKey,
          items,
          page,
          limit,
          appliedSort,
        }).catch((err) => logSoftError('shadow evaluation failed', err));
      });
    };

    if (sort === 'new') {
      const [slideos, total] = await Promise.all([
        prisma.slideo.findMany({
          where: { isHidden: false },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: slideoSelect,
        }),
        prisma.slideo.count({ where: { isHidden: false } }),
      ]);
      const result = await enrich(slideos, req.user?.id);
      runShadowAsync(result, 'new');
      const payload = {
        slideos: result,
        total,
        page,
        hasMore: page * limit < total,
        experiment: assignment.experiment,
        variant: feedVariant,
        subjectKey: assignment.subjectKey,
        appliedSort: 'new',
        recommendation: {
          shadowMode: recFlags.shadowEnabled,
          serveMode: recFlags.serveEnabled,
        },
      };
      ttlCache.set('slideo-feed', cacheKey, payload, 12_000);
      return res.json(normalizeMediaUrls(payload));
    }

    if (sort === 'popular') {
      const [slideos, total] = await Promise.all([
        prisma.slideo.findMany({
          where: { isHidden: false },
          orderBy: [{ savesCount: 'desc' }, { likesCount: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
          select: slideoSelect,
        }),
        prisma.slideo.count({ where: { isHidden: false } }),
      ]);
      const result = await enrich(slideos, req.user?.id);
      runShadowAsync(result, 'popular');
      const payload = {
        slideos: result,
        total,
        page,
        hasMore: page * limit < total,
        experiment: assignment.experiment,
        variant: feedVariant,
        subjectKey: assignment.subjectKey,
        appliedSort: 'popular',
        recommendation: {
          shadowMode: recFlags.shadowEnabled,
          serveMode: recFlags.serveEnabled,
        },
      };
      ttlCache.set('slideo-feed', cacheKey, payload, 12_000);
      return res.json(normalizeMediaUrls(payload));
    }

    // A/B default feed for hot ranking.
    const hot = await getHotFeedPage(page, limit, slideoSelect, req.user?.id || null);
    const result = await enrich(hot.slideos, req.user?.id);
    const reordered =
      feedVariant === 'B'
        ? [...result].sort((a, b) => {
            const scoreA = a.savesCount * 4 + a.shareCount * 3 + a.likesCount * 1.5 + a.viewsCount * 0.1;
            const scoreB = b.savesCount * 4 + b.shareCount * 3 + b.likesCount * 1.5 + b.viewsCount * 0.1;
            return scoreB - scoreA;
          })
        : result;

    runShadowAsync(reordered, feedVariant === 'B' ? 'ab_weighted' : 'hot');

    const payload = {
      slideos: reordered,
      total: hot.total,
      page: hot.page,
      hasMore: hot.hasMore,
      experiment: assignment.experiment,
      variant: feedVariant,
      subjectKey: assignment.subjectKey,
      appliedSort: feedVariant === 'B' ? 'ab_weighted' : 'hot',
      recommendation: {
        shadowMode: recFlags.shadowEnabled,
        serveMode: recFlags.serveEnabled,
      },
    };
    ttlCache.set('slideo-feed', cacheKey, payload, 12_000);
    res.json(normalizeMediaUrls(payload));
  } catch (err) {
    logger.error('Failed to fetch slideo feed', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
};
const evaluateFeed = async (req, res) => {
  try {
    const assignment = await getAssignedVariant(req);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const tracked = await trackFeedEvents(assignment.subjectKey, assignment.variant, items);
    res.json({
      ok: true,
      tracked: tracked.inserted,
      experiment: assignment.experiment,
      variant: assignment.variant,
    });
  } catch (err) {
    logger.error('Failed to evaluate feed events', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to evaluate feed events' });
  }
};

const getFeedExperimentStats = async (req, res) => {
  try {
    const days = Number(req.query?.days || 7);
    const EMPTY_RESULT = { experiment: 'feed_v2_ab', days, variants: {}, timedOut: true };
    const data = await withQueryTimeout(getFeedEvaluation({ days }), 7000, EMPTY_RESULT);
    res.json(data);
  } catch (err) {
    logger.error('Failed to fetch feed experiment stats', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch feed experiment stats' });
  }
};

// GET /api/slideo/:id
const getOne = async (req, res) => {
  try {
    const slideo = await prisma.slideo.findUnique({
      where: { id: Number(req.params.id) },
      select: slideoSelect,
    });
    if (!slideo) return res.status(404).json({ error: 'Slideo not found' });
    if (slideo.isHidden && req.user?.id !== slideo.user.id && !req.user?.isAdmin) {
      return res.status(404).json({ error: 'Slideo not found' });
    }
    const [result] = await enrich([slideo], req.user?.id);
    res.json(normalizeMediaUrls(result));
  } catch (err) {
    logger.error('Failed to fetch slideo', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch slideo' });
  }
};

// GET /api/slideo/me
const getMine = async (req, res) => {
  try {
    const slideos = await prisma.slideo.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: slideoSelect,
    });
    res.json(normalizeMediaUrls(slideos.map(s => fmt(s))));
  } catch (err) {
    logger.error('Failed to fetch user slideos (getMine)', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch your slideos' });
  }
};

// DELETE /api/slideo/:id
const remove = async (req, res) => {
  try {
    const slideo = await prisma.slideo.findUnique({ where: { id: Number(req.params.id) } });
    if (!slideo) return res.status(404).json({ error: 'Slideo not found' });
    if (slideo.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.slideo.delete({ where: { id: Number(req.params.id) } });
    invalidateHotFeedCache();
    ttlCache.clear('slideo-feed');
    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to delete slideo', { error: err.message, stack: err.stack });
    const isForeignKeyError = err?.code === 'P2003';
    res.status(500).json({
      error: isForeignKeyError ? 'Slideo bagli kayitlar nedeniyle silinemedi' : 'Failed to delete slideo',
    });
  }
};

// POST /api/slideo/:id/view
const trackView = async (req, res) => {
  try {
    const slideoId = Number(req.params.id);
    if (!Number.isInteger(slideoId) || slideoId <= 0) {
      return res.status(400).json({ error: 'Invalid slideo id' });
    }
    const dedupKey = getViewDedupKey(req, slideoId);
    const counted = await dedup.check(dedupKey, 30); // 30 second TTL
    if (!counted) return res.json({ ok: true, deduped: true });
    const updated = await prisma.slideo.updateMany({
      where: { id: slideoId, isHidden: false },
      data: { viewsCount: { increment: 1 } },
    });
    if (updated.count === 0) {
      return res.status(404).json({ error: 'Slideo not found' });
    }
    res.json({ ok: true, deduped: false });
  } catch (err) {
    logger.error('trackView failed', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed' });
  }
};

// POST /api/slideo/:id/like
const toggleLike = async (req, res) => {
  try {
    const slideoId = Number(req.params.id);
    const userId = req.user.id;

    const existing = await prisma.slideoLike.findUnique({
      where: { userId_slideoId: { userId, slideoId } },
    });

    if (existing) {
      try {
        await prisma.$transaction([
          prisma.slideoLike.delete({ where: { userId_slideoId: { userId, slideoId } } }),
          prisma.slideo.update({ where: { id: slideoId }, data: { likesCount: { decrement: 1 } } }),
        ]);
        invalidateHotFeedCache();
    ttlCache.clear('slideo-feed');
      } catch (err) {
        if (!isPrismaCode(err, 'P2025')) throw err;
      }
      const feedVariant = String(req.body?.variant || req.headers['x-feed-variant'] || '').toUpperCase();
      const subjectKey = String(req.body?.subjectKey || '').trim();
      if (subjectKey && (feedVariant === 'A' || feedVariant === 'B')) {
        trackFeedEvents(subjectKey, feedVariant, [{ slideoId, eventType: 'like' }]).catch((err) => logSoftError('track like(unlike) failed', err));
      }
      return res.json({ liked: false });
    }

    try {
      await prisma.$transaction([
        prisma.slideoLike.create({ data: { userId, slideoId } }),
        prisma.slideo.update({ where: { id: slideoId }, data: { likesCount: { increment: 1 } } }),
      ]);
      invalidateHotFeedCache();
    ttlCache.clear('slideo-feed');
    } catch (err) {
      if (isPrismaCode(err, 'P2002')) return res.json({ liked: true });
      throw err;
    }
    const feedVariant = String(req.body?.variant || req.headers['x-feed-variant'] || '').toUpperCase();
    const subjectKey = String(req.body?.subjectKey || '').trim();
    if (subjectKey && (feedVariant === 'A' || feedVariant === 'B')) {
      trackFeedEvents(subjectKey, feedVariant, [{ slideoId, eventType: 'like' }]).catch((err) => logSoftError('track like failed', err));
    }
    res.json({ liked: true });
  } catch (err) {
    logger.error('Failed to toggle slideo like', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

// POST /api/slideo/:id/save
const toggleSave = async (req, res) => {
  try {
    const slideoId = Number(req.params.id);
    const userId = req.user.id;

    const existing = await prisma.slideoSave.findUnique({
      where: { userId_slideoId: { userId, slideoId } },
    });

    if (existing) {
      try {
        await prisma.$transaction([
          prisma.slideoSave.delete({ where: { userId_slideoId: { userId, slideoId } } }),
          prisma.slideo.update({ where: { id: slideoId }, data: { savesCount: { decrement: 1 } } }),
        ]);
        invalidateHotFeedCache();
    ttlCache.clear('slideo-feed');
      } catch (err) {
        if (!isPrismaCode(err, 'P2025')) throw err;
      }
      const feedVariant = String(req.body?.variant || req.headers['x-feed-variant'] || '').toUpperCase();
      const subjectKey = String(req.body?.subjectKey || '').trim();
      if (subjectKey && (feedVariant === 'A' || feedVariant === 'B')) {
        trackFeedEvents(subjectKey, feedVariant, [{ slideoId, eventType: 'save' }]).catch((err) => logSoftError('track save(unsave) failed', err));
      }
      return res.json({ saved: false });
    }

    try {
      await prisma.$transaction([
        prisma.slideoSave.create({ data: { userId, slideoId } }),
        prisma.slideo.update({ where: { id: slideoId }, data: { savesCount: { increment: 1 } } }),
      ]);
      invalidateHotFeedCache();
    ttlCache.clear('slideo-feed');
    } catch (err) {
      if (isPrismaCode(err, 'P2002')) return res.json({ saved: true });
      throw err;
    }
    const feedVariant = String(req.body?.variant || req.headers['x-feed-variant'] || '').toUpperCase();
    const subjectKey = String(req.body?.subjectKey || '').trim();
    if (subjectKey && (feedVariant === 'A' || feedVariant === 'B')) {
      trackFeedEvents(subjectKey, feedVariant, [{ slideoId, eventType: 'save' }]).catch((err) => logSoftError('track save failed', err));
    }
    res.json({ saved: true });
  } catch (err) {
    logger.error('Failed to toggle slideo save', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to toggle save' });
  }
};

// GET /api/slideo/by-slide/:slideId
const getBySlide = async (req, res) => {
  try {
    const slideId = Number(req.params.slideId);
    const slideos = await prisma.slideo.findMany({
      where: { slideId, isHidden: false },
      orderBy: { likesCount: 'desc' },
      take: 10,
      select: slideoSelect,
    });
    const result = await enrich(slideos, req.user?.id);
    res.json(normalizeMediaUrls(result));
  } catch (err) {
    logger.error('Failed to fetch slideos for slide', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch slideos for slide' });
  }
};

// GET /api/slideo/:id/related
const getRelated = async (req, res) => {
  try {
    const slideo = await prisma.slideo.findUnique({
      where: { id: Number(req.params.id) },
      select: {
        id: true, userId: true,
        slide: { select: { topic: { select: { id: true } } } },
      },
    });
    if (!slideo) return res.status(404).json({ error: 'Slideo not found' });

    const topicId = slideo.slide?.topic?.id;

    const [sameCreator, sameTopic] = await Promise.all([
      prisma.slideo.findMany({
        where: { userId: slideo.userId, id: { not: slideo.id }, isHidden: false },
        orderBy: { likesCount: 'desc' },
        take: 4,
        select: slideoSelect,
      }),
      topicId
        ? prisma.slideo.findMany({
            where: {
              slide: { topic: { id: topicId } },
              id: { not: slideo.id },
              userId: { not: slideo.userId },
              isHidden: false,
            },
            orderBy: { likesCount: 'desc' },
            take: 4,
            select: slideoSelect,
          })
        : Promise.resolve([]),
    ]);

    const allSlideos = [...sameCreator, ...sameTopic];
    const enriched = await enrich(allSlideos, req.user?.id);

    res.json(normalizeMediaUrls({
      sameCreator: enriched.slice(0, sameCreator.length),
      sameTopic: enriched.slice(sameCreator.length),
    }));
  } catch (err) {
    logger.error('Failed to fetch related slideos', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch related slideos' });
  }
};


// POST /api/slideo/:id/share
const trackShare = async (req, res) => {
  try {
    const slideoId = Number(req.params.id);
    await prisma.$transaction([
      prisma.slideo.update({
        where: { id: slideoId },
        data: { shareCount: { increment: 1 } },
      }),
      prisma.slideoShare.upsert({
        where: { userId_slideoId: { userId: req.user.id, slideoId } },
        create: { userId: req.user.id, slideoId },
        update: {},
      }),
    ]);
    invalidateHotFeedCache();
    ttlCache.clear('slideo-feed');
    const feedVariant = String(req.body?.variant || req.headers['x-feed-variant'] || '').toUpperCase();
    const subjectKey = String(req.body?.subjectKey || '').trim();
    if (subjectKey && (feedVariant === 'A' || feedVariant === 'B')) {
      trackFeedEvents(subjectKey, feedVariant, [{ slideoId, eventType: 'share' }]).catch((err) => logSoftError('track share failed', err));
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error('Failed to track slideo share', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed' });
  }
};

const trackCompletion = async (req, res) => {
  try {
    const slideoId = Number(req.params.id);
    await prisma.slideoCompletion.upsert({
      where: { userId_slideoId: { userId: req.user.id, slideoId } },
      create: { userId: req.user.id, slideoId },
      update: { completedAt: new Date() },
    });
    invalidateHotFeedCache();
    ttlCache.clear('slideo-feed');
    const feedVariant = String(req.body?.variant || req.headers['x-feed-variant'] || '').toUpperCase();
    const subjectKey = String(req.body?.subjectKey || '').trim();
    if (subjectKey && (feedVariant === 'A' || feedVariant === 'B')) {
      trackFeedEvents(subjectKey, feedVariant, [{ slideoId, eventType: 'complete' }]).catch((err) => logSoftError('track complete failed', err));
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error('Failed to track slideo completion', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed' });
  }
};

module.exports = {
  getFeed,
  evaluateFeed,
  getFeedExperimentStats,
  getOne,
  getMine,
  remove,
  trackView,
  trackShare,
  trackCompletion,
  toggleLike,
  toggleSave,
  getBySlide,
  getRelated,
};



