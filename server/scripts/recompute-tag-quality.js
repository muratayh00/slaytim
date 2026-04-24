#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DAYS = Math.max(7, Number(process.env.TAG_INDEX_RECENT_DAYS || 90));
const MIN_ITEMS = Math.max(1, Number(process.env.TAG_INDEX_MIN_ITEMS || 5));

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

async function main() {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const tags = await prisma.tag.findMany({
    select: { id: true, slug: true },
    orderBy: { id: 'asc' },
  });

  let updated = 0;
  for (const tag of tags) {
    const rows = await prisma.slideTag.findMany({
      where: {
        tagId: tag.id,
        slide: {
          isHidden: false,
          deletedAt: null,
          conversionStatus: 'done',
        },
      },
      select: {
        slide: {
          select: {
            createdAt: true,
            viewsCount: true,
            likesCount: true,
            savesCount: true,
          },
        },
      },
      take: 5000,
    });

    const total = rows.length;
    const recentRows = rows.filter((r) => new Date(r.slide.createdAt) >= since);
    const recent = recentRows.length;

    const agg = rows.reduce((acc, row) => {
      acc.views += Number(row.slide.viewsCount || 0);
      acc.likes += Number(row.slide.likesCount || 0);
      acc.saves += Number(row.slide.savesCount || 0);
      return acc;
    }, { views: 0, likes: 0, saves: 0 });

    const views = Math.max(1, agg.views);
    const saveRate = clamp(agg.saves / views, 0, 1);
    const likeRate = clamp(agg.likes / views, 0, 1);
    const recentRatio = clamp(recent / Math.max(1, total), 0, 1);
    const quality = clamp((saveRate * 0.5) + (likeRate * 0.3) + (recentRatio * 0.2), 0, 1);
    const isIndexable = total >= MIN_ITEMS && recent > 0 && quality >= 0.08;

    await prisma.tag.update({
      where: { id: tag.id },
      data: {
        qualityScore: quality,
        last90dActivity: recent,
        minIndexThreshold: MIN_ITEMS,
        isIndexable,
      },
    });
    updated += 1;
  }

  console.log(`[tag-quality] updated=${updated} days=${DAYS} minItems=${MIN_ITEMS}`);
}

main()
  .catch((err) => {
    console.error('[tag-quality] failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
