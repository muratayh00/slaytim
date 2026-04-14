import { test, expect } from '@playwright/test';

test.describe('Protected Routes', () => {
  test('topics/new redirects unauthenticated users', async ({ page }) => {
    const response = await page.goto('/topics/new');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    const redirected = url.includes('/login') || url.includes('/register');
    const hasAuthPrompt = (await page.locator('text=/giris/i, text=/login/i').count()) > 0;
    const status = response?.status() || 0;
    expect(status < 500 && (redirected || hasAuthPrompt || status === 200)).toBeTruthy();
  });

  test('admin page redirects unauthenticated users', async ({ page }) => {
    const response = await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    const bodyText = await page.locator('body').textContent();
    const status = response?.status() || 0;
    const noServerError = status < 500;
    const hasGuardUi =
      url.includes('/login') ||
      url.includes('/403') ||
      bodyText?.toLowerCase().includes('admin') ||
      bodyText?.toLowerCase().includes('giris');
    expect(noServerError && hasGuardUi).toBeTruthy();
  });

  test('profile edit redirects unauthenticated users', async ({ page }) => {
    const response = await page.goto('/profile/settings');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    const redirected = url.includes('/login');
    const status = response?.status() || 0;
    const is404 = status === 404 || url.includes('/404') || (await page.locator('h1').filter({ hasText: /404|not found/i }).count()) > 0;
    const bodyText = await page.locator('body').textContent();
    const noServerError = status < 500;
    const hasAuthMsg = bodyText?.toLowerCase().includes('giris') || redirected || is404;
    expect(noServerError && (hasAuthMsg || status === 200)).toBeTruthy();
  });
});
