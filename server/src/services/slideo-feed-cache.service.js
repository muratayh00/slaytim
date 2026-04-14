const prisma = require('../lib/prisma');

const HOT_WINDOW_DAYS = 30;
const HOT_FEED_POOL_SIZE = 300;
const HOT_FEED_CACHE_TTL_MS = 60_000;

let hotFeedCache = null;

function calcSlideoScore(slideo, ageHours) {
  const score =
    slideo.likesCount * 1 +
    slideo.savesCount * 5 +
    slideo.shareCount * 4 +
    (slideo.completionCount || 0) * 6 +
    slideo.viewsCount * 0.1;
  return score / Math.pow(ageHours + 2, 1.2);
}

async function rebuildHotFeedCache() {
  const since = new Date(Date.now() - HOT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rawSlideos = await prisma.slideo.findMany({
    where: { createdAt: { gte: since }, isHidden: false },
    take: HOT_FEED_POOL_SIZE,
    select: {
      id: true,
      createdAt: true,
      likesCount: true,
      savesCount: true,
      shareCount: true,
      viewsCount: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const completionAgg = await prisma.slideoCompletion.groupBy({
    by: ['slideoId'],
    _count: { _all: true },
    where: { slideoId: { in: rawSlideos.map((s) => s.id) } },
  });
  const completionMap = new Map(completionAgg.map((r) => [r.slideoId, r._count._all || 0]));

  const now = Date.now();
  const rankedIds = rawSlideos
    .map((s) => {
      const ageHours = (now - new Date(s.createdAt).getTime()) / (1000 * 60 * 60);
      return {
        id: s.id,
        score: calcSlideoScore({ ...s, completionCount: completionMap.get(s.id) || 0 }, ageHours),
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((s) => s.id);

  hotFeedCache = {
    rankedIds,
    total: rankedIds.length,
    expiresAt: Date.now() + HOT_FEED_CACHE_TTL_MS,
  };

  return hotFeedCache;
}

async function getHotFeedPage(page, limit, select, userId = null) {
  const cache = hotFeedCache && hotFeedCache.expiresAt > Date.now()
    ? hotFeedCache
    : await rebuildHotFeedCache();

  let rankedIds = cache.rankedIds;
  if (userId) {
    const profileRows = await prisma.slideo.findMany({
      where: { id: { in: cache.rankedIds.slice(0, 200) } },
      select: {
        id: true,
        userId: true,
        slide: { select: { topic: { select: { id: true, categoryId: true } } } },
      },
    });
    const byId = new Map(profileRows.map((r) => [r.id, r]));

    const [savedRows, shareRows, completionRows] = await Promise.all([
      prisma.slideoSave.findMany({
        where: { userId: Number(userId) },
        select: { slideoId: true, slideo: { select: { userId: true, slide: { select: { topic: { select: { id: true, categoryId: true } } } } } } },
        take: 200,
      }),
      prisma.slideoShare.findMany({
        where: { userId: Number(userId) },
        select: { slideoId: true, slideo: { select: { userId: true, slide: { select: { topic: { select: { id: true, categoryId: true } } } } } } },
        take: 200,
      }),
      prisma.slideoCompletion.findMany({
        where: { userId: Number(userId) },
        select: { slideoId: true, slideo: { select: { userId: true, slide: { select: { topic: { select: { id: true, categoryId: true } } } } } } },
        take: 200,
      }),
    ]);

    const creatorAffinity = new Map();
    const categoryAffinity = new Map();
    const topicAffinity = new Map();
    const seenSet = new Set();
    const applySignal = (rows, weight) => {
      for (const row of rows) {
        if (!row?.slideo) continue;
        seenSet.add(row.slideoId);
        const creatorId = row.slideo.userId;
        const topicId = row.slideo.slide?.topic?.id;
        const categoryId = row.slideo.slide?.topic?.categoryId;
        creatorAffinity.set(creatorId, (creatorAffinity.get(creatorId) || 0) + weight);
        if (topicId) topicAffinity.set(topicId, (topicAffinity.get(topicId) || 0) + weight);
        if (categoryId) categoryAffinity.set(categoryId, (categoryAffinity.get(categoryId) || 0) + weight);
      }
    };

    applySignal(savedRows, 2);
    applySignal(shareRows, 2.5);
    applySignal(completionRows, 3);

    rankedIds = cache.rankedIds.slice(0, 200).sort((a, b) => {
      const rowA = byId.get(a);
      const rowB = byId.get(b);
      if (!rowA || !rowB) return 0;
      const topicA = rowA.slide?.topic;
      const topicB = rowB.slide?.topic;
      const scoreA =
        (creatorAffinity.get(rowA.userId) || 0) * 1.2 +
        (topicAffinity.get(topicA?.id) || 0) * 1.1 +
        (categoryAffinity.get(topicA?.categoryId) || 0) * 0.9 -
        (seenSet.has(a) ? 3 : 0);
      const scoreB =
        (creatorAffinity.get(rowB.userId) || 0) * 1.2 +
        (topicAffinity.get(topicB?.id) || 0) * 1.1 +
        (categoryAffinity.get(topicB?.categoryId) || 0) * 0.9 -
        (seenSet.has(b) ? 3 : 0);
      return scoreB - scoreA;
    });
  }

  const start = (page - 1) * limit;
  const end = page * limit;
  const ids = rankedIds.slice(start, end);

  if (ids.length === 0) {
    return { slideos: [], total: cache.total, page, hasMore: page * limit < cache.total };
  }

  const rows = await prisma.slideo.findMany({
    where: { id: { in: ids } },
    select,
  });

  const byId = new Map(rows.map((row) => [row.id, row]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

  return {
    slideos: ordered,
    total: rankedIds.length,
    page,
    hasMore: page * limit < rankedIds.length,
  };
}

function invalidateHotFeedCache() {
  hotFeedCache = null;
}

module.exports = {
  getHotFeedPage,
  invalidateHotFeedCache,
};
