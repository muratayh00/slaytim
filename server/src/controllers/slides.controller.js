const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const pdfParse = require('../lib/pdf-parse');
const prisma = require('../lib/prisma');
const { checkBadges, awardBadge } = require('../services/badge.service');
const { enqueueSlideConversion } = require('../services/conversion.service');
const { sanitizeText } = require('../lib/sanitize');
const { toSlug, uniqueSlug, randomSuffix } = require('../lib/slug');
const { cleanupUploadedFile } = require('../middleware/upload');
const {
  putLocalFile,
  isRemoteEnabled,
  deleteStoredObject,
  resolveStorageReadUrl,
} = require('../services/storage.service');
const { notifyTopicSubscribers } = require('../services/topic-subscription.service');
const logger = require('../lib/logger');
const dedup = require('../lib/dedup');

const slideSelect = {
  id: true,
  title: true,
  description: true,
  slug: true,
  fileUrl: true,
  thumbnailUrl: true,
  pdfUrl: true,
  conversionStatus: true,
  likesCount: true,
  savesCount: true,
  viewsCount: true,
  downloadsCount: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, username: true, avatarUrl: true } },
  topic: { select: { id: true, title: true, slug: true, category: { select: { name: true, slug: true } } } },
};

const PAGE_EVENT_TYPES = new Set(['view', 'drop', 'profile_visit', 'follow_convert']);
const PAGE_REACTION_TYPES = new Set(['like', 'save', 'share', 'emoji', 'confused', 'summary', 'exam']);
const MAX_COMMENT_LEN = 500;

const getViewDedupKey = (req, slideId) => {
  const userPart = req.user?.id ? `u:${req.user.id}` : `ip:${req.ip || 'na'}`;
  const sessionPart = req.headers['x-view-session']
    ? `s:${String(req.headers['x-view-session'])}`
    : `ua:${(req.headers['user-agent'] || 'na').slice(0, 64)}`;
  return `${slideId}|${userPart}|${sessionPart}`;
};

const getSessionKey = (req, slideId) => {
  const header = req.headers['x-view-session'];
  if (header) return `${slideId}:s:${String(header).slice(0, 96)}`;
  const ip = req.ip || 'na';
  const ua = (req.headers['user-agent'] || 'na').slice(0, 80);
  return `${slideId}:ip:${ip}:ua:${ua}`;
};

const toPageNumber = (value) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
};

const mapSlideUploadError = (err) => {
  const message = String(err?.message || '').toLowerCase();

  if (message.includes('topic not found')) {
    return { status: 404, error: 'Topic not found', code: 'TOPIC_NOT_FOUND' };
  }
  if (message.includes('remote storage driver is configured but client could not be initialised')) {
    return {
      status: 503,
      error: 'Depolama servisi hazir degil. STORAGE_* ayarlarini kontrol edin.',
      code: 'STORAGE_NOT_READY',
    };
  }
  if (message.includes('remote storage credentials are missing')) {
    return {
      status: 503,
      error: 'Depolama kimlik bilgileri eksik. STORAGE_* env degerlerini tamamlayin.',
      code: 'STORAGE_CONFIG_MISSING',
    };
  }
  if (message.includes('could not resolve upload path for local storage')) {
    return {
      status: 500,
      error: 'Yerel depolama yolu cozumlenemedi.',
      code: 'STORAGE_PATH_INVALID',
    };
  }
  if (
    message.includes('credentialsprovidererror')
    || message.includes('accessdenied')
    || message.includes('invalidaccesskeyid')
    || message.includes('signaturedoesnotmatch')
    || message.includes('nosuchbucket')
    || message.includes('requesttimeout')
    || message.includes('getaddrinfo')
    || message.includes('econnrefused')
  ) {
    return {
      status: 503,
      error: 'Depolama servisine baglanti basarisiz. Bucket ve kimlik bilgilerini kontrol edin.',
      code: 'STORAGE_UNAVAILABLE',
    };
  }

  return {
    status: 500,
    error: 'Failed to upload slide',
    code: 'UPLOAD_FAILED',
  };
};

const upsertPageStat = async (slideId, pageNumber, increments = {}) => {
  const inc = {
    viewCount: Number(increments.viewCount || 0),
    uniqueViewCount: Number(increments.uniqueViewCount || 0),
    totalReadMs: Number(increments.totalReadMs || 0),
    likeCount: Number(increments.likeCount || 0),
    saveCount: Number(increments.saveCount || 0),
    shareCount: Number(increments.shareCount || 0),
    confusedCount: Number(increments.confusedCount || 0),
    summaryCount: Number(increments.summaryCount || 0),
    examCount: Number(increments.examCount || 0),
    emojiCount: Number(increments.emojiCount || 0),
    commentCount: Number(increments.commentCount || 0),
    dropCount: Number(increments.dropCount || 0),
    profileVisitCount: Number(increments.profileVisitCount || 0),
    followConversionCount: Number(increments.followConversionCount || 0),
  };

  return prisma.slidePageStat.upsert({
    where: { slideId_pageNumber: { slideId, pageNumber } },
    create: {
      slideId,
      pageNumber,
      viewCount: inc.viewCount,
      uniqueViewCount: inc.uniqueViewCount,
      totalReadMs: inc.totalReadMs,
      likeCount: inc.likeCount,
      saveCount: inc.saveCount,
      shareCount: inc.shareCount,
      confusedCount: inc.confusedCount,
      summaryCount: inc.summaryCount,
      examCount: inc.examCount,
      emojiCount: inc.emojiCount,
      commentCount: inc.commentCount,
      dropCount: inc.dropCount,
      profileVisitCount: inc.profileVisitCount,
      followConversionCount: inc.followConversionCount,
    },
    update: {
      viewCount: { increment: inc.viewCount },
      uniqueViewCount: { increment: inc.uniqueViewCount },
      totalReadMs: { increment: inc.totalReadMs },
      likeCount: { increment: inc.likeCount },
      saveCount: { increment: inc.saveCount },
      shareCount: { increment: inc.shareCount },
      confusedCount: { increment: inc.confusedCount },
      summaryCount: { increment: inc.summaryCount },
      examCount: { increment: inc.examCount },
      emojiCount: { increment: inc.emojiCount },
      commentCount: { increment: inc.commentCount },
      dropCount: { increment: inc.dropCount },
      profileVisitCount: { increment: inc.profileVisitCount },
      followConversionCount: { increment: inc.followConversionCount },
    },
  });
};

const getByTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { sort: sortRaw = 'latest', page = 1, limit = 50 } = req.query;
    const ALLOWED_SORTS = new Set(['latest', 'popular', 'saved']);
    const sort = ALLOWED_SORTS.has(sortRaw) ? sortRaw : 'latest';
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    const orderBy =
      sort === 'popular'
        ? { likesCount: 'desc' }
        : sort === 'saved'
        ? { savesCount: 'desc' }
        : { createdAt: 'desc' };

    const where = { topicId: Number(topicId), isHidden: false };
    const [slides, total] = await Promise.all([
      prisma.slide.findMany({
        where,
        orderBy,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: slideSelect,
      }),
      prisma.slide.count({ where }),
    ]);
    res.json({ slides, total, page: pageNum, hasMore: pageNum * limitNum < total });
  } catch (err) {
    logger.error('Failed to fetch slides by topic', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch slides' });
  }
};

const getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const slideId = Number(id);
    const slide = await prisma.slide.findUnique({ where: { id: slideId }, select: slideSelect });
    if (!slide) return res.status(404).json({ error: 'Slide not found' });
    const job = await prisma.conversionJob.findUnique({
      where: { slideId },
      select: { status: true, lastError: true, attempts: true, updatedAt: true },
    });
    let hydrated = slide;
    if (slide?.pdfUrl) hydrated = { ...hydrated, pdfUrl: await resolveStorageReadUrl(slide.pdfUrl) };
    if (slide?.thumbnailUrl) hydrated = { ...hydrated, thumbnailUrl: await resolveStorageReadUrl(slide.thumbnailUrl) };
    if (slide?.fileUrl) hydrated = { ...hydrated, fileUrl: await resolveStorageReadUrl(slide.fileUrl) };
    res.json({
      ...hydrated,
      conversionJob: job || null,
    });
  } catch (err) {
    logger.error('Failed to fetch slide (getOne)', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch slide' });
  }
};

const incrementView = async (req, res) => {
  try {
    const { id } = req.params;
    const slideId = Number(id);
    if (!Number.isInteger(slideId) || slideId <= 0) {
      return res.status(400).json({ error: 'Invalid slide id' });
    }

    const dedupKey = getViewDedupKey(req, slideId);
    const counted = await dedup.check(dedupKey, 30); // 30 second TTL
    if (!counted) return res.json({ ok: true, deduped: true });

    const updated = await prisma.slide.updateMany({
      where: { id: slideId, isHidden: false },
      data: { viewsCount: { increment: 1 } },
    });
    if (updated.count === 0) {
      return res.status(404).json({ error: 'Slide not found' });
    }
    res.json({ ok: true, deduped: false });
  } catch (err) {
    logger.error('Failed to track slide view', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to track view' });
  }
};

const trackPageEvent = async (req, res) => {
  try {
    const slideId = Number(req.params.id);
    const pageNumber = toPageNumber(req.body?.pageNumber);
    const eventType = String(req.body?.eventType || 'view');
    const completed = Boolean(req.body?.completed);
    const readMs = Math.max(0, Math.min(120000, Number(req.body?.readMs || 0)));

    if (!Number.isInteger(slideId) || slideId <= 0) {
      return res.status(400).json({ error: 'Invalid slide id' });
    }
    if (!pageNumber) return res.status(400).json({ error: 'Invalid page number' });
    if (!PAGE_EVENT_TYPES.has(eventType)) return res.status(400).json({ error: 'Invalid event type' });

    const slide = await prisma.slide.findUnique({
      where: { id: slideId },
      select: { id: true, userId: true, isHidden: true },
    });
    if (!slide || slide.isHidden) return res.status(404).json({ error: 'Slide not found' });

    const sessionKey = getSessionKey(req, slideId);
    const session = await prisma.slideViewSession.findUnique({
      where: { slideId_sessionKey: { slideId, sessionKey } },
    });
    const isFirstSeenPage = !session || pageNumber > session.maxPage;

    const increments = { totalReadMs: readMs };
    if (eventType === 'view') increments.viewCount = 1;
    if (eventType === 'drop') increments.dropCount = 1;
    if (eventType === 'profile_visit') increments.profileVisitCount = 1;
    if (eventType === 'follow_convert') increments.followConversionCount = 1;
    if (eventType === 'view' && isFirstSeenPage) increments.uniqueViewCount = 1;

    await upsertPageStat(slideId, pageNumber, increments);

    const sessionData = {
      userId: req.user?.id || null,
      lastSeenAt: new Date(),
      maxPage: Math.max(session?.maxPage || 1, pageNumber),
      totalReadMs: { increment: readMs },
      completed: completed || session?.completed || false,
      profileVisited: eventType === 'profile_visit' ? true : (session?.profileVisited || false),
      followConverted: eventType === 'follow_convert' ? true : (session?.followConverted || false),
    };

    if (session) {
      await prisma.slideViewSession.update({
        where: { slideId_sessionKey: { slideId, sessionKey } },
        data: sessionData,
      });
    } else {
      await prisma.slideViewSession.create({
        data: {
          slideId,
          sessionKey,
          userId: req.user?.id || null,
          maxPage: pageNumber,
          totalReadMs: readMs,
          completed,
          profileVisited: eventType === 'profile_visit',
          followConverted: eventType === 'follow_convert',
        },
      });
    }

    res.json({ ok: true, eventType });
  } catch (err) {
    logger.error('Failed to track page event', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to track page event' });
  }
};

const reactToPage = async (req, res) => {
  try {
    const slideId = Number(req.params.id);
    const pageNumber = toPageNumber(req.body?.pageNumber);
    const reactionType = String(req.body?.reactionType || '').trim();
    const emoji = reactionType === 'emoji' ? String(req.body?.emoji || '').trim().slice(0, 24) : null;

    if (!Number.isInteger(slideId) || slideId <= 0) {
      return res.status(400).json({ error: 'Invalid slide id' });
    }
    if (!pageNumber) return res.status(400).json({ error: 'Invalid page number' });
    if (!PAGE_REACTION_TYPES.has(reactionType)) return res.status(400).json({ error: 'Invalid reaction type' });
    if (reactionType === 'emoji' && !emoji) return res.status(400).json({ error: 'Emoji required' });

    const sessionKey = getSessionKey(req, slideId);
    const actorKey = req.user?.id ? `u:${req.user.id}` : sessionKey;

    try {
      await prisma.slidePageReaction.create({
        data: {
          slideId,
          pageNumber,
          userId: req.user?.id || null,
          actorKey,
          reactionType,
          emoji,
        },
      });
    } catch (err) {
      if (err?.code === 'P2002') return res.json({ ok: true, deduped: true });
      throw err;
    }

    const metricMap = {
      like: { likeCount: 1 },
      save: { saveCount: 1 },
      share: { shareCount: 1 },
      emoji: { emojiCount: 1 },
      confused: { confusedCount: 1 },
      summary: { summaryCount: 1 },
      exam: { examCount: 1 },
    };
    await upsertPageStat(slideId, pageNumber, metricMap[reactionType] || {});
    res.json({ ok: true, deduped: false });
  } catch (err) {
    logger.error('Failed to react to page', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to react page' });
  }
};

const listSlideComments = async (req, res) => {
  try {
    const slideId = Number(req.params.id);
    const pageNumber = toPageNumber(req.query?.pageNumber);
    const where = { slideId };
    if (pageNumber) where.pageNumber = pageNumber;

    const comments = await prisma.slidePageComment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        pageNumber: true,
        content: true,
        createdAt: true,
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
    res.json(comments);
  } catch (err) {
    logger.error('Failed to fetch slide comments', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

const createSlideComment = async (req, res) => {
  try {
    const slideId = Number(req.params.id);
    const pageNumber = req.body?.pageNumber ? toPageNumber(req.body?.pageNumber) : null;
    const content = sanitizeText(req.body?.content, MAX_COMMENT_LEN);
    if (!content) return res.status(400).json({ error: 'Gecerli yorum gerekli' });

    const comment = await prisma.slidePageComment.create({
      data: {
        slideId,
        pageNumber,
        userId: req.user.id,
        content,
      },
      select: {
        id: true,
        pageNumber: true,
        content: true,
        createdAt: true,
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
    if (pageNumber) {
      await upsertPageStat(slideId, pageNumber, { commentCount: 1 });
    }
    res.status(201).json(comment);
  } catch (err) {
    logger.error('Failed to create slide comment', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

const removeSlideComment = async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);
    const comment = await prisma.slidePageComment.findUnique({ where: { id: commentId } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.slidePageComment.delete({ where: { id: commentId } });
    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to delete slide comment', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

const getPageStats = async (req, res) => {
  try {
    const slideId = Number(req.params.id);
    const stats = await prisma.slidePageStat.findMany({
      where: { slideId },
      orderBy: { pageNumber: 'asc' },
    });

    const withScore = stats.map((s) => ({
      ...s,
      engagementScore:
        s.likeCount + s.saveCount * 2 + s.shareCount * 2 + s.summaryCount * 2 + s.examCount * 2 + s.emojiCount,
    }));
    const maxScore = Math.max(...withScore.map((s) => s.engagementScore), 1);
    const heatmap = withScore.map((s) => ({
      pageNumber: s.pageNumber,
      score: s.engagementScore,
      level: s.engagementScore >= maxScore * 0.75 ? 'high' : s.engagementScore >= maxScore * 0.35 ? 'mid' : 'low',
      viewCount: s.viewCount,
      saveCount: s.saveCount,
      dropCount: s.dropCount,
    }));

    const maxBy = (arr, fn) => arr.reduce((best, cur) => (!best || fn(cur) > fn(best) ? cur : best), null);
    const mostReactive = maxBy(withScore, (s) => s.engagementScore);
    const mostDropped = maxBy(withScore, (s) => s.dropCount);
    const mostShared = maxBy(withScore, (s) => s.shareCount);

    res.json({
      pages: withScore,
      heatmap,
      tags: {
        mostReactivePage: mostReactive?.pageNumber || null,
        mostDroppedPage: mostDropped?.pageNumber || null,
        mostSharedPage: mostShared?.pageNumber || null,
      },
    });
  } catch (err) {
    logger.error('Failed to fetch page stats', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch page stats' });
  }
};

const getCreatorInsights = async (req, res) => {
  try {
    const slideId = Number(req.params.id);
    const compare = String(req.query?.compare || '0') === '1';
    const periodDaysRaw = Number(req.query?.periodDays || 30);
    const periodDays = Math.min(90, Math.max(7, Number.isFinite(periodDaysRaw) ? periodDaysRaw : 30));
    const slide = await prisma.slide.findUnique({
      where: { id: slideId },
      select: { id: true, userId: true, viewsCount: true },
    });
    if (!slide) return res.status(404).json({ error: 'Slide not found' });
    if (slide.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [stats, sessions, slideos] = await Promise.all([
      prisma.slidePageStat.findMany({ where: { slideId }, orderBy: { pageNumber: 'asc' } }),
      prisma.slideViewSession.findMany({ where: { slideId } }),
      prisma.slideo.findMany({
        where: { slideId, isHidden: false },
        select: { id: true, title: true, viewsCount: true, likesCount: true, savesCount: true, shareCount: true },
      }),
    ]);

    const uniqueViews = sessions.length;
    const avgReadMs = uniqueViews
      ? Math.round(sessions.reduce((acc, s) => acc + (s.totalReadMs || 0), 0) / uniqueViews)
      : 0;
    const completedCount = sessions.filter((s) => s.completed).length;
    const completionRate = uniqueViews ? (completedCount / uniqueViews) * 100 : 0;

    const sumProfileVisits = stats.reduce((acc, s) => acc + s.profileVisitCount, 0);
    const sumFollowConversions = stats.reduce((acc, s) => acc + s.followConversionCount, 0);
    const sumShares = stats.reduce((acc, s) => acc + s.shareCount, 0);
    const sumSaves = stats.reduce((acc, s) => acc + s.saveCount, 0);

    const maxBy = (arr, fn) => arr.reduce((best, cur) => (!best || fn(cur) > fn(best) ? cur : best), null);
    const dropPage = maxBy(stats, (s) => s.dropCount)?.pageNumber || null;
    const highSavePage = maxBy(stats, (s) => s.saveCount)?.pageNumber || null;

    const slideoPerformance = slideos
      .map((s) => ({
        ...s,
        score: s.savesCount * 3 + s.likesCount * 2 + s.shareCount * 3 + s.viewsCount * 0.2,
      }))
      .sort((a, b) => b.score - a.score);

    const bestSlideo = slideoPerformance[0] || null;

    const response = {
      totalViews: slide.viewsCount,
      uniqueViews,
      averageReadSeconds: Math.round(avgReadMs / 1000),
      completionRate: Number(completionRate.toFixed(2)),
      dropPage,
      highSavePage,
      bestSlideo,
      profileVisitRate: uniqueViews ? Number(((sumProfileVisits / uniqueViews) * 100).toFixed(2)) : 0,
      followConversionRate: sumProfileVisits ? Number(((sumFollowConversions / sumProfileVisits) * 100).toFixed(2)) : 0,
      shareRate: slide.viewsCount ? Number(((sumShares / slide.viewsCount) * 100).toFixed(2)) : 0,
      saveRate: slide.viewsCount ? Number(((sumSaves / slide.viewsCount) * 100).toFixed(2)) : 0,
      slideoPerformance: slideoPerformance.slice(0, 5),
      pageStats: stats,
    };

    if (compare) {
      const now = new Date();
      const currentStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
      const previousStart = new Date(currentStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

      const [currentSessions, previousSessions, currentReactions, previousReactions] = await Promise.all([
        prisma.slideViewSession.findMany({
          where: { slideId, startedAt: { gte: currentStart, lt: now } },
          select: { completed: true, totalReadMs: true },
        }),
        prisma.slideViewSession.findMany({
          where: { slideId, startedAt: { gte: previousStart, lt: currentStart } },
          select: { completed: true, totalReadMs: true },
        }),
        prisma.slidePageReaction.groupBy({
          by: ['reactionType'],
          where: { slideId, createdAt: { gte: currentStart, lt: now } },
          _count: { _all: true },
        }),
        prisma.slidePageReaction.groupBy({
          by: ['reactionType'],
          where: { slideId, createdAt: { gte: previousStart, lt: currentStart } },
          _count: { _all: true },
        }),
      ]);

      const toReactionMap = (rows) => {
        const map = { save: 0, share: 0, like: 0 };
        for (const row of rows) {
          if (row.reactionType === 'save') map.save = row._count._all || 0;
          if (row.reactionType === 'share') map.share = row._count._all || 0;
          if (row.reactionType === 'like') map.like = row._count._all || 0;
        }
        return map;
      };

      const summarizePeriod = (sessions, reactionRows) => {
        const uniques = sessions.length;
        const completed = sessions.filter((s) => s.completed).length;
        const avgReadSeconds = uniques
          ? Math.round(sessions.reduce((acc, s) => acc + (s.totalReadMs || 0), 0) / uniques / 1000)
          : 0;
        const completionRate = uniques ? Number(((completed / uniques) * 100).toFixed(2)) : 0;
        return {
          uniqueViews: uniques,
          avgReadSeconds,
          completionRate,
          reactions: toReactionMap(reactionRows),
        };
      };

      response.comparison = {
        periodDays,
        current: summarizePeriod(currentSessions, currentReactions),
        previous: summarizePeriod(previousSessions, previousReactions),
      };
    }

    res.json(response);
  } catch (err) {
    logger.error('Failed to fetch creator insights', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch creator insights' });
  }
};

const create = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    const { title: rawTitle, description: rawDesc, topicId } = req.body;
    const topicIdNum = Number(topicId);
    const title = sanitizeText(rawTitle, 200);
    const description = sanitizeText(rawDesc, 1000) || null;

    if (!title) {
      cleanupUploadedFile(req.file);
      return res.status(400).json({ error: 'Baslik zorunlu' });
    }
    if (!Number.isInteger(topicIdNum) || topicIdNum <= 0) {
      cleanupUploadedFile(req.file);
      return res.status(400).json({ error: 'Gecerli topicId zorunlu' });
    }

    const fileUrl = await putLocalFile(
      req.file.path,
      `slides/${req.file.filename}`,
      req.file.mimetype,
    );

    const topic = await prisma.topic.findUnique({
      where: { id: topicIdNum },
      select: { id: true, roomId: true },
    });
    if (!topic) {
      cleanupUploadedFile(req.file);
      return res.status(404).json({ error: 'Topic not found' });
    }

    if (topic.roomId) {
      const membership = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId: topic.roomId, userId: req.user.id } },
        select: { roomId: true },
      });
      if (!membership) {
        cleanupUploadedFile(req.file);
        return res.status(403).json({ error: 'Bu oda konusuna slayt yuklemek icin odaya katilmalisin' });
      }
    }

    // Optimistic-insert loop: generates a slug, tries to insert, retries on the rare
    // P2002 unique-constraint violation that can still occur if two requests race
    // through uniqueSlug simultaneously and land on the same value.
    // uniqueSlug already uses random suffixes to make this astronomically unlikely,
    // but this loop closes the remaining TOCTOU window with zero chance of a 500.
    let slide;
    {
      const baseTitle = toSlug(title);
      for (let attempt = 0; attempt <= 5; attempt++) {
        const slug = attempt === 0
          ? await uniqueSlug(prisma.slide, baseTitle)
          : `${baseTitle.slice(0, 70)}-${randomSuffix()}`;
        try {
          slide = await prisma.slide.create({
            data: {
              title,
              description,
              slug,
              fileUrl,
              topicId: topicIdNum,
              userId: req.user.id,
            },
            select: slideSelect,
          });
          break; // success — exit retry loop
        } catch (err) {
          const isSlugConflict =
            err?.code === 'P2002' &&
            (err?.meta?.target?.includes('slug') || String(err?.message || '').includes('slug'));
          if (attempt < 5 && isSlugConflict) continue; // retry with new random slug
          throw err; // non-slug error or exhausted retries → propagate
        }
      }
    }

    let enqueueError = null;
    try {
      await enqueueSlideConversion(slide.id);
    } catch (err) {
      enqueueError = String(err?.message || 'Conversion enqueue failed').slice(0, 500);
      await prisma.conversionJob.upsert({
        where: { slideId: slide.id },
        create: {
          slideId: slide.id,
          status: 'failed',
          attempts: 1,
          finishedAt: new Date(),
          lastError: enqueueError,
        },
        update: {
          status: 'failed',
          lockedAt: null,
          nextAttemptAt: null,
          finishedAt: new Date(),
          lastError: enqueueError,
        },
      }).catch(() => {});
      await prisma.slide.updateMany({
        where: { id: slide.id },
        data: { conversionStatus: 'failed' },
      }).catch(() => {});
    }
    notifyTopicSubscribers({
      topicId: topicIdNum,
      actorUserId: req.user.id,
      slideTitle: title,
    });
    // Only delete the local temp file if it was already uploaded to remote storage (S3/R2).
    // With local storage the file in uploads/slides/ IS the source — deleting it breaks conversion.
    if (isRemoteEnabled()) cleanupUploadedFile(req.file);
    checkBadges(req.user.id).catch(() => {});
    const uploadHour = new Date().getHours();
    if (uploadHour >= 0 && uploadHour < 5) {
      awardBadge(req.user.id, 'hidden_night_owl').catch(() => {});
    }

    if (enqueueError) {
      const fresh = await prisma.slide.findUnique({
        where: { id: slide.id },
        select: slideSelect,
      }).catch(() => null);
      return res.status(201).json(fresh || { ...slide, conversionStatus: 'failed' });
    }

    res.status(201).json(slide);
  } catch (err) {
    logger.error('Failed to upload slide', { error: err.message, stack: err.stack });
    cleanupUploadedFile(req.file);
    const mapped = mapSlideUploadError(err);
    res.status(mapped.status).json({
      error: mapped.error,
      code: mapped.code || 'UPLOAD_FAILED',
    });
  }
};

const getBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const slide = await prisma.slide.findUnique({ where: { slug }, select: slideSelect });
    if (!slide) return res.status(404).json({ error: 'Slide not found' });
    const job = await prisma.conversionJob.findUnique({
      where: { slideId: slide.id },
      select: { status: true, lastError: true, attempts: true, updatedAt: true },
    });
    let hydrated = slide;
    if (slide?.pdfUrl) hydrated = { ...hydrated, pdfUrl: await resolveStorageReadUrl(slide.pdfUrl) };
    if (slide?.thumbnailUrl) hydrated = { ...hydrated, thumbnailUrl: await resolveStorageReadUrl(slide.thumbnailUrl) };
    if (slide?.fileUrl) hydrated = { ...hydrated, fileUrl: await resolveStorageReadUrl(slide.fileUrl) };
    res.json({
      ...hydrated,
      conversionJob: job || null,
    });
  } catch (err) {
    logger.error('Failed to fetch slide (getBySlug)', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch slide' });
  }
};

const toUploadAbsPath = (urlPath) => {
  if (!urlPath || typeof urlPath !== 'string') return null;
  const normalized = urlPath.replace(/^\/+/, '');
  return path.join(__dirname, '../../', normalized);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getPdfForPreview = async (req, res) => {
  try {
    const slideId = Number(req.params.id);
    if (!Number.isInteger(slideId) || slideId <= 0) {
      return res.status(400).json({ error: 'Invalid slide id' });
    }

    const slide = await prisma.slide.findUnique({
      where: { id: slideId },
      select: {
        id: true,
        userId: true,
        isHidden: true,
        deletedAt: true,
        pdfUrl: true,
        conversionStatus: true,
      },
    });
    if (!slide || slide.deletedAt) {
      return res.status(404).json({ error: 'Slide not found' });
    }
    if (slide.isHidden && slide.userId !== req.user?.id && !req.user?.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (slide.conversionStatus !== 'done' || !slide.pdfUrl) {
      return res.status(409).json({ error: 'PDF is not ready yet' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    // Allow short-lived browser caching for repeat opens while keeping user-scoped privacy.
    res.setHeader('Cache-Control', 'private, max-age=120, must-revalidate');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    const isRemote = /^https?:\/\//i.test(slide.pdfUrl);
    if (isRemote) {
      const parsed = new URL(slide.pdfUrl);
      const allowedHosts = (process.env.ALLOWED_CDN_HOSTS || '').split(',').filter(Boolean);
      const isAllowed = allowedHosts.length === 0 || allowedHosts.some(h => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`));
      if (!isAllowed) {
        // Block private IP ranges
        const privateRanges = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/;
        if (privateRanges.test(parsed.hostname)) {
          logger.warn('SSRF attempt blocked in getPdfForPreview', { url: slide.pdfUrl, ip: req.ip });
          return res.status(403).json({ error: 'Forbidden URL' });
        }
      }
      const readUrl = await resolveStorageReadUrl(slide.pdfUrl);
      const upstreamHeaders = {};
      if (req.headers.range) upstreamHeaders.Range = String(req.headers.range);

      const upstream = await fetch(readUrl, { headers: upstreamHeaders });
      if (!upstream.ok) {
        return res.status(502).json({ error: 'Remote PDF fetch failed' });
      }

      // Preserve partial-content semantics for fast PDF first-page rendering.
      res.status(upstream.status);
      const contentType = upstream.headers.get('content-type');
      const contentLength = upstream.headers.get('content-length');
      const contentRange = upstream.headers.get('content-range');
      const acceptRanges = upstream.headers.get('accept-ranges');
      const etag = upstream.headers.get('etag');
      const lastModified = upstream.headers.get('last-modified');

      if (contentType) res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      if (contentRange) res.setHeader('Content-Range', contentRange);
      if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
      if (etag) res.setHeader('ETag', etag);
      if (lastModified) res.setHeader('Last-Modified', lastModified);

      if (upstream.body) {
        Readable.fromWeb(upstream.body).pipe(res);
      } else {
        const raw = await upstream.arrayBuffer();
        res.end(Buffer.from(raw));
      }
      return;
    }

    const filePath = toUploadAbsPath(slide.pdfUrl);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'PDF file not found' });
    }
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    logger.error('Failed to stream pdf', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to stream pdf' });
  }
};

const getPreviewMeta = async (req, res) => {
  try {
    const slideId = Number(req.params.id);
    if (!Number.isInteger(slideId) || slideId <= 0) {
      return res.status(400).json({ error: 'Invalid slide id' });
    }

    const slide = await prisma.slide.findUnique({
      where: { id: slideId },
      select: {
        id: true,
        userId: true,
        isHidden: true,
        deletedAt: true,
        pdfUrl: true,
        conversionStatus: true,
      },
    });
    if (!slide || slide.deletedAt) {
      return res.status(404).json({ error: 'Slide not found' });
    }
    if (slide.isHidden && slide.userId !== req.user?.id && !req.user?.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (slide.conversionStatus !== 'done' || !slide.pdfUrl) {
      return res.status(409).json({ error: 'Preview is not ready yet' });
    }

    let pageCount = 0;
    let lastError = null;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        let pdfBuffer = null;
        const isRemote = /^https?:\/\//i.test(slide.pdfUrl);
        if (isRemote) {
          const readUrl = await resolveStorageReadUrl(slide.pdfUrl);
          const upstream = await fetch(readUrl);
          if (!upstream.ok) throw new Error('Remote PDF fetch failed');
          const raw = await upstream.arrayBuffer();
          pdfBuffer = Buffer.from(raw);
        } else {
          const filePath = toUploadAbsPath(slide.pdfUrl);
          if (!filePath || !fs.existsSync(filePath)) throw new Error('PDF file not found');
          pdfBuffer = await fs.promises.readFile(filePath);
        }
        const parsed = await pdfParse(pdfBuffer);
        pageCount = Math.max(1, Number(parsed?.numpages || 0));
        if (pageCount > 0) break;
      } catch (err) {
        lastError = err;
        if (attempt < 4) await sleep(300 * attempt);
      }
    }
    if (!pageCount) {
      return res.status(409).json({
        error: String(lastError?.message || 'PDF sayfa sayısı okunamadı. Lütfen kısa süre sonra tekrar deneyin.'),
      });
    }
    return res.json({
      slideId,
      pageCount,
      previewUrl: `/api/slides/${slideId}/pdf`,
      conversionStatus: 'done',
    });
  } catch (err) {
    logger.error('Failed to load preview metadata', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to load preview metadata' });
  }
};

// Algorithm 10 - quality score: saves count stronger than likes
const getPopular = async (req, res) => {
  try {
    const slides = await prisma.slide.findMany({
      where: { conversionStatus: 'done', isHidden: false },
      orderBy: [{ savesCount: 'desc' }, { likesCount: 'desc' }],
      take: 12,
      select: slideSelect,
    });
    res.json(slides);
  } catch (err) {
    logger.error('Failed to fetch popular slides', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch popular slides' });
  }
};

const getMine = async (req, res) => {
  try {
    const onlyDone = String(req.query?.onlyDone || '').toLowerCase() === 'true';
    const q = sanitizeText(req.query?.q, 120);
    const where = {
      userId: req.user.id,
      deletedAt: null,
      ...(onlyDone ? { conversionStatus: 'done' } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { topic: { title: { contains: q } } },
            ],
          }
        : {}),
    };

    const slides = await prisma.slide.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        title: true,
        conversionStatus: true,
        pdfUrl: true,
        thumbnailUrl: true,
        createdAt: true,
        topic: { select: { id: true, title: true, slug: true } },
      },
    });

    res.json({ slides });
  } catch (err) {
    logger.error('Failed to fetch user slides (getMine)', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch your slides' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const slide = await prisma.slide.findUnique({ where: { id: Number(id) } });
    if (!slide) return res.status(404).json({ error: 'Slide not found' });
    if (slide.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { title: rawTitle, description: rawDesc } = req.body;
    const data = {};
    if (rawTitle !== undefined) {
      const title = sanitizeText(rawTitle, 200);
      if (!title) return res.status(400).json({ error: 'Baslik zorunlu' });
      data.title = title;
      data.slug = await uniqueSlug(prisma.slide, toSlug(title), Number(id));
    }
    if (rawDesc !== undefined) data.description = sanitizeText(rawDesc, 1000) || null;
    const updated = await prisma.slide.update({ where: { id: Number(id) }, data, select: slideSelect });
    res.json(updated);
  } catch (err) {
    logger.error('Failed to update slide', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to update slide' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const slide = await prisma.slide.findUnique({ where: { id: Number(id) } });
    if (!slide) return res.status(404).json({ error: 'Slide not found' });
    if (slide.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    for (const fileUrl of [slide.fileUrl, slide.pdfUrl, slide.thumbnailUrl]) {
      if (!fileUrl) continue;
      try {
        await deleteStoredObject(fileUrl);
      } catch (cleanupErr) {
        logger.warn('Failed to cleanup slide file in storage', {
          slideId: Number(id),
          fileUrl,
          error: cleanupErr?.message || String(cleanupErr),
        });
      }
    }

    await prisma.slide.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to delete slide', { error: err.message, stack: err.stack });
    const isForeignKeyError = err?.code === 'P2003';
    res.status(500).json({
      error: isForeignKeyError ? 'Slide bagli kayitlar nedeniyle silinemedi' : 'Failed to delete slide',
    });
  }
};

const getRelated = async (req, res) => {
  try {
    const { id } = req.params;
    const slide = await prisma.slide.findUnique({
      where: { id: Number(id) },
      select: { topicId: true, topic: { select: { categoryId: true } } },
    });
    if (!slide) return res.status(404).json({ error: 'Slide not found' });

    const [topicPopular, categoryLatest, newest] = await Promise.all([
      prisma.slide.findMany({
        where: { topicId: slide.topicId, id: { not: Number(id) }, isHidden: false },
        orderBy: { likesCount: 'desc' },
        take: 4,
        select: slideSelect,
      }),
      prisma.slide.findMany({
        where: {
          id: { not: Number(id) },
          isHidden: false,
          topic: { categoryId: slide.topic.categoryId },
          topicId: { not: slide.topicId },
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: slideSelect,
      }),
      prisma.slide.findMany({
        where: { id: { not: Number(id) }, isHidden: false },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: slideSelect,
      }),
    ]);

    res.json({ topicPopular, categoryLatest, newest });
  } catch (err) {
    logger.error('Failed to fetch related slides', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch related slides' });
  }
};

const trackDownload = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid slide id' });
    }
    const slide = await prisma.slide.findUnique({
      where: { id },
      select: { id: true, isHidden: true, deletedAt: true },
    });
    if (!slide || slide.isHidden || slide.deletedAt) {
      return res.status(404).json({ error: 'Slide not found' });
    }

    await prisma.slide.update({
      where: { id },
      data: { downloadsCount: { increment: 1 } },
    });
    res.json({ ok: true });
  } catch (err) {
    logger.error('Failed to track download', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to track download' });
  }
};

const retryConversion = async (req, res) => {
  try {
    const slideId = Number(req.params.id);
    if (!Number.isInteger(slideId) || slideId <= 0) {
      return res.status(400).json({ error: 'Invalid slide id' });
    }
    const slide = await prisma.slide.findUnique({
      where: { id: slideId },
      select: { id: true, userId: true, conversionStatus: true },
    });
    if (!slide) return res.status(404).json({ error: 'Slide not found' });
    if (slide.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await enqueueSlideConversion(slideId);
    res.json({ ok: true, conversionStatus: 'pending' });
  } catch (err) {
    logger.error('Failed to retry conversion', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to retry conversion' });
  }
};

module.exports = {
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
  trackDownload,
  getPreviewMeta,
  getPdfForPreview,
  remove,
  getRelated,
  retryConversion,
};
