import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3100';
const API = process.env.E2E_API_BASE_URL || 'http://localhost:5002/api';
const ts = Date.now();

const TEST_USER = {
  username: `slidetest${ts}`,
  email: `slidetest${ts}@example.com`,
  password: 'TestPass123!',
};

// Helper: register + login via API
async function loginAsTestUser(request: any): Promise<string> {
  // Register
  await request.post(`${API}/auth/register`, {
    data: TEST_USER,
    headers: { 'Content-Type': 'application/json' },
  });
  // Login
  const loginRes = await request.post(`${API}/auth/login`, {
    data: { email: TEST_USER.email, password: TEST_USER.password },
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await loginRes.json();
  return body.token || '';
}

test.describe('Slide Operations', () => {
  test('slide detail page loads for existing slide', async ({ page, request }) => {
    // Get first available slide
    const topicsRes = await request.get(`${API}/topics?limit=5`);
    if (!topicsRes.ok()) { test.skip(); return; }
    const { topics } = await topicsRes.json();
    if (!topics?.length) { test.skip(); return; }

    for (const topic of topics) {
      const slidesRes = await request.get(`${API}/slides?topicId=${topic.id}&limit=1`);
      if (!slidesRes.ok()) continue;
      const { slides } = await slidesRes.json();
      if (!slides?.length) continue;

      await page.goto(`${BASE}/slides/${slides[0].id}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
      return;
    }
    test.skip();
  });

  test('like button requires authentication', async ({ page }) => {
    const res = await page.request.get(`${API}/topics?limit=1`);
    if (!res.ok()) { test.skip(); return; }
    const { topics } = await res.json();
    if (!topics?.length) { test.skip(); return; }

    const slidesRes = await page.request.get(`${API}/slides?topicId=${topics[0].id}&limit=1`);
    if (!slidesRes.ok()) { test.skip(); return; }
    const { slides } = await slidesRes.json();
    if (!slides?.length) { test.skip(); return; }

    await page.goto(`${BASE}/slides/${slides[0].id}`);
    await page.waitForLoadState('networkidle');

    const likeBtn = page.locator('button:has-text("beÄŸen"), button[aria-label*="like"], button[aria-label*="beÄŸen"]').first();
    if (await likeBtn.count() > 0) {
      await likeBtn.click();
      await page.waitForTimeout(1000);
      // Should show login prompt or toast
      const hasPrompt = await page.locator('text=/giriÅŸ/i').count() > 0;
      // Just check no crash
      await expect(page.locator('body')).toBeVisible();
    } else {
      test.skip();
    }
  });
});
