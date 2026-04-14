const prisma = require('../lib/prisma');
const { checkBadges } = require('../services/badge.service');
const { createNotification } = require('../lib/notify');
const { topicPath, slidePath } = require('../lib/route-paths');
const logger = require('../lib/logger');

const isPrismaCode = (err, code) => err && typeof err === 'object' && err.code === code;

const toggleTopicLike = async (req, res) => {
  const userId = req.user.id;
  const topicId = Number(req.params.id);

  try {
    const existing = await prisma.topicLike.findUnique({
      where: { userId_topicId: { userId, topicId } },
    });

    if (existing) {
      try {
        await prisma.$transaction([
          prisma.topicLike.delete({ where: { userId_topicId: { userId, topicId } } }),
          prisma.topic.update({ where: { id: topicId }, data: { likesCount: { decrement: 1 } } }),
        ]);
      } catch (err) {
        if (!isPrismaCode(err, 'P2025')) throw err;
      }
      return res.json({ liked: false });
    }

    let likedTopic;
    try {
      const [, updatedTopic] = await prisma.$transaction([
        prisma.topicLike.create({ data: { userId, topicId } }),
        prisma.topic.update({ where: { id: topicId }, data: { likesCount: { increment: 1 } } }),
      ]);
      likedTopic = updatedTopic;
    } catch (err) {
      if (isPrismaCode(err, 'P2002')) return res.json({ liked: true });
      throw err;
    }

    if (likedTopic.userId !== userId) {
      createNotification({
        userId: likedTopic.userId,
        type: 'like',
        message: 'Birileri konunuzu beğendi',
        link: topicPath(likedTopic),
      }).catch(() => {});
    }

    return res.json({ liked: true });
  } catch (err) {
    logger.error('Failed to toggle topic like', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to toggle topic like' });
  }
};

const toggleSlideLike = async (req, res) => {
  const userId = req.user.id;
  const slideId = Number(req.params.id);

  try {
    const existing = await prisma.slideLike.findUnique({
      where: { userId_slideId: { userId, slideId } },
    });

    if (existing) {
      try {
        await prisma.$transaction([
          prisma.slideLike.delete({ where: { userId_slideId: { userId, slideId } } }),
          prisma.slide.update({ where: { id: slideId }, data: { likesCount: { decrement: 1 } } }),
        ]);
      } catch (err) {
        if (!isPrismaCode(err, 'P2025')) throw err;
      }
      return res.json({ liked: false });
    }

    let updatedSlide;
    try {
      const [, updated] = await prisma.$transaction([
        prisma.slideLike.create({ data: { userId, slideId } }),
        prisma.slide.update({ where: { id: slideId }, data: { likesCount: { increment: 1 } } }),
      ]);
      updatedSlide = updated;
    } catch (err) {
      if (isPrismaCode(err, 'P2002')) return res.json({ liked: true });
      throw err;
    }

    if (updatedSlide.userId !== userId) {
      checkBadges(updatedSlide.userId).catch(() => {});
      createNotification({
        userId: updatedSlide.userId,
        type: 'like',
        message: 'Birileri slaytınızı beğendi',
        link: slidePath(updatedSlide),
      }).catch(() => {});
    }

    return res.json({ liked: true });
  } catch (err) {
    logger.error('Failed to toggle slide like', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to toggle slide like' });
  }
};

const getUserLikes = async (req, res) => {
  try {
    const userId = req.user.id;
    const [topicLikes, slideLikes] = await Promise.all([
      prisma.topicLike.findMany({ where: { userId }, select: { topicId: true } }),
      prisma.slideLike.findMany({ where: { userId }, select: { slideId: true } }),
    ]);
    return res.json({
      topics: topicLikes.map((l) => l.topicId),
      slides: slideLikes.map((l) => l.slideId),
    });
  } catch (err) {
    logger.error('Failed to fetch likes', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to fetch likes' });
  }
};

module.exports = { toggleTopicLike, toggleSlideLike, getUserLikes };

