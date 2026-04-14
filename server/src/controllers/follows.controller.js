const prisma = require('../lib/prisma');
const { checkBadges } = require('../services/badge.service');
const { createNotification } = require('../lib/notify');
const logger = require('../lib/logger');

const toPageNumber = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const getSessionKey = (req, slideId) => {
  const header = req.headers['x-view-session'];
  if (header) return `${slideId}:s:${String(header).slice(0, 96)}`;
  const ip = req.ip || 'na';
  const ua = (req.headers['user-agent'] || 'na').slice(0, 80);
  return `${slideId}:ip:${ip}:ua:${ua}`;
};

const trackFollowConversionFromSlide = async (req) => {
  const sourceSlideId = Number(req.body?.sourceSlideId);
  const sourcePageNumber = toPageNumber(req.body?.sourcePageNumber);
  if (!Number.isInteger(sourceSlideId) || sourceSlideId <= 0 || !sourcePageNumber) return;

  const sessionKey = getSessionKey(req, sourceSlideId);
  const session = await prisma.slideViewSession.findUnique({
    where: { slideId_sessionKey: { slideId: sourceSlideId, sessionKey } },
  });
  if (!session || session.followConverted) return;

  await prisma.$transaction([
    prisma.slideViewSession.update({
      where: { slideId_sessionKey: { slideId: sourceSlideId, sessionKey } },
      data: { followConverted: true },
    }),
    prisma.slidePageStat.upsert({
      where: { slideId_pageNumber: { slideId: sourceSlideId, pageNumber: sourcePageNumber } },
      create: {
        slideId: sourceSlideId,
        pageNumber: sourcePageNumber,
        followConversionCount: 1,
      },
      update: {
        followConversionCount: { increment: 1 },
      },
    }),
  ]);
};

const toggleFollowUser = async (req, res) => {
  const followerId = req.user.id;
  const followingId = Number(req.params.id);

  if (followerId === followingId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }

  try {
    const existing = await prisma.followedUser.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (existing) {
      await prisma.followedUser.delete({
        where: { followerId_followingId: { followerId, followingId } },
      });
      return res.json({ following: false });
    }

    await prisma.followedUser.create({ data: { followerId, followingId } });
    trackFollowConversionFromSlide(req).catch(() => {});
    checkBadges(followerId).catch(() => {});
    createNotification({
      userId: followingId,
      type: 'follow',
      message: 'Birileri sizi takip etmeye basladi',
      link: null,
    }).catch(() => {});

    return res.json({ following: true });
  } catch (err) {
    logger.error('Failed to toggle user follow', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to toggle user follow' });
  }
};

const toggleFollowCategory = async (req, res) => {
  const userId = req.user.id;
  const categoryId = Number(req.params.id);

  try {
    const existing = await prisma.followedCategory.findUnique({
      where: { userId_categoryId: { userId, categoryId } },
    });

    if (existing) {
      await prisma.followedCategory.delete({
        where: { userId_categoryId: { userId, categoryId } },
      });
      return res.json({ following: false });
    }

    await prisma.followedCategory.create({ data: { userId, categoryId } });
    checkBadges(userId).catch(() => {});
    return res.json({ following: true });
  } catch (err) {
    logger.error('Failed to toggle category follow', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to toggle category follow' });
  }
};

const getFollowStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const [followedUsers, followedCategories] = await Promise.all([
      prisma.followedUser.findMany({ where: { followerId: userId }, select: { followingId: true } }),
      prisma.followedCategory.findMany({ where: { userId }, select: { categoryId: true } }),
    ]);
    return res.json({
      users: followedUsers.map((f) => f.followingId),
      categories: followedCategories.map((f) => f.categoryId),
    });
  } catch (err) {
    logger.error('Failed to fetch follow status', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to fetch follow status' });
  }
};

module.exports = { toggleFollowUser, toggleFollowCategory, getFollowStatus };
