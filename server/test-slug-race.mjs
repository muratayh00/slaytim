/**
 * Slug race condition test
 *
 * Starts the API, then fires 10 concurrent identical-title uploads.
 * Every request must return 201 — no 500s allowed.
 * All 10 slides must have distinct slugs in the DB.
 */

import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { setTimeout as sleep } from 'timers/promises';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 5098;
const BASE = `http://127.0.0.1:${PORT}`;

const DB_URL = readFileSync(join(__dirname, '.env'), 'utf8')
  .split('\n').find(l => l.startsWith('DATABASE_URL='))
  ?.replace(/^DATABASE_URL="?|"?$/g, '').trim();

const ENV = {
  NODE_ENV: 'test',
  PORT: String(PORT),
  DATABASE_URL: DB_URL,
  JWT_SECRET: 'test_secret_for_slug_race_test_32_chars_ok',
  AUTH_COOKIE_NAME: 'slaytim_auth',
  CSRF_COOKIE_NAME: 'slaytim_csrf',
  AUTH_COOKIE_SECURE: 'false',
  AUTH_COOKIE_SAME_SITE: 'lax',
  CLIENT_URL: BASE,
  TRUST_PROXY: '0',
  BLOCKED_IPS: '',
  REDIS_ENABLED: 'false',
  CONVERSION_LOCAL_FALLBACK: 'true',
  LIBREOFFICE_PATH: 'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  LIBREOFFICE_REQUIRED: 'false',
  CLAMAV_REQUIRED: 'false',
  STORAGE_DRIVER: '',
  ALLOW_LOCAL_STORAGE_DEV: 'true',
  LOG_LEVEL: 'error',   // suppress startup noise
  E2E_DISABLE_RATE_LIMIT: 'true',
};

function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body instanceof Buffer ? body : (body ? JSON.stringify(body) : null);
    const contentType = body instanceof Buffer ? headers['Content-Type'] : 'application/json';
    const opts = {
      hostname: '127.0.0.1', port: PORT, path, method,
      headers: {
        ...(contentType ? { 'Content-Type': contentType } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers,
      },
    };
    const r = http.request(opts, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, body: raw }); }
      });
    });
    r.on('error', reject);
    r.setTimeout(15000, () => { r.destroy(); reject(new Error('timeout')); });
    if (data) r.write(data);
    r.end();
  });
}

async function waitForPort(port, ms = 20000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      await req('GET', '/api/health');
      return true;
    } catch { await sleep(400); }
  }
  return false;
}

function makePdfBody(boundary, title, topicId, cookie, csrfToken) {
  const content = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 0\ntrailer\n<< /Size 1 >>\nstartxref\n9\n%%EOF\n');
  const crlf = '\r\n';
  return Buffer.concat([
    Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="title"${crlf}${crlf}${title}${crlf}`),
    Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="topicId"${crlf}${crlf}${topicId}${crlf}`),
    Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="file"; filename="test.pdf"${crlf}Content-Type: application/octet-stream${crlf}${crlf}`),
    content,
    Buffer.from(`${crlf}--${boundary}--${crlf}`),
  ]);
}

// ── Start server ──────────────────────────────────────────────────────────────
console.log('Starting API server...');
const server = spawn('node', ['src/index.js'], { env: { ...process.env, ...ENV }, cwd: __dirname });
server.stderr.on('data', () => {}); // suppress

const ready = await waitForPort(PORT);
if (!ready) { console.error('Server failed to start'); server.kill(); process.exit(1); }
console.log('Server ready.\n');

// ── Setup: auth + topic ───────────────────────────────────────────────────────
const uid = Date.now().toString().slice(-7);
const user = { username: `rc_${uid}`, email: `rc${uid}@test.invalid`, password: 'Pass123!' };

const csrfRes = await req('GET', '/api/auth/csrf');
const csrfCookieRaw = (csrfRes.headers['set-cookie'] || []).find(c => c.startsWith('slaytim_csrf='));
const csrfToken = csrfRes.body?.csrfToken || csrfCookieRaw?.split(';')[0].split('=').slice(1).join('=');

await req('POST', '/api/auth/register', user);
const loginRes = await req('POST', '/api/auth/login', user);
const authCookieRaw = (loginRes.headers['set-cookie'] || []).find(c => c.startsWith('slaytim_auth='));
const cookieStr = [authCookieRaw?.split(';')[0], csrfCookieRaw?.split(';')[0]].filter(Boolean).join('; ');

const catsRes = await req('GET', '/api/categories');
const categoryId = (Array.isArray(catsRes.body) ? catsRes.body : [])[0]?.id;
const topicRes = await req('POST', '/api/topics', { title: 'Race Test', description: 'x', categoryId }, {
  Cookie: cookieStr, 'x-csrf-token': csrfToken,
});
const topicId = topicRes.body?.id;

if (!topicId) {
  console.error('Could not create topic:', topicRes.body);
  server.kill(); process.exit(1);
}
console.log(`Setup: user=${user.username} topic=${topicId} csrf=${csrfToken?.slice(0,8)}...`);

// ── THE RACE TEST ─────────────────────────────────────────────────────────────
const CONCURRENT = 10;
const IDENTICAL_TITLE = 'Race Condition Test Slide'; // all requests use the same title

console.log(`\nFiring ${CONCURRENT} concurrent uploads with identical title: "${IDENTICAL_TITLE}"`);

const uploadOne = () => {
  const boundary = `----Bound${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  const body = makePdfBody(boundary, IDENTICAL_TITLE, topicId, cookieStr, csrfToken);
  return req('POST', '/api/slides', body, {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    Cookie: cookieStr,
    'x-csrf-token': csrfToken,
  });
};

const results = await Promise.all(Array.from({ length: CONCURRENT }, uploadOne));

// ── Evaluate results ──────────────────────────────────────────────────────────
console.log('\nResults:');
const statuses = results.map(r => r.status);
const slugs = results.map(r => r.body?.slug).filter(Boolean);
const uniqueSlugs = new Set(slugs);

results.forEach((r, i) => {
  const status = r.status;
  const slug = r.body?.slug;
  const err = r.body?.error;
  const marker = status === 201 ? '✓' : '✗';
  console.log(`  [${i + 1}] ${marker} status=${status} slug=${slug || err}`);
});

console.log('\n─── Test Results ───');

let passed = true;

// Test 1: All requests must return 201
const all201 = results.every(r => r.status === 201);
if (all201) {
  console.log(`✓ All ${CONCURRENT} requests returned 201 — no 500s`);
} else {
  const fails = results.filter(r => r.status !== 201);
  console.log(`✗ ${fails.length} requests failed (expected all 201):`);
  fails.forEach(r => console.log(`    status=${r.status} error=${r.body?.error}`));
  passed = false;
}

// Test 2: All slugs must be unique
if (slugs.length === CONCURRENT && uniqueSlugs.size === CONCURRENT) {
  console.log(`✓ All ${CONCURRENT} slugs are unique`);
} else {
  console.log(`✗ Slug uniqueness failed: got ${uniqueSlugs.size} unique out of ${slugs.length} slugs`);
  const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (dupes.length) console.log(`  Duplicates: ${[...new Set(dupes)].join(', ')}`);
  passed = false;
}

// Test 3: Slugs are based on the title
const expectedBase = 'race-condition-test-slide';
const allTitleBased = slugs.every(s => s.startsWith(expectedBase));
if (allTitleBased) {
  console.log(`✓ All slugs are derived from the title ("${expectedBase}...")`);
} else {
  const bad = slugs.filter(s => !s.startsWith(expectedBase));
  console.log(`✗ Some slugs not title-based: ${bad.join(', ')}`);
  passed = false;
}

// Show slug uniqueness proof
console.log('\nSlugs generated:');
slugs.forEach(s => console.log(`  ${s}`));

server.kill();
await sleep(500);

console.log(`\n${passed ? '✓ RACE CONDITION TEST PASSED' : '✗ RACE CONDITION TEST FAILED'}`);
process.exit(passed ? 0 : 1);
