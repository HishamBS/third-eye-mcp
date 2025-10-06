import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1, // Retry failed tests once
  workers: 4, // Parallel execution with 4 workers
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3300',
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
  ],

  webServer: {
    command: 'bun run dev',
    url: 'http://127.0.0.1:3300',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
