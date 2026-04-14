const prisma = require('../lib/prisma');
const { createNotification } = require('../lib/notify');
const { topicPath } = require('../lib/route-paths');

async function notifyTopicSubscribers({ topicId, actorUserId, slideTitle }) {
  const tid = Number(topicId);
  const actor = Number(actorUserId);
  if (!Number.isInteger(tid) || tid <= 0) return;
  if (!Number.isInteger(actor) || actor <= 0) return;

  try {
    const subs = await prisma.topicSubscription.findMany({
      where: {
        topicId: tid,
        notifyNewSlides: true,
        userId: { not: actor },
      },
      select: {
        userId: true,
        topic: { select: { id: true, title: true, slug: true } },
      },
      take: 500,
    });

    for (const sub of subs) {
      const topicLink = topicPath(sub.topic || { id: tid, title: String(sub.topic?.title || '') });
      createNotification({
        userId: sub.userId,
        type: 'topic_update',
        message: `${sub.topic?.title || 'Takip ettiğiniz konuda'} yeni slayt yüklendi: ${slideTitle}`,
        link: topicLink,
      });
    }
  } catch {
    // non-blocking
  }
}

module.exports = {
  notifyTopicSubscribers,
};
