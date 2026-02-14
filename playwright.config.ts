import { defineConfig, devices } from '@playwright/test';

const E2E_PORT = process.env.E2E_PORT || '3999';
const baseURL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: process.env.PLAYWRIGHT_BASE_URL || baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: { PORT: E2E_PORT },
  },
});
