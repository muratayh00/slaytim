const prisma = require('../lib/prisma');
const { toSlug } = require('../lib/slug');
const logger = require('../lib/logger');

const TAG_INDEX_MIN_ITEMS = Math.max(1, Number(process.env.TAG_INDEX_MIN_ITEMS || 5));
const TAG_INDEX_RECENT_DAYS = Math.max(7, Number(process.env.TAG_INDEX_RECENT_DAYS || 90));

const normalizeTerm = (slug) => {
  const cleanSlug = toSlug(String(slug || ''));
  return {
    slug: cleanSlug,
    phrase: cleanSlug.replace(/-/g, ' ').trim(),
  };
};

const computeIndexability = (totalCount, recentCount) => ({
  indexable: Number(totalCount || 0) >= TAG_INDEX_MIN_ITEMS && Number(recentCount || 0) > 0,
  minItems: TAG_INDEX_MIN_ITEMS,
  recentWindowDays: TAG_INDEX_RECENT_DAYS,
  recentItems: Number(recentCount || 0),
});

const list = async (req, res) => {
  try {
    const limit = Math.min(1000, Math.max(1, Number(req.query?.limit || 300)));
    const indexableOnly = String(req.query?.indexableOnly || '') === '1';
    const since = new Date(Date.now() - TAG_INDEX_RECENT_DAYS * 24 * 60 * 60 * 1000);

    const [tags, groupedAll, groupedRecent] = await Promise.all([
      prisma.tag.findMany({
        orderBy: [{ usageCount: 'desc' }, { updatedAt: 'desc' }],
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          usageCount: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
      prisma.slideTag.groupBy({
        by: ['tagId'],
        where: {
          slide: {
            isHidden: false,
            deletedAt: null,
            conversionStatus: 'done',
          },
        },
        _count: { _all: true },
      }),
      prisma.slideTag.groupBy({
        by: ['tagId'],
        where: {
          slide: {
            isHidden: false,
            deletedAt: null,
            conversionStatus: 'done',
            createdAt: { gte: since },
          },
        },
        _count: { _all: true },
      }),
    ]);

    const totalMap = new Map(groupedAll.map((r) => [r.tagId, Number(r._count?._all || 0)]));
    const recentMap = new Map(groupedRecent.map((r) => [r.tagId, Number(r._count?._all || 0)]));

    const rows = tags
      .map((tag) => {
        const total = Number(totalMap.get(tag.id) || 0);
        const recent = Number(recentMap.get(tag.id) || 0);
        const seo = computeIndexability(total, recent);
        return {
          slug: tag.slug,
          label: tag.name,
          usageCount: tag.usageCount,
          updatedAt: tag.updatedAt || tag.createdAt,
          totals: { slides: total, topics: 0, all: total },
          seo,
        };
      })
      .filter((row) => row.totals.all > 0)
      .filter((row) => (indexableOnly ? row.seo.indexable : true));

    return res.json({ tags: rows, total: rows.length });
  } catch (err) {
    logger.error('Failed to list tags', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to list tags' });
  }
};

const getBySlug = async (req, res) => {
  try {
    const { slug, phrase } = normalizeTerm(req.params.slug);
    if (!slug) return res.status(400).json({ error: 'Invalid tag slug' });

    const since = new Date(Date.now() - TAG_INDEX_RECENT_DAYS * 24 * 60 * 60 * 1000);
    const tag = await prisma.tag.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true },
    });
    if (!tag) return res.status(404).json({ error: 'Tag not found' });

    const slideWhere = {
      tags: { some: { tagId: tag.id } },
      isHidden: false,
      deletedAt: null,
      conversionStatus: 'done',
    };

    const [slides, slideCount, recentSlideCount] = await Promise.all([
      prisma.slide.findMany({
        where: slideWhere,
        orderBy: [{ likesCount: 'desc' }, { savesCount: 'desc' }, { createdAt: 'desc' }],
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
          topic: {
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
          },
        },
      }),
      prisma.slide.count({ where: slideWhere }),
      prisma.slide.count({
        where: {
          ...slideWhere,
          createdAt: { gte: since },
        },
      }),
    ]);

    if (slideCount === 0) return res.status(404).json({ error: 'Tag not found' });

    const uniqueTopics = [];
    const seen = new Set();
    for (const slide of slides) {
      const topic = slide?.topic;
      if (!topic || seen.has(topic.id)) continue;
      seen.add(topic.id);
      uniqueTopics.push(topic);
      if (uniqueTopics.length >= 24) break;
    }

    const seo = computeIndexability(slideCount, recentSlideCount);

    return res.json({
      tag: {
        slug: tag.slug,
        label: tag.name || phrase,
      },
      totals: {
        topics: uniqueTopics.length,
        slides: slideCount,
        all: slideCount,
      },
      seo,
      topics: uniqueTopics,
      slides,
    });
  } catch (err) {
    logger.error('Failed to fetch tag page data', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to fetch tag page data' });
  }
};

module.exports = {
  list,
  getBySlug,
};
