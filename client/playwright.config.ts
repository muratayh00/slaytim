import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3100';
const apiBaseURL = process.env.E2E_API_BASE_URL || 'http://localhost:5002/api';
const apiHealthURL = process.env.E2E_API_HEALTH_URL || 'http://localhost:5002/api/health';
process.env.E2E_BASE_URL = baseURL;
process.env.E2E_API_BASE_URL = apiBaseURL;
process.env.E2E_API_HEALTH_URL = apiHealthURL;
const webPort = (() => {
  try {
    return new URL(baseURL).port || '3100';
  } catch {
    return '3100';
  }
})();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run start',
      cwd: path.resolve(process.cwd(), '../server'),
      url: apiHealthURL,
      env: {
        ...process.env,
        PORT: '5002',
        E2E_DISABLE_RATE_LIMIT: 'true',
        REDIS_ENABLED: process.env.E2E_REDIS_ENABLED ?? 'false',
        CONVERSION_LOCAL_FALLBACK: process.env.E2E_CONVERSION_LOCAL_FALLBACK ?? 'true',
      },
      // Start a dedicated backend for tests so env toggles (like rate-limit disable)
      // are guaranteed and independent from any local dev server.
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: `npm run dev:clean -- -p ${webPort}`,
      cwd: process.cwd(),
      url: baseURL,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: apiBaseURL,
      },
      // Always start a clean Next instance for deterministic frontend assertions.
      // Existing dev servers can keep stale module state and cause false negatives.
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
