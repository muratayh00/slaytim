const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const {
  recencyScore,
  contentScore,
  clamp,
} = require('../services/ranking/ranking.constants');

const LIMIT_DEFAULT = 20;
const LIMIT_MAX = 50;

const normalizeSessionId = (raw, req) => {
  const input = String(raw || '').trim();
  if (input) return input.slice(0, 128);
  return `anon:${String(req.ip || 'na')}:${String(req.headers['user-agent'] || 'na').slice(0, 60)}`;
};

const computeBaseContentScore = (item) => {
  const views = Math.max(1, Number(item.viewsCount || 0));
  const likes = Number(item.likesCount || 0);
  const saves = Number(item.savesCount || 0);
  const shares = Number(item.shareCount || 0);

  const likeRate = clamp(likes / views, 0, 1);
  const saveRate = clamp(saves / views, 0, 1);
  const shareRate = clamp(shares / views, 0, 1);

  // Without page-level watch/completion we approximate with saves/likes.
  const watchTimeNorm = clamp((likes + saves * 2) / (views + 5), 0, 1);
  const completionRate = clamp((saves * 1.5 + likes) / (views + 10), 0, 1);

  return contentScore({
    watchTimeNorm,
    completionRate,
    likeRate,
    saveRate,
    commentRate: 0,
    shareRate,
    fastSkipRate: 0,
    reportRate: 0,
  });
};

const computeInterestMatch = (tagIds, affinityMap) => {
  if (!tagIds?.length || !affinityMap.size) return 0;
  let sum = 0;
  for (const tagId of tagIds) {
    sum += Number(affinityMap.get(tagId) || 0);
  }
  return clamp(sum / Math.max(1, tagIds.length * 3), -1, 1);
};

const diversify = (items) => {
  const result = [];
  const creatorCount = new Map();
  const tagCount = new Map();

  for (const item of items) {
    const creatorId = Number(item.creatorId || 0);
    const creatorSeen = creatorCount.get(creatorId) || 0;
    if (creatorSeen >= 2) continue;

    const topTag = item.tagIds?.[0] || null;
    const topTagSeen = topTag ? (tagCount.get(topTag) || 0) : 0;
    if (topTag && topTagSeen >= 3) continue;

    result.push(item);
    creatorCount.set(creatorId, creatorSeen + 1);
    if (topTag) tagCount.set(topTag, topTagSeen + 1);
  }

  return result;
};

const getFeed = async (req, res) => {
  try {
    const limit = Math.min(LIMIT_MAX, Math.max(1, Number(req.query?.limit || LIMIT_DEFAULT)));
    const sessionId = normalizeSessionId(req.query?.sessionId || req.headers['x-view-session'], req);
    const userId = req.user?.id || null;

    const [slides, slideos, userTags] = await Promise.all([
      prisma.slide.findMany({
        where: {
          isHidden: false,
          deletedAt: null,
          conversionStatus: 'done',
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 120,
        select: {
          id: true,
          title: true,
          slug: true,
          createdAt: true,
          viewsCount: true,
          likesCount: true,
          savesCount: true,
          thumbnailUrl: true,
          userId: true,
          tags: {
            select: {
              tagId: true,
            },
          },
        },
      }),
      prisma.slideo.findMany({
        where: {
          isHidden: false,
          slide: {
            isHidden: false,
            deletedAt: null,
            conversionStatus: 'done',
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 120,
        select: {
          id: true,
          title: true,
          slug: true,
          createdAt: true,
          viewsCount: true,
          likesCount: true,
          savesCount: true,
          shareCount: true,
          userId: true,
          slideId: true,
          slide: {
            select: {
              thumbnailUrl: true,
              tags: { select: { tagId: true } },
            },
          },
        },
      }),
      userId
        ? prisma.userTagProfile.findMany({
            where: { userId },
            orderBy: { affinity: 'desc' },
            take: 200,
            select: { tagId: true, affinity: true },
          })
        : [],
    ]);

    const affinityMap = new Map(userTags.map((x) => [x.tagId, Number(x.affinity || 0)]));

    const candidates = [];
    for (const slide of slides) {
      const tagIds = slide.tags.map((t) => t.tagId);
      const base = computeBaseContentScore(slide);
      const interest = computeInterestMatch(tagIds, affinityMap);
      const recency = recencyScore(slide.createdAt, 10);
      const finalScore = (base * 0.5) + (interest * 0.3) + (recency * 0.2);
      candidates.push({
        contentType: 'slide',
        contentId: slide.id,
        title: slide.title,
        slug: slide.slug,
        createdAt: slide.createdAt,
        thumbnailUrl: slide.thumbnailUrl,
        creatorId: slide.userId,
        tagIds,
        score: finalScore,
      });
    }

    for (const slideo of slideos) {
      const tagIds = (slideo.slide?.tags || []).map((t) => t.tagId);
      const base = computeBaseContentScore(slideo);
      const interest = computeInterestMatch(tagIds, affinityMap);
      const recency = recencyScore(slideo.createdAt, 7);
      const finalScore = (base * 0.5) + (interest * 0.3) + (recency * 0.2);
      candidates.push({
        contentType: 'slideo',
        contentId: slideo.id,
        title: slideo.title,
        slug: slideo.slug,
        createdAt: slideo.createdAt,
        thumbnailUrl: slideo.slide?.thumbnailUrl || null,
        creatorId: slideo.userId,
        tagIds,
        score: finalScore,
      });
    }

    const sorted = candidates.sort((a, b) => b.score - a.score);
    const diversified = diversify(sorted).slice(0, limit);

    if (diversified.length > 0) {
      await prisma.feedImpressionLog.createMany({
        data: diversified.map((item, idx) => ({
          userId,
          sessionId,
          contentType: item.contentType,
          contentId: item.contentId,
          rank: idx + 1,
          score: Number(item.score.toFixed(6)),
        })),
      }).catch(() => {});
    }

    return res.json({
      sessionId,
      items: diversified.map((item, idx) => ({
        rank: idx + 1,
        contentType: item.contentType,
        contentId: item.contentId,
        title: item.title,
        slug: item.slug,
        thumbnailUrl: item.thumbnailUrl,
        score: Number(item.score.toFixed(4)),
      })),
    });
  } catch (err) {
    logger.error('Failed to build feed', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to fetch feed' });
  }
};

module.exports = {
  getFeed,
};
