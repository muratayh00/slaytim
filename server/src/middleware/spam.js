// Algorithm 7 — Spam / Abuse Protection Middleware
// Checks account age and recent upload velocity to throttle new accounts.

const prisma = require('../lib/prisma');

const MIN_ACCOUNT_AGE_HOURS = 1; // account must be at least 1 hour old to upload
const NEW_USER_DAILY_UPLOAD_LIMIT = 5; // new accounts (<7 days) limited to 5 uploads/day

/**
 * Middleware: block uploads from brand-new accounts (< 1 hour old).
 * Also enforces daily upload cap for accounts younger than 7 days.
 */
const spamGuard = async (req, res, next) => {
  try {
    // Keep anti-spam strict in production, but avoid blocking local/dev and automated E2E flows.
    if (process.env.NODE_ENV !== 'production' || process.env.E2E_DISABLE_SPAM_GUARD === 'true') {
      return next();
    }

    const userId = req.user?.id;
    if (!userId) return next();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, isMuted: true, isBanned: true },
    });

    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.isBanned) return res.status(403).json({ error: 'Hesabınız askıya alındı' });
    if (user.isMuted) return res.status(403).json({ error: 'İçerik paylaşma yetkiniz kısıtlandı' });

    const ageHours = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60);

    // Block uploads if account is too new
    if (ageHours < MIN_ACCOUNT_AGE_HOURS) {
      return res.status(429).json({
        error: 'Yeni hesaplar hemen içerik paylaşamaz. Lütfen 1 saat bekleyin.',
      });
    }

    // Rate-cap uploads for accounts younger than 7 days
    if (ageHours < 7 * 24) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentUploads = await prisma.slide.count({
        where: { userId, createdAt: { gte: since } },
      });
      if (recentUploads >= NEW_USER_DAILY_UPLOAD_LIMIT) {
        return res.status(429).json({
          error: `Yeni hesaplar günlük en fazla ${NEW_USER_DAILY_UPLOAD_LIMIT} içerik paylaşabilir.`,
        });
      }
    }

    next();
  } catch {
    return res.status(503).json({
      error: 'Geçici doğrulama hatası. Lütfen tekrar deneyin.',
    });
  }
};

module.exports = { spamGuard };
