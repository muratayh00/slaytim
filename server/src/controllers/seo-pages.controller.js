const prisma = require('../lib/prisma');
const { normalizeMediaUrls } = require('../lib/media-normalize');
const logger = require('../lib/logger');

/**
 * Programmatic SEO landing page data endpoint.
 * Returns topics, slides and slideos that match the page's search terms.
 */

const PAGE_SEARCH_CONFIG = {
  'pitch-deck': {
    searchTerms: ['pitch deck', 'yatırım', 'startup', 'girişim', 'yatırımcı'],
  },
  'sirket-tanitimi': {
    searchTerms: ['şirket tanıtım', 'kurumsal sunum', 'şirket', 'tanıtım', 'company'],
  },
  'satis-sunumu': {
    searchTerms: ['satış', 'satış sunumu', 'sales', 'ürün sunumu'],
  },
  'pazarlama-plani': {
    searchTerms: ['pazarlama', 'marketing', 'dijital pazarlama', 'marka stratejisi'],
  },
  'seo': {
    searchTerms: ['seo', 'arama motoru', 'arama motoru optimizasyonu', 'organik trafik'],
  },
  'google-ads': {
    searchTerms: ['google ads', 'google reklam', 'adwords', 'dijital reklam'],
  },
  'yapay-zeka': {
    searchTerms: ['yapay zeka', 'artificial intelligence', 'makine öğrenmesi', 'ai'],
  },
  'python': {
    searchTerms: ['python', 'programlama', 'veri bilimi', 'veri analizi'],
  },
  'cv-portfolyo': {
    searchTerms: ['cv', 'özgeçmiş', 'portfolyo', 'kariyer', 'iş başvurusu'],
  },
  'finansal-rapor': {
    searchTerms: ['finansal rapor', 'mali rapor', 'bütçe', 'gelir gider', 'finans'],
  },
  'powerpoint-sablonlari': {
    searchTerms: ['şablon', 'template', 'powerpoint', 'sunum şablonu', 'slayt şablon'],
  },
  'ogretmen-sunumlari': {
    searchTerms: ['öğretmen', 'eğitim', 'ders planı', 'okul', 'sınıf sunumu'],
  },
};

/** Build a Prisma OR filter that checks each term against multiple fields. */
function buildTermsWhere(searchTerms, fields) {
  return {
    OR: searchTerms.flatMap((term) =>
      fields.map((field) => ({ [field]: { contains: term, mode: 'insensitive' } })),
    ),
  };
}

const getPage = async (req, res) => {
  try {
    const { slug } = req.params;
    const config = PAGE_SEARCH_CONFIG[slug];
    if (!config) return res.status(404).json({ error: 'SEO page not found' });

    const { searchTerms } = config;
    const titleDescWhere = buildTermsWhere(searchTerms, ['title', 'description']);

    // Each query is isolated with its own .catch so a single schema mismatch
    // or transient DB error cannot 500 the entire SEO page.
    const [topics, slides, slideos, tags] = await Promise.all([
      prisma.topic.findMany({
        where: { ...titleDescWhere, isHidden: false, deletedAt: null },
        orderBy: [{ viewsCount: 'desc' }, { likesCount: 'desc' }],
        take: 12,
        select: {
          id: true, title: true, slug: true, description: true,
          likesCount: true, viewsCount: true, createdAt: true,
          category: { select: { name: true, slug: true } },
          user: { select: { id: true, username: true, avatarUrl: true } },
          _count: { select: { slides: true } },
        },
      }).catch((err) => {
        logger.warn('[seo-pages] topics query failed', { slug, error: err.message });
        return [];
      }),
      prisma.slide.findMany({
        where: { ...titleDescWhere, isHidden: false, deletedAt: null, conversionStatus: 'done' },
        orderBy: [{ viewsCount: 'desc' }, { likesCount: 'desc' }],
        take: 12,
        select: {
          id: true, title: true, slug: true, description: true,
          thumbnailUrl: true, fileUrl: true,
          likesCount: true, savesCount: true, viewsCount: true, createdAt: true,
          user: { select: { id: true, username: true, avatarUrl: true } },
          topic: { select: { id: true, title: true, slug: true } },
        },
      }).catch((err) => {
        logger.warn('[seo-pages] slides query failed', { slug, error: err.message });
        return [];
      }),
      // Slideo model uses isHidden + hiddenAt — it has NO deletedAt field.
      prisma.slideo.findMany({
        where: { ...buildTermsWhere(searchTerms, ['title', 'description']), isHidden: false },
        orderBy: [{ viewsCount: 'desc' }, { likesCount: 'desc' }],
        take: 8,
        select: {
          id: true, title: true, description: true, pageIndices: true, coverPage: true,
          viewsCount: true, likesCount: true, createdAt: true,
          user: { select: { id: true, username: true, avatarUrl: true } },
          slide: { select: { id: true, title: true, thumbnailUrl: true } },
        },
      }).catch((err) => {
        logger.warn('[seo-pages] slideos query failed', { slug, error: err.message });
        return [];
      }),
      prisma.tag.findMany({
        where: {
          OR: searchTerms.map((term) => ({
            name: { contains: term, mode: 'insensitive' },
          })),
        },
        take: 10,
        select: { slug: true, name: true },
      }).catch((err) => {
        logger.warn('[seo-pages] tags query failed', { slug, error: err.message });
        return [];
      }),
    ]);

    const contentCount = topics.length + slides.length + slideos.length;

    res.json(
      normalizeMediaUrls({
        topics,
        slides,
        slideos: slideos.map((s) => {
          let pageIndices = [];
          try { pageIndices = JSON.parse(s.pageIndices || '[]'); } catch {}
          return { ...s, pageIndices };
        }),
        tags,
        contentCount,
      }),
    );
  } catch (err) {
    logger.error('[seo-pages] Failed to fetch page', {
      error: err.message,
      slug: req.params.slug,
    });
    res.status(500).json({ error: 'Failed to fetch SEO page' });
  }
};

module.exports = { getPage, PAGE_SEARCH_CONFIG };
