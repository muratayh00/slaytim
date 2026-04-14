const prisma = require('../lib/prisma');
const { hasAdminAccess } = require('../lib/rbac');
const logger = require('../lib/logger');

const VALID_TYPES = ['slide', 'topic', 'comment', 'user', 'slideo'];
const VALID_REASONS = ['spam', 'copyright', 'inappropriate', 'wrong_category', 'duplicate'];
const VALID_STATUSES = ['pending', 'reviewed', 'resolved', 'rejected'];
const PRIORITY_SLA_HOURS = { low: 72, medium: 48, high: 24, critical: 6 };

const getPriorityWeight = (priority) => {
  if (priority === 'critical') return 4;
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  return 1;
};

const derivePriority = (reason, targetReportCount) => {
  let priority = 'medium';
  if (reason === 'copyright' || reason === 'inappropriate') priority = 'high';
  if (reason === 'spam' || reason === 'duplicate' || reason === 'wrong_category') priority = 'medium';
  if (targetReportCount >= 5) priority = 'critical';
  else if (targetReportCount >= 3 && priority !== 'critical') priority = 'high';
  return priority;
};

const withSla = (report) => {
  const slaHours = PRIORITY_SLA_HOURS[report.priority] || 48;
  const dueAt = new Date(new Date(report.createdAt).getTime() + slaHours * 60 * 60 * 1000);
  const msLeft = dueAt.getTime() - Date.now();
  return {
    ...report,
    sla: {
      dueAt,
      hours: slaHours,
      breached: msLeft < 0 && report.status === 'pending',
      remainingMinutes: Math.floor(msLeft / (1000 * 60)),
    },
  };
};

const mapById = (items) => new Map(items.map((item) => [item.id, item]));

const targetExists = async (targetType, targetId) => {
  if (targetType === 'slide') return !!(await prisma.slide.findUnique({ where: { id: targetId }, select: { id: true } }));
  if (targetType === 'topic') return !!(await prisma.topic.findUnique({ where: { id: targetId }, select: { id: true } }));
  if (targetType === 'comment') return !!(await prisma.comment.findUnique({ where: { id: targetId }, select: { id: true } }));
  if (targetType === 'user') return !!(await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } }));
  if (targetType === 'slideo') return !!(await prisma.slideo.findUnique({ where: { id: targetId }, select: { id: true } }));
  return false;
};

const attachTargets = async (reports) => {
  if (!reports.length) return reports;

  const idsByType = reports.reduce((acc, report) => {
    if (!acc[report.targetType]) acc[report.targetType] = new Set();
    acc[report.targetType].add(report.targetId);
    return acc;
  }, {});

  const [slides, topics, comments, users, slideos] = await Promise.all([
    idsByType.slide?.size
      ? prisma.slide.findMany({
          where: { id: { in: [...idsByType.slide] } },
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnailUrl: true,
            isHidden: true,
            user: { select: { id: true, username: true } },
            topic: { select: { id: true, title: true } },
          },
        })
      : Promise.resolve([]),
    idsByType.topic?.size
      ? prisma.topic.findMany({
          where: { id: { in: [...idsByType.topic] } },
          select: {
            id: true,
            title: true,
            slug: true,
            isHidden: true,
            user: { select: { id: true, username: true } },
            category: { select: { id: true, name: true, slug: true } },
          },
        })
      : Promise.resolve([]),
    idsByType.comment?.size
      ? prisma.comment.findMany({
          where: { id: { in: [...idsByType.comment] } },
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: { select: { id: true, username: true } },
            topic: { select: { id: true, title: true } },
          },
        })
      : Promise.resolve([]),
    idsByType.user?.size
      ? prisma.user.findMany({
          where: { id: { in: [...idsByType.user] } },
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            isBanned: true,
            isMuted: true,
          },
        })
      : Promise.resolve([]),
    idsByType.slideo?.size
      ? prisma.slideo.findMany({
          where: { id: { in: [...idsByType.slideo] } },
          select: {
            id: true,
            title: true,
            isHidden: true,
            user: { select: { id: true, username: true } },
            slide: { select: { id: true, title: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const targetMaps = {
    slide: mapById(slides),
    topic: mapById(topics),
    comment: mapById(comments),
    user: mapById(users),
    slideo: mapById(slideos),
  };

  return reports.map((report) => ({
    ...report,
    target: targetMaps[report.targetType]?.get(report.targetId) || null,
  }));
};

const create = async (req, res) => {
  try {
    const { targetType, targetId, reason, details } = req.body;

    if (!VALID_TYPES.includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' });
    }
    if (!VALID_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'Invalid reason' });
    }

    const numericTargetId = Number(targetId);
    if (!Number.isInteger(numericTargetId) || numericTargetId <= 0) {
      return res.status(400).json({ error: 'Invalid target id' });
    }
    const exists = await targetExists(targetType, numericTargetId);
    if (!exists) {
      return res.status(404).json({ error: 'Target not found' });
    }

    const existing = await prisma.report.findFirst({
      where: { userId: req.user.id, targetType, targetId: numericTargetId },
    });
    if (existing) {
      return res.status(409).json({ error: 'Already reported' });
    }

    const totalOnTarget = await prisma.report.count({
      where: { targetType, targetId: numericTargetId },
    });
    const priority = derivePriority(reason, totalOnTarget + 1);

    const report = await prisma.report.create({
      data: {
        userId: req.user.id,
        targetType,
        targetId: numericTargetId,
        reason,
        details: details || null,
        priority,
      },
    });
    return res.status(201).json(withSla(report));
  } catch {
    return res.status(500).json({ error: 'Failed to submit report' });
  }
};

const getAll = async (req, res) => {
  try {
    if (!hasAdminAccess(req.user)) return res.status(403).json({ error: 'Forbidden' });

    const { status = 'pending', page = 1 } = req.query;
    const take = 20;
    const pageNum = Math.max(1, Number(page));
    const skip = (pageNum - 1) * take;

    if (status !== 'all' && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const where = status === 'all' ? {} : { status };

    const [rawReports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take,
        skip,
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);

    const reportsWithTarget = await attachTargets(rawReports);
    const reports = reportsWithTarget
      .map(withSla)
      .sort((a, b) => {
        const pa = getPriorityWeight(a.priority);
        const pb = getPriorityWeight(b.priority);
        if (pa !== pb) return pb - pa;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    return res.json({ reports, total, page: pageNum, pages: Math.ceil(total / take) });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

const updateStatus = async (req, res) => {
  try {
    if (!hasAdminAccess(req.user)) return res.status(403).json({ error: 'Forbidden' });

    const { id } = req.params;
    const { status, deleteContent } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const report = await prisma.report.update({
      where: { id: Number(id) },
      data: {
        status,
        resolvedAt: status === 'resolved' || status === 'rejected' ? new Date() : null,
      },
    });

    if (deleteContent && status === 'resolved') {
      try {
        if (report.targetType === 'topic') {
          await prisma.topic.delete({ where: { id: report.targetId } });
        } else if (report.targetType === 'slide') {
          await prisma.slide.delete({ where: { id: report.targetId } });
        } else if (report.targetType === 'comment') {
          await prisma.comment.delete({ where: { id: report.targetId } });
        } else if (report.targetType === 'slideo') {
          await prisma.slideo.delete({ where: { id: report.targetId } });
        }
      } catch {
        // Target may already be deleted; report status update should remain successful.
      }
    }

    return res.json(report);
  } catch {
    return res.status(500).json({ error: 'Failed to update report' });
  }
};

const batchUpdateStatus = async (req, res) => {
  try {
    if (!hasAdminAccess(req.user)) return res.status(403).json({ error: 'Forbidden' });
    const { ids, status, deleteContent } = req.body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids is required' });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const numericIds = [...new Set(ids.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0))];
    const reports = await prisma.report.findMany({
      where: { id: { in: numericIds } },
      select: { id: true, targetType: true, targetId: true },
    });

    await prisma.report.updateMany({
      where: { id: { in: numericIds } },
      data: {
        status,
        resolvedAt: status === 'resolved' || status === 'rejected' ? new Date() : null,
      },
    });

    if (deleteContent && status === 'resolved') {
      for (const report of reports) {
        try {
          // eslint-disable-next-line no-await-in-loop
          if (report.targetType === 'topic') await prisma.topic.delete({ where: { id: report.targetId } });
          // eslint-disable-next-line no-await-in-loop
          else if (report.targetType === 'slide') await prisma.slide.delete({ where: { id: report.targetId } });
          // eslint-disable-next-line no-await-in-loop
          else if (report.targetType === 'comment') await prisma.comment.delete({ where: { id: report.targetId } });
          // eslint-disable-next-line no-await-in-loop
          else if (report.targetType === 'slideo') await prisma.slideo.delete({ where: { id: report.targetId } });
        } catch {
          // non-blocking
        }
      }
    }

    res.json({ success: true, updated: numericIds.length });
  } catch (err) {
    logger.error('Failed to batch update reports', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to batch update reports' });
  }
};

module.exports = { create, getAll, updateStatus, batchUpdateStatus };
