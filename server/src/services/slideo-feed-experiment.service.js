const crypto = require('crypto');
const prisma = require('../lib/prisma');

const EXPERIMENT_NAME = process.env.SLIDEO_FEED_EXPERIMENT || 'feed_v2_ab';
const ENABLED = String(process.env.SLIDEO_FEED_EXPERIMENT_ENABLED || 'true') !== 'false';
const VARIANTS = ['A', 'B'];
const EVENT_TYPES = new Set(['impression', 'open', 'like', 'save', 'share', 'complete', 'skip']);

const toInt = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const getSubjectKey = (req) => {
  if (req.user?.id) return `u:${req.user.id}`;
  const sessionHeader = String(req.headers['x-feed-session'] || '').trim();
  if (sessionHeader) return `s:${sessionHeader.slice(0, 96)}`;
  const ip = req.ip || 'na';
  const ua = String(req.headers['user-agent'] || 'na').slice(0, 80);
  return `a:${ip}:${ua}`;
};

const pickVariant = (subjectKey) => {
  const digest = crypto.createHash('sha256').update(`${EXPERIMENT_NAME}:${subjectKey}`).digest('hex');
  const value = parseInt(digest.slice(0, 8), 16);
  return VARIANTS[value % VARIANTS.length];
};

const getAssignedVariant = async (req) => {
  if (!ENABLED) return { subjectKey: getSubjectKey(req), variant: 'A', experiment: EXPERIMENT_NAME, enabled: false };

  const subjectKey = getSubjectKey(req);
  const existing = await prisma.slideoFeedAssignment.findUnique({ where: { subjectKey } });
  if (existing) {
    await prisma.slideoFeedAssignment.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date() },
    }).catch(() => {});
    return { subjectKey, variant: existing.variant, experiment: EXPERIMENT_NAME, enabled: true };
  }

  const variant = pickVariant(subjectKey);
  try {
    await prisma.slideoFeedAssignment.create({ data: { subjectKey, variant } });
  } catch (err) {
    if (err?.code !== 'P2002') throw err;
  }
  return { subjectKey, variant, experiment: EXPERIMENT_NAME, enabled: true };
};

const trackFeedEvents = async (subjectKey, variant, items = []) => {
  const valid = (Array.isArray(items) ? items : [])
    .map((item) => ({
      slideoId: toInt(item?.slideoId),
      eventType: String(item?.eventType || '').toLowerCase(),
      page: Math.max(1, toInt(item?.page, 1)),
      position: Math.max(0, toInt(item?.position, 0)),
    }))
    .filter((x) => x.slideoId > 0 && EVENT_TYPES.has(x.eventType));

  if (!valid.length) return { inserted: 0 };

  await prisma.slideoFeedEvent.createMany({
    data: valid.map((x) => ({
      subjectKey,
      variant,
      slideoId: x.slideoId,
      page: x.page,
      position: x.position,
      eventType: x.eventType,
    })),
  });
  return { inserted: valid.length };
};

const getFeedEvaluation = async ({ days = 7 } = {}) => {
  const clampedDays = Math.max(1, Math.min(30, toInt(days, 7)));
  const since = new Date(Date.now() - clampedDays * 24 * 60 * 60 * 1000);

  const events = await prisma.slideoFeedEvent.groupBy({
    by: ['variant', 'eventType'],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });

  const out = {
    experiment: EXPERIMENT_NAME,
    days: clampedDays,
    variants: {},
  };
  for (const v of VARIANTS) {
    out.variants[v] = {
      impression: 0,
      open: 0,
      like: 0,
      save: 0,
      share: 0,
      complete: 0,
      skip: 0,
      ctr: 0,
      completionRate: 0,
    };
  }

  for (const row of events) {
    if (!out.variants[row.variant]) continue;
    out.variants[row.variant][row.eventType] = row._count._all || 0;
  }

  for (const v of VARIANTS) {
    const item = out.variants[v];
    item.ctr = item.impression ? Number(((item.open / item.impression) * 100).toFixed(2)) : 0;
    item.completionRate = item.open ? Number(((item.complete / item.open) * 100).toFixed(2)) : 0;
  }
  return out;
};

module.exports = {
  getAssignedVariant,
  trackFeedEvents,
  getFeedEvaluation,
};

