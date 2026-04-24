const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const {
  EVENT_WEIGHTS,
  ALLOWED_CONTENT_TYPES,
  ALLOWED_EVENT_TYPES,
  clamp,
} = require('../services/ranking/ranking.constants');

const MAX_SESSION_ID_LEN = 128;

const normalizeSessionId = (raw, req) => {
  const input = String(raw || '').trim();
  if (input) return input.slice(0, MAX_SESSION_ID_LEN);
  const ip = String(req.ip || 'na');
  const ua = String(req.headers['user-agent'] || 'na').slice(0, 60);
  return `anon:${ip}:${ua}`;
};

const parseIntOrNull = (value) => {
  const num = Number(value);
  if (!Number.isInteger(num)) return null;
  return num;
};

const resolveContentTags = async (contentType, contentId) => {
  if (contentType === 'slide') {
    const tags = await prisma.slideTag.findMany({
      where: { slideId: contentId },
      select: { tagId: true, confidence: true },
    });
    return tags.map((t) => ({ tagId: t.tagId, weight: Number(t.confidence || 1) || 1 }));
  }

  if (contentType === 'slideo') {
    const slideo = await prisma.slideo.findUnique({
      where: { id: contentId },
      select: { slideId: true },
    });
    if (!slideo?.slideId) return [];
    const tags = await prisma.slideTag.findMany({
      where: { slideId: slideo.slideId },
      select: { tagId: true, confidence: true },
    });
    return tags.map((t) => ({ tagId: t.tagId, weight: Number(t.confidence || 1) || 1 }));
  }

  if (contentType === 'topic') {
    const tags = await prisma.slideTag.findMany({
      where: {
        slide: { topicId: contentId, isHidden: false, deletedAt: null },
      },
      select: { tagId: true },
      take: 200,
    });
    const countMap = new Map();
    for (const row of tags) {
      countMap.set(row.tagId, (countMap.get(row.tagId) || 0) + 1);
    }
    return [...countMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tagId, count]) => ({ tagId, weight: count }));
  }

  return [];
};

const upsertUserTagAffinity = async (userId, tagSignals, eventType) => {
  if (!userId || !tagSignals.length) return;
  const baseWeight = Number(EVENT_WEIGHTS[eventType] || 0);
  if (baseWeight === 0) return;
  const impressionInc = eventType === 'impression' ? 1 : 0;

  for (const signal of tagSignals) {
    const tagId = Number(signal.tagId);
    if (!Number.isInteger(tagId) || tagId <= 0) continue;
    const signalWeight = Number(signal.weight || 1);
    const delta = baseWeight * Math.max(0.25, Math.min(3, signalWeight));

    await prisma.userTagProfile.upsert({
      where: { userId_tagId: { userId, tagId } },
      create: {
        userId,
        tagId,
        affinity: delta,
        confidence: clamp(Math.abs(delta) / 8, 0.05, 1),
        impressions: impressionInc,
      },
      update: {
        affinity: { increment: delta },
        confidence: {
          increment: eventType === 'impression' ? 0.005 : 0.03,
        },
        impressions: { increment: impressionInc },
      },
    });
  }

  await prisma.userTagProfile.updateMany({
    where: { userId, confidence: { gt: 1 } },
    data: { confidence: 1 },
  });
};

const syncContentTagProfiles = async (contentType, contentId, tagSignals) => {
  if (!tagSignals.length) return;
  for (const signal of tagSignals) {
    const tagId = Number(signal.tagId);
    if (!Number.isInteger(tagId) || tagId <= 0) continue;
    const weight = Math.max(0.1, Math.min(5, Number(signal.weight || 1)));
    await prisma.contentTagProfile.upsert({
      where: { contentType_contentId_tagId: { contentType, contentId, tagId } },
      create: {
        contentType,
        contentId,
        tagId,
        weight,
        source: 'system',
        quality: 0,
      },
      update: {
        weight,
      },
    });
  }
};

const ingestContentEvent = async (req, res) => {
  try {
    const contentType = String(req.body?.contentType || '').trim().toLowerCase();
    const contentId = Number(req.body?.contentId);
    const eventType = String(req.body?.eventType || '').trim().toLowerCase();
    const watchMs = parseIntOrNull(req.body?.watchMs);
    const pageIndex = parseIntOrNull(req.body?.pageIndex);
    const sessionId = normalizeSessionId(req.body?.sessionId || req.headers['x-view-session'], req);

    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return res.status(400).json({ error: 'Invalid contentType' });
    }
    if (!Number.isInteger(contentId) || contentId <= 0) {
      return res.status(400).json({ error: 'Invalid contentId' });
    }
    if (!ALLOWED_EVENT_TYPES.has(eventType)) {
      return res.status(400).json({ error: 'Invalid eventType' });
    }
    if (watchMs !== null && (watchMs < 0 || watchMs > 600000)) {
      return res.status(400).json({ error: 'Invalid watchMs' });
    }
    if (pageIndex !== null && (pageIndex < 0 || pageIndex > 5000)) {
      return res.status(400).json({ error: 'Invalid pageIndex' });
    }

    const userId = req.user?.id || null;

    const event = await prisma.userContentEvent.create({
      data: {
        userId,
        sessionId,
        contentType,
        contentId,
        eventType,
        watchMs,
        pageIndex,
      },
      select: {
        id: true,
        contentType: true,
        contentId: true,
        eventType: true,
        createdAt: true,
      },
    });

    const tagSignals = await resolveContentTags(contentType, contentId);
    await syncContentTagProfiles(contentType, contentId, tagSignals);
    await upsertUserTagAffinity(userId, tagSignals, eventType);

    return res.status(201).json({
      ok: true,
      event,
      processedTags: tagSignals.length,
    });
  } catch (err) {
    logger.error('Failed to ingest content event', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to ingest event' });
  }
};

module.exports = {
  ingestContentEvent,
};
