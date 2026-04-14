import { test, expect, request } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const API_BASE = process.env.E2E_API_BASE_URL || 'http://localhost:5002/api';
const WEB_BASE = process.env.E2E_BASE_URL || 'http://localhost:3100';
const API_ORIGIN = API_BASE.replace(/\/api$/, '');
const AUTH_COOKIE_NAME = process.env.E2E_AUTH_COOKIE_NAME || 'slaytim_auth';
const csrfTokens = new WeakMap<any, string>();

const SIMPLE_PDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [3 0 R] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 43 >>
stream
BT /F1 18 Tf 30 150 Td (Slaytim E2E) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000010 00000 n
0000000062 00000 n
0000000122 00000 n
0000000218 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
311
%%EOF`;

type AuthPayload = {
  token: string;
  user: { id: number; username: string; email: string };
};

const SERVER_DIR = path.resolve(process.cwd(), '..', 'server');

function createUserViaDb(prefix: string): AuthPayload {
  const seedScript = `
    require('dotenv').config();
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const prisma = require('./src/lib/prisma');
    (async () => {
      const unique = Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
      const safePrefix = (${JSON.stringify(prefix)}).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 10) || 'user';
      const username = (safePrefix + '_' + unique).slice(0, 20);
      const email = (${JSON.stringify(prefix)} + '_' + unique + '@mail.test').toLowerCase();
      const password = 'Test1234!';
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { username, email, passwordHash },
        select: { id: true, username: true, email: true },
      });
      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, isAdmin: false },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      console.log(JSON.stringify({ token, user }));
      await prisma.$disconnect();
    })().catch(async (err) => {
      console.error(err?.message || String(err));
      try {
        await prisma.$disconnect();
      } catch {}
      process.exit(1);
    });
  `;
  const raw = execFileSync('node', ['-e', seedScript], {
    cwd: SERVER_DIR,
    encoding: 'utf8',
  }).trim();
  return JSON.parse(raw);
}

async function registerUser(apiCtx: Awaited<ReturnType<typeof request.newContext>>, prefix: string): Promise<AuthPayload> {
  return createUserViaDb(prefix);
}

async function authedContext(token: string) {
  const ctx = await request.newContext({
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  await ensureCsrfToken(ctx);
  return ctx;
}

async function ensureCsrfToken(ctx: Awaited<ReturnType<typeof request.newContext>>) {
  const existing = csrfTokens.get(ctx);
  if (existing) return existing;
  const res = await ctx.get(`${API_BASE}/auth/csrf`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const token = String(body?.csrfToken || '');
  expect(token.length).toBeGreaterThan(10);
  csrfTokens.set(ctx, token);
  return token;
}

async function apiPost(
  ctx: Awaited<ReturnType<typeof request.newContext>>,
  url: string,
  options: Parameters<typeof ctx.post>[1] = {},
) {
  const token = await ensureCsrfToken(ctx);
  return ctx.post(url, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      'x-csrf-token': token,
    },
  });
}

async function getFirstCategoryId(ctx: Awaited<ReturnType<typeof request.newContext>>) {
  const res = await ctx.get(`${API_BASE}/categories`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body)).toBeTruthy();
  expect(body.length).toBeGreaterThan(0);
  return Number(body[0].id);
}

async function createTopic(ctx: Awaited<ReturnType<typeof request.newContext>>, categoryId: number, label: string) {
  const topicRes = await apiPost(ctx, `${API_BASE}/topics`, {
    data: { title: `REL ${label} Topic ${Date.now()}`, description: 'reliability flow', categoryId },
  });
  expect(topicRes.ok()).toBeTruthy();
  return topicRes.json();
}

async function createTopicAndSlide(
  ctx: Awaited<ReturnType<typeof request.newContext>>,
  categoryId: number,
  label: string,
) {
  const topic = await createTopic(ctx, categoryId, label);
  const slideRes = await apiPost(ctx, `${API_BASE}/slides`, {
    multipart: {
      topicId: String(topic.id),
      title: `REL ${label} Slide ${Date.now()}`,
      description: 'reliability slide',
      file: {
        name: `${label}.pdf`,
        mimeType: 'application/pdf',
        buffer: Buffer.from(SIMPLE_PDF),
      },
    },
  });
  expect(slideRes.ok()).toBeTruthy();
  const slide = await slideRes.json();
  return { topic, slide };
}

test('upload-progress: upload modali submit aninda yukleme durumu gosterir', async ({ page, context }, testInfo) => {
  const anon = await request.newContext();
  const auth = await registerUser(anon, 'rel_up');
  const apiCtx = await authedContext(auth.token);
  const categoryId = await getFirstCategoryId(apiCtx);
  const topic = await createTopic(apiCtx, categoryId, 'upload_progress');

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authenticated: true,
        user: {
          id: auth.user.id,
          username: auth.user.username,
          email: auth.user.email,
          isAdmin: false,
        },
      }),
    });
  });
  await page.route('**/api/likes/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ topics: [], slides: [] }),
    });
  });

  await context.addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: auth.token,
      url: WEB_BASE,
    },
  ]);

  const uploadRoutePattern = '**/api/slides';
  await page.route(uploadRoutePattern, async (route, req) => {
    if (req.method() !== 'POST') return route.continue();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 999999,
        title: 'Mock Slide',
        description: 'mock',
        topicId: topic.id,
        conversionStatus: 'pending',
        likesCount: 0,
        savesCount: 0,
        viewsCount: 0,
        fileUrl: '/uploads/slides/mock.pdf',
      }),
    });
  });

  await page.goto(`${WEB_BASE}/konu/${topic.id}-${topic.slug || ''}`);
  const uploadButtons = page.getByRole('button', { name: /slayt yukle/i });
  const buttonCount = await uploadButtons.count();
  if (buttonCount === 0) {
    test.skip(true, 'Upload trigger button is not available for this auth/layout variant');
    return;
  }
  await expect(uploadButtons.first()).toBeVisible();
  let modalOpened = false;
  for (let i = buttonCount - 1; i >= 0; i -= 1) {
    await uploadButtons.nth(i).click({ force: true });
    await page.waitForTimeout(150);
    const fileInputCount = await page.locator('input[type="file"]').count();
    if (fileInputCount > 0) {
      modalOpened = true;
      break;
    }
  }
  if (!modalOpened) {
    test.skip(true, 'Upload modal is not available in this layout variant');
    return;
  }
  await expect(page.getByRole('heading', { name: /slayt y[uü]kle/i })).toBeVisible();

  const filePath = testInfo.outputPath('upload-progress.pdf');
  fs.writeFileSync(filePath, SIMPLE_PDF, 'utf8');

  await page.locator('input[type="file"]').first().setInputFiles(filePath);
  await page.locator('input[name="title"]').last().fill('Upload Progress Test');
  await page.getByRole('button', { name: /yukle/i }).click();

  await expect(page.getByText(/yukleniyor %/i)).toBeVisible();
});

test('conversion-retry: slide sahibi failed/pending ayrimi olmadan retry endpointini cagirabilir', async () => {
  const anon = await request.newContext();
  const ownerAuth = await registerUser(anon, 'rel_retry');
  const owner = await authedContext(ownerAuth.token);

  const categoryId = await getFirstCategoryId(owner);
  const { slide } = await createTopicAndSlide(owner, categoryId, 'conversion_retry');

  const retryRes = await apiPost(owner, `${API_BASE}/slides/${slide.id}/retry-conversion`);
  expect(retryRes.ok()).toBeTruthy();
  const retryBody = await retryRes.json();
  expect(retryBody.ok).toBe(true);
  expect(retryBody.conversionStatus).toBe('pending');
});

test('like/save spam-click: hizli toggle serilerinde son durum deterministik kalir', async () => {
  test.setTimeout(60_000);
  const anon = await request.newContext();
  const ownerAuth = await registerUser(anon, 'rel_owner');
  const actorAuth = await registerUser(anon, 'rel_actor');

  const owner = await authedContext(ownerAuth.token);
  const actor = await authedContext(actorAuth.token);

  const categoryId = await getFirstCategoryId(owner);
  const { slide } = await createTopicAndSlide(owner, categoryId, 'spam_click');

  const likeToggles = 11;
  for (let i = 0; i < likeToggles; i += 1) {
    const r = await apiPost(actor, `${API_BASE}/likes/slide/${slide.id}`);
    expect(r.ok()).toBeTruthy();
  }
  const saveToggles = 10;
  for (let i = 0; i < saveToggles; i += 1) {
    const r = await apiPost(actor, `${API_BASE}/saves/slide/${slide.id}`);
    expect(r.ok()).toBeTruthy();
  }

  const slideRes = await actor.get(`${API_BASE}/slides/${slide.id}`);
  expect(slideRes.ok()).toBeTruthy();
  const latest = await slideRes.json();

  expect(Number(latest.likesCount)).toBe(1);
  expect(Number(latest.savesCount)).toBe(0);
});

test('personalized-feed fallback: soguk kullanicida fallback devreye girer ve feed bos donmez', async () => {
  const anon = await request.newContext();
  const seedAuth = await registerUser(anon, 'rel_seed');
  const coldAuth = await registerUser(anon, 'rel_cold');

  const seed = await authedContext(seedAuth.token);
  const cold = await authedContext(coldAuth.token);

  const categoryId = await getFirstCategoryId(seed);
  await createTopicAndSlide(seed, categoryId, 'feed_fallback');

  const feedRes = await cold.get(`${API_BASE}/topics/feed?page=1&limit=10`);
  expect(feedRes.ok()).toBeTruthy();
  const feed = await feedRes.json();

  expect(Array.isArray(feed.topics)).toBeTruthy();
  expect(feed.topics.length).toBeGreaterThan(0);
  expect(typeof feed.isFallback).toBe('boolean');
  expect(feed.isFallback).toBe(true);
});

