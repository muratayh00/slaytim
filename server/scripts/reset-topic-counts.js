/**
 * reset-topic-counts.js
 *
 * Tüm konuların görüntülenme ve beğeni sayılarını sıfırlar.
 *
 * Kullanım:
 *   node server/scripts/reset-topic-counts.js
 *
 * Opsiyonel bayraklar:
 *   --dry-run   → Gerçek güncelleme yapmadan kaç kayıt etkileneceğini gösterir
 *   --likes     → Sadece likesCount sıfırla
 *   --views     → Sadece viewsCount sıfırla
 *   (bayrak yoksa her ikisi de sıfırlanır)
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

const args = process.argv.slice(2);
const DRY_RUN   = args.includes('--dry-run');
const ONLY_LIKES = args.includes('--likes');
const ONLY_VIEWS = args.includes('--views');

const resetLikes = !ONLY_VIEWS;
const resetViews = !ONLY_LIKES;

async function main() {
  const total = await prisma.topic.count();
  console.log(`\n📊 Toplam konu sayısı: ${total}`);

  if (DRY_RUN) {
    console.log('\n🔍 DRY-RUN modu — hiçbir değişiklik yapılmayacak.');
    if (resetLikes) console.log(`  → likesCount  sıfırlanacak: ${total} kayıt`);
    if (resetViews) console.log(`  → viewsCount  sıfırlanacak: ${total} kayıt`);
    await prisma.$disconnect();
    return;
  }

  console.log('\n⚠️  Bu işlem geri alınamaz. Devam etmek için 3 saniye bekleyin...');
  await new Promise((r) => setTimeout(r, 3000));

  const data = {};
  if (resetLikes) data.likesCount = 0;
  if (resetViews) data.viewsCount = 0;

  const result = await prisma.topic.updateMany({ data });

  console.log(`\n✅ Tamamlandı:`);
  if (resetLikes) console.log(`  → likesCount  = 0   (${result.count} kayıt)`);
  if (resetViews) console.log(`  → viewsCount  = 0   (${result.count} kayıt)`);

  // topic_likes junction tablosunu da temizle (opsiyonel)
  if (resetLikes) {
    const deleted = await prisma.topicLike.deleteMany({});
    console.log(`  → topic_likes tablosu temizlendi (${deleted.count} kayıt silindi)`);
  }

  // visited_topics tablosunu temizle (view dedup ve kişiselleştirme verisi)
  if (resetViews) {
    const deleted = await prisma.visitedTopic.deleteMany({});
    console.log(`  → visited_topics tablosu temizlendi (${deleted.count} kayıt silindi)`);
  }

  console.log('\n🔄 Cache temizleniyor... (sunucu restart gerekebilir)');
}

main()
  .catch((err) => {
    console.error('❌ Hata:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
