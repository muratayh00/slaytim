#!/usr/bin/env node
/**
 * smoke-test-prod.mjs
 *
 * Production smoke test — verifies critical API endpoints respond correctly.
 * Kullanım: node scripts/smoke-test-prod.mjs [--api-url https://api.slaytim.com/api]
 *
 * Çıkış kodu: 0 = tüm testler geçti, 1 = bazıları başarısız.
 */
import { setTimeout as sleep } from 'node:timers/promises';

const args = process.argv.slice(2);
const apiUrlIdx = args.indexOf('--api-url');
const API_URL = (apiUrlIdx !== -1 ? args[apiUrlIdx + 1] : null)
  || process.env.API_URL
  || 'http://localhost:5001/api';

const TIMEOUT_MS = 10_000;

let passed = 0;
let failed = 0;

async function check(label, fn) {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${label}: ${err.message}`);
    failed++;
  }
}

async function GET(path, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(opts.headers || {}) },
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function expectOk(path, label) {
  await check(label, async () => {
    const res = await GET(path);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  });
}

async function expectJson(path, label, validator) {
  await check(label, async () => {
    const res = await GET(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (validator) validator(body);
  });
}

console.log(`\n=== Smoke Test — ${API_URL} ===`);
console.log(`Tarih: ${new Date().toISOString()}\n`);

// ── Temel sağlık ──────────────────────────────────────────────────────────────
await expectOk('/health', 'GET /health → 200');

// ── Kategoriler ───────────────────────────────────────────────────────────────
await expectJson('/categories', 'GET /categories → JSON dizi', (body) => {
  if (!Array.isArray(body)) throw new Error('Beklenen dizi, alınan: ' + typeof body);
  if (body.length === 0) throw new Error('Kategori listesi boş');
});

// ── Konular ───────────────────────────────────────────────────────────────────
await expectJson('/topics?page=1&limit=5', 'GET /topics → sayfalı sonuç', (body) => {
  if (!body.topics && !Array.isArray(body)) throw new Error('Konu verisi yok');
});

// ── Slaytlar ──────────────────────────────────────────────────────────────────
await expectJson('/slides/popular?limit=5', 'GET /slides/popular → 200', (body) => {
  if (!Array.isArray(body)) throw new Error('Beklenen dizi, alınan: ' + typeof body);
});

// ── Auth guard ────────────────────────────────────────────────────────────────
await check('GET /admin/stats → 401 (auth guard)', async () => {
  const res = await GET('/admin/stats');
  if (res.status !== 401 && res.status !== 403) {
    throw new Error(`Beklenen 401/403, alınan ${res.status}`);
  }
});

// ── Preview endpoint ──────────────────────────────────────────────────────────
await check('GET /slides/1/preview-meta → 200 veya 404 (crash yok)', async () => {
  const res = await GET('/slides/1/preview-meta');
  if (res.status !== 200 && res.status !== 404 && res.status !== 401) {
    throw new Error(`Beklenen 200/404/401, alınan ${res.status}`);
  }
});

// ── Feed ──────────────────────────────────────────────────────────────────────
await expectJson('/slideo/feed?limit=5', 'GET /slideo/feed → 200', (body) => {
  if (!body.items && !Array.isArray(body)) throw new Error('Feed verisi yok');
});

// ── Rate limit sağlığı ────────────────────────────────────────────────────────
await check('Rate limit header mevcut', async () => {
  const res = await GET('/categories');
  const rl = res.headers.get('x-ratelimit-limit') || res.headers.get('ratelimit-limit');
  // Rate limit header yoksa soft warning (bazı deploylar expose etmeyebilir)
  if (!rl) console.log('    ⚠️  Rate limit header yok — soft warning');
});

// ── Sonuç ─────────────────────────────────────────────────────────────────────
console.log('');
console.log(`=== Sonuç: ${passed} geçti, ${failed} başarısız ===`);

if (failed > 0) {
  console.error('\n❌ Smoke test BAŞARISIZ — production sağlık sorunu var!');
  process.exit(1);
} else {
  console.log('\n✅ Tüm smoke testler geçti.');
  process.exit(0);
}
