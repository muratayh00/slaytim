const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

const toggle = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const blockedId = Number(req.params.userId);

    if (blockerId === blockedId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    const existing = await prisma.blockedUser.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });

    if (existing) {
      await prisma.blockedUser.delete({ where: { id: existing.id } });
      res.json({ blocked: false });
    } else {
      await prisma.blockedUser.create({ data: { blockerId, blockedId } });
      // Also unfollow each other when blocking
      await prisma.followedUser.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: blockedId },
            { followerId: blockedId, followingId: blockerId },
          ],
        },
      });
      res.json({ blocked: true });
    }
  } catch (err) {
    logger.error('Failed to toggle block', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to toggle block' });
  }
};

const getMyBlocked = async (req, res) => {
  try {
    const blocks = await prisma.blockedUser.findMany({
      where: { blockerId: req.user.id },
      include: {
        blocked: { select: { id: true, username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(blocks.map((b) => b.blocked));
  } catch (err) {
    logger.error('Failed to fetch blocked users', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch blocked users' });
  }
};

const checkBlocked = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const blockedId = Number(req.params.userId);
    const block = await prisma.blockedUser.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    res.json({ blocked: !!block });
  } catch (err) {
    logger.error('Failed to check block', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to check block' });
  }
};

module.exports = { toggle, getMyBlocked, checkBlocked };
