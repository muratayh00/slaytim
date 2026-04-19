#!/usr/bin/env node
/**
 * seo-check.mjs
 *
 * SEO sağlık kontrolü — kritik URL'lerin meta tag, canonical, og:image
 * ve robots durumunu doğrular.
 *
 * Kullanım:
 *   node scripts/seo-check.mjs [--url https://slaytim.com]
 *
 * Çıkış kodu: 0 = tüm kontroller geçti, 1 = sorun var.
 */
import { setTimeout as sleep } from 'node:timers/promises';

const args = process.argv.slice(2);
const urlIdx = args.indexOf('--url');
const BASE_URL = (urlIdx !== -1 ? args[urlIdx + 1] : null)
  || process.env.SITE_URL
  || 'https://slaytim.com';

const API_URL = process.env.API_URL || 'https://api.slaytim.com/api';
const TIMEOUT_MS = 15_000;

let passed = 0;
let warned = 0;
let failed = 0;

function ok(label) { console.log(`  ✅ ${label}`); passed++; }
function warn(label) { console.warn(`  ⚠️  ${label}`); warned++; }
function fail(label) { console.error(`  ❌ ${label}`); failed++; }

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SlaytimSEOBot/1.0' },
    });
    clearTimeout(timer);
    return { status: res.status, text: await res.text(), headers: res.headers };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function extractMeta(html, name) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, 'i');
  return (html.match(re) || html.match(re2) || [])[1] || null;
}

function extractCanonical(html) {
  return (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || [])[1] || null;
}

function extractTitle(html) {
  return (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1]?.trim() || null;
}

console.log(`\n=== SEO Kontrolü — ${BASE_URL} ===`);
console.log(`Tarih: ${new Date().toISOString()}\n`);

// ── 1. Ana Sayfa ──────────────────────────────────────────────────────────────
console.log('--- Ana Sayfa ---');
try {
  const { status, text } = await fetchPage(BASE_URL);
  if (status !== 200) { fail(`Ana sayfa HTTP ${status}`); }
  else {
    const title = extractTitle(text);
    const desc = extractMeta(text, 'description');
    const ogTitle = extractMeta(text, 'og:title');
    const ogImg = extractMeta(text, 'og:image');
    const canonical = extractCanonical(text);
    const robots = extractMeta(text, 'robots');

    title ? ok(`<title>: ${title.slice(0, 60)}`) : fail('title tag eksik');
    desc ? ok(`meta description: ${desc.slice(0, 80)}`) : warn('meta description eksik');
    ogTitle ? ok('og:title mevcut') : warn('og:title eksik');
    ogImg ? ok(`og:image: ${ogImg.slice(0, 80)}`) : warn('og:image eksik');
    canonical ? ok(`canonical: ${canonical}`) : warn('canonical eksik');
    robots && robots.includes('noindex') ? fail(`robots=noindex! ${robots}`) : ok('robots noindex yok');
  }
} catch (err) { fail(`Ana sayfa fetch hatası: ${err.message}`); }

// ── 2. robots.txt ─────────────────────────────────────────────────────────────
console.log('\n--- robots.txt ---');
try {
  const { status, text } = await fetchPage(`${BASE_URL}/robots.txt`);
  if (status !== 200) { fail(`robots.txt HTTP ${status}`); }
  else {
    text.includes('Sitemap') ? ok('Sitemap direktifi mevcut') : warn('Sitemap direktifi yok');
    text.includes('User-agent') ? ok('User-agent direktifi mevcut') : fail('User-agent direktifi yok');
    text.includes('Disallow: /admin') ? ok('/admin disallow edilmiş') : warn('/admin disallow edilmemiş');
  }
} catch (err) { fail(`robots.txt fetch hatası: ${err.message}`); }

// ── 3. sitemap.xml ────────────────────────────────────────────────────────────
console.log('\n--- sitemap.xml ---');
try {
  const { status, text } = await fetchPage(`${BASE_URL}/sitemap.xml`);
  if (status !== 200) { fail(`sitemap.xml HTTP ${status}`); }
  else {
    text.includes('<urlset') || text.includes('<sitemapindex')
      ? ok('sitemap.xml geçerli XML')
      : fail('sitemap.xml geçersiz format');
    const urlCount = (text.match(/<url>/g) || []).length;
    const sitemapCount = (text.match(/<sitemap>/g) || []).length;
    if (urlCount > 0) ok(`${urlCount} URL bulundu`);
    else if (sitemapCount > 0) ok(`${sitemapCount} sub-sitemap bulundu`);
    else warn('sitemap URL sayısı 0');
  }
} catch (err) { fail(`sitemap.xml fetch hatası: ${err.message}`); }

// ── 4. API seo verileri ───────────────────────────────────────────────────────
console.log('\n--- API SEO Verileri ---');
try {
  const categories = await fetchJson(`${API_URL}/categories`);
  Array.isArray(categories) && categories.length > 0
    ? ok(`${categories.length} kategori mevcut`)
    : warn('Kategori verisi yok');

  // Her kategorinin slug'ı var mı?
  const missingSlug = categories.filter(c => !c.slug).length;
  missingSlug === 0
    ? ok('Tüm kategorilerde slug var')
    : fail(`${missingSlug} kategoride slug eksik`);
} catch (err) { warn(`API kategori kontrolü başarısız: ${err.message}`); }

// ── 5. Örnek slayt sayfası ────────────────────────────────────────────────────
console.log('\n--- Örnek İçerik Sayfası ---');
try {
  const slides = await fetchJson(`${API_URL}/slides/popular?limit=1`);
  const slide = Array.isArray(slides) ? slides[0] : null;
  if (!slide) { warn('Popüler slayt bulunamadı — slayt sayfası testi atlandı'); }
  else {
    const slideUrl = `${BASE_URL}/slides/${slide.id}`;
    const { status, text } = await fetchPage(slideUrl);
    if (status !== 200) { fail(`Slayt sayfası HTTP ${status}: ${slideUrl}`); }
    else {
      const title = extractTitle(text);
      const desc = extractMeta(text, 'description');
      const ogImg = extractMeta(text, 'og:image');
      title ? ok(`Slayt title: ${title.slice(0, 60)}`) : fail('Slayt sayfasında title yok');
      desc ? ok('meta description mevcut') : warn('meta description eksik');
      ogImg ? ok('og:image mevcut') : warn('og:image eksik');
    }
  }
} catch (err) { warn(`Slayt sayfası kontrolü başarısız: ${err.message}`); }

// ── Sonuç ─────────────────────────────────────────────────────────────────────
console.log('');
console.log(`=== Sonuç: ${passed} geçti, ${warned} uyarı, ${failed} hata ===`);

if (failed > 0) {
  console.error('\n❌ SEO kontrolü başarısız — kritik sorunlar var!');
  process.exit(1);
} else if (warned > 0) {
  console.warn('\n⚠️  SEO kontrolü tamamlandı — iyileştirme önerileri var.');
  process.exit(0);
} else {
  console.log('\n✅ Tüm SEO kontrolleri geçti.');
  process.exit(0);
}
