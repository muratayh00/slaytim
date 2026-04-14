import { test, expect } from '@playwright/test';

const API = 'http://localhost:5001/api';

test.describe('Engagement API (unauthenticated)', () => {
  test('like slide without auth returns 401', async ({ request }) => {
    const res = await request.post(`${API}/likes/slide/1`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('save slide without auth returns 401', async ({ request }) => {
    const res = await request.post(`${API}/saves/slide/1`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('post comment without auth returns 401', async ({ request }) => {
    const res = await request.post(`${API}/comments/topic/1`, {
      data: { content: 'test comment' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('create topic without auth returns 401', async ({ request }) => {
    const res = await request.post(`${API}/topics`, {
      data: { title: 'Test', categoryId: 1 },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('admin endpoint without auth returns 401', async ({ request }) => {
    const res = await request.get(`${API}/admin/stats`);
    expect([401, 403]).toContain(res.status());
  });
});
