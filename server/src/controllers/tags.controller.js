const prisma = require('../lib/prisma');
const { toSlug } = require('../lib/slug');
const logger = require('../lib/logger');

const normalizeTerm = (slug) => {
  const cleanSlug = toSlug(String(slug || ''));
  return {
    slug: cleanSlug,
    phrase: cleanSlug.replace(/-/g, ' ').trim(),
  };
};

const getBySlug = async (req, res) => {
  try {
    const { slug, phrase } = normalizeTerm(req.params.slug);
    if (!slug) return res.status(400).json({ error: 'Invalid tag slug' });

    const topicWhere = {
      isHidden: false,
      OR: [
        { title: { contains: phrase } },
        { description: { contains: phrase } },
      ],
    };

    const slideWhere = {
      isHidden: false,
      OR: [
        { title: { contains: phrase } },
        { description: { contains: phrase } },
      ],
    };

    const [topics, slides, topicCount, slideCount] = await Promise.all([
      prisma.topic.findMany({
        where: topicWhere,
        orderBy: { viewsCount: 'desc' },
        take: 24,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          likesCount: true,
          viewsCount: true,
          createdAt: true,
          user: { select: { id: true, username: true, avatarUrl: true } },
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { slides: true } },
        },
      }),
      prisma.slide.findMany({
        where: slideWhere,
        orderBy: { likesCount: 'desc' },
        take: 30,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          fileUrl: true,
          thumbnailUrl: true,
          likesCount: true,
          savesCount: true,
          viewsCount: true,
          createdAt: true,
          user: { select: { id: true, username: true, avatarUrl: true } },
          topic: { select: { id: true, title: true, slug: true } },
        },
      }),
      prisma.topic.count({ where: topicWhere }),
      prisma.slide.count({ where: slideWhere }),
    ]);

    return res.json({
      tag: {
        slug,
        label: phrase,
      },
      totals: {
        topics: topicCount,
        slides: slideCount,
        all: topicCount + slideCount,
      },
      topics,
      slides,
    });
  } catch (err) {
    logger.error('Failed to fetch tag page data', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to fetch tag page data' });
  }
};

module.exports = {
  getBySlug,
};
