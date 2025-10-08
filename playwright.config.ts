import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * Tests both UI and server integration
 */
export default defineConfig({
  testDir: './apps/ui/__tests__/e2e',

  /* Maximum time one test can run for */
  timeout: 60 * 1000,

  fullyParallel: true,
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],

  use: {
    baseURL: process.env.UI_URL || 'http://127.0.0.1:3300',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Record browser console logs
    contextOptions: {
      recordVideo: {
        dir: 'test-results/videos',
        size: { width: 1280, height: 720 },
      },
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* Test against mobile viewports */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run both server and UI before starting tests */
  webServer: [
    {
      command: 'bun run apps/server/src/start.ts',
      url: 'http://127.0.0.1:7070/health',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'bun run --cwd apps/ui dev --port 3300',
      url: 'http://127.0.0.1:3300',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    }
  ],
});
