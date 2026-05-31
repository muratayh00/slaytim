const prisma = require('../lib/prisma');
const { registerSseClient, unregisterSseClient, pushEvent } = require('../services/notification-stream.service');
const logger = require('../lib/logger');

// Per-user rate-limit for /since — max one real query every 5 seconds.
// Returns an empty-events 200 (not 429) so the client handles it silently.
const SINCE_MIN_INTERVAL_MS = 5_000;
const sinceLastCall = new Map(); // userId -> lastCallMs

// Periodically purge stale entries so the Map doesn't grow indefinitely.
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [k, v] of sinceLastCall) {
    if (v < cutoff) sinceLastCall.delete(k);
  }
}, 60_000).unref();

const getAll = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json(notifications);
  } catch (err) {
    logger.error('Failed to fetch notifications', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    res.json({ count });
  } catch (err) {
    logger.error('Failed to fetch unread count', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

const getSince = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = Date.now();
    const last = sinceLastCall.get(userId) || 0;
    if (now - last < SINCE_MIN_INTERVAL_MS) {
      // Too soon — return a no-op response the client can handle gracefully.
      const lastEventId = String(req.query?.lastEventId || '').trim();
      return res.json({ events: [], unread: 0, latestEventId: lastEventId || null });
    }
    sinceLastCall.set(userId, now);

    const lastEventId = String(req.query?.lastEventId || '').trim();
    const lastNotificationId = Number(lastEventId);
    const where = {
      userId: req.user.id,
      ...(Number.isInteger(lastNotificationId) && lastNotificationId > 0
        ? { id: { gt: lastNotificationId } }
        : {}),
    };
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { id: 'asc' },
      take: 200,
    });
    const unread = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });

    const events = notifications.map((n) => ({
      type: 'notification',
      id: String(n.id),
      createdAt: n.createdAt,
      data: { notification: n, unread },
    }));

    res.json({
      events,
      unread,
      latestEventId: notifications.length ? String(notifications[notifications.length - 1].id) : lastEventId || null,
    });
  } catch (err) {
    logger.error('Failed to fetch notification diff', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch notification diff' });
  }
};

const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const markAll = !id || req.path === '/all/read' || req.originalUrl.includes('/all/read');
    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: req.user.id, isRead: false },
        data: { isRead: true },
      });
    } else {
      const notif = await prisma.notification.findUnique({ where: { id: Number(id) } });
      if (!notif || notif.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      await prisma.notification.update({ where: { id: Number(id) }, data: { isRead: true } });
    }
    const unread = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    pushEvent(req.user.id, 'unread_count', {
      type: 'unread_count',
      id: `unread_${Date.now()}`,
      createdAt: new Date().toISOString(),
      data: { count: unread },
    });
    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to mark notification as read', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

const stream = async (req, res) => {
  const userId = req.user.id;
  let headersCommitted = false;

  try {
    // ── SSE headers ────────────────────────────────────────────────────────────
    // X-Accel-Buffering: no  → tells Nginx to stream bytes immediately instead
    // of buffering the whole response.  Without this the client receives an
    // empty body (ERR_EMPTY_RESPONSE) because Nginx holds data until the
    // connection closes.
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // ← critical for Nginx
    res.flushHeaders?.();
    headersCommitted = true;

    // Immediately confirm connection — EventSource opens before any DB work.
    res.write(': connected\n\n');

    registerSseClient(userId, res);

    // 25-second heartbeat keeps the TCP connection alive through idle proxies.
    const keepAlive = setInterval(() => {
      try { res.write(': ping\n\n'); } catch { clearInterval(keepAlive); }
    }, 25_000);

    req.on('close', () => {
      clearInterval(keepAlive);
      unregisterSseClient(userId, res);
      try { res.end(); } catch {}
    });

    // Fetch & push initial unread count after registering (so no events are missed).
    const unread = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    const ts = Date.now();
    res.write('retry: 5000\n');
    res.write(`id: unread_${ts}\n`);
    res.write(`event: unread_count\n`);
    res.write(`data: ${JSON.stringify({
      type: 'unread_count',
      id: `unread_${ts}`,
      createdAt: new Date().toISOString(),
      data: { count: unread },
    })}\n\n`);
  } catch (err) {
    logger.error('SSE stream error', { userId, error: err.message, stack: err.stack });
    // Headers already committed → cannot send JSON; just end the stream.
    if (headersCommitted) {
      try { res.end(); } catch {}
    } else {
      res.status(500).json({ error: 'Stream setup failed' });
    }
    unregisterSseClient(userId, res);
  }
};

module.exports = { getAll, getUnreadCount, getSince, markRead, stream };
