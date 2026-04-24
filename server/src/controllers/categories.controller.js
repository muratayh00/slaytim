const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

const getAll = async (req, res) => {
  try {
    const activeOnly = String(req.query?.activeOnly || '') === '1';
    const categories = await prisma.category.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
      include: { _count: { select: { topics: true, followedCategories: true } } },
    });

    if (String(req.query?.tree || '') === '1') {
      const mainCategories = categories
        .filter((cat) => (cat.isMain || cat.parentId === null) && cat.isActive !== false)
        .sort((a, b) => {
          if ((a.sortOrder || 0) !== (b.sortOrder || 0)) return (a.sortOrder || 0) - (b.sortOrder || 0);
          return String(a.name || '').localeCompare(String(b.name || ''), 'tr');
        })
        .map((main) => ({
          ...main,
          children: categories
            .filter((sub) => sub.parentId === main.id && sub.isActive !== false)
            .sort((a, b) => {
              if ((a.sortOrder || 0) !== (b.sortOrder || 0)) return (a.sortOrder || 0) - (b.sortOrder || 0);
              return String(a.name || '').localeCompare(String(b.name || ''), 'tr');
            }),
        }));

      return res.json({ mainCategories, categories });
    }

    return res.json(categories);
  } catch (err) {
    logger.error('Failed to fetch categories', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

const getOne = async (req, res) => {
  try {
    const { slug } = req.params;
    const include = { _count: { select: { topics: true } } };

    // 1. Exact match (fast path — most requests hit this)
    let category = await prisma.category.findUnique({ where: { slug }, include });

    // 2. Case-insensitive fallback: handles slugs whose casing drifted between
    //    the DB and the URL (e.g. Turkish i/İ normalization differences).
    if (!category) {
      category = await prisma.category.findFirst({
        where: { slug: { equals: slug, mode: 'insensitive' } },
        include,
      });
    }

    // 3. Slug-as-name fallback: the slug may have been regenerated after a rename
    //    (e.g. "lgs-matematik" → stored as "lgs-mat"). Try matching the humanised
    //    form of the slug against the category name.
    if (!category) {
      const humanised = slug.replace(/-/g, ' ');
      category = await prisma.category.findFirst({
        where: { name: { contains: humanised, mode: 'insensitive' } },
        include,
      });
    }

    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    logger.error('Failed to fetch category', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch category' });
  }
};

const create = async (req, res) => {
  try {
    const { name } = req.body;
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (name.trim().length > 80) {
      return res.status(400).json({ error: 'Name is too long' });
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!slug) {
      return res.status(400).json({ error: 'Invalid category name' });
    }
    const category = await prisma.category.create({ data: { name, slug } });
    res.status(201).json(category);
  } catch (err) {
    logger.error('Failed to create category', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to create category' });
  }
};

module.exports = { getAll, getOne, create };
