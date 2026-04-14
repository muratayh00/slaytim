const crypto = require('crypto');
const prisma = require('../lib/prisma');

const safeNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const ageHours = (createdAt) => {
  const ts = new Date(createdAt).getTime();
  if (!Number.isFinite(ts)) return 24;
  return Math.max(0.1, (Date.now() - ts) / 3600000);
};

const legacyHotScore = (item) => {
  const engagement =
    safeNumber(item.likesCount) * 1 +
    safeNumber(item.savesCount) * 5 +
    safeNumber(item.shareCount) * 4 +
    safeNumber(item.viewsCount) * 0.1;
  return engagement / Math.pow(ageHours(item.createdAt) + 2, 1.2);
};

const recencyDecay = (item) => 1 / Math.pow(ageHours(item.createdAt) + 2, 0.7);

const buildUserAffinity = async (userId) => {
  if (!userId) {
    return {
      category: new Map(),
      topic: new Map(),
      creator: new Map(),
      seen: new Set(),
    };
  }

  const [saves, completes, likes] = await Promise.all([
    prisma.slideoSave.findMany({
      where: { userId: Number(userId) },
      take: 120,
      orderBy: { createdAt: 'desc' },
      select: {
        slideoId: true,
        slideo: { select: { userId: true, slide: { select: { topic: { select: { id: true, categoryId: true } } } } } },
      },
    }),
    prisma.slideoCompletion.findMany({
      where: { userId: Number(userId) },
      take: 120,
      orderBy: { completedAt: 'desc' },
      select: {
        slideoId: true,
        slideo: { select: { userId: true, slide: { select: { topic: { select: { id: true, categoryId: true } } } } } },
      },
    }),
    prisma.slideoLike.findMany({
      where: { userId: Number(userId) },
      take: 120,
      orderBy: { createdAt: 'desc' },
      select: {
        slideoId: true,
        slideo: { select: { userId: true, slide: { select: { topic: { select: { id: true, categoryId: true } } } } } },
      },
    }),
  ]);

  const category = new Map();
  const topic = new Map();
  const creator = new Map();
  const seen = new Set();

  const apply = (rows, weight) => {
    for (const row of rows) {
      const s = row?.slideo;
      if (!s) continue;
      seen.add(row.slideoId);
      creator.set(s.userId, (creator.get(s.userId) || 0) + weight);
      const topicId = s.slide?.topic?.id;
      const categoryId = s.slide?.topic?.categoryId;
      if (topicId) topic.set(topicId, (topic.get(topicId) || 0) + weight);
      if (categoryId) category.set(categoryId, (category.get(categoryId) || 0) + weight);
    }
  };

  apply(saves, 2.4);
  apply(completes, 3.2);
  apply(likes, 1.4);

  return { category, topic, creator, seen };
};

const getFollowBoostMaps = async (userId) => {
  if (!userId) return { followedUsers: new Set(), followedCategories: new Set() };

  const [users, categories] = await Promise.all([
    prisma.followedUser.findMany({ where: { followerId: Number(userId) }, select: { followingId: true }, take: 1000 }),
    prisma.followedCategory.findMany({ where: { userId: Number(userId) }, select: { categoryId: true }, take: 1000 }),
  ]);

  return {
    followedUsers: new Set(users.map((x) => x.followingId)),
    followedCategories: new Set(categories.map((x) => x.categoryId)),
  };
};

const scoreItem = (item, affinity, follows) => {
  const topic = item?.slide?.topic;
  const creatorId = item?.user?.id;
  const topicId = topic?.id;
  const categoryId = topic?.categoryId || topic?.category?.id;

  const personal =
    (affinity.creator.get(creatorId) || 0) * 1.15 +
    (affinity.topic.get(topicId) || 0) * 1.2 +
    (affinity.category.get(categoryId) || 0) * 0.95;

  const similarity =
    (affinity.topic.get(topicId) || 0) * 0.8 +
    (affinity.category.get(categoryId) || 0) * 0.6;

  const followBoost =
    (follows.followedUsers.has(creatorId) ? 2.5 : 0) +
    (follows.followedCategories.has(categoryId) ? 1.3 : 0);

  const skipPenalty = affinity.seen.has(item.id) ? 1.8 : 0;

  const finalScore =
    legacyHotScore(item) * 0.55 +
    personal * 0.2 +
    similarity * 0.12 +
    followBoost * 0.08 +
    recencyDecay(item) * 0.07 -
    skipPenalty * 0.15;

  return {
    finalScore,
    components: {
      legacyHot: legacyHotScore(item),
      personal,
      similarity,
      followBoost,
      recency: recencyDecay(item),
      skipPenalty,
    },
  };
};

const overlapAtK = (legacyIds, shadowIds, k = 10) => {
  const left = legacyIds.slice(0, k);
  const right = new Set(shadowIds.slice(0, k));
  let matches = 0;
  for (const id of left) {
    if (right.has(id)) matches += 1;
  }
  return k > 0 ? matches / k : 0;
};

const persistShadowEvalBestEffort = async ({ subjectKey, surface, requestMeta, legacyIds, shadowItems }) => {
  try {
    const payload = {
      subjectKey,
      surface,
      requestMeta,
      legacyTop: legacyIds.slice(0, 20),
      shadowTop: shadowItems.slice(0, 20).map((x) => ({ id: x.id, score: Number(x.score.toFixed(6)) })),
      overlapAt10: overlapAtK(legacyIds, shadowItems.map((x) => x.id), 10),
      createdAt: new Date().toISOString(),
    };

    await prisma.analyticsEvent.create({
      data: {
        eventId: `rec-shadow-${crypto.randomUUID()}`,
        sessionId: `rec:${subjectKey}`.slice(0, 128),
        sequence: 0,
        eventType: 'rec_shadow_eval',
        payload: JSON.stringify(payload),
      },
    });
  } catch {
    // never block feed on shadow logging
  }
};

const runSlideoShadowEvaluation = async ({ req, subjectKey, items = [], page = 1, limit = 10, appliedSort = 'hot' }) => {
  if (!Array.isArray(items) || items.length === 0) return;

  const userId = req.user?.id ? Number(req.user.id) : null;
  const [affinity, follows] = await Promise.all([
    buildUserAffinity(userId),
    getFollowBoostMaps(userId),
  ]);

  const scored = items.map((item) => {
    const { finalScore, components } = scoreItem(item, affinity, follows);
    return {
      id: item.id,
      score: finalScore,
      components,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  await persistShadowEvalBestEffort({
    subjectKey,
    surface: 'slideo_feed',
    requestMeta: { page, limit, appliedSort, userId: userId || null },
    legacyIds: items.map((x) => x.id),
    shadowItems: scored,
  });
};

module.exports = {
  runSlideoShadowEvaluation,
};
