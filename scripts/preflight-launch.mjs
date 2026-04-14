#!/usr/bin/env node
/**
 * Slaytim production launch preflight checker.
 * Run:
 *   node scripts/preflight-launch.mjs --url https://slaytim.com
 *   node scripts/preflight-launch.mjs --url https://slaytim.com --api-url https://api.slaytim.com/api
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

const args = process.argv.slice(2);
const urlFlagIndex = args.findIndex((a) => a === '--url');
const apiUrlFlagIndex = args.findIndex((a) => a === '--api-url');
const cliUrl = urlFlagIndex >= 0 ? args[urlFlagIndex + 1] : '';
const cliApiUrl = apiUrlFlagIndex >= 0 ? args[apiUrlFlagIndex + 1] : '';

const BASE_URL = cliUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';
const API_BASE_URL = cliApiUrl || process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';

const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;

let passed = 0;
let failed = 0;
let warned = 0;

const green = (s) => `\x1b[32m[PASS]\x1b[0m ${s}`;
const red = (s) => `\x1b[31m[FAIL]\x1b[0m ${s}`;
const yellow = (s) => `\x1b[33m[WARN]\x1b[0m ${s}`;

function logPass(msg) {
  console.log(green(msg));
  passed += 1;
}

function logFail(msg) {
  console.log(red(msg));
  failed += 1;
}

function logWarn(msg) {
  console.log(yellow(msg));
  warned += 1;
}

function fetchUrl(rawUrl) {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch (error) {
      resolve({ status: 0, headers: {}, body: '', error: `Invalid URL: ${rawUrl}` });
      return;
    }

    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        timeout: TIMEOUT_MS,
        rejectUnauthorized: true,
        headers: { 'User-Agent': 'slaytim-preflight/1.1' },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          if (body.length < 200_000) body += String(chunk);
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers || {},
            body,
          });
        });
      },
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, headers: {}, body: '', error: 'timeout' });
    });
    req.on('error', (err) => {
      resolve({ status: 0, headers: {}, body: '', error: err.message });
    });
    req.end();
  });
}

async function fetchUrlFollowRedirects(rawUrl, maxRedirects = MAX_REDIRECTS) {
  const chain = [];
  let current = rawUrl;

  for (let i = 0; i <= maxRedirects; i += 1) {
    const res = await fetchUrl(current);
    chain.push({ url: current, status: res.status, location: res.headers?.location || '' });

    if (!(res.status >= 300 && res.status < 400 && res.headers?.location)) {
      return { ...res, finalUrl: current, chain };
    }

    current = new URL(String(res.headers.location), current).toString();
  }

  return {
    status: 0,
    headers: {},
    body: '',
    error: `Too many redirects (>${maxRedirects})`,
    finalUrl: current,
    chain,
  };
}

async function checkDomain(baseUrl) {
  const res = await fetchUrl(baseUrl);
  if (res.error) {
    logFail(`Domain unreachable: ${baseUrl} (${res.error})`);
    return false;
  }
  if (res.status >= 200 && res.status < 400) {
    logPass(`Domain resolves and responds (${res.status})`);
    return true;
  }
  logFail(`Domain returned unexpected status: ${res.status}`);
  return false;
}

async function checkHttpToHttps(baseUrl) {
  const parsed = new URL(baseUrl);
  const httpUrl = `http://${parsed.hostname}${parsed.pathname}`;
  const res = await fetchUrl(httpUrl);
  if (res.status >= 300 && res.status < 400) {
    const location = String(res.headers.location || '');
    if (location.startsWith('https://')) {
      logPass(`HTTP -> HTTPS redirect works (${res.status})`);
    } else {
      logWarn(`HTTP redirects but not to HTTPS (${location || 'empty location'})`);
    }
  } else if (res.status === 0) {
    logWarn('HTTP endpoint is not reachable (may be blocked by infra)');
  } else {
    logWarn(`HTTP did not redirect to HTTPS (status ${res.status})`);
  }
}

async function checkWwwCanonical(baseUrl) {
  const parsed = new URL(baseUrl);
  const isWww = parsed.hostname.startsWith('www.');
  const altHost = isWww ? parsed.hostname.replace(/^www\./, '') : `www.${parsed.hostname}`;
  const altUrl = `${parsed.protocol}//${altHost}${parsed.pathname}`;
  const res = await fetchUrl(altUrl);

  if (res.status >= 300 && res.status < 400) {
    logPass('www/non-www canonical redirect exists');
  } else if (res.status === 0) {
    logWarn('Alternative host did not respond (verify DNS setup)');
  } else {
    logWarn(`www/non-www canonical redirect missing (status ${res.status})`);
  }
}

async function checkRobots(baseUrl) {
  const res = await fetchUrlFollowRedirects(new URL('/robots.txt', baseUrl).toString());
  if (res.status === 200) {
    logPass('robots.txt reachable (200)');
    if (res.body.toLowerCase().includes('noindex')) {
      logFail('robots.txt contains "noindex" — search engines may be blocked');
    } else {
      logPass('robots.txt does not contain noindex');
    }
  } else if (res.error) {
    logFail(`robots.txt unreachable: ${res.error}`);
  } else {
    logFail(`robots.txt not reachable (HTTP ${res.status})`);
  }
}

async function checkSitemap(baseUrl) {
  const res = await fetchUrlFollowRedirects(new URL('/sitemap.xml', baseUrl).toString());
  if (res.status === 200) {
    const hops = (res.chain?.length || 1) - 1;
    if (hops > 0) {
      logPass(`sitemap.xml reachable after redirect (${hops} hop)`);
    } else {
      logPass('sitemap.xml reachable (200)');
    }
  } else if (res.error) {
    logFail(`sitemap.xml unreachable: ${res.error}`);
  } else {
    logFail(`sitemap.xml not reachable (HTTP ${res.status})`);
  }
}

async function checkHealth(baseUrl) {
  const defaultHealth = new URL('/api/health', baseUrl).toString();
  const healthUrl = API_BASE_URL
    ? new URL('/health', API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`).toString()
    : defaultHealth;

  const res = await fetchUrlFollowRedirects(healthUrl);
  if (res.status === 200) {
    let parsed;
    try {
      parsed = JSON.parse(res.body);
    } catch {}

    if (parsed?.status === 'ok') {
      logPass(`${healthUrl} -> status ok`);
    } else if (parsed?.status === 'degraded') {
      logFail(
        `${healthUrl} -> status degraded (${JSON.stringify({ database: parsed?.database, redis: parsed?.redis })})`,
      );
    } else {
      logPass(`${healthUrl} is reachable (200)`);
    }
  } else if (res.error) {
    logFail(`${healthUrl} unreachable: ${res.error}`);
  } else {
    logFail(`${healthUrl} returned HTTP ${res.status} (expected 200)`);
  }
}

async function checkMeta(baseUrl) {
  const res = await fetchUrlFollowRedirects(baseUrl);
  if (!res.body) {
    logWarn('Could not inspect HTML for meta tags');
    return;
  }

  const checks = [
    { label: 'title tag', re: /<title\b/i },
    { label: 'meta description', re: /<meta[^>]+name=["']description["']/i },
    { label: 'og:title', re: /<meta[^>]+property=["']og:title["']/i },
    { label: 'og:image', re: /<meta[^>]+property=["']og:image["']/i },
    { label: 'canonical tag', re: /<link[^>]+rel=["']canonical["']/i },
  ];

  for (const check of checks) {
    if (check.re.test(res.body)) logPass(`${check.label} present`);
    else logWarn(`${check.label} missing`);
  }

  if (res.body.toLowerCase().includes('noindex')) logFail('Homepage contains noindex');
  else logPass('Homepage does not contain noindex');
}

async function main() {
  console.log(`\nPreflight target: ${BASE_URL}\n`);
  if (API_BASE_URL) {
    console.log(`API health target: ${API_BASE_URL}\n`);
  }

  const domainOk = await checkDomain(BASE_URL);
  if (!domainOk) {
    console.log('\nPreflight stopped because domain is not reachable.');
    process.exit(1);
  }

  await checkHttpToHttps(BASE_URL);
  await checkWwwCanonical(BASE_URL);
  await checkRobots(BASE_URL);
  await checkSitemap(BASE_URL);
  await checkHealth(BASE_URL);
  await checkMeta(BASE_URL);

  console.log('\nSummary');
  console.log(`Passed : ${passed}`);
  console.log(`Warnings: ${warned}`);
  console.log(`Failed : ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(red(`Preflight crashed: ${error.message}`));
  process.exit(1);
});
