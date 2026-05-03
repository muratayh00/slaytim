const prisma = require('../lib/prisma');
const { sanitizeText } = require('../lib/sanitize');
const { toSlug, uniqueSlug } = require('../lib/slug');
const logger = require('../lib/logger');
const ttlCache = require('../lib/ttl-cache');
const { normalizeMediaUrls } = require('../lib/media-normalize');

const topicSelect = {
  id: true,
  title: true,
  description: true,
  slug: true,
  roomId: true,
  subcategoryId: true,
  likesCount: true,
  viewsCount: true,
  isSponsored: true,
  sponsorName: true,
  sponsorUrl: true,
  sponsorDisclosure: true,
  sponsorCampaignId: true,
  sponsoredFrom: true,
  sponsoredTo: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, username: true, avatarUrl: true } },
  category: { select: { id: true, name: true, slug: true, parentId: true, isMain: true } },
  subcategory: { select: { id: true, name: true, slug: true, parentId: true } },
  room: { select: { id: true, name: true, slug: true, isPublic: true } },
  pinnedSlideId: true,
  pinnedSlide: { select: { id: true, title: true, thumbnailUrl: true } },
  _count: { select: { slides: true, likes: true } },
};

const dedup = require('../lib/dedup');

const VIEW_DEDUP_TTL = parseInt(process.env.VIEW_DEDUP_TTL_SECONDS || '30', 10);

const getViewDedupKey = (req, topicId) => {
  const userPart = req.user?.id ? `u:${req.user.id}` : `ip:${req.ip || 'na'}`;
  const sessionPart = req.headers['x-view-session']
    ? `s:${String(req.headers['x-view-session'])}`
    : `ua:${(req.headers['user-agent'] || 'na').slice(0, 64)}`;
  return `topic:view:${topicId}|${userPart}|${sessionPart}`;
};

function clearTopicCaches() {
  ttlCache.clear('topic-feed');
  ttlCache.clear('topic-trending');
}

const resolveTopicCategorySelection = async ({ categoryId, mainCategoryId, subcategoryId }) => {
  const providedMain = Number(mainCategoryId ?? categoryId);
  if (!Number.isInteger(providedMain) || providedMain <= 0) {
    return { error: 'Gecerli ana kategori zorunlu' };
  }

  const main = await prisma.category.findUnique({
    where: { id: providedMain },
    select: { id: true, isMain: true, parentId: true, isActive: true },
  });
  if (!main || main.isActive === false) return { error: 'Kategori bulunamadi' };

  const resolvedMainId = main.parentId ? main.parentId : main.id;
  let resolvedSubcategoryId = null;

  const providedSub = Number(subcategoryId);
  if (Number.isInteger(providedSub) && providedSub > 0) {
    const sub = await prisma.category.findUnique({
      where: { id: providedSub },
      select: { id: true, parentId: true, isActive: true },
    });
    if (!sub || sub.isActive === false) return { error: 'Alt kategori bulunamadi' };
    if (!sub.parentId || sub.parentId !== resolvedMainId) {
      return { error: 'Alt kategori secili ana kategoriye ait degil' };
    }
    resolvedSubcategoryId = sub.id;
  } else if (main.parentId) {
    // Backward compatibility: when legacy categoryId points to a child category.
    resolvedSubcategoryId = main.id;
  }

  return { categoryId: resolvedMainId, subcategoryId: resolvedSubcategoryId };
};

// ?? Algorithm 1: Hot/Trending Score ??????????????????????????????????????????
// hot_score = (likes + slides*4 + views*0.05) / (age_hours + 2)^1.5
// Saves count 3x more than likes; new slides added to a topic boost velocity.
function calcHotScore(topic, ageHours) {
  const score = topic.likesCount * 1 + topic._count.slides * 4 + topic.viewsCount * 0.05;
  return score / Math.pow(ageHours + 2, 1.5);
}

// ?? Algorithm 2: Personalized feed score ?????????????????????????????????????
// personal_score = creator_affinity + category_affinity + freshness_boost
function calcPersonalScore(topic, followedUserIds, followedCategoryIds, visitedTopicIds, now) {
  let score = 0;
  if (followedUserIds.has(topic.userId)) score += 5;         // creator affinity
  if (followedCategoryIds.has(topic.categoryId)) score += 3; // category affinity
  if (visitedTopicIds.has(topic.id)) score -= 2;             // de-boost already seen

  // freshness: decay over 7 days
  const ageHours = (now - new Date(topic.createdAt).getTime()) / (1000 * 60 * 60);
  score += Math.max(0, 7 - ageHours / 24) * 0.5;

  // engagement quality
  score += topic._count.slides * 0.4;
  return score;
}

// ?? Algorithm 8: Search ranking score ????????????????????????????????????????
// search_score = text_relevance_bonus + quality_score
function calcSearchScore(item, q) {
  const lower = q.toLowerCase();
  let score = (item.savesCount || 0) * 3 + (item.likesCount || 0) * 1;
  if (item.title.toLowerCase().startsWith(lower)) score += 20;
  else if (item.title.toLowerCase().includes(lower)) score += 10;
  return score;
}

const withGuaranteedSlug = async (topic) => {
  if (!topic || typeof topic !== 'object') return topic;
  if (topic.slug) return topic;
  const base = toSlug(topic.title || '') || `topic-${topic.id}`;
  const slug = await uniqueSlug(prisma.topic, base, Number(topic.id));
  await prisma.topic.update({
    where: { id: Number(topic.id) },
    data: { slug },
  }).catch(() => {});
  return { ...topic, slug };
};

const withGuaranteedSlugs = async (topics) => {
  if (!Array.isArray(topics) || topics.length === 0) return topics || [];
  return Promise.all(topics.map((topic) => withGuaranteedSlug(topic)));
};

const getAll = async (req, res) => {
  try {
    const { category, roomId, sort = 'latest', page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const roomIdNum = roomId !== undefined ? Number(roomId) : null;

    let roomFilter = {};
    if (roomIdNum !== null) {
      if (!Number.isInteger(roomIdNum) || roomIdNum <= 0) {
        return res.status(400).json({ error: 'Gecerli oda id gerekli' });
      }
      const room = await prisma.room.findUnique({
        where: { id: roomIdNum },
        select: { id: true, isPublic: true },
      });
      if (!room) return res.status(404).json({ error: 'Oda bulunamadi' });

      if (!room.isPublic) {
        if (!req.user?.id) return res.status(401).json({ error: 'Bu oda gizli. Giris yapman gerekiyor' });
        const membership = await prisma.roomMember.findUnique({
          where: { roomId_userId: { roomId: roomIdNum, userId: req.user.id } },
          select: { roomId: true },
        });
        if (!membership) return res.status(403).json({ error: 'Bu gizli oda icin uye olmalisin' });
      }
      roomFilter = { roomId: roomIdNum };
    }

    const where = { isHidden: false, ...roomFilter, ...(category ? { category: { slug: category } } : {}) };
    const orderBy =
      sort === 'popular'
        ? { likesCount: 'desc' }
        : sort === 'views'
        ? { viewsCount: 'desc' }
        : { createdAt: 'desc' };

    const [topics, total] = await Promise.all([
      prisma.topic.findMany({ where, orderBy, skip, take: Number(limit), select: topicSelect }),
      prisma.topic.count({ where }),
    ]);

    const normalizedTopics = await withGuaranteedSlugs(topics);
    res.json(normalizeMediaUrls({ topics: normalizedTopics, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }));
  } catch (err) {
    logger.error('Failed to fetch topics', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
};

const getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const topicId = Number(id);
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        category: { select: { id: true, name: true, slug: true, parentId: true, isMain: true } },
        subcategory: { select: { id: true, name: true, slug: true, parentId: true } },
        pinnedSlide: { select: { id: true, title: true, thumbnailUrl: true } },
        _count: { select: { slides: true, likes: true } },
      },
    });
    if (!topic) return res.status(404).json({ error: 'Konu bulunamadı' });

    if (await dedup.check(getViewDedupKey(req, topicId), VIEW_DEDUP_TTL)) {
      await prisma.topic.update({ where: { id: topicId }, data: { viewsCount: { increment: 1 } } });
    }

    let isSubscribed = false;
    if (req.user) {
      await prisma.visitedTopic.upsert({
        where: { userId_topicId: { userId: req.user.id, topicId } },
        create: { userId: req.user.id, topicId },
        update: { visitedAt: new Date() },
      });
      const sub = await prisma.topicSubscription.findUnique({
        where: { userId_topicId: { userId: req.user.id, topicId } },
        select: { id: true },
      });
      isSubscribed = Boolean(sub);
    }

    const normalizedTopic = await withGuaranteedSlug(topic);
    res.json(normalizeMediaUrls({ ...normalizedTopic, isSubscribed }));
  } catch (err) {
    logger.error('Failed to fetch topic (getOne)', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Konu yüklenemedi' });
  }
};

const create = async (req, res) => {
  try {
    const { title: rawTitle, description: rawDesc, categoryId, mainCategoryId, subcategoryId, roomId } = req.body;
    const roomIdNum = roomId !== undefined && roomId !== null && String(roomId).trim() !== '' ? Number(roomId) : null;
    const title = sanitizeText(rawTitle, 200);
    const description = sanitizeText(rawDesc, 1000) || null;
    if (!title) return res.status(400).json({ error: 'Baslik zorunlu' });

    const selection = await resolveTopicCategorySelection({ categoryId, mainCategoryId, subcategoryId });
    if (selection.error) {
      return res.status(400).json({ error: selection.error });
    }

    if (roomIdNum !== null) {
      if (!Number.isInteger(roomIdNum) || roomIdNum <= 0) {
        return res.status(400).json({ error: 'Gecerli oda gerekli' });
      }
      const membership = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId: roomIdNum, userId: req.user.id } },
        select: { roomId: true },
      });
      if (!membership) {
        return res.status(403).json({ error: 'Bu oda icin konu acmak uzere once odaya katilmalisin' });
      }
    }

    const slug = await uniqueSlug(prisma.topic, toSlug(title));

    const topic = await prisma.topic.create({
      data: {
        title,
        description,
        categoryId: selection.categoryId,
        subcategoryId: selection.subcategoryId,
        roomId: roomIdNum,
        userId: req.user.id,
        slug,
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        category: { select: { id: true, name: true, slug: true, parentId: true, isMain: true } },
        subcategory: { select: { id: true, name: true, slug: true, parentId: true } },
        room: { select: { id: true, name: true, slug: true, isPublic: true } },
      },
    });
    clearTopicCaches();
    res.status(201).json(normalizeMediaUrls(topic));
  } catch (err) {
    logger.error('Failed to create topic', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Konu oluşturulamadı' });
  }
};

const getBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    let topic = await prisma.topic.findUnique({
      where: { slug },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        category: { select: { id: true, name: true, slug: true, parentId: true, isMain: true } },
        subcategory: { select: { id: true, name: true, slug: true, parentId: true } },
        pinnedSlide: { select: { id: true, title: true, thumbnailUrl: true } },
        _count: { select: { slides: true, likes: true } },
      },
    });
    if (!topic) {
      const idMatch = String(slug).match(/-(\d+)$/);
      if (idMatch) {
        const fallbackId = Number(idMatch[1]);
        if (Number.isInteger(fallbackId) && fallbackId > 0) {
          topic = await prisma.topic.findUnique({
            where: { id: fallbackId },
            include: {
              user: { select: { id: true, username: true, avatarUrl: true } },
              category: { select: { id: true, name: true, slug: true, parentId: true, isMain: true } },
              subcategory: { select: { id: true, name: true, slug: true, parentId: true } },
              pinnedSlide: { select: { id: true, title: true, thumbnailUrl: true } },
              _count: { select: { slides: true, likes: true } },
            },
          });
        }
      }
    }
    if (!topic) return res.status(404).json({ error: 'Konu bulunamadı' });
    if (await dedup.check(getViewDedupKey(req, topic.id), VIEW_DEDUP_TTL)) {
      await prisma.topic.update({ where: { id: topic.id }, data: { viewsCount: { increment: 1 } } });
    }
    let isSubscribed = false;
    if (req.user) {
      await prisma.visitedTopic.upsert({
        where: { userId_topicId: { userId: req.user.id, topicId: topic.id } },
        create: { userId: req.user.id, topicId: topic.id },
        update: { visitedAt: new Date() },
      });
      const sub = await prisma.topicSubscription.findUnique({
        where: { userId_topicId: { userId: req.user.id, topicId: topic.id } },
        select: { id: true },
      });
      isSubscribed = Boolean(sub);
    }
    const normalizedTopic = await withGuaranteedSlug(topic);
    res.json(normalizeMediaUrls({ ...normalizedTopic, isSubscribed }));
  } catch (err) {
    logger.error('Failed to fetch topic (getBySlug)', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch topic' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const topic = await prisma.topic.findUnique({ where: { id: Number(id) } });
    if (!topic) return res.status(404).json({ error: 'Konu bulunamadı' });
    if (topic.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { title: rawTitle, description: rawDesc, categoryId, mainCategoryId, subcategoryId } = req.body;
    const data = {};
    if (rawTitle !== undefined) {
      const title = sanitizeText(rawTitle, 200);
      if (!title) return res.status(400).json({ error: 'Başlık zorunlu' });
      data.title = title;
      data.slug = await uniqueSlug(prisma.topic, toSlug(title), Number(id));
    }
    if (rawDesc !== undefined) data.description = sanitizeText(rawDesc, 1000) || null;
    if (categoryId !== undefined || mainCategoryId !== undefined || subcategoryId !== undefined) {
      const selection = await resolveTopicCategorySelection({ categoryId, mainCategoryId, subcategoryId });
      if (selection.error) return res.status(400).json({ error: selection.error });
      data.categoryId = selection.categoryId;
      data.subcategoryId = selection.subcategoryId;
    }
    const updated = await prisma.topic.update({ where: { id: Number(id) }, data, select: topicSelect });
    clearTopicCaches();
    res.json(normalizeMediaUrls(updated));
  } catch (err) {
    logger.error('Failed to update topic', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to update topic' });
  }
};

const pinSlide = async (req, res) => {
  try {
    const topicId = Number(req.params.id);
    if (!Number.isInteger(topicId) || topicId <= 0) {
      return res.status(400).json({ error: 'Invalid topic id' });
    }

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      select: { id: true, userId: true },
    });
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    if (topic.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const rawSlideId = req.body?.slideId;
    if (rawSlideId === null || rawSlideId === undefined || String(rawSlideId).trim() === '') {
      const updated = await prisma.topic.update({
        where: { id: topicId },
        data: { pinnedSlideId: null },
        select: topicSelect,
      });
      clearTopicCaches();
      return res.json(normalizeMediaUrls(updated));
    }

    const slideId = Number(rawSlideId);
    if (!Number.isInteger(slideId) || slideId <= 0) {
      return res.status(400).json({ error: 'Invalid slide id' });
    }

    const slide = await prisma.slide.findUnique({
      where: { id: slideId },
      select: { id: true, topicId: true, isHidden: true, deletedAt: true },
    });
    if (!slide || slide.topicId !== topicId || slide.isHidden || slide.deletedAt) {
      return res.status(404).json({ error: 'Slide not found in this topic' });
    }

    const updated = await prisma.topic.update({
      where: { id: topicId },
      data: { pinnedSlideId: slideId },
      select: topicSelect,
    });
    clearTopicCaches();
    return res.json(normalizeMediaUrls(updated));
  } catch (err) {
    logger.error('Failed to pin slide', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to pin slide' });
  }
};

// Algorithm 1 applied: hot score with time decay
const getTrending = async (req, res) => {
  try {
    const cached = ttlCache.get('topic-trending', 'default');
    if (cached) return res.json(normalizeMediaUrls(cached));

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // last 30 days
    const topics = await prisma.topic.findMany({
      where: { isHidden: false, createdAt: { gte: since } },
      take: 150,
      select: topicSelect,
    });

    const now = Date.now();
    const scored = topics
      .map((t) => {
        const ageHours = (now - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
        return { ...t, _hotScore: calcHotScore(t, ageHours) };
      })
      .sort((a, b) => b._hotScore - a._hotScore)
      .slice(0, 10)
      .map(({ _hotScore, ...t }) => t);

    const normalized = await withGuaranteedSlugs(scored);
    ttlCache.set('topic-trending', 'default', normalized, 30_000);
    res.json(normalizeMediaUrls(normalized));
  } catch (err) {
    logger.error('Failed to fetch trending topics', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch trending topics' });
  }
};

// Turkish character normalization for case-insensitive search
// "İstanbul" -> "istanbul", "şehir" -> "sehir"
function normalizeTr(str) {
  return str
    .replace(/İ/g, 'i').replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
    .replace(/Ş/g, 's').replace(/ş/g, 's')
    .replace(/Ü/g, 'u').replace(/ü/g, 'u')
    .replace(/Ö/g, 'o').replace(/ö/g, 'o')
    .replace(/Ç/g, 'c').replace(/ç/g, 'c')
    .toLowerCase();
}

// Algorithm 8 applied: title-weight + quality score + Turkish normalize + pagination
const search = async (req, res) => {
  try {
    const { q = '' } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit) || 10));
    if (!q.trim()) {
      return res.json(normalizeMediaUrls({
        topics: [],
        slides: [],
        total: 0,
        page,
        pages: 0,
        totals: { topics: 0, slides: 0, all: 0 },
        paging: { topics: 0, slides: 0, max: 0 },
      }));
    }

    const qNorm = normalizeTr(q);
    // Build OR conditions: original + normalized variant (covers Turkish case-insensitivity)
    const makeOr = (q, qNorm) => {
      // mode: 'insensitive' makes PostgreSQL use ILIKE so "figma" matches "Figma".
      const conditions = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
      if (qNorm !== q.toLowerCase()) {
        conditions.push(
          { title: { contains: qNorm, mode: 'insensitive' } },
          { description: { contains: qNorm, mode: 'insensitive' } },
        );
      }
      return conditions;
    };

    const slideSelect = {
      id: true, title: true, description: true,
      likesCount: true, savesCount: true, createdAt: true,
      thumbnailUrl: true,
      user: { select: { id: true, username: true, avatarUrl: true } },
      topic: { select: { id: true, title: true, category: { select: { name: true, slug: true } } } },
    };

    const [rawTopics, rawSlides] = await Promise.all([
      prisma.topic.findMany({ where: { isHidden: false, OR: makeOr(q, qNorm) }, take: 30, select: topicSelect }),
      prisma.slide.findMany({ where: { isHidden: false, OR: makeOr(q, qNorm) }, take: 30, select: slideSelect }),
    ]);

    // Deduplicate by id (same item can match multiple OR conditions)
    const dedup = (arr) => [...new Map(arr.map((x) => [x.id, x])).values()];

    const scoreAndSort = (arr) =>
      dedup(arr)
        .map((x) => ({ ...x, _s: calcSearchScore(x, q) + calcSearchScore(x, qNorm) }))
        .sort((a, b) => b._s - a._s)
        .map(({ _s, ...x }) => x);

    const allTopics = await withGuaranteedSlugs(scoreAndSort(rawTopics));
    const allSlides = scoreAndSort(rawSlides);

    const topicTotal = allTopics.length;
    const slideTotal = allSlides.length;
    const total = topicTotal + slideTotal;
    const topicPages = Math.ceil(topicTotal / limit);
    const slidePages = Math.ceil(slideTotal / limit);
    const maxPages = Math.max(topicPages, slidePages);
    const topicsPage = allTopics.slice((page - 1) * limit, page * limit);
    const slidesPage = allSlides.slice((page - 1) * limit, page * limit);

    res.json(normalizeMediaUrls({
      topics: topicsPage,
      slides: slidesPage,
      total,
      page,
      pages: maxPages,
      totals: { topics: topicTotal, slides: slideTotal, all: total },
      paging: { topics: topicPages, slides: slidePages, max: maxPages },
    }));
  } catch (err) {
    logger.error('Search failed', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Search failed' });
  }
};

// Algorithm 2 applied: personalized feed with affinity scoring
const getFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const cacheKey = `u:${userId}|p:${pageNum}|l:${limitNum}`;
    const cached = ttlCache.get('topic-feed', cacheKey);
    if (cached) return res.json(normalizeMediaUrls(cached));

    const [followedUsers, followedCategories, recentVisits, likedTopics, savedSlides] = await Promise.all([
      prisma.followedUser.findMany({ where: { followerId: userId }, select: { followingId: true } }),
      prisma.followedCategory.findMany({ where: { userId }, select: { categoryId: true } }),
      prisma.visitedTopic.findMany({
        where: { userId },
        select: { topicId: true },
        orderBy: { visitedAt: 'desc' },
        take: 50,
      }),
      prisma.topicLike.findMany({
        where: { userId },
        select: { topicId: true },
        take: 120,
      }),
      prisma.savedSlide.findMany({
        where: { userId },
        select: {
          slide: {
            select: {
              topicId: true,
              topic: { select: { categoryId: true } },
            },
          },
        },
        take: 120,
      }),
    ]);

    const followedUserIds = new Set(followedUsers.map((f) => f.followingId));
    const followedCategoryIds = new Set(followedCategories.map((f) => f.categoryId));
    const visitedTopicIds = new Set(recentVisits.map((v) => v.topicId));
    const interactedTopicIds = new Set(likedTopics.map((x) => x.topicId));
    const interactedCategoryIds = new Set();
    for (const row of savedSlides) {
      if (row?.slide?.topicId) interactedTopicIds.add(row.slide.topicId);
      if (row?.slide?.topic?.categoryId) interactedCategoryIds.add(row.slide.topic.categoryId);
    }

    const affinityUserIds = [...followedUserIds];
    const affinityCategoryIds = [...new Set([...followedCategoryIds, ...interactedCategoryIds])];
    const affinityTopicIds = [...interactedTopicIds];

    const whereOr = [
      ...(affinityUserIds.length > 0 ? [{ userId: { in: affinityUserIds } }] : []),
      ...(affinityCategoryIds.length > 0 ? [{ categoryId: { in: affinityCategoryIds } }] : []),
      ...(affinityTopicIds.length > 0 ? [{ id: { in: affinityTopicIds } }] : []),
    ];

    // Fetch more than needed so we can re-rank in JS.
    const fetchLimit = Math.min(limitNum * 4, 160);
    let rawTopics = [];
    let total = 0;
    let isFallback = false;

    if (whereOr.length > 0) {
      const where = { isHidden: false, OR: whereOr };
      [rawTopics, total] = await Promise.all([
        prisma.topic.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: fetchLimit,
          select: topicSelect,
        }),
        prisma.topic.count({ where }),
      ]);
    }

    if (!rawTopics.length) {
      // Cold-start fallback: never return empty feed to active users.
      isFallback = true;
      const where = { isHidden: false };
      [rawTopics, total] = await Promise.all([
        prisma.topic.findMany({
          where,
          orderBy: [{ likesCount: 'desc' }, { viewsCount: 'desc' }, { createdAt: 'desc' }],
          take: fetchLimit,
          select: topicSelect,
        }),
        prisma.topic.count({ where }),
      ]);
    }

    const now = Date.now();
    const sorted = rawTopics
      .map((t) => ({
        ...t,
        _ps:
          calcPersonalScore(t, followedUserIds, followedCategoryIds, visitedTopicIds, now) +
          (interactedTopicIds.has(t.id) ? 2.5 : 0) +
          (interactedCategoryIds.has(t.category.id) ? 1.4 : 0),
      }))
      .sort((a, b) => b._ps - a._ps)
      .slice((pageNum - 1) * limitNum, pageNum * limitNum)
      .map(({ _ps, ...t }) => t);

    const payload = {
      topics: sorted,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      isEmpty: sorted.length === 0,
      isFallback,
    };
    ttlCache.set('topic-feed', cacheKey, payload, 15_000);
    res.json(normalizeMediaUrls(payload));
  } catch (err) {
    logger.error('Failed to fetch feed', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
};

const toggleSubscription = async (req, res) => {
  try {
    const topicId = Number(req.params.id);
    if (!Number.isInteger(topicId) || topicId <= 0) {
      return res.status(400).json({ error: 'Invalid topic id' });
    }
    const topic = await prisma.topic.findUnique({ where: { id: topicId }, select: { id: true, isHidden: true } });
    if (!topic || topic.isHidden) return res.status(404).json({ error: 'Topic not found' });

    const existing = await prisma.topicSubscription.findUnique({
      where: { userId_topicId: { userId: req.user.id, topicId } },
    });
    if (existing) {
      await prisma.topicSubscription.delete({ where: { id: existing.id } });
      ttlCache.del('topic-feed', `u:${req.user.id}|p:1|l:20`);
      return res.json({ subscribed: false });
    }

    await prisma.topicSubscription.create({
      data: { userId: req.user.id, topicId, notifyNewSlides: true },
    });
    ttlCache.del('topic-feed', `u:${req.user.id}|p:1|l:20`);
    res.json({ subscribed: true });
  } catch (err) {
    logger.error('Failed to toggle subscription', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to toggle subscription' });
  }
};

const getMySubscriptions = async (req, res) => {
  try {
    const rows = await prisma.topicSubscription.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        topic: {
          select: {
            id: true,
            title: true,
            slug: true,
            category: { select: { id: true, name: true, slug: true } },
            user: { select: { id: true, username: true } },
          },
        },
      },
      take: 100,
    });
    res.json(normalizeMediaUrls({ topics: rows.map((r) => r.topic).filter(Boolean) }));
  } catch (err) {
    logger.error('Failed to fetch subscriptions', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
};

module.exports = { getAll, getOne, getBySlug, create, update, pinSlide, getTrending, search, getFeed, toggleSubscription, getMySubscriptions };

