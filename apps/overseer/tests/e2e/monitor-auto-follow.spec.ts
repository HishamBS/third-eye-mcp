import { test, expect } from '@playwright/test';

const sessionsPayload = {
  items: [
    {
      session_id: 'session-1',
      title: 'Session One',
      status: 'in_progress' as const,
      created_at: '2025-01-01T10:00:00Z',
      last_event_at: '2025-01-01T10:05:00Z',
      tenant: 'tenant-alpha',
      eye_counts: { approvals: 4, rejections: 1 },
    },
    {
      session_id: 'session-2',
      title: 'Session Two',
      status: 'approved' as const,
      created_at: '2025-01-02T10:00:00Z',
      last_event_at: '2025-01-02T10:07:00Z',
      tenant: 'tenant-beta',
      eye_counts: { approvals: 6, rejections: 0 },
    },
  ],
};

const heroMetrics = {
  requests_per_minute: 42,
  approvals: 6,
  rejections: 1,
  open_blockers: 0,
  dominant_provider: 'groq',
  token_usage: {
    input: 12345,
    output: 6789,
  },
};

const summaryPayload = {
  session_id: 'session-1',
  tenant: 'tenant-alpha',
  status: 'in_progress',
  hero_metrics: heroMetrics,
  eyes: [
    { eye: 'SHARINGAN', ok: true, code: 'OK', tool_version: '1.2.3', last_event_at: '2025-01-01T10:04:00Z' },
  ],
};

const emptyEvents = { items: [] };

const headers = {
  'content-type': 'application/json',
};

test.describe('Truth Monitor auto-follow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('third-eye.api-key', 'sk_test_e2e');
      window.localStorage.setItem('third-eye.session-id', 'session-1');
      window.localStorage.setItem('third-eye.monitor.auto-follow', 'true');
    });

    await page.route('**/sessions?limit=*', async (route) => {
      await route.fulfill({ status: 200, headers, body: JSON.stringify(sessionsPayload) });
    });

    await page.route('**/session/session-1/summary', async (route) => {
      await route.fulfill({ status: 200, headers, body: JSON.stringify(summaryPayload) });
    });

    await page.route('**/session/session-2/summary', async (route) => {
      const payload = { ...summaryPayload, session_id: 'session-2', tenant: 'tenant-beta' };
      await route.fulfill({ status: 200, headers, body: JSON.stringify(payload) });
    });

    await page.route('**/session/**/events?limit=*', async (route) => {
      await route.fulfill({ status: 200, headers, body: JSON.stringify(emptyEvents) });
    });

    await page.route('**/session/**/settings', async (route) => {
      await route.fulfill({ status: 200, headers, body: JSON.stringify({ data: summaryPayload }) });
    });

    page.on('websocket', (socket) => {
      socket.close();
    });
  });

  test('populates roster, shows hero metrics, and defaults auto-follow on', async ({ page }) => {
    await page.goto('/session/session-1');

    const sessionDropdown = page.getByLabel('Session');
    await expect(sessionDropdown).toHaveValue('session-1');

    await expect(sessionDropdown.locator('option[value="session-1"]')).toHaveText(/Session One/);
    await expect(sessionDropdown.locator('option[value="session-2"]')).toHaveText(/Session Two/);

    const autoFollowToggle = page.getByLabel('Toggle auto-follow session');
    await expect(autoFollowToggle).toBeChecked();

    await expect(page.getByText('Truth Monitor')).toBeVisible();
    await expect(page.getByText('Requests / min')).toBeVisible();
    await expect(page.getByText('Session One')).toBeVisible();
  });
});
