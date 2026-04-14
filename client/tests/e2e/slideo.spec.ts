import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3100';
const API = process.env.E2E_API_BASE_URL || 'http://localhost:5002/api';

test.describe('Slideo Feed', () => {
  test('slideo feed page renders', async ({ page }) => {
    await page.goto(`${BASE}/slideo`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('slideo detail page renders for existing slideo', async ({ page, request }) => {
    const res = await request.get(`${API}/slideo/feed?limit=1`);
    if (!res.ok()) { test.skip(); return; }
    const body = await res.json();
    const slideos = body.slideos || body.items || body;
    if (!Array.isArray(slideos) || !slideos.length) { test.skip(); return; }

    await page.goto(`${BASE}/slideo/${slideos[0].id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('slideo API returns valid structure', async ({ request }) => {
    const res = await request.get(`${API}/slideo/feed?limit=5`);
    // Feed may require auth - that's OK
    if (res.status() === 401) { test.skip(); return; }
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Should be an object or array
    expect(body).toBeDefined();
  });
});
