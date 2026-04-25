const prisma = require('../lib/prisma');
const { sanitizeText } = require('../lib/sanitize');
const { hasAdminAccess } = require('../lib/rbac');
const logger = require('../lib/logger');
const { normalizeMediaUrls } = require('../lib/media-normalize');

// Per-user rate-limit for GET /me/recent-topics — max one DB query per 10s.
// Returns a 200 with empty topics so the client degrades silently.
const RECENT_TOPICS_MIN_INTERVAL_MS = 10_000;
const recentTopicsLastCall = new Map(); // userId -> lastCallMs
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [k, v] of recentTopicsLastCall) {
    if (v < cutoff) recentTopicsLastCall.delete(k);
  }
}, 60_000).unref();

const getProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true, username: true, avatarUrl: true, bio: true, createdAt: true,
        _count: {
          select: {
            topics: true, slides: true,
            following: true, followers: true, slideos: true,
          },
        },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [slideAgg, topCategoryRaw, slideoAgg] = await Promise.all([
      prisma.slide.aggregate({
        where: { userId: user.id },
        _sum: { viewsCount: true, savesCount: true, likesCount: true },
      }),
      prisma.topic.groupBy({
        by: ['categoryId'],
        where: { userId: user.id },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1,
      }),
      prisma.slideo.aggregate({
        where: { userId: user.id },
        _sum: { viewsCount: true, likesCount: true },
      }),
    ]);

    let topCategory = null;
    if (topCategoryRaw.length > 0) {
      const cat = await prisma.category.findUnique({ where: { id: topCategoryRaw[0].categoryId } });
      if (cat) topCategory = { name: cat.name, slug: cat.slug };
    }

    res.json(normalizeMediaUrls({
      ...user,
      stats: {
        totalSlideViews: slideAgg._sum.viewsCount || 0,
        totalSlideSaves: slideAgg._sum.savesCount || 0,
        totalSlideLikes: slideAgg._sum.likesCount || 0,
        totalSlideoViews: slideoAgg._sum.viewsCount || 0,
        totalSlideoLikes: slideoAgg._sum.likesCount || 0,
        topCategory,
      },
    }));
  } catch (err) {
    logger.error('Failed to fetch profile', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

const getProfileDetails = async (req, res) => {
  try {
    const { username } = req.params;
    if (!req.user || (req.user.username !== username && !hasAdminAccess(req.user))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [likedSlides, likedTopics, savedSlides, followedCategories, followedUsers, followers, visitedTopics] =
      await Promise.all([
        prisma.slideLike.findMany({
          where: { userId: user.id },
          include: {
            slide: {
              select: {
                id: true, title: true, fileUrl: true, thumbnailUrl: true,
                likesCount: true, savesCount: true, viewsCount: true, createdAt: true,
                user: { select: { id: true, username: true, avatarUrl: true } },
                topic: { select: { id: true, title: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.topicLike.findMany({
          where: { userId: user.id },
          include: {
            topic: {
              select: {
                id: true, title: true, likesCount: true, viewsCount: true, createdAt: true,
                user: { select: { id: true, username: true } },
                category: { select: { name: true, slug: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.savedSlide.findMany({
          where: { userId: user.id },
          include: {
            slide: {
              select: {
                id: true, title: true, fileUrl: true, thumbnailUrl: true,
                likesCount: true, savesCount: true, viewsCount: true, createdAt: true,
                user: { select: { id: true, username: true, avatarUrl: true } },
                topic: { select: { id: true, title: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.followedCategory.findMany({
          where: { userId: user.id },
          include: { category: { select: { id: true, name: true, slug: true } } },
        }),
        prisma.followedUser.findMany({
          where: { followerId: user.id },
          include: {
            following: { select: { id: true, username: true, avatarUrl: true, bio: true } },
          },
        }),
        prisma.followedUser.findMany({
          where: { followingId: user.id },
          include: {
            follower: { select: { id: true, username: true, avatarUrl: true, bio: true } },
          },
          take: 50,
        }),
        prisma.visitedTopic.findMany({
          where: { userId: user.id },
          include: {
            topic: {
              select: {
                id: true, title: true, viewsCount: true,
                category: { select: { name: true, slug: true } },
                user: { select: { id: true, username: true } },
              },
            },
          },
          orderBy: { visitedAt: 'desc' },
          take: 10,
        }),
      ]);

    res.json(normalizeMediaUrls({
      likedSlides: likedSlides.map((l) => l.slide),
      likedTopics: likedTopics.map((l) => l.topic),
      savedSlides: savedSlides.map((s) => s.slide),
      followedCategories: followedCategories.map((f) => f.category),
      followedUsers: followedUsers.map((f) => f.following),
      followers: followers.map((f) => f.follower),
      visitedTopics: visitedTopics.map((v) => v.topic),
    }));
  } catch (err) {
    logger.error('Failed to fetch profile details', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch profile details' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { bio, avatarUrl } = req.body;

    // Server-side validation
    if (bio !== undefined && bio !== null && typeof bio === 'string' && bio.length > 200) {
      return res.status(400).json({ error: 'Bio en fazla 200 karakter olabilir' });
    }
    if (avatarUrl !== undefined && avatarUrl !== null && avatarUrl !== '') {
      if (typeof avatarUrl !== 'string' || avatarUrl.length > 500) {
        return res.status(400).json({ error: 'Geçersiz avatarUrl' });
      }
      if (!/^https?:\/\//i.test(avatarUrl)) {
        return res.status(400).json({ error: 'avatarUrl geçerli bir https:// adresi olmalı' });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        bio: bio !== undefined ? (sanitizeText(bio, 200) || null) : undefined,
        avatarUrl: avatarUrl !== undefined ? (avatarUrl?.trim() || null) : undefined,
      },
      select: { id: true, username: true, email: true, avatarUrl: true, bio: true },
    });
    res.json(user);
  } catch (err) {
    logger.error('Failed to update profile', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const getUserTopics = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const topics = await prisma.topic.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, slug: true, title: true, description: true, likesCount: true, viewsCount: true, createdAt: true,
        category: { select: { name: true, slug: true } },
        _count: { select: { slides: true } },
      },
    });
    res.json(topics);
  } catch (err) {
    logger.error('Failed to fetch user topics', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch user topics' });
  }
};

const getUserSlideos = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const slideos = await prisma.slideo.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true, title: true, description: true, pageIndices: true, coverPage: true,
        viewsCount: true, likesCount: true, savesCount: true, createdAt: true,
        slide: {
          select: {
            id: true, title: true, pdfUrl: true, thumbnailUrl: true, conversionStatus: true,
            topic: { select: { id: true, title: true, category: { select: { name: true, slug: true } } } },
          },
        },
      },
    });
    res.json(normalizeMediaUrls(slideos.map(s => {
      let pageIndices = [];
      try { pageIndices = JSON.parse(s.pageIndices || '[]'); } catch {}
      return { ...s, pageIndices };
    })));
  } catch (err) {
    logger.error('Failed to fetch user slideos', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch user slideos' });
  }
};

const searchUsers = async (req, res) => {
  try {
    const { q = '' } = req.query;
    if (!q.trim()) return res.json([]);

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q } },
          { bio: { contains: q } },
        ],
      },
      select: {
        id: true, username: true, avatarUrl: true, bio: true,
        _count: { select: { topics: true, followers: true } },
      },
      take: 20,
    });
    res.json(normalizeMediaUrls(users));
  } catch (err) {
    logger.error('User search failed', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'User search failed' });
  }
};


const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    // Cascade via Prisma relations — all user data removed
    await prisma.user.delete({ where: { id: userId } });
    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to delete account', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

const getMyRecentTopics = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = Date.now();
    const last = recentTopicsLastCall.get(userId) || 0;
    if (now - last < RECENT_TOPICS_MIN_INTERVAL_MS) {
      // Called too soon — return empty payload silently (frontend handles gracefully).
      return res.json({ topics: [] });
    }
    recentTopicsLastCall.set(userId, now);

    const rows = await prisma.visitedTopic.findMany({
      where: { userId: req.user.id },
      orderBy: { visitedAt: 'desc' },
      take: 15,
      select: {
        visitedAt: true,
        topic: {
          select: {
            id: true,
            title: true,
            slug: true,
            isHidden: true,
            deletedAt: true,
          },
        },
      },
    });

    const topics = rows
      .filter((r) => r.topic && !r.topic.isHidden && !r.topic.deletedAt)
      .map((r) => ({
        id: r.topic.id,
        title: r.topic.title,
        slug: r.topic.slug,
        visitedAt: r.visitedAt,
      }));

    res.json({ topics });
  } catch (err) {
    logger.error('Failed to fetch recent topics', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch recent topics' });
  }
};

// GET /api/users/me/notification-prefs
const getNotificationPrefs = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { notifyOnLike: true, notifyOnComment: true, notifyOnFollow: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    logger.error('Failed to fetch notification prefs', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch notification prefs' });
  }
};

// PATCH /api/users/me/notification-prefs
const updateNotificationPrefs = async (req, res) => {
  try {
    const allowed = ['notifyOnLike', 'notifyOnComment', 'notifyOnFollow'];
    const data = {};
    for (const key of allowed) {
      if (typeof req.body[key] === 'boolean') data[key] = req.body[key];
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { notifyOnLike: true, notifyOnComment: true, notifyOnFollow: true },
    });
    res.json(updated);
  } catch (err) {
    logger.error('Failed to update notification prefs', { error: err.message });
    res.status(500).json({ error: 'Failed to update notification prefs' });
  }
};

module.exports = { getProfile, getProfileDetails, updateProfile, getUserTopics, getUserSlideos, searchUsers, deleteAccount, getMyRecentTopics, getNotificationPrefs, updateNotificationPrefs };
