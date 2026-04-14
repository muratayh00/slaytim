const prisma = require('../lib/prisma');
const { checkBadges } = require('../services/badge.service');
const { createNotification } = require('../lib/notify');
const { slidePath } = require('../lib/route-paths');
const logger = require('../lib/logger');

const isPrismaCode = (err, code) => err && typeof err === 'object' && err.code === code;

const toggleSave = async (req, res) => {
  const userId = req.user.id;
  const slideId = Number(req.params.id);

  try {
    const existing = await prisma.savedSlide.findUnique({
      where: { userId_slideId: { userId, slideId } },
    });

    if (existing) {
      try {
        await prisma.$transaction([
          prisma.savedSlide.delete({ where: { userId_slideId: { userId, slideId } } }),
          prisma.slide.update({ where: { id: slideId }, data: { savesCount: { decrement: 1 } } }),
        ]);
      } catch (err) {
        if (!isPrismaCode(err, 'P2025')) throw err;
      }
      return res.json({ saved: false });
    }

    let updatedSlide;
    try {
      const [, updated] = await prisma.$transaction([
        prisma.savedSlide.create({ data: { userId, slideId } }),
        prisma.slide.update({ where: { id: slideId }, data: { savesCount: { increment: 1 } } }),
      ]);
      updatedSlide = updated;
    } catch (err) {
      if (isPrismaCode(err, 'P2002')) return res.json({ saved: true });
      throw err;
    }

    checkBadges(userId).catch(() => {});
    if (updatedSlide.userId !== userId) {
      checkBadges(updatedSlide.userId).catch(() => {});
      createNotification({
        userId: updatedSlide.userId,
        type: 'save',
        message: 'Birileri slaytýnýzý kaydetti',
        link: slidePath(updatedSlide),
      }).catch(() => {});
    }

    return res.json({ saved: true });
  } catch (err) {
    logger.error('Failed to toggle save', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to toggle save' });
  }
};

const getSaved = async (req, res) => {
  try {
    const userId = req.user.id;
    const saved = await prisma.savedSlide.findMany({
      where: { userId },
      include: {
        slide: {
          select: {
            id: true,
            title: true,
            description: true,
            fileUrl: true,
            thumbnailUrl: true,
            likesCount: true,
            savesCount: true,
            createdAt: true,
            user: { select: { id: true, username: true, avatarUrl: true } },
            topic: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(saved.map((s) => s.slide));
  } catch (err) {
    logger.error('Failed to fetch saved slides', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to fetch saved slides' });
  }
};

module.exports = { toggleSave, getSaved };
