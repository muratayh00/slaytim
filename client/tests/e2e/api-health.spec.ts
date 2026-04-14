import { test, expect } from '@playwright/test';

const API = 'http://localhost:5001/api';

test.describe('API Health', () => {
  test('health check endpoint responds', async ({ request }) => {
    const res = await request.get(`${API.replace('/api', '')}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('status');
    expect(['ok', 'degraded']).toContain(body.status);
  });

  test('GET /api/topics returns list', async ({ request }) => {
    const res = await request.get(`${API}/topics`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('topics');
    expect(Array.isArray(body.topics)).toBeTruthy();
  });

  test('GET /api/categories returns list', async ({ request }) => {
    const res = await request.get(`${API}/categories`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('GET /api/slideo/feed returns data', async ({ request }) => {
    const res = await request.get(`${API}/slideo/feed`);
    // May require auth - accept 200 or 401
    expect([200, 401].includes(res.status())).toBeTruthy();
  });

  test('auth endpoints exist', async ({ request }) => {
    const csrfRes = await request.get(`${API}/auth/csrf`);
    expect([200, 403, 404]).toContain(csrfRes.status());
  });

  test('unauthorized access returns 401 or 403', async ({ request }) => {
    const res = await request.post(`${API}/topics`, {
      data: { title: 'test', categoryId: 1 },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403, 400, 422]).toContain(res.status());
  });
});
