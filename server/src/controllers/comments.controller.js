const prisma = require('../lib/prisma');
const { checkBadges } = require('../services/badge.service');
const { sanitizeText } = require('../lib/sanitize');
const { topicPath } = require('../lib/route-paths');
const logger = require('../lib/logger');

const MAX_COMMENT_LEN = 500;

const commentSelect = {
  id: true,
  content: true,
  createdAt: true,
  user: { select: { id: true, username: true, avatarUrl: true } },
};

const getByTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const comments = await prisma.comment.findMany({
      where: { topicId: Number(topicId) },
      orderBy: { createdAt: 'asc' },
      select: commentSelect,
    });
    res.json(comments);
  } catch (err) {
    logger.error('Failed to fetch comments', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

const create = async (req, res) => {
  try {
    const { topicId } = req.params;
    const raw = req.body.content;
    if (!raw?.trim()) return res.status(400).json({ error: 'İçerik boş olamaz' });

    // XSS: strip HTML tags, limit length
    const content = sanitizeText(raw, MAX_COMMENT_LEN);
    if (!content) return res.status(400).json({ error: 'Geçersiz yorum içeriği' });

    const topic = await prisma.topic.findUnique({ where: { id: Number(topicId) } });
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const commenter = await prisma.user.findUnique({ where: { id: req.user.id }, select: { isMuted: true } });
    if (commenter?.isMuted) return res.status(403).json({ error: 'Hesabınız susturuldu' });

    const comment = await prisma.comment.create({
      data: { content, topicId: Number(topicId), userId: req.user.id },
      select: commentSelect,
    });

    // Notify topic owner if it's not themselves
    if (topic.userId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: topic.userId,
          type: 'comment',
          message: `@${req.user.username} konuna yorum yaptı: "${sanitizeText(topic.title, 60)}"`,
          link: topicPath(topic),
        },
      });
    }

    checkBadges(req.user.id).catch(() => {});

    res.status(201).json(comment);
  } catch (err) {
    logger.error('Failed to create comment', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await prisma.comment.findUnique({ where: { id: Number(id) } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.userId !== req.user.id && !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });

    await prisma.comment.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to delete comment', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

module.exports = { getByTopic, create, remove };

