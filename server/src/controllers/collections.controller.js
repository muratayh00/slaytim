const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { normalizeMediaUrls } = require('../lib/media-normalize');

const slideSelect = {
  id: true, title: true, description: true, fileUrl: true,
  thumbnailUrl: true, pdfUrl: true, conversionStatus: true,
  likesCount: true, savesCount: true, viewsCount: true, createdAt: true,
  user: { select: { id: true, username: true, avatarUrl: true } },
  topic: { select: { id: true, title: true } },
};

// GET /collections/me — current user's collections
const getMine = async (req, res) => {
  try {
    const collections = await prisma.collection.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { slides: true, followers: true } },
        slides: { orderBy: { addedAt: 'desc' }, select: { slideId: true, slide: { select: { thumbnailUrl: true, pdfUrl: true } } } },
      },
    });
    res.json(normalizeMediaUrls(collections));
  } catch (err) {
    logger.error('Failed to fetch collections', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
};

// GET /collections/user/:username — public collections of a user
const getByUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { username: req.params.username }, select: { id: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const collections = await prisma.collection.findMany({
      where: { userId: user.id, isPublic: true },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { slides: true, followers: true } },
        slides: { orderBy: { addedAt: 'desc' }, select: { slideId: true, slide: { select: { thumbnailUrl: true, pdfUrl: true } } } },
      },
    });
    res.json(normalizeMediaUrls(collections));
  } catch (err) {
    logger.error('Failed to fetch collections', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
};

// GET /collections/:id — single collection with slides
const getOne = async (req, res) => {
  try {
    const col = await prisma.collection.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        slides: { orderBy: { addedAt: 'desc' }, include: { slide: { select: slideSelect } } },
        _count: { select: { slides: true, followers: true } },
      },
    });
    if (!col) return res.status(404).json({ error: 'Collection not found' });
    if (!col.isPublic && col.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    let isFollowing = false;
    if (req.user?.id && col.userId !== req.user.id) {
      const follow = await prisma.collectionFollow.findUnique({
        where: { userId_collectionId: { userId: req.user.id, collectionId: col.id } },
      });
      isFollowing = Boolean(follow);
    }
    res.json(normalizeMediaUrls({ ...col, isFollowing }));
  } catch (err) {
    logger.error('Failed to fetch collection', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
};

// POST /collections — create
const create = async (req, res) => {
  try {
    const { name, description, isPublic = true } = req.body;
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (description !== undefined && description !== null && typeof description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string' });
    }

    const col = await prisma.collection.create({
      data: {
        name: name.trim(),
        description: typeof description === 'string' ? description.trim() : null,
        isPublic: Boolean(isPublic),
        userId: req.user.id,
      },
      include: { _count: { select: { slides: true, followers: true } } },
    });
    res.status(201).json(normalizeMediaUrls(col));
  } catch (err) {
    logger.error('Failed to create collection', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to create collection' });
  }
};

// PATCH /collections/:id
const update = async (req, res) => {
  try {
    const col = await prisma.collection.findUnique({ where: { id: Number(req.params.id) } });
    if (!col) return res.status(404).json({ error: 'Not found' });
    if (col.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const { name, description, isPublic } = req.body;
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ error: 'Name must be a non-empty string' });
    }
    if (description !== undefined && description !== null && typeof description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string or null' });
    }

    const nextData = {};
    if (name !== undefined) nextData.name = name.trim();
    if (description !== undefined) nextData.description = description === null ? null : description.trim();
    if (isPublic !== undefined) nextData.isPublic = Boolean(isPublic);

    const updated = await prisma.collection.update({
      where: { id: col.id },
      data: nextData,
      include: { _count: { select: { slides: true, followers: true } } },
    });
    res.json(normalizeMediaUrls(updated));
  } catch (err) {
    logger.error('Failed to update collection', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to update collection' });
  }
};

// DELETE /collections/:id
const remove = async (req, res) => {
  try {
    const col = await prisma.collection.findUnique({ where: { id: Number(req.params.id) } });
    if (!col) return res.status(404).json({ error: 'Not found' });
    if (col.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await prisma.collection.delete({ where: { id: col.id } });
    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to delete collection', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to delete collection' });
  }
};

// POST /collections/:id/slides/:slideId — add slide
const addSlide = async (req, res) => {
  try {
    const col = await prisma.collection.findUnique({ where: { id: Number(req.params.id) } });
    if (!col) return res.status(404).json({ error: 'Collection not found' });
    if (col.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const slideId = Number(req.params.slideId);
    if (!Number.isInteger(slideId) || slideId <= 0) {
      return res.status(400).json({ error: 'Invalid slide id' });
    }
    const slide = await prisma.slide.findUnique({ where: { id: slideId }, select: { id: true, isHidden: true } });
    if (!slide || slide.isHidden) {
      return res.status(404).json({ error: 'Slide not found' });
    }

    const existing = await prisma.collectionSlide.findUnique({
      where: { collectionId_slideId: { collectionId: col.id, slideId } },
    });
    if (existing) {
      // Toggle: remove if already in collection
      await prisma.collectionSlide.delete({ where: { id: existing.id } });
      const slidesCount = await prisma.collectionSlide.count({ where: { collectionId: col.id } });
      return res.json({ added: false, slidesCount });
    }

    await prisma.collectionSlide.create({ data: { collectionId: col.id, slideId } });
    const slidesCount = await prisma.collectionSlide.count({ where: { collectionId: col.id } });
    res.json({ added: true, slidesCount });
  } catch (err) {
    logger.error('Failed to update collection', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to update collection' });
  }
};

// POST /collections/:id/follow -> toggle
const toggleFollow = async (req, res) => {
  try {
    const collectionId = Number(req.params.id);
    if (!Number.isInteger(collectionId) || collectionId <= 0) {
      return res.status(400).json({ error: 'Invalid collection id' });
    }

    const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    if (!collection.isPublic && collection.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (collection.userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot follow your own collection' });
    }

    const existing = await prisma.collectionFollow.findUnique({
      where: { userId_collectionId: { userId: req.user.id, collectionId } },
    });
    if (existing) {
      await prisma.collectionFollow.delete({ where: { id: existing.id } });
      return res.json({ following: false });
    }

    await prisma.collectionFollow.create({
      data: { userId: req.user.id, collectionId },
    });
    res.json({ following: true });
  } catch (err) {
    logger.error('Failed to toggle follow', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to toggle follow' });
  }
};

// GET /collections/following/me
const getMyFollowedCollections = async (req, res) => {
  try {
    const rows = await prisma.collectionFollow.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        collection: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true } },
            _count: { select: { slides: true, followers: true } },
          },
        },
      },
      take: 50,
    });
    res.json({ collections: rows.map((r) => r.collection).filter(Boolean) });
  } catch (err) {
    logger.error('Failed to fetch followed collections', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch followed collections' });
  }
};

module.exports = { getMine, getByUser, getOne, create, update, remove, addSlide, toggleFollow, getMyFollowedCollections };
