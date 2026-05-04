/**
 * Slideo hot-feed cache with cold-start injection.
 *
 * Cache lifecycle
 * ───────────────
 * rebuildHotFeedCache()  runs at most once per HOT_FEED_CACHE_TTL_MS (60 s).
 * It produces:
 *   rankedIds[]      – all hot-pool IDs sorted by time-decayed score (desc).
 *   coldStartIds[]   – subset of rankedIds that are still in cold-start phase,
 *                      sorted by coldStartImpressions ASC (least-seen first).
 *   coldStartIdSet   – Set<number> for O(1) membership test.
 *
 * Per-request work (getHotFeedPage)
 * ───────────────────────────────────
 * 1. Slice hot page from rankedIds.
 * 2. Count how many cold-start items landed in the page naturally (via boost).
 * 3. Fill remaining cold-start slots (up to COLD_START_MAX_RATIO of page)
 *    by injecting items from coldStartIds that are NOT already on the page.
 *    Pool offset = (page − 1) × slotsPerPage so consecutive pages pull
 *    different items from the pool (deterministic, no randomness).
 * 4. Fetch full rows for the final page IDs and return in order.
 *
 * Score formula
 * ─────────────
 *   score = (hot + coldStartBoost + noViewBonus) / (ageHours + 2)^1.2
 *
 *   hot          = likes×1 + saves×5 + shares×4 + completions×6 + views×0.1
 *   coldStartBoost  = Slideo.coldStartBoost  (50 new → 20/5/0 after eval)
 *   noViewBonus  = +10 if coldStartActive AND ageHours ≥ 1 AND impressions < 5
 *                  (protects content that slipped through without any views)
 */

const prisma = require('../lib/prisma');

const HOT_WINDOW_DAYS        = 30;
const HOT_FEED_POOL_SIZE     = 300;
const HOT_FEED_CACHE_TTL_MS  = 60_000;   // 60 s
const COLD_START_MAX_RATIO   = 0.20;     // max 20 % of any page may be cold-start
const NO_VIEW_HOUR_THRESHOLD = 1;        // hours alive before no-view bonus kicks in
const NO_VIEW_IMP_THRESHOLD  = 5;        // impressions below which bonus applies
const NO_VIEW_BONUS          = 10;       // extra score points

let hotFeedCache = null;

/* ── Score ──────────────────────────────────────────────────────────────── */

function calcSlideoScore(slideo, ageHours) {
  const hot =
    slideo.likesCount       * 1   +
    slideo.savesCount       * 5   +
    slideo.shareCount       * 4   +
    (slideo.completionCount || 0) * 6 +
    slideo.viewsCount       * 0.1;

  const boost = slideo.coldStartBoost || 0;

  // No-view protection: a cold-start item that's been live ≥ 1 h but has
  // fewer than 5 impressions gets a temporary +10 to ensure it surfaces.
  const noViewBonus =
    slideo.coldStartActive &&
    ageHours >= NO_VIEW_HOUR_THRESHOLD &&
    (slideo.coldStartImpressions || 0) < NO_VIEW_IMP_THRESHOLD
      ? NO_VIEW_BONUS
      : 0;

  return (hot + boost + noViewBonus) / Math.pow(ageHours + 2, 1.2);
}

/* ── Cache rebuild ──────────────────────────────────────────────────────── */

async function rebuildHotFeedCache() {
  const since = new Date(Date.now() - HOT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Single query: newest 300 visible slideos in the hot window.
  const rawSlideos = await prisma.slideo.findMany({
    where:   { createdAt: { gte: since }, isHidden: false },
    take:    HOT_FEED_POOL_SIZE,
    orderBy: { createdAt: 'desc' },
    select:  {
      id:                   true,
      createdAt:            true,
      likesCount:           true,
      savesCount:           true,
      shareCount:           true,
      viewsCount:           true,
      coldStartBoost:       true,
      coldStartActive:      true,
      coldStartImpressions: true,
    },
  });

  // Completion counts — single aggregation for the whole pool.
  const completionAgg = await prisma.slideoCompletion.groupBy({
    by:    ['slideoId'],
    _count: { _all: true },
    where: { slideoId: { in: rawSlideos.map((s) => s.id) } },
  });
  const completionMap = new Map(
    completionAgg.map((r) => [r.slideoId, r._count._all || 0]),
  );

  const now = Date.now();

  // Score every item and sort descending.
  const scored = rawSlideos
    .map((s) => {
      const ageHours =
        (now - new Date(s.createdAt).getTime()) / (1000 * 60 * 60);
      return {
        id:                   s.id,
        score:                calcSlideoScore(
          { ...s, completionCount: completionMap.get(s.id) || 0 },
          ageHours,
        ),
        coldStartActive:      Boolean(s.coldStartActive),
        coldStartImpressions: s.coldStartImpressions || 0,
      };
    })
    .sort((a, b) => b.score - a.score);

  const rankedIds = scored.map((s) => s.id);

  // Cold-start pool: active items sorted by fewest impressions first.
  // Only items already inside the hot window (virtually all new content).
  const coldStartItems = scored
    .filter((s) => s.coldStartActive)
    .sort((a, b) => a.coldStartImpressions - b.coldStartImpressions);

  const coldStartIds   = coldStartItems.map((s) => s.id);
  const coldStartIdSet = new Set(coldStartIds);

  hotFeedCache = {
    rankedIds,
    coldStartIds,
    coldStartIdSet,
    total:     rankedIds.length,
    expiresAt: Date.now() + HOT_FEED_CACHE_TTL_MS,
  };

  return hotFeedCache;
}

/* ── Page retrieval + injection ─────────────────────────────────────────── */

async function getHotFeedPage(page, limit, select, userId = null) {
  const cache =
    hotFeedCache && hotFeedCache.expiresAt > Date.now()
      ? hotFeedCache
      : await rebuildHotFeedCache();

  let rankedIds = cache.rankedIds;
  let seenIds   = new Set(); // items this user has already interacted with

  /* ── Personalization (logged-in users) ─────────────────────────────── */
  if (userId) {
    const profileRows = await prisma.slideo.findMany({
      where:  { id: { in: cache.rankedIds.slice(0, 200) } },
      select: {
        id:     true,
        userId: true,
        slide:  { select: { topic: { select: { id: true, categoryId: true } } } },
      },
    });
    const profileById = new Map(profileRows.map((r) => [r.id, r]));

    const [savedRows, shareRows, completionRows] = await Promise.all([
      prisma.slideoSave.findMany({
        where:  { userId: Number(userId) },
        select: {
          slideoId: true,
          slideo: { select: { userId: true, slide: { select: { topic: { select: { id: true, categoryId: true } } } } } },
        },
        take: 200,
      }),
      prisma.slideoShare.findMany({
        where:  { userId: Number(userId) },
        select: {
          slideoId: true,
          slideo: { select: { userId: true, slide: { select: { topic: { select: { id: true, categoryId: true } } } } } },
        },
        take: 200,
      }),
      prisma.slideoCompletion.findMany({
        where:  { userId: Number(userId) },
        select: {
          slideoId: true,
          slideo: { select: { userId: true, slide: { select: { topic: { select: { id: true, categoryId: true } } } } } },
        },
        take: 200,
      }),
    ]);

    const creatorAffinity  = new Map();
    const categoryAffinity = new Map();
    const topicAffinity    = new Map();

    const applySignal = (rows, weight) => {
      for (const row of rows) {
        if (!row?.slideo) continue;
        seenIds.add(row.slideoId);
        const creatorId  = row.slideo.userId;
        const topicId    = row.slideo.slide?.topic?.id;
        const categoryId = row.slideo.slide?.topic?.categoryId;
        creatorAffinity.set(creatorId, (creatorAffinity.get(creatorId) || 0) + weight);
        if (topicId)    topicAffinity.set(topicId, (topicAffinity.get(topicId) || 0) + weight);
        if (categoryId) categoryAffinity.set(categoryId, (categoryAffinity.get(categoryId) || 0) + weight);
      }
    };

    applySignal(savedRows,      2);
    applySignal(shareRows,      2.5);
    applySignal(completionRows, 3);

    rankedIds = cache.rankedIds.slice(0, 200).sort((a, b) => {
      const rowA  = profileById.get(a);
      const rowB  = profileById.get(b);
      if (!rowA || !rowB) return 0;
      const topA  = rowA.slide?.topic;
      const topB  = rowB.slide?.topic;
      const sA    =
        (creatorAffinity.get(rowA.userId)   || 0) * 1.2 +
        (topicAffinity.get(topA?.id)        || 0) * 1.1 +
        (categoryAffinity.get(topA?.categoryId) || 0) * 0.9 -
        (seenIds.has(a) ? 3 : 0);
      const sB    =
        (creatorAffinity.get(rowB.userId)   || 0) * 1.2 +
        (topicAffinity.get(topB?.id)        || 0) * 1.1 +
        (categoryAffinity.get(topB?.categoryId) || 0) * 0.9 -
        (seenIds.has(b) ? 3 : 0);
      return sB - sA;
    });
  }

  /* ── Hot page slice ─────────────────────────────────────────────────── */
  const start       = (page - 1) * limit;
  let   pageIds     = rankedIds.slice(start, start + limit);
  const pageIdSet   = new Set(pageIds);

  /* ── Cold-start injection ───────────────────────────────────────────── */
  // How many cold-start slots can this page carry?
  const maxColdSlots = Math.max(1, Math.floor(limit * COLD_START_MAX_RATIO));

  // How many cold-start items are ALREADY in the page (via score boost)?
  const naturalColdCount = pageIds.filter((id) => cache.coldStartIdSet.has(id)).length;
  const slotsAvailable   = Math.max(0, maxColdSlots - naturalColdCount);

  if (slotsAvailable > 0) {
    // Deterministic pool offset: each page pulls the NEXT slice of the pool.
    // The pool is sorted by impressions ASC so least-seen items go first.
    const poolOffset = (page - 1) * maxColdSlots;

    const toInject = cache.coldStartIds
      .filter((id) => !pageIdSet.has(id) && !seenIds.has(id))
      .slice(poolOffset, poolOffset + slotsAvailable);

    if (toInject.length > 0) {
      // Replace the tail of the hot page with cold-start items.
      // This preserves the top-ranked positions for proven content.
      pageIds = [
        ...pageIds.slice(0, pageIds.length - toInject.length),
        ...toInject,
      ];
    }
  }

  /* ── Fetch full rows ────────────────────────────────────────────────── */
  if (pageIds.length === 0) {
    return {
      slideos: [],
      total:   cache.total,
      page,
      hasMore: page * limit < cache.total,
    };
  }

  const rows  = await prisma.slideo.findMany({
    where:  { id: { in: pageIds } },
    select,
  });
  const byId  = new Map(rows.map((r) => [r.id, r]));
  const ordered = pageIds.map((id) => byId.get(id)).filter(Boolean);

  return {
    slideos: ordered,
    total:   rankedIds.length,
    page,
    hasMore: page * limit < rankedIds.length,
  };
}

/* ── Cache invalidation ─────────────────────────────────────────────────── */

function invalidateHotFeedCache() {
  hotFeedCache = null;
}

module.exports = {
  getHotFeedPage,
  invalidateHotFeedCache,
};
