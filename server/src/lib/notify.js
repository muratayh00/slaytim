/**
 * Bildirim oluşturma yardımcı fonksiyonu.
 * Fire-and-forget — ana iş akışını asla engellememeli.
 */

const prisma = require('./prisma');
const logger = require('./logger');
const { pushEvent } = require('../services/notification-stream.service');

// Maps notification types to the user preference field that controls them.
const PREF_FIELD = {
  like:    'notifyOnLike',
  save:    'notifyOnLike',
  comment: 'notifyOnComment',
  follow:  'notifyOnFollow',
};

/**
 * Kullanıcıya bildirim gönder.
 * @param {object} opts
 * @param {number} opts.userId - Bildirimi alacak kullanıcı
 * @param {string} opts.type   - Bildirim türü (like|save|follow|comment|badge|warning|mute)
 * @param {string} opts.message
 * @param {string} [opts.link]
 * @param {boolean} [opts.respectPrefs=true] - Kullanıcı tercihlerine göre gönderimi atla
 */
async function createNotification({ userId, type, message, link = null, respectPrefs = true }) {
  try {
    // Kullanıcı tercihlerini kontrol et
    if (respectPrefs) {
      const prefField = PREF_FIELD[type];
      if (prefField) {
        const prefs = await prisma.user.findUnique({
          where: { id: Number(userId) },
          select: { [prefField]: true },
        });
        if (prefs && prefs[prefField] === false) return; // Kullanıcı bu tür bildirimi devre dışı bırakmış
      }
    }
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const existingRecent = await prisma.notification.findFirst({
      where: {
        userId: Number(userId),
        type,
        link,
        isRead: false,
        createdAt: { gte: tenMinutesAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    const created = existingRecent
      ? await prisma.notification.update({
          where: { id: existingRecent.id },
          data: { message, createdAt: new Date() },
        })
      : await prisma.notification.create({
          data: { userId, type, message, link },
        });

    const unread = await prisma.notification.count({
      where: { userId: Number(userId), isRead: false },
    });
    pushEvent(userId, 'notification', {
      type: 'notification',
      id: String(created.id),
      createdAt: created.createdAt,
      data: { notification: created, unread },
    });
    pushEvent(userId, 'unread_count', {
      type: 'unread_count',
      id: `unread_${created.id}`,
      createdAt: new Date().toISOString(),
      data: { count: unread },
    });
  } catch (err) {
    // Bildirim hatası hiçbir zaman ana isteği engellememeli
    logger.error('[notify] Failed to create notification', { error: err.message });
  }
}

module.exports = { createNotification };
