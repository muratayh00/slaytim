const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

const getVisited = async (req, res) => {
  try {
    const userId = req.user.id;
    const visited = await prisma.visitedTopic.findMany({
      where: { userId },
      include: {
        topic: {
          select: {
            id: true, title: true, viewsCount: true, createdAt: true,
            category: { select: { name: true, slug: true } },
            user: { select: { id: true, username: true } },
          },
        },
      },
      orderBy: { visitedAt: 'desc' },
      take: 20,
    });
    res.json(visited.map((v) => ({ ...v.topic, visitedAt: v.visitedAt })));
  } catch (err) {
    logger.error('Failed to fetch visited topics', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch visited topics' });
  }
};

module.exports = { getVisited };
