const prisma = require('../lib/prisma');
const { sanitizeText } = require('../lib/sanitize');
const { hasAdminAccess } = require('../lib/rbac');
const logger = require('../lib/logger');

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

    res.json({
      ...user,
      stats: {
        totalSlideViews: slideAgg._sum.viewsCount || 0,
        totalSlideSaves: slideAgg._sum.savesCount || 0,
        totalSlideLikes: slideAgg._sum.likesCount || 0,
        totalSlideoViews: slideoAgg._sum.viewsCount || 0,
        totalSlideoLikes: slideoAgg._sum.likesCount || 0,
        topCategory,
      },
    });
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

    res.json({
      likedSlides: likedSlides.map((l) => l.slide),
      likedTopics: likedTopics.map((l) => l.topic),
      savedSlides: savedSlides.map((s) => s.slide),
      followedCategories: followedCategories.map((f) => f.category),
      followedUsers: followedUsers.map((f) => f.following),
      followers: followers.map((f) => f.follower),
      visitedTopics: visitedTopics.map((v) => v.topic),
    });
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
    res.json(slideos.map(s => {
      let pageIndices = [];
      try { pageIndices = JSON.parse(s.pageIndices || '[]'); } catch {}
      return { ...s, pageIndices };
    }));
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
    res.json(users);
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

module.exports = { getProfile, getProfileDetails, updateProfile, getUserTopics, getUserSlideos, searchUsers, deleteAccount, getMyRecentTopics };
