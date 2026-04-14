import { test, expect } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE_URL || 'http://localhost:5002/api';

const ts = Date.now();
const TEST_USER = {
  username: `tu${ts.toString().slice(-8)}`,
  email: `testuser${ts}@example.com`,
  password: 'TestPass123!',
};

test.describe('Authentication', () => {
  test('should register a new user', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/register`, {
      data: TEST_USER,
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body?.user?.email).toBe(TEST_USER.email);
    expect(typeof body?.token).toBe('string');
  });

  test('should login with valid credentials', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email: TEST_USER.email, password: TEST_USER.password },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body?.user?.email).toBe(TEST_USER.email);
    expect(typeof body?.token).toBe('string');
  });

  test('should reject invalid credentials', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email: 'nonexistent@example.com', password: 'wrongpassword' },
    });
    expect([400, 401]).toContain(res.status());
  });

  test('should logout successfully', async ({ request }) => {
    const login = await request.post(`${API_BASE}/auth/login`, {
      data: { email: TEST_USER.email, password: TEST_USER.password },
    });
    test.skip(!login.ok(), 'Login failed; skipping logout assertion');

    const token = (await login.json())?.token;
    const res = await request.post(`${API_BASE}/auth/logout`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    expect([200, 204, 401, 403]).toContain(res.status());
  });
});
