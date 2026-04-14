/**
 * Slaytim API Tests
 * Run with: node tests/api.test.js
 * Requires the server to be running on http://localhost:5000
 * Uses Node built-in fetch (Node 18+) and assert.
 */

'use strict';

const assert = require('assert');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

let passed = 0;
let failed = 0;
const results = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    results.push({ name, status: 'FAIL', error: err.message });
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

async function runTests() {
  console.log('\nSlaytim API Test Suite');
  console.log('======================\n');

  // --- Auth Tests ---
  console.log('Auth:');

  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'SecurePass123',
  };

  await test('POST /auth/register — valid data returns 201 and token', async () => {
    const { status, data } = await request('POST', '/auth/register', testUser);
    assert.strictEqual(status, 201, `Expected 201 got ${status}. Body: ${JSON.stringify(data)}`);
    assert.ok(data.token, 'Response should include token');
    assert.ok(data.user, 'Response should include user object');
    assert.ok(data.user.id, 'User should have an id');
    assert.strictEqual(data.user.username, testUser.username, 'Username should match');
  });

  await test('POST /auth/register — username too short (< 3 chars) returns 400', async () => {
    const { status, data } = await request('POST', '/auth/register', {
      username: 'ab',
      email: `short_${Date.now()}@example.com`,
      password: 'SecurePass123',
    });
    assert.strictEqual(status, 400, `Expected 400 got ${status}. Body: ${JSON.stringify(data)}`);
    assert.ok(data.error, 'Response should include error message');
  });

  await test('POST /auth/register — invalid username chars returns 400', async () => {
    const { status, data } = await request('POST', '/auth/register', {
      username: 'bad username!',
      email: `baduser_${Date.now()}@example.com`,
      password: 'SecurePass123',
    });
    assert.strictEqual(status, 400, `Expected 400 got ${status}. Body: ${JSON.stringify(data)}`);
    assert.ok(data.error, 'Response should include error message');
  });

  await test('POST /auth/register — password too short (< 8 chars) returns 400', async () => {
    const { status, data } = await request('POST', '/auth/register', {
      username: `valid_${Date.now()}`.slice(0, 20),
      email: `shortpw_${Date.now()}@example.com`,
      password: 'abc',
    });
    assert.strictEqual(status, 400, `Expected 400 got ${status}. Body: ${JSON.stringify(data)}`);
    assert.ok(data.error, 'Response should include error message');
  });

  await test('POST /auth/login — wrong password returns 401', async () => {
    const { status, data } = await request('POST', '/auth/login', {
      email: testUser.email,
      password: 'wrongpassword99',
    });
    assert.strictEqual(status, 401, `Expected 401 got ${status}. Body: ${JSON.stringify(data)}`);
    assert.ok(data.error, 'Response should include error message');
  });

  await test('POST /auth/login — non-existent user returns 401', async () => {
    const { status, data } = await request('POST', '/auth/login', {
      email: 'nobody_exists_here@example.com',
      password: 'AnyPassword1',
    });
    assert.strictEqual(status, 401, `Expected 401 got ${status}. Body: ${JSON.stringify(data)}`);
  });

  // --- Slides Tests ---
  console.log('\nSlides:');

  await test('GET /slides/popular — returns array', async () => {
    const { status, data } = await request('GET', '/slides/popular');
    assert.strictEqual(status, 200, `Expected 200 got ${status}. Body: ${JSON.stringify(data)}`);
    assert.ok(Array.isArray(data), `Expected array, got ${typeof data}`);
  });

  // --- Admin Tests ---
  console.log('\nAdmin:');

  await test('GET /admin/stats — without auth returns 401 or 403', async () => {
    const { status } = await request('GET', '/admin/stats');
    assert.ok(
      status === 401 || status === 403,
      `Expected 401 or 403 got ${status}`
    );
  });

  await test('GET /admin/stats — with non-admin token returns 403', async () => {
    // Register a regular user and use their token
    const regularUser = {
      username: `reguser_${Date.now()}`.slice(0, 20),
      email: `reguser_${Date.now()}@example.com`,
      password: 'RegularPass1',
    };
    const { data: regData } = await request('POST', '/auth/register', regularUser);
    if (!regData?.token) {
      throw new Error('Could not register regular user for admin test');
    }
    const { status } = await request('GET', '/admin/stats', null, regData.token);
    assert.strictEqual(status, 403, `Expected 403 got ${status}`);
  });

  // --- Summary ---
  console.log('\n======================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('All tests passed!');
  }
}

runTests().catch((err) => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
