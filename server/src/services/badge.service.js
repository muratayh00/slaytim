const prisma = require('../lib/prisma');

// All badge definitions
const BADGES = [
  // Starter
  { key: 'first_step',        name: 'İlk Adım',          description: 'Hesabını oluşturdu',                         icon: '🎯', category: 'starter',    isHidden: false },
  { key: 'first_upload',      name: 'İlk Yükleme',        description: 'İlk slaytını yükledi',                       icon: '📤', category: 'starter',    isHidden: false },
  { key: 'first_save',        name: 'İlk Kaydetme',       description: 'İlk slaytını kaydetti',                      icon: '🔖', category: 'starter',    isHidden: false },
  { key: 'first_comment',     name: 'İlk Yorum',          description: 'İlk yorumunu yaptı',                         icon: '💬', category: 'starter',    isHidden: false },
  { key: 'first_follow',      name: 'İlk Takip',          description: 'İlk kullanıcıyı veya kategoriyi takip etti', icon: '👥', category: 'starter',    isHidden: false },
  // Creator
  { key: 'creator_1',         name: 'Katılımcı',          description: '3 slayt yükledi',                            icon: '🌱', category: 'creator',    isHidden: false },
  { key: 'creator_2',         name: 'Üretici',            description: '10 slayt yükledi',                           icon: '⚡', category: 'creator',    isHidden: false },
  { key: 'creator_3',         name: 'Sunum Ustası',       description: '50 slayt yükledi',                           icon: '🏆', category: 'creator',    isHidden: false },
  // Quality
  { key: 'quality_liked',     name: 'Beğenilen İçerik',  description: 'Bir slaytı 25 beğeni aldı',                  icon: '❤️', category: 'quality',    isHidden: false },
  { key: 'quality_saved',     name: 'Kaydedilen İçerik', description: 'Bir slaytı 50 kez kaydedildi',               icon: '⭐', category: 'quality',    isHidden: false },
  { key: 'quality_editor',    name: 'Editör Seçimi',     description: 'Editörün seçimi olarak belirlendi',           icon: '🎖️', category: 'quality',    isHidden: false },
  // Engagement
  { key: 'engage_explorer',   name: 'Keşifçi',           description: '20 farklı slayt görüntüledi',                icon: '🔭', category: 'engagement', isHidden: false },
  { key: 'engage_collector',  name: 'Koleksiyoncu',      description: '25 slayt kaydetti',                          icon: '📚', category: 'engagement', isHidden: false },
  { key: 'engage_commenter',  name: 'Yorumcu',           description: '20 yorum yaptı',                             icon: '✍️', category: 'engagement', isHidden: false },
  // Community
  { key: 'community_founder', name: 'Kurucu Üye',        description: 'İlk 500 kullanıcıdan biri',                  icon: '🌟', category: 'community',  isHidden: false },
  { key: 'community_star',    name: 'Topluluk Yıldızı',  description: 'Topluluk içinde çok sevilen hesap',           icon: '💫', category: 'community',  isHidden: false },
  // Hidden
  { key: 'hidden_night_owl',  name: 'Gece Kuşu',         description: 'Gece saatlerinde aktif',                     icon: '🦉', category: 'hidden',     isHidden: true  },
  { key: 'hidden_quick_start',name: 'Hızlı Başlangıç',  description: 'İlk gün 5 aksiyon tamamladı',                icon: '🚀', category: 'hidden',     isHidden: true  },
];

// Seed all badges into DB (idempotent)
async function seedBadges() {
  for (const badge of BADGES) {
    await prisma.badge.upsert({
      where: { key: badge.key },
      update: { name: badge.name, description: badge.description, icon: badge.icon, category: badge.category, isHidden: badge.isHidden },
      create: badge,
    });
  }
}

// Award a badge to a user (idempotent — won't duplicate)
async function awardBadge(userId, key) {
  try {
    const badge = await prisma.badge.findUnique({ where: { key } });
    if (!badge) return;

    const existing = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
    });
    if (existing) return;

    await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });

    // Notify the user
    await prisma.notification.create({
      data: {
        userId,
        type: 'badge',
        message: `🏅 Yeni rozet kazandın: ${badge.icon} ${badge.name}`,
      },
    }).catch(() => {});
  } catch {
    // ignore
  }
}

// Check and award all applicable badges for a user
async function checkBadges(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        createdAt: true,
        _count: {
          select: {
            slides: true,
            comments: true,
            savedSlides: true,
            following: true,
            followedCategories: true,
          },
        },
      },
    });
    if (!user) return;

    const slideCount = user._count.slides;
    const commentCount = user._count.comments;
    const savedCount = user._count.savedSlides;
    const followUserCount = user._count.following;
    const followCatCount = user._count.followedCategories;
    const totalFollowCount = followUserCount + followCatCount;

    // Starter badges
    if (slideCount >= 1)   await awardBadge(userId, 'first_upload');
    if (savedCount >= 1)   await awardBadge(userId, 'first_save');
    if (commentCount >= 1) await awardBadge(userId, 'first_comment');
    if (totalFollowCount >= 1) await awardBadge(userId, 'first_follow');

    // Creator badges
    if (slideCount >= 3)  await awardBadge(userId, 'creator_1');
    if (slideCount >= 10) await awardBadge(userId, 'creator_2');
    if (slideCount >= 50) await awardBadge(userId, 'creator_3');

    // Engagement badges
    if (savedCount >= 25)   await awardBadge(userId, 'engage_collector');
    if (commentCount >= 20) await awardBadge(userId, 'engage_commenter');

    // Community: founder (userId <= 500)
    if (userId <= 500) await awardBadge(userId, 'community_founder');

    // Quality: check slides with high likes/saves
    const qualityLikedSlide = await prisma.slide.findFirst({
      where: { userId, likesCount: { gte: 25 } },
    });
    if (qualityLikedSlide) await awardBadge(userId, 'quality_liked');

    const qualitySavedSlide = await prisma.slide.findFirst({
      where: { userId, savesCount: { gte: 50 } },
    });
    if (qualitySavedSlide) await awardBadge(userId, 'quality_saved');

    // Night owl: registered between 00:00-05:00
    const hour = new Date(user.createdAt).getHours();
    if (hour >= 0 && hour < 5) await awardBadge(userId, 'hidden_night_owl');

    // Hidden: quick start — 5+ distinct actions completed on account's first day
    const firstDayEnd = new Date(new Date(user.createdAt).getTime() + 24 * 60 * 60 * 1000);
    const [firstDaySlides, firstDaySaves, firstDayComments, firstDayFollowUsers, firstDayFollowCats] =
      await Promise.all([
        prisma.slide.count({ where: { userId, createdAt: { lte: firstDayEnd } } }),
        prisma.savedSlide.count({ where: { userId, createdAt: { lte: firstDayEnd } } }),
        prisma.slidePageComment.count({ where: { userId, createdAt: { lte: firstDayEnd } } }),
        prisma.followedUser.count({ where: { followerId: userId, createdAt: { lte: firstDayEnd } } }),
        prisma.followedCategory.count({ where: { userId, createdAt: { lte: firstDayEnd } } }),
      ]);
    const firstDayActions =
      firstDaySlides + firstDaySaves + firstDayComments + firstDayFollowUsers + firstDayFollowCats;
    if (firstDayActions >= 5) await awardBadge(userId, 'hidden_quick_start');

    // Community star: total likes received across all slides >= 100
    const totalLikesReceived = await prisma.slide.aggregate({
      where: { userId },
      _sum: { likesCount: true },
    });
    if ((totalLikesReceived._sum.likesCount || 0) >= 100) {
      await awardBadge(userId, 'community_star');
    }

  } catch {
    // ignore
  }
}

// Check view count for explorer badge (based on visited topics as proxy)
async function checkExplorerBadge(userId) {
  try {
    const viewCount = await prisma.visitedTopic.count({ where: { userId } });
    if (viewCount >= 20) await awardBadge(userId, 'engage_explorer');
  } catch {
    // ignore
  }
}

module.exports = { seedBadges, awardBadge, checkBadges, checkExplorerBadge, BADGES };
