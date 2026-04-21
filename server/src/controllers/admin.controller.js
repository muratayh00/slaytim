const prisma = require('../lib/prisma');
const fs = require('fs');
const path = require('path');
const { invalidateHotFeedCache } = require('../services/slideo-feed-cache.service');
const { hasAdminAccess } = require('../lib/rbac');
const { enqueueSlideConversion, getConversionQueueState, dispatchPreviewGeneration } = require('../services/conversion.service');
const {
  retryRecoverableFailedConversions,
  reclassifyInvalidFailedConversions,
} = require('../services/conversion-maintenance.service');
const logger = require('../lib/logger');

const guard = (req, res) => {
  if (!hasAdminAccess(req.user)) { res.status(403).json({ error: 'Forbidden' }); return false; }
  return true;
};

const removeUploadIfExists = (urlPath) => {
  if (!urlPath || typeof urlPath !== 'string') return;
  if (!urlPath.startsWith('/uploads/')) return;

  const filePath = path.join(__dirname, '../../', urlPath);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
};

const normalizeSponsorPayload = (body = {}) => {
  const isSponsored = Boolean(body.isSponsored);
  const sponsorName = String(body.sponsorName || '').trim().slice(0, 120) || null;
  const sponsorUrl = String(body.sponsorUrl || '').trim().slice(0, 500) || null;
  const sponsorDisclosure = String(body.sponsorDisclosure || '').trim().slice(0, 280) || null;
  const sponsorCampaignId = String(body.sponsorCampaignId || '').trim().slice(0, 120) || null;
  const sponsoredFrom = body.sponsoredFrom ? new Date(body.sponsoredFrom) : null;
  const sponsoredTo = body.sponsoredTo ? new Date(body.sponsoredTo) : null;

  const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());
  if (body.sponsoredFrom && !isValidDate(sponsoredFrom)) {
    throw new Error('Invalid sponsoredFrom');
  }
  if (body.sponsoredTo && !isValidDate(sponsoredTo)) {
    throw new Error('Invalid sponsoredTo');
  }
  if (isValidDate(sponsoredFrom) && isValidDate(sponsoredTo) && sponsoredFrom > sponsoredTo) {
    throw new Error('sponsoredFrom must be before sponsoredTo');
  }

  if (!isSponsored) {
    return {
      isSponsored: false,
      sponsorName: null,
      sponsorUrl: null,
      sponsorDisclosure: null,
      sponsorCampaignId: null,
      sponsoredFrom: null,
      sponsoredTo: null,
    };
  }

  return {
    isSponsored: true,
    sponsorName,
    sponsorUrl,
    sponsorDisclosure: sponsorDisclosure || 'Bu icerik sponsorlu is birligi kapsaminda yayinlanmistir.',
    sponsorCampaignId,
    sponsoredFrom: isValidDate(sponsoredFrom) ? sponsoredFrom : null,
    sponsoredTo: isValidDate(sponsoredTo) ? sponsoredTo : null,
  };
};

// ?? Audit Log Helper ??????????????????????????????????????????????????????????
const auditLog = async (adminId, action, targetType, targetId, meta, ip) => {
  try {
    await prisma.adminLog.create({
      data: {
        adminId,
        action,
        targetType: targetType || null,
        targetId: targetId ? Number(targetId) : null,
        meta: meta ? JSON.stringify(meta) : null,
        ip: ip || null,
      },
    });
  } catch (err) {
    logger.warn('[audit] Log entry could not be written', { error: err.message, adminId, action });
  }
};

// ?? Overview Stats ????????????????????????????????????????????????????????????
const getStats = async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week = new Date(now); week.setDate(week.getDate() - 7);
    const month = new Date(now); month.setDate(month.getDate() - 30);

    const [
      totalUsers, newUsersToday, newUsersWeek, newUsersMonth,
      totalTopics, newTopicsToday, hiddenTopics,
      totalSlides, newSlidesToday, hiddenSlides, failedConversions,
      totalSlideos, newSlideosToday,
      totalComments, newCommentsToday,
      pendingReports, criticalReports, totalReports,
      bannedUsers, mutedUsers,
      topTopics, categoryStats,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: week } } }),
      prisma.user.count({ where: { createdAt: { gte: month } } }),
      prisma.topic.count(),
      prisma.topic.count({ where: { createdAt: { gte: today } } }),
      prisma.topic.count({ where: { isHidden: true } }),
      prisma.slide.count(),
      prisma.slide.count({ where: { createdAt: { gte: today } } }),
      prisma.slide.count({ where: { isHidden: true } }),
      prisma.slide.count({ where: { conversionStatus: 'failed' } }),
      prisma.slideo.count(),
      prisma.slideo.count({ where: { createdAt: { gte: today } } }),
      prisma.comment.count(),
      prisma.comment.count({ where: { createdAt: { gte: today } } }),
      prisma.report.count({ where: { status: 'pending' } }),
      prisma.report.count({ where: { status: 'pending', priority: 'critical' } }),
      prisma.report.count(),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.user.count({ where: { isMuted: true } }),
      prisma.topic.findMany({
        orderBy: { viewsCount: 'desc' }, take: 10,
        select: { id: true, title: true, viewsCount: true, likesCount: true, user: { select: { username: true } } },
      }),
      prisma.category.findMany({
        include: { _count: { select: { topics: true } } },
        orderBy: { topics: { _count: 'desc' } }, take: 8,
      }),
    ]);

    res.json({
      users: { total: totalUsers, today: newUsersToday, week: newUsersWeek, month: newUsersMonth, banned: bannedUsers, muted: mutedUsers },
      topics: { total: totalTopics, today: newTopicsToday, hidden: hiddenTopics },
      slides: { total: totalSlides, today: newSlidesToday, hidden: hiddenSlides, failedConversions },
      slideos: { total: totalSlideos, today: newSlideosToday },
      comments: { total: totalComments, today: newCommentsToday },
      reports: { pending: pendingReports, critical: criticalReports, total: totalReports },
      topTopics,
      categoryStats: categoryStats.map(c => ({ id: c.id, name: c.name, slug: c.slug, count: c._count.topics })),
    });
  } catch (err) {
    logger.error('Admin: Failed to fetch stats', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// ?? Content Management ????????????????????????????????????????????????????????
const getContent = async (req, res) => {
  if (!guard(req, res)) return;
  const { type = 'topics', page = 1, showHidden = 'false' } = req.query;
  const q = String(req.query.q || '').slice(0, 100).trim();
  const take = 20;
  const skip = (Number(page) - 1) * take;
  const hiddenFilter = showHidden === 'true' ? {} : { isHidden: false };
  const ALLOWED_CONTENT_TYPES = new Set(['topics', 'slides', 'comments']);
  if (!ALLOWED_CONTENT_TYPES.has(type)) return res.status(400).json({ error: 'Invalid type' });
  try {
    if (type === 'topics') {
      const where = { ...hiddenFilter, ...(q ? { title: { contains: q } } : {}) };
      const [items, total] = await Promise.all([
        prisma.topic.findMany({
          where, skip, take, orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, username: true } },
            category: { select: { name: true } },
            _count: { select: { slides: true, comments: true } },
          },
        }),
        prisma.topic.count({ where }),
      ]);
      return res.json({ items, total, pages: Math.ceil(total / take) });
    }
    if (type === 'slides') {
      const where = { ...hiddenFilter, ...(q ? { title: { contains: q } } : {}) };
      const [items, total] = await Promise.all([
        prisma.slide.findMany({
          where, skip, take, orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, username: true } },
            topic: { select: { id: true, title: true } },
          },
        }),
        prisma.slide.count({ where }),
      ]);
      return res.json({ items, total, pages: Math.ceil(total / take) });
    }
    if (type === 'comments') {
      const where = { ...(q ? { content: { contains: q } } : {}) };
      const [items, total] = await Promise.all([
        prisma.comment.findMany({
          where, skip, take, orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, username: true } },
            topic: { select: { id: true, title: true } },
          },
        }),
        prisma.comment.count({ where }),
      ]);
      return res.json({ items, total, pages: Math.ceil(total / take) });
    }
    res.status(400).json({ error: 'Invalid type' });
  } catch (err) {
    logger.error('Admin: Failed to fetch content', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch content' });
  }
};

// Soft hide content (reversible)
const hideContent = async (req, res) => {
  if (!guard(req, res)) return;
  const { type, id } = req.params;
  try {
    if (type === 'topic') {
      await prisma.topic.update({ where: { id: Number(id) }, data: { isHidden: true, deletedAt: new Date() } });
    } else if (type === 'slide') {
      await prisma.slide.update({ where: { id: Number(id) }, data: { isHidden: true, deletedAt: new Date() } });
    } else return res.status(400).json({ error: 'Invalid type' });

    await auditLog(req.user.id, 'hide_content', type, id, null, req.ip);
    res.json({ success: true });
  } catch (err) {
    logger.error('Admin: Failed to hide content', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to hide content' });
  }
};

// Restore hidden content
const restoreContent = async (req, res) => {
  if (!guard(req, res)) return;
  const { type, id } = req.params;
  try {
    if (type === 'topic') {
      await prisma.topic.update({ where: { id: Number(id) }, data: { isHidden: false, deletedAt: null } });
    } else if (type === 'slide') {
      await prisma.slide.update({ where: { id: Number(id) }, data: { isHidden: false, deletedAt: null } });
    } else return res.status(400).json({ error: 'Invalid type' });

    await auditLog(req.user.id, 'restore_content', type, id, null, req.ip);
    res.json({ success: true });
  } catch (err) {
    logger.error('Admin: Failed to restore content', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to restore content' });
  }
};

const setContentSponsor = async (req, res) => {
  if (!guard(req, res)) return;
  const { type, id } = req.params;
  const entityId = Number(id);
  if (!Number.isInteger(entityId) || entityId <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    const payload = normalizeSponsorPayload(req.body || {});
    if (payload.isSponsored && !payload.sponsorName) {
      return res.status(400).json({ error: 'sponsorName is required when isSponsored=true' });
    }

    if (type === 'topic') {
      const updated = await prisma.topic.update({
        where: { id: entityId },
        data: payload,
        select: {
          id: true,
          isSponsored: true,
          sponsorName: true,
          sponsorUrl: true,
          sponsorDisclosure: true,
          sponsorCampaignId: true,
          sponsoredFrom: true,
          sponsoredTo: true,
        },
      });
      await auditLog(req.user.id, 'set_sponsor_meta', 'topic', id, payload, req.ip);
      return res.json(updated);
    }

    if (type === 'slide') {
      const updated = await prisma.slide.update({
        where: { id: entityId },
        data: payload,
        select: {
          id: true,
          isSponsored: true,
          sponsorName: true,
          sponsorUrl: true,
          sponsorDisclosure: true,
          sponsorCampaignId: true,
          sponsoredFrom: true,
          sponsoredTo: true,
        },
      });
      await auditLog(req.user.id, 'set_sponsor_meta', 'slide', id, payload, req.ip);
      return res.json(updated);
    }

    return res.status(400).json({ error: 'Invalid type' });
  } catch (err) {
    if (String(err?.message || '').toLowerCase().includes('invalid sponsored')) {
      return res.status(400).json({ error: err.message });
    }
    logger.error('Admin: Failed to set sponsor metadata', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to set sponsor metadata' });
  }
};

// Hard delete content (permanent)
const deleteContent = async (req, res) => {
  if (!guard(req, res)) return;
  const { type, id } = req.params;
  try {
    if (type === 'topic') {
      await prisma.topic.delete({ where: { id: Number(id) } });
    } else if (type === 'slide') {
      // Read file paths first, then delete DB record, then clean up files.
      // This order ensures: if DB delete fails we keep files; if file delete fails slide is still gone.
      const slide = await prisma.slide.findUnique({ where: { id: Number(id) } });
      if (!slide) return res.status(404).json({ error: 'Slide not found' });
      const { fileUrl, pdfUrl, thumbnailUrl } = slide;
      await prisma.slide.delete({ where: { id: Number(id) } });
      removeUploadIfExists(fileUrl);
      removeUploadIfExists(pdfUrl);
      removeUploadIfExists(thumbnailUrl);
    } else if (type === 'comment') {
      await prisma.comment.delete({ where: { id: Number(id) } });
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }
    await auditLog(req.user.id, 'delete_content', type, id, null, req.ip);
    res.json({ success: true });
  } catch (err) {
    logger.error('Admin: Failed to delete content', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to delete content' });
  }
};

// ?? User Management ???????????????????????????????????????????????????????????
const getUsers = async (req, res) => {
  if (!guard(req, res)) return;
  const { q = '', page = 1, filter = 'all' } = req.query;
  const take = 20;
  const skip = (Number(page) - 1) * take;
  const where = {
    ...(q ? { OR: [{ username: { contains: q } }, { email: { contains: q } }] } : {}),
    ...(filter === 'banned' ? { isBanned: true } : filter === 'muted' ? { isMuted: true } : filter === 'admin' ? { isAdmin: true } : {}),
  };
  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        select: {
          id: true, username: true, email: true, avatarUrl: true,
          isAdmin: true, isMuted: true, isBanned: true, role: true, createdAt: true,
          _count: { select: { topics: true, slides: true, comments: true, reports: true } },
          warnings: { orderBy: { createdAt: 'desc' }, take: 3 },
        },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ users, total, page: Number(page), pages: Math.ceil(total / take) });
  } catch (err) {
    logger.error('Admin: Failed to fetch users', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const warnUser = async (req, res) => {
  if (!guard(req, res)) return;
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Reason required' });
  try {
    const warning = await prisma.userWarning.create({ data: { userId: Number(id), reason } });
    await prisma.notification.create({
      data: { userId: Number(id), type: 'warning', message: `⚠️ Uyarı aldınız: ${reason}` },
    });
    await auditLog(req.user.id, 'warn_user', 'user', id, { reason }, req.ip);
    res.json(warning);
  } catch (err) {
    logger.error('Admin: Failed to warn user', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to warn user' });
  }
};

const muteUser = async (req, res) => {
  if (!guard(req, res)) return;
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(id) }, select: { id: true, isMuted: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Atomic toggle: WHERE clause pins current state to avoid TOCTOU races.
    const updated = await prisma.user.update({
      where: { id: Number(id), isMuted: user.isMuted },
      data: { isMuted: !user.isMuted },
    });
    if (updated.isMuted) {
      await prisma.notification.create({
        data: { userId: Number(id), type: 'mute', message: '🔇 Hesabınız susturuldu. Yorum yapamazsınız.' },
      });
    }
    await auditLog(req.user.id, updated.isMuted ? 'mute_user' : 'unmute_user', 'user', id, null, req.ip);
    res.json({ isMuted: updated.isMuted });
  } catch (err) {
    logger.error('Admin: Failed to update mute status', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to update mute status' });
  }
};

const banUser = async (req, res) => {
  if (!guard(req, res)) return;
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(id) }, select: { id: true, isAdmin: true, isBanned: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isAdmin) return res.status(400).json({ error: 'Cannot ban admin' });
    // Atomic toggle: WHERE clause pins current state to avoid TOCTOU races.
    const updated = await prisma.user.update({
      where: { id: Number(id), isBanned: user.isBanned },
      data: { isBanned: !user.isBanned },
    });
    await auditLog(req.user.id, updated.isBanned ? 'ban_user' : 'unban_user', 'user', id, null, req.ip);
    res.json({ isBanned: updated.isBanned });
  } catch (err) {
    logger.error('Admin: Failed to update ban status', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to update ban status' });
  }
};

// Update user role
const updateRole = async (req, res) => {
  if (!guard(req, res)) return;
  const { id } = req.params;
  const { role } = req.body;
  const VALID_ROLES = ['user', 'moderator', 'support', 'analytics', 'operations', 'super_admin'];
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
  // Only super_admin can grant or revoke super_admin role.
  if (role === 'super_admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Yalnızca super_admin rolü bu yetkiyi verebilir' });
  }
  try {
    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data: { role, isAdmin: role === 'super_admin' },
      select: { id: true, username: true, role: true, isAdmin: true },
    });
    await auditLog(req.user.id, 'update_role', 'user', id, { role }, req.ip);
    res.json(updated);
  } catch (err) {
    logger.error('Admin: Failed to update role', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to update role' });
  }
};

// ?? Reports Management ????????????????????????????????????????????????????????
const updateReportPriority = async (req, res) => {
  if (!guard(req, res)) return;
  const { id } = req.params;
  const { priority } = req.body;
  if (!['low', 'medium', 'high', 'critical'].includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority' });
  }
  try {
    const report = await prisma.report.update({ where: { id: Number(id) }, data: { priority } });
    await auditLog(req.user.id, 'set_report_priority', 'report', id, { priority }, req.ip);
    res.json(report);
  } catch (err) {
    logger.error('Admin: Failed to update report priority', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to update priority' });
  }
};

const addReportNote = async (req, res) => {
  if (!guard(req, res)) return;
  const { id } = req.params;
  const note = String(req.body.note || '').slice(0, 2000).trim() || null;
  try {
    const report = await prisma.report.update({ where: { id: Number(id) }, data: { note } });
    await auditLog(req.user.id, 'add_report_note', 'report', id, { noteLength: note?.length || 0 }, req.ip);
    res.json(report);
  } catch (err) {
    logger.error('Admin: Failed to update report note', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to update note' });
  }
};

// ?? Content Intelligence ??????????????????????????????????????????????????????
// Quality score: saves*5 + likes*1 + views*0.01 (slides)
//                likes*1 + comments*3 + views*0.01 + slides*2 (topics)
const getContentIntelligence = async (req, res) => {
  if (!guard(req, res)) return;
  const { type = 'slides', sort = 'quality', page = 1, q = '' } = req.query;
  const take = 20;
  const pageNum = Math.max(1, Number(page));
  const skip = (pageNum - 1) * take;
  const textFilter = q ? { title: { contains: q } } : {};

  try {
    if (type === 'slides') {
      const where = {
        ...textFilter,
        ...(sort === 'underexposed' ? { viewsCount: { lte: 300 } } : {}),
      };
      const orderBy =
        sort === 'saves'
          ? [{ savesCount: 'desc' }, { createdAt: 'desc' }]
          : sort === 'views'
          ? [{ viewsCount: 'desc' }, { createdAt: 'desc' }]
          : sort === 'underexposed'
          ? [{ savesCount: 'desc' }, { likesCount: 'desc' }, { viewsCount: 'asc' }, { createdAt: 'desc' }]
          : [{ savesCount: 'desc' }, { likesCount: 'desc' }, { viewsCount: 'desc' }, { createdAt: 'desc' }];

      const [items, total] = await Promise.all([
        prisma.slide.findMany({
          where,
          skip,
          take,
          orderBy,
          select: {
            id: true, title: true, likesCount: true, savesCount: true, viewsCount: true,
            conversionStatus: true, isHidden: true, createdAt: true,
            user: { select: { id: true, username: true } },
            topic: { select: { id: true, title: true } },
          },
        }),
        prisma.slide.count({ where }),
      ]);

      return res.json({
        items: items.map(s => ({
          ...s,
          qualityScore: Math.round(s.savesCount * 5 + s.likesCount * 1 + s.viewsCount * 0.01),
        })),
        total,
        page: pageNum,
        pages: Math.ceil(total / take),
      });
    }

    if (type === 'topics') {
      const where = {
        ...textFilter,
        ...(sort === 'underexposed' ? { viewsCount: { lte: 500 } } : {}),
      };
      const orderBy =
        sort === 'views'
          ? [{ viewsCount: 'desc' }, { createdAt: 'desc' }]
          : sort === 'underexposed'
          ? [
              { likesCount: 'desc' },
              { comments: { _count: 'desc' } },
              { slides: { _count: 'desc' } },
              { viewsCount: 'asc' },
              { createdAt: 'desc' },
            ]
          : [
              { likesCount: 'desc' },
              { comments: { _count: 'desc' } },
              { slides: { _count: 'desc' } },
              { viewsCount: 'desc' },
              { createdAt: 'desc' },
            ];

      const [items, total] = await Promise.all([
        prisma.topic.findMany({
          where,
          skip,
          take,
          orderBy,
          select: {
            id: true, title: true, likesCount: true, viewsCount: true, isHidden: true, createdAt: true,
            user: { select: { id: true, username: true } },
            category: { select: { name: true, slug: true } },
            _count: { select: { slides: true, comments: true } },
          },
        }),
        prisma.topic.count({ where }),
      ]);

      return res.json({
        items: items.map(t => ({
          ...t,
          qualityScore: Math.round(t.likesCount * 1 + t._count.comments * 3 + t.viewsCount * 0.01 + t._count.slides * 2),
        })),
        total,
        page: pageNum,
        pages: Math.ceil(total / take),
      });
    }

    return res.status(400).json({ error: 'Invalid type' });
  } catch (err) {
    logger.error('Admin: Failed to fetch content intelligence', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to fetch content intelligence' });
  }
};
const getSlideoStats = async (req, res) => {
  if (!guard(req, res)) return;
  const { sort = 'views', page = 1, q = '', status = 'all' } = req.query;
  const take = 20;
  const skip = (Number(page) - 1) * take;
  const where = {
    ...(q ? { title: { contains: q } } : {}),
    ...(status === 'hidden' ? { isHidden: true } : status === 'visible' ? { isHidden: false } : {}),
  };
  try {
    const baseItems = await prisma.slideo.findMany({
      where,
      skip,
      take,
      orderBy: sort === 'likes'
        ? { likesCount: 'desc' }
        : sort === 'saves'
          ? { savesCount: 'desc' }
          : sort === 'new'
            ? { createdAt: 'desc' }
            : { viewsCount: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        viewsCount: true,
        likesCount: true,
        savesCount: true,
        shareCount: true,
        isHidden: true,
        hiddenAt: true,
        coverPage: true,
        pageIndices: true,
        createdAt: true,
        user: { select: { id: true, username: true } },
        slide: { select: { id: true, title: true } },
      },
    });

    const ids = baseItems.map((i) => i.id);
    const [total, reportsAgg, pendingAgg, totalReportsCount] = await Promise.all([
      prisma.slideo.count({ where }),
      ids.length
        ? prisma.report.groupBy({
            by: ['targetId'],
            where: { targetType: 'slideo', targetId: { in: ids } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      ids.length
        ? prisma.report.groupBy({
            by: ['targetId'],
            where: { targetType: 'slideo', status: 'pending', targetId: { in: ids } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      prisma.report.count({ where: { targetType: 'slideo' } }),
    ]);

    const reportsById = new Map(reportsAgg.map((x) => [x.targetId, x._count._all || 0]));
    const pendingById = new Map(pendingAgg.map((x) => [x.targetId, x._count._all || 0]));
    const now = Date.now();

    const withSignals = baseItems.map((item) => {
      const reportCount = reportsById.get(item.id) || 0;
      const pendingReports = pendingById.get(item.id) || 0;
      const ageHours = Math.max(1, (now - new Date(item.createdAt).getTime()) / (1000 * 60 * 60));
      const velocity = item.viewsCount / ageHours;
      const reportRatio = reportCount / Math.max(item.viewsCount, 1);

      let riskScore = 0;
      if (pendingReports >= 1) riskScore += 20;
      if (reportCount >= 3) riskScore += 25;
      if (reportRatio > 0.02) riskScore += 25;
      if (item.viewsCount >= 300 && ageHours <= 6) riskScore += 20; // sudden spike heuristic
      if (velocity >= 80) riskScore += 10;
      riskScore = Math.min(100, riskScore);

      return {
        ...item,
        pageIndices: JSON.parse(item.pageIndices || '[]'),
        reportCount,
        pendingReports,
        reportRatio,
        viewVelocityPerHour: velocity,
        riskScore,
        riskSignals: {
          suddenViewSpike: item.viewsCount >= 300 && ageHours <= 6,
          highReportRatio: reportRatio > 0.02,
          hasPendingReports: pendingReports > 0,
        },
      };
    });

    const items = sort === 'risk'
      ? withSignals.sort((a, b) => b.riskScore - a.riskScore || b.viewsCount - a.viewsCount)
      : withSignals;

    res.json({
      items,
      total,
      totalReports: totalReportsCount,
      page: Number(page),
      pages: Math.ceil(total / take),
    });
  } catch (err) {
    logger.error('Admin: Failed to fetch slideo stats', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch slideo stats' });
  }
};

const hideSlideo = async (req, res) => {
  if (!guard(req, res)) return;
  const { id } = req.params;
  try {
    const slideo = await prisma.slideo.update({
      where: { id: Number(id) },
      data: { isHidden: true, hiddenAt: new Date() },
      select: { id: true, isHidden: true, hiddenAt: true },
    });
    invalidateHotFeedCache();
    await auditLog(req.user.id, 'hide_content', 'slideo', id, null, req.ip);
    res.json(slideo);
  } catch (err) {
    logger.error('Admin: Failed to hide slideo', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to hide slideo' });
  }
};

const restoreSlideo = async (req, res) => {
  if (!guard(req, res)) return;
  const { id } = req.params;
  try {
    const slideo = await prisma.slideo.update({
      where: { id: Number(id) },
      data: { isHidden: false, hiddenAt: null },
      select: { id: true, isHidden: true, hiddenAt: true },
    });
    invalidateHotFeedCache();
    await auditLog(req.user.id, 'restore_content', 'slideo', id, null, req.ip);
    res.json(slideo);
  } catch (err) {
    logger.error('Admin: Failed to restore slideo', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to restore slideo' });
  }
};

const deleteSlideo = async (req, res) => {
  if (!guard(req, res)) return;
  const { id } = req.params;
  try {
    await prisma.slideo.delete({ where: { id: Number(id) } });
    invalidateHotFeedCache();
    await auditLog(req.user.id, 'delete_slideo', 'slideo', id, null, req.ip);
    res.json({ success: true });
  } catch (err) {
    logger.error('Admin: Failed to delete slideo', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to delete slideo' });
  }
};

// ?? Audit Logs ????????????????????????????????????????????????????????????????
const getAuditLogs = async (req, res) => {
  if (!guard(req, res)) return;
  const { page = 1, action = '', adminId = '' } = req.query;
  const take = 30;
  const skip = (Number(page) - 1) * take;
  const where = {
    ...(action ? { action } : {}),
    ...(adminId ? { adminId: Number(adminId) } : {}),
  };
  try {
    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { id: true, username: true } } },
      }),
      prisma.adminLog.count({ where }),
    ]);
    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / take) });
  } catch (err) {
    logger.error('Admin: Failed to fetch audit logs', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

// Conversion queue health + retry
const getConversionJobs = async (req, res) => {
  if (!guard(req, res)) return;
  const { page = 1, status = 'all', q = '' } = req.query;
  const take = 20;
  const pageNum = Math.max(1, Number(page));
  const skip = (pageNum - 1) * take;
  const statusMap = {
    pending: 'queued',
    processing: 'processing',
    failed: 'failed',
    done: 'done',
  };
  const normalizedStatus = String(status || 'all').toLowerCase();

  try {
    const statusWhere = {};
    if (normalizedStatus === 'unsupported') {
      statusWhere.slide = { conversionStatus: 'unsupported' };
    } else if (normalizedStatus !== 'all') {
      statusWhere.status = statusMap[normalizedStatus] || 'queued';
    }

    const where = {
      ...statusWhere,
      ...(q
        ? {
            OR: [
              { slide: { title: { contains: q } } },
              { slide: { topic: { title: { contains: q } } } },
              { slide: { user: { username: { contains: q } } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.conversionJob.findMany({
        where,
        skip,
        take,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          slide: {
            select: {
              id: true,
              title: true,
              conversionStatus: true,
              fileUrl: true,
              pdfUrl: true,
              user: { select: { id: true, username: true } },
              topic: { select: { id: true, title: true } },
            },
          },
        },
      }),
      prisma.conversionJob.count({ where }),
    ]);

    const counts = await prisma.conversionJob.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const summary = { pending: 0, processing: 0, failed: 0, done: 0 };
    for (const row of counts) {
      if (row.status === 'queued') summary.pending = row._count._all || 0;
      else if (row.status === 'processing') summary.processing = row._count._all || 0;
      else if (row.status === 'failed') summary.failed = row._count._all || 0;
      else if (row.status === 'done') summary.done = row._count._all || 0;
    }
    summary.unsupported = await prisma.slide.count({
      where: { conversionStatus: 'unsupported', deletedAt: null, isHidden: false },
    });

    res.json({
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / take),
      summary,
    });
  } catch (err) {
    logger.error('Admin: Failed to fetch conversion jobs', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch conversion jobs' });
  }
};

const retryConversionJob = async (req, res) => {
  if (!guard(req, res)) return;
  const { id } = req.params;
  const jobId = Number(id);
  if (!Number.isInteger(jobId) || jobId <= 0) {
    return res.status(400).json({ error: 'Invalid job id' });
  }

  try {
    const job = await prisma.conversionJob.findUnique({
      where: { id: jobId },
      select: { id: true, slideId: true, status: true },
    });
    if (!job) return res.status(404).json({ error: 'Conversion job not found' });

    await enqueueSlideConversion(job.slideId);
    await auditLog(req.user.id, 'retry_conversion', 'slide', job.slideId, { jobId }, req.ip);

    res.json({ success: true, jobId: job.id, slideId: job.slideId });
  } catch (err) {
    logger.error('Admin: Failed to retry conversion job', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to retry conversion job' });
  }
};

const retryFailedConversions = async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const limit = Math.max(1, Number(req.body?.limit || req.query?.limit || 200));
    const summary = await retryRecoverableFailedConversions(limit);
    await auditLog(req.user.id, 'retry_failed_conversions', 'slide', null, summary, req.ip);
    res.json({ success: true, ...summary });
  } catch (err) {
    logger.error('Admin: Failed to retry failed conversions', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to retry failed conversions' });
  }
};

const reclassifyInvalidConversions = async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const limit = Math.max(1, Number(req.body?.limit || req.query?.limit || 500));
    const summary = await reclassifyInvalidFailedConversions(limit);
    await auditLog(req.user.id, 'reclassify_invalid_conversions', 'slide', null, summary, req.ip);
    res.json({ success: true, ...summary });
  } catch (err) {
    logger.error('Admin: Failed to reclassify invalid conversions', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to reclassify invalid conversions' });
  }
};

const getConversionHealth = async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - 10 * 60 * 1000);
    const [queued, processing, failed, staleProcessing, queue] = await Promise.all([
      prisma.conversionJob.count({ where: { status: 'queued' } }),
      prisma.conversionJob.count({ where: { status: 'processing' } }),
      prisma.conversionJob.count({ where: { status: 'failed' } }),
      prisma.conversionJob.count({ where: { status: 'processing', lockedAt: { lt: staleThreshold } } }),
      getConversionQueueState().catch(() => null),
    ]);

    let level = 'ok';
    if (failed >= 10 || staleProcessing > 0) level = 'critical';
    else if (failed >= 3 || queued >= 20) level = 'warning';

    res.json({
      level,
      queued,
      processing,
      failed,
      staleProcessing,
      queue,
      checkedAt: now,
    });
  } catch (err) {
    logger.error('Admin: Failed to fetch conversion health', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch conversion health' });
  }
};

// ── Preview Ops ───────────────────────────────────────────────────────────────
const getPreviewOps = async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const stuckThreshold = new Date(Date.now() - 30 * 60 * 1000);

    const [statusCounts, assetStats, stuckSlides, failedSlides, missingSlides] = await Promise.all([
      // Status distribution
      prisma.slide.groupBy({
        by: ['previewStatus'],
        where: { conversionStatus: 'done', deletedAt: null },
        _count: { _all: true },
      }),
      // Asset stats
      prisma.slidePreviewAsset.aggregate({
        _count: { _all: true },
        _sum: { fileSizeBytes: true },
        _avg: { fileSizeBytes: true },
      }),
      // Stuck processing (30+ min)
      prisma.slide.findMany({
        where: {
          previewStatus: 'processing',
          updatedAt: { lt: stuckThreshold },
          deletedAt: null,
        },
        select: { id: true, title: true, updatedAt: true, viewsCount: true },
        orderBy: { updatedAt: 'asc' },
        take: 20,
      }),
      // Failed slides
      prisma.slide.findMany({
        where: { previewStatus: 'failed', deletedAt: null },
        select: { id: true, title: true, viewsCount: true, updatedAt: true },
        orderBy: { viewsCount: 'desc' },
        take: 20,
      }),
      // Missing (done but no preview)
      prisma.slide.count({
        where: {
          conversionStatus: 'done',
          previewStatus: { in: ['none', 'failed'] },
          deletedAt: null,
        },
      }),
    ]);

    const distribution = {};
    for (const row of statusCounts) {
      distribution[row.previewStatus] = row._count._all;
    }

    res.json({
      distribution,
      assets: {
        total: assetStats._count._all || 0,
        totalSizeMB: Math.round((assetStats._sum?.fileSizeBytes || 0) / 1024 / 1024),
        avgSizeKB: Math.round((assetStats._avg?.fileSizeBytes || 0) / 1024),
      },
      stuckSlides,
      failedSlides,
      missingCount: missingSlides,
      checkedAt: new Date(),
    });
  } catch (err) {
    logger.error('Admin: Failed to fetch preview ops', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch preview ops' });
  }
};

const retryPreview = async (req, res) => {
  if (!guard(req, res)) return;
  const { action, slideId, limit: limitParam } = req.body;
  const VALID_ACTIONS = ['retry_failed', 'retry_stuck', 'retry_single', 'backfill_top'];
  if (!VALID_ACTIONS.includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  try {
    const stuckThreshold = new Date(Date.now() - 30 * 60 * 1000);
    const limit = Math.min(500, Math.max(1, Number(limitParam || 100)));

    if (action === 'retry_single') {
      if (!slideId) return res.status(400).json({ error: 'slideId required' });
      const slide = await prisma.slide.findUnique({
        where: { id: Number(slideId) },
        select: { id: true, pdfUrl: true, conversionStatus: true },
      });
      if (!slide) return res.status(404).json({ error: 'Slide not found' });
      if (slide.conversionStatus !== 'done') return res.status(400).json({ error: 'Slide not converted yet' });

      await prisma.slide.update({
        where: { id: slide.id },
        data: { previewStatus: 'none' },
      });
      if (slide.pdfUrl) {
        void dispatchPreviewGeneration(slide.id, slide.pdfUrl);
      }
      await auditLog(req.user.id, 'preview_retry_single', 'slide', slideId, { action }, req.ip);
      return res.json({ success: true, queued: 1 });
    }

    if (action === 'retry_failed') {
      const failed = await prisma.slide.findMany({
        where: { previewStatus: 'failed', conversionStatus: 'done', deletedAt: null },
        select: { id: true, pdfUrl: true },
        orderBy: { viewsCount: 'desc' },
        take: limit,
      });
      await prisma.slide.updateMany({
        where: { id: { in: failed.map(s => s.id) } },
        data: { previewStatus: 'none' },
      });
      for (const s of failed) {
        if (s.pdfUrl) void dispatchPreviewGeneration(s.id, s.pdfUrl);
      }
      await auditLog(req.user.id, 'preview_retry_failed', 'slide', null, { count: failed.length }, req.ip);
      return res.json({ success: true, queued: failed.length });
    }

    if (action === 'retry_stuck') {
      const stuck = await prisma.slide.findMany({
        where: {
          previewStatus: 'processing',
          updatedAt: { lt: stuckThreshold },
          deletedAt: null,
        },
        select: { id: true, pdfUrl: true },
        take: limit,
      });
      await prisma.slide.updateMany({
        where: { id: { in: stuck.map(s => s.id) } },
        data: { previewStatus: 'none' },
      });
      for (const s of stuck) {
        if (s.pdfUrl) void dispatchPreviewGeneration(s.id, s.pdfUrl);
      }
      await auditLog(req.user.id, 'preview_retry_stuck', 'slide', null, { count: stuck.length }, req.ip);
      return res.json({ success: true, queued: stuck.length });
    }

    if (action === 'backfill_top') {
      const missing = await prisma.slide.findMany({
        where: {
          conversionStatus: 'done',
          previewStatus: { in: ['none', 'failed'] },
          pdfUrl: { not: null },
          deletedAt: null,
        },
        select: { id: true, pdfUrl: true },
        orderBy: { viewsCount: 'desc' },
        take: limit,
      });
      await prisma.slide.updateMany({
        where: { id: { in: missing.map(s => s.id) } },
        data: { previewStatus: 'none' },
      });
      for (const s of missing) {
        if (s.pdfUrl) void dispatchPreviewGeneration(s.id, s.pdfUrl);
      }
      await auditLog(req.user.id, 'preview_backfill_top', 'slide', null, { count: missing.length, limit }, req.ip);
      return res.json({ success: true, queued: missing.length });
    }
  } catch (err) {
    logger.error('Admin: Failed to retry preview', { error: err.message });
    res.status(500).json({ error: 'Failed to retry preview' });
  }
};

module.exports = {
  getStats,
  getContent, hideContent, restoreContent, setContentSponsor, deleteContent,
  getUsers, warnUser, muteUser, banUser, updateRole,
  updateReportPriority, addReportNote,
  getContentIntelligence,
  getSlideoStats, hideSlideo, restoreSlideo, deleteSlideo,
  getAuditLogs,
  getConversionJobs, retryConversionJob, retryFailedConversions, reclassifyInvalidConversions, getConversionHealth,
  getPreviewOps, retryPreview,
};
