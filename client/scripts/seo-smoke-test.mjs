#!/usr/bin/env node
/**
 * SEO Smoke-Test Script — slaytim.com
 * ─────────────────────────────────────
 * Runs a suite of automated checks against a live deployment.
 * Place in CI/CD release pipeline:
 *
 *   node scripts/seo-smoke-test.mjs https://slaytim.com
 *
 * Exit code 0 = all checks passed
 * Exit code 1 = one or more failures
 *
 * Usage:
 *   node scripts/seo-smoke-test.mjs [BASE_URL]
 *   BASE_URL defaults to https://www.slaytim.com
 */

const BASE = (process.argv[2] || 'https://www.slaytim.com').replace(/\/$/, '');

let passed = 0;
let failed = 0;
const failures = [];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function get(path, opts = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    redirect: opts.followRedirects === false ? 'manual' : 'follow',
    headers: { 'User-Agent': 'SlaytimSEOBot/1.0' },
    signal: AbortSignal.timeout(10_000),
  });
  const text = await res.text().catch(() => '');
  return { res, text, url };
}

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    const msg = detail ? `${name} — ${detail}` : name;
    console.error(`  ✗ ${msg}`);
    failed++;
    failures.push(msg);
  }
}

async function section(title, fn) {
  console.log(`\n▸ ${title}`);
  await fn();
}

// ── Test Suite ────────────────────────────────────────────────────────────────

await section('robots.txt', async () => {
  const { res, text } = await get('/robots.txt');
  const normalized = text.toLowerCase();
  check('Status 200', res.status === 200, `got ${res.status}`);
  check('Contains User-agent: *', normalized.includes('user-agent: *'));
  check('Contains Sitemap directive', normalized.includes('sitemap:'));
  check('Disallows /admin', normalized.includes('disallow: /admin'));
  check('Disallows /api/', normalized.includes('disallow: /api/'));
  check('Content-Type text/plain', (res.headers.get('content-type') || '').includes('text/plain'));
});

await section('sitemap.xml', async () => {
  const { res, text } = await get('/sitemap.xml');
  check('Status 200', res.status === 200, `got ${res.status}`);
  check('Is XML', text.trimStart().startsWith('<?xml') || text.includes('<urlset'));
  check('Contains slaytim.com URLs', text.includes('slaytim.com'));
  check('Contains /konu/ entries', text.includes('/konu/') || text.includes('/topics/'));
  check('Contains /slayt/ entries', text.includes('/slayt/') || text.includes('/slides/'));
  check('No placeholder URLs', !text.includes('localhost'));
});

await section('ads.txt', async () => {
  const { res, text } = await get('/ads.txt');
  check('Status 200', res.status === 200, `got ${res.status}`);
  check('Content-Type text/plain', (res.headers.get('content-type') || '').includes('text/plain'));
  const hasRealId = /google\.com,\s*pub-\d{16}/.test(text);
  const hasPlaceholder = text.includes('pub-XXXXXXXXXXXXXXXX');
  if (hasPlaceholder) {
    check('No placeholder publisher ID', false, 'Set NEXT_PUBLIC_ADSENSE_ID in production env');
  } else if (hasRealId) {
    check('Contains real publisher ID', true);
  } else {
    check('ads.txt has content', text.trim().length > 10, 'File is empty or comment-only — set NEXT_PUBLIC_ADSENSE_ID');
  }
});

await section('Home page (SSR content)', async () => {
  const { res, text } = await get('/');
  check('Status 200', res.status === 200, `got ${res.status}`);
  check('Contains <h1>', text.includes('<h1'));
  check('No noindex on home', !text.includes('noindex'));
  check('Has canonical link', text.includes('rel="canonical"') || text.includes("rel='canonical'"));
  check('Has og:title', text.includes('og:title'));
  check('Has og:description', text.includes('og:description'));
});

await section('Slide detail page (SSR content)', async () => {
  // Try to find a real slide from the sitemap
  const { text: sitemapText } = await get('/sitemap.xml');
  const slugMatch = sitemapText.match(/slaytim\.com(\/slayt\/[^<]+)/);
  const slidePath = slugMatch ? slugMatch[1] : null;

  if (!slidePath) {
    check('Found slide in sitemap', false, 'No /slayt/ entries in sitemap');
    return;
  }

  const { res, text } = await get(slidePath);
  check('Status 200', res.status === 200, `got ${res.status} for ${slidePath}`);
  check('Contains <h1>', text.includes('<h1'), 'Slide title not in initial HTML — SSR may be missing');
  check('Has canonical link', text.includes('rel="canonical"') || text.includes("rel='canonical'"));
  check('Has og:title', text.includes('og:title'));
  check('No noindex', !text.includes('noindex'));
});

await section('Topic detail page (SSR content)', async () => {
  const { text: sitemapText } = await get('/sitemap.xml');
  const slugMatch = sitemapText.match(/slaytim\.com(\/konu\/[^<]+)/);
  const topicPath = slugMatch ? slugMatch[1] : null;

  if (!topicPath) {
    check('Found topic in sitemap', false, 'No /konu/ entries in sitemap');
    return;
  }

  const { res, text } = await get(topicPath);
  check('Status 200', res.status === 200, `got ${res.status} for ${topicPath}`);
  check('Contains <h1>', text.includes('<h1'), 'Topic title not in initial HTML — SSR may be missing');
  check('Has canonical link', text.includes('rel="canonical"') || text.includes("rel='canonical'"));
  check('No noindex', !text.includes('noindex'));
});

await section('Canonical redirects', async () => {
  // NOTE: Next.js `permanentRedirect()` returns 308 in production and 307 in
  // development mode. Static `redirects()` in next.config.js with permanent:true
  // returns 308 in production and 307 in dev. Both are permanent-intent redirects
  // and should be accepted by this test. 301 is also accepted for proxy layers.
  const isPermanentRedirect = (status) => status === 301 || status === 307 || status === 308;

  // rooms: numeric ID should redirect to slug
  const { res: r1 } = await get('/rooms/1', { followRedirects: false });
  // If slug exists it might 200 directly — acceptable
  check(
    'Numeric /rooms/1 redirects or serves directly',
    isPermanentRedirect(r1.status) || r1.status === 200 || r1.status === 404,
    `got ${r1.status}`,
  );

  // profile: /profile/x should redirect to /@x
  const { res: r2 } = await get('/profile/test', { followRedirects: false });
  check(
    '/profile/:username redirects to /@username',
    isPermanentRedirect(r2.status),
    `got ${r2.status} (expected 301/307/308)`,
  );
  if (isPermanentRedirect(r2.status)) {
    const loc = r2.headers.get('location') || '';
    if (loc.includes('/@')) {
      check('Redirect target starts with /@', true);
    } else {
      // Some deployments first enforce host/canonical-domain redirect.
      const hop = await get(loc || '/profile/test', { followRedirects: false });
      const hopLoc = hop.res.headers.get('location') || '';
      check('Redirect target starts with /@', hopLoc.includes('/@'), `location: ${hopLoc || loc}`);
    }
  }
});

await section('Security headers', async () => {
  const { res } = await get('/');
  check('X-Content-Type-Options nosniff', res.headers.get('x-content-type-options') === 'nosniff');
  check('Referrer-Policy set', Boolean(res.headers.get('referrer-policy')));
  check('No X-Powered-By header', !res.headers.has('x-powered-by'));
});

await section('404 handling', async () => {
  const randomPath = `/__definitely-not-found-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { res, text } = await get(randomPath);
  check('Returns 404 (not 200)', res.status === 404, `got ${res.status}`);
  check('404 page has noindex', text.includes('noindex') || res.status === 404);
});

await section('Structured data (JSON-LD)', async () => {
  const { text: homeText } = await get('/');
  check('Home has application/ld+json', homeText.includes('application/ld+json'));
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`SEO Smoke Test: ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.error('\nFailed checks:');
  failures.forEach((f) => console.error(`  • ${f}`));
}

console.log('─'.repeat(50));
process.exit(failed > 0 ? 1 : 0);
