const prisma = require('../lib/prisma');
const { awardBadge } = require('../services/badge.service');
const logger = require('../lib/logger');

const getUserBadges = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const userBadges = await prisma.userBadge.findMany({
      where: { userId: user.id },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    });

    res.json({ badges: userBadges.map(ub => ({ ...ub.badge, earnedAt: ub.earnedAt })) });
  } catch (err) {
    logger.error('Failed to fetch badges', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
};

// Admin: award a badge manually
const awardBadgeManual = async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    const { userId, key } = req.body;
    await awardBadge(Number(userId), key);
    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to award badge', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to award badge' });
  }
};

// List all non-hidden badges
const listAllBadges = async (req, res) => {
  try {
    const badges = await prisma.badge.findMany({
      where: { isHidden: false },
      orderBy: { category: 'asc' },
    });
    res.json({ badges });
  } catch (err) {
    logger.error('Failed to fetch all badges', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
};

module.exports = { getUserBadges, awardBadgeManual, listAllBadges };
