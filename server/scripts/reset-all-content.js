#!/usr/bin/env node
/**
 * reset-all-content.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tüm kullanıcı içeriklerini ve demo verilerini temizler.
 * Kod tabanına, env dosyalarına, migration geçmişine ve badge tanımlarına
 * dokunmaz. Kategoriler silinir ve ardından otomatik olarak yeniden seed edilir.
 *
 * KULLANIM:
 *   node scripts/reset-all-content.js              → dry-run (neyin silineceğini göster)
 *   node scripts/reset-all-content.js --confirm    → gerçekten sil
 *   node scripts/reset-all-content.js --skip-files → dosya sistemini atla (sadece DB)
 *
 * ROLLBACK UYARISI:
 *   Bu işlem GERİ ALINAMAZ. Çalıştırmadan önce Supabase Dashboard →
 *   Database → Backups bölümünden manuel bir yedek alın.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { categoryData } = require('../prisma/categoryData');

const prisma = new PrismaClient();

const CONFIRM = process.argv.includes('--confirm');
const SKIP_FILES = process.argv.includes('--skip-files');

// ── Upload klasörleri ─────────────────────────────────────────────────────────
const UPLOADS_ROOT = path.resolve(__dirname, '../uploads');
const UPLOAD_DIRS_TO_CLEAR = [
  'slides',          // Orijinal .pptx dosyaları
  'pdfs',            // LibreOffice tarafından üretilen PDF'ler
  'thumbnails',      // Slide thumbnail görselleri
  'slideo-previews', // Slideo preview dosyaları
  'avatars',         // Kullanıcı avatar görselleri (varsa)
];
// Bu klasörler silinmez (LibreOffice runtime cache)
const UPLOAD_DIRS_PROTECTED = ['.lo-profile', '.lo-profiles'];

// ── Tablo listesi (FK bağımlılık sırasıyla — leaf'ler önce) ──────────────────
// Her bir model adı Prisma client metodu olarak kullanılır.
// Sıra kritik: bağımlı tablolar önce temizlenmeli.
const TABLE_DELETION_ORDER = [
  // Analytics & session
  'analyticsEvent',
  'sessionSnapshot',
  'slideoFeedAssignment',
  'slideoFeedEvent',

  // Auth & security
  'passwordResetToken',
  'adminLog',
  'userWarning',
  'blockedUser',

  // Social graph
  'followedUser',
  'followedCategory',
  'visitedTopic',
  'topicSubscription',

  // Engagement (likes / saves)
  'topicLike',
  'slideLike',
  'savedSlide',
  'slideoLike',
  'slideoSave',
  'slideoCompletion',
  'slideoShare',

  // Slide interactions
  'slidePageReaction',
  'slidePageComment',
  'slidePageStat',
  'slideViewSession',

  // Flashcards
  'flashcardAttempt',
  'flashcardQuestion',

  // Collections
  'collectionSlide',
  'collectionFollow',

  // Rooms
  'roomMember',
  'roomMessage',

  // Core content interactions
  'comment',
  'notification',
  'report',

  // Badges (user↔badge ilişkisi; badge tanımları korunur)
  'userBadge',

  // Conversion jobs
  'conversionJob',

  // Slideo hierarchy
  'slideoSession',
  'slideo',
  'slideoSeries',

  // Other content
  'flashcardSet',
  'collection',
  'room',

  // Core content (sıra önemli)
  'slide',
  'topic',

  // Kategoriler — son aşamada silinir, ardından re-seed edilir
  'category',

  // Kullanıcılar — en son (neredeyse her şey kullanıcıya bağlı)
  'user',
];

// ── Yardımcı fonksiyonlar ─────────────────────────────────────────────────────

function banner(text) {
  const line = '─'.repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${text}`);
  console.log(`${line}`);
}

function countFilesInDir(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  try {
    return fs.readdirSync(dirPath).filter((f) => {
      const full = path.join(dirPath, f);
      return fs.statSync(full).isFile();
    }).length;
  } catch {
    return 0;
  }
}

function clearDirectory(dirPath, dryRun) {
  if (!fs.existsSync(dirPath)) {
    console.log(`  [SKIP] ${dirPath} — klasör yok`);
    return 0;
  }

  const entries = fs.readdirSync(dirPath);
  let deleted = 0;

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry);
    const stat = fs.statSync(entryPath);

    if (stat.isFile()) {
      if (!dryRun) fs.unlinkSync(entryPath);
      deleted++;
    } else if (stat.isDirectory()) {
      // Sadece alt klasörlerdeki dosyaları sil (klasörü koru)
      const subFiles = fs.readdirSync(entryPath);
      for (const sub of subFiles) {
        const subPath = path.join(entryPath, sub);
        if (fs.statSync(subPath).isFile()) {
          if (!dryRun) fs.unlinkSync(subPath);
          deleted++;
        }
      }
    }
  }

  return deleted;
}

// ── Ana fonksiyon ─────────────────────────────────────────────────────────────

async function main() {
  banner('SLAYTIM İÇERİK SIFIRLAMA ARACI');

  if (!CONFIRM) {
    console.log('\n⚠️  DRY-RUN MODU — Hiçbir şey silinmedi.');
    console.log('   Gerçekten silmek için: node scripts/reset-all-content.js --confirm\n');
  } else {
    console.log('\n🔴 ONAY ALINDI — Veriler silinecek. Bu işlem geri alınamaz!\n');
  }

  // ── 1. Mevcut kayıt sayılarını göster ──────────────────────────────────────
  banner('Silinecek Kayıt Sayıları (DB)');

  const counts = {};
  let totalRows = 0;
  for (const model of TABLE_DELETION_ORDER) {
    try {
      const count = await prisma[model].count();
      counts[model] = count;
      totalRows += count;
      if (count > 0) {
        console.log(`  ${model.padEnd(30)} ${count} kayıt`);
      }
    } catch (err) {
      console.log(`  ${model.padEnd(30)} [ERR: ${err.message.split('\n')[0]}]`);
      counts[model] = 0;
    }
  }
  console.log(`\n  ${'TOPLAM'.padEnd(30)} ${totalRows} kayıt`);

  // ── 2. Upload klasörlerini say ──────────────────────────────────────────────
  if (!SKIP_FILES) {
    banner('Silinecek Upload Dosyaları');
    let totalFiles = 0;
    for (const dir of UPLOAD_DIRS_TO_CLEAR) {
      const dirPath = path.join(UPLOADS_ROOT, dir);
      const count = countFilesInDir(dirPath);
      totalFiles += count;
      console.log(`  uploads/${dir.padEnd(25)} ${count} dosya`);
    }
    console.log(`\n  ${'TOPLAM'.padEnd(30)} ${totalFiles} dosya`);
    console.log('\n  KORUNAN klasörler:', UPLOAD_DIRS_PROTECTED.join(', '));
  }

  // ── Dry-run'da burada dur ───────────────────────────────────────────────────
  if (!CONFIRM) {
    banner('Devam etmek için');
    console.log('  node scripts/reset-all-content.js --confirm\n');
    console.log('  ⚠️  Öncesinde Supabase Dashboard → Backups\'tan yedek almanız önerilir.\n');
    await prisma.$disconnect();
    return;
  }

  // ── 3. DB silme işlemi ──────────────────────────────────────────────────────
  banner('DB Silme İşlemi Başlıyor');
  console.log('  Bu işlem uzun sürebilir, lütfen bekleyin...\n');

  let dbErrors = 0;
  for (const model of TABLE_DELETION_ORDER) {
    if (counts[model] === 0) {
      process.stdout.write(`  [SKIP] ${model} — zaten boş\n`);
      continue;
    }
    try {
      const result = await prisma[model].deleteMany({});
      console.log(`  [OK]   ${model.padEnd(30)} ${result.count} kayıt silindi`);
    } catch (err) {
      console.error(`  [ERR]  ${model.padEnd(30)} ${err.message.split('\n')[0]}`);
      dbErrors++;
    }
  }

  if (dbErrors > 0) {
    console.error(`\n  ⚠️  ${dbErrors} tabloda hata oluştu. Yukarıdaki hataları inceleyin.`);
  } else {
    console.log('\n  ✅ Tüm tablolar temizlendi.');
  }

  // ── 4. Kategorileri yeniden seed et ────────────────────────────────────────
  banner('Kategoriler Yeniden Oluşturuluyor');
  let catCount = 0;
  for (const category of categoryData) {
    try {
      await prisma.category.upsert({
        where: { slug: category.slug },
        update: { name: category.name },
        create: category,
      });
      catCount++;
    } catch (err) {
      console.error(`  [ERR] Kategori oluşturulamadı (${category.slug}): ${err.message}`);
    }
  }
  console.log(`  ✅ ${catCount} kategori yeniden oluşturuldu.`);

  // ── 5. Upload dosyalarını temizle ──────────────────────────────────────────
  if (!SKIP_FILES) {
    banner('Upload Dosyaları Temizleniyor');
    let totalDeleted = 0;
    for (const dir of UPLOAD_DIRS_TO_CLEAR) {
      const dirPath = path.join(UPLOADS_ROOT, dir);
      try {
        const deleted = clearDirectory(dirPath, false);
        totalDeleted += deleted;
        console.log(`  [OK]   uploads/${dir.padEnd(25)} ${deleted} dosya silindi`);
      } catch (err) {
        console.error(`  [ERR]  uploads/${dir}: ${err.message}`);
      }
    }
    console.log(`\n  ✅ Toplam ${totalDeleted} dosya silindi.`);
    console.log('  Klasör yapısı korundu (boş klasörler sağlıklı çalışma için gerekli).');
  }

  // ── 6. Son durum özeti ──────────────────────────────────────────────────────
  banner('Sistem Durumu');
  const userCount = await prisma.user.count();
  const topicCount = await prisma.topic.count();
  const slideCount = await prisma.slide.count();
  const categoryCount = await prisma.category.count();
  const badgeCount = await prisma.badge.count();

  console.log(`  Kullanıcılar  : ${userCount}`);
  console.log(`  Konular       : ${topicCount}`);
  console.log(`  Slaytlar      : ${slideCount}`);
  console.log(`  Kategoriler   : ${categoryCount} (seed edildi)`);
  console.log(`  Badge tanımları: ${badgeCount} (korundu)`);
  console.log('');

  if (userCount === 0 && topicCount === 0 && slideCount === 0) {
    console.log('  ✅ Sistem temiz ve çalışır halde. İlk admin kullanıcıyı oluşturmak için:');
    console.log('     node scripts/create-admin.js --email=admin@slaytim.com --password=SifreNiz123!');
  } else {
    console.log('  ⚠️  Bazı tablolarda hâlâ kayıt var, yukarıdaki hataları kontrol edin.');
  }

  console.log('');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('\n❌ Reset başarısız:', err.message);
  console.error(err.stack);
  prisma.$disconnect();
  process.exit(1);
});
