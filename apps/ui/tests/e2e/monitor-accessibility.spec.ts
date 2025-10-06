import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const sessionsPayload = {
  items: [
    {
      session_id: 'session-axe',
      title: 'Accessibility Session',
      status: 'in_progress' as const,
      created_at: '2025-01-01T10:00:00Z',
      last_event_at: '2025-01-01T10:05:00Z',
      tenant: 'tenant-a11y',
      eye_counts: { approvals: 5, rejections: 0 },
    },
  ],
};

const summaryPayload = {
  session_id: 'session-axe',
  tenant: 'tenant-a11y',
  status: 'in_progress',
  hero_metrics: {
    requests_per_minute: 30,
    approvals: 5,
    rejections: 0,
    open_blockers: 0,
    dominant_provider: 'groq',
    token_usage: { input: 1200, output: 800 },
  },
};

const emptyEvents = { items: [] };
const headers = { 'content-type': 'application/json' };

test('Truth Monitor header is axe clean', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('third-eye.api-key', 'sk_test_a11y');
    window.localStorage.setItem('third-eye.session-id', 'session-axe');
    window.localStorage.setItem('third-eye.monitor.auto-follow', 'true');
  });

  await page.route('**/sessions?limit=*', async (route) => {
    await route.fulfill({ status: 200, headers, body: JSON.stringify(sessionsPayload) });
  });

  await page.route('**/session/session-axe/summary', async (route) => {
    await route.fulfill({ status: 200, headers, body: JSON.stringify(summaryPayload) });
  });

  await page.route('**/session/**/events?limit=*', async (route) => {
    await route.fulfill({ status: 200, headers, body: JSON.stringify(emptyEvents) });
  });

  await page.goto('/session/session-axe');

  await expect(page.getByLabel('Session')).toHaveValue('session-axe');

  const axe = new AxeBuilder({ page }).include('section');
  const results = await axe.analyze();

  expect(results.violations).toHaveLength(0);
});
