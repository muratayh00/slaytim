import { test, expect } from '@playwright/test';

test.describe('Public Navigation', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/.+/);
    // Check no server error
    expect(page.url()).not.toContain('500');
  });

  test('topics page loads', async ({ page }) => {
    await page.goto('/topics');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('categories page loads', async ({ page }) => {
    await page.goto('/kategori');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('slideo feed page loads', async ({ page }) => {
    await page.goto('/slideo');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('404 page works', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345');
    await page.waitForLoadState('domcontentloaded');
    // Should return 404 or show 404 content
    const status = response?.status();
    const bodyText = await page.locator('body').textContent();
    const is404 = status === 404 || bodyText?.includes('404') || bodyText?.includes('bulunamadı');
    expect(is404).toBeTruthy();
  });
});
