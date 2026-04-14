#!/usr/bin/env node
/**
 * create-admin.js — İlk super_admin kullanıcısını oluşturur veya mevcut bir
 * hesabı super_admin'e yükseltir.
 *
 * Kullanım:
 *   node scripts/create-admin.js --email=admin@slaytim.com
 *   node scripts/create-admin.js --email=admin@slaytim.com --password=GucluSifre123!
 *   node scripts/create-admin.js --email=mevcut@kullanici.com --promote-only
 *
 * Seçenekler:
 *   --email=<email>       (zorunlu) Admin e-posta adresi
 *   --password=<sifre>    Yeni kullanıcı oluşturulurken kullanılacak şifre
 *                         (--promote-only olmadan, mevcut kullanıcı yoksa gereklidir)
 *   --username=<ad>       Yeni kullanıcı için kullanıcı adı (varsayılan: "admin")
 *   --promote-only        Yalnızca mevcut kullanıcıyı yükselt, oluşturma
 *
 * UYARI: Bu scripti yalnızca güvenli bir ortamda (lokal veya SSH) çalıştırın.
 *        Şifre komut satırında görünür — process-monitor'lar log tutabilir.
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, ...valParts] = arg.slice(2).split('=');
      args[key] = valParts.length ? valParts.join('=') : true;
    }
  }
  return args;
}

function generatePassword(len = 20) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const crypto = require('crypto');
  return Array.from(crypto.randomBytes(len))
    .map((b) => chars[b % chars.length])
    .join('');
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.email) {
    console.error('Hata: --email parametresi zorunlu');
    console.error('Örnek: node scripts/create-admin.js --email=admin@slaytim.com');
    process.exit(1);
  }

  const email = String(args.email).toLowerCase().trim();
  const promoteOnly = args['promote-only'] === true || args['promote-only'] === 'true';

  // ── Mevcut kullanıcıyı kontrol et ────────────────────────────────────────
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.isAdmin && existing.role === 'super_admin') {
      console.log(`✅ ${email} zaten super_admin. İşlem yapılmadı.`);
      return;
    }

    const updated = await prisma.user.update({
      where: { email },
      data: { isAdmin: true, role: 'super_admin' },
      select: { id: true, username: true, email: true, role: true, isAdmin: true },
    });
    console.log('✅ Mevcut kullanıcı super_admin\'e yükseltildi:');
    console.log(`   ID       : ${updated.id}`);
    console.log(`   Kullanıcı: ${updated.username}`);
    console.log(`   E-posta  : ${updated.email}`);
    console.log(`   Rol      : ${updated.role}`);
    return;
  }

  if (promoteOnly) {
    console.error(`Hata: --promote-only belirtildi ama ${email} adresiyle kullanıcı bulunamadı.`);
    process.exit(1);
  }

  // ── Yeni kullanıcı oluştur ────────────────────────────────────────────────
  let password = args.password;
  let generated = false;
  if (!password) {
    password = generatePassword();
    generated = true;
  }

  if (String(password).length < 8) {
    console.error('Hata: Şifre en az 8 karakter olmalıdır.');
    process.exit(1);
  }

  const username = String(args.username || 'admin').trim().slice(0, 30);
  const hash = await bcrypt.hash(String(password), 12);

  // Kullanıcı adı çakışmasını önlemek için benzersiz yap
  const usernameConflict = await prisma.user.findUnique({ where: { username } });
  const finalUsername = usernameConflict ? `${username}_${Date.now()}` : username;

  const created = await prisma.user.create({
    data: {
      email,
      username: finalUsername,
      passwordHash: hash,
      isAdmin: true,
      role: 'super_admin',
    },
    select: { id: true, username: true, email: true, role: true, isAdmin: true },
  });

  console.log('✅ Super admin kullanıcısı oluşturuldu:');
  console.log(`   ID       : ${created.id}`);
  console.log(`   Kullanıcı: ${created.username}`);
  console.log(`   E-posta  : ${created.email}`);
  console.log(`   Rol      : ${created.role}`);
  if (generated) {
    console.log('');
    console.log('⚠️  Şifre otomatik oluşturuldu (kaydet, tekrar gösterilmez):');
    console.log(`   Şifre: ${password}`);
    console.log('');
    console.log('   Giriş yaptıktan sonra şifreyi değiştirmeyi unutmayın!');
  }
}

main()
  .catch((err) => {
    console.error('❌ Hata:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
