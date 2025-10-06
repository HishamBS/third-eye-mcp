import { test, expect } from '@playwright/test';

/**
 * E2E Test: Monitoring Dashboard
 *
 * Tests the real-time monitoring dashboard functionality:
 * - Dashboard loads without errors
 * - WebSocket connects and receives events
 * - Timeline updates in real-time
 * - Tab switching works correctly
 * - Auto-follow mode works
 */

test.describe('Monitoring Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page and create session
    await page.goto('/');
    await page.click('button:has-text("New Session")');
    await page.waitForURL(/\/session\/.+/);
  });

  test('should load dashboard without errors', async ({ page }) => {
    // Verify dashboard is visible
    const dashboard = page.locator('[data-testid="monitor-dashboard"]');
    await expect(dashboard).toBeVisible();

    // Verify all main sections are rendered
    const heroRibbon = page.locator('[data-testid="hero-ribbon"]');
    await expect(heroRibbon).toBeVisible();

    const timeline = page.locator('[data-testid="timeline"]');
    await expect(timeline).toBeVisible();

    const tabs = page.locator('[data-testid="monitor-tabs"]');
    await expect(tabs).toBeVisible();

    // Verify no JavaScript errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Wait a bit to catch any delayed errors
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });

  test('should connect WebSocket and receive events', async ({ page }) => {
    // Verify WebSocket status indicator
    const wsStatus = page.locator('[data-testid="ws-status"]');
    await expect(wsStatus).toBeVisible();
    await expect(wsStatus).toHaveText(/connected/i);

    // Run an Eye to trigger WebSocket events
    await page.fill('textarea[name="prompt"]', 'test prompt');
    await page.click('button:has-text("Run Sharingan")');

    // Wait for WebSocket event
    await page.waitForSelector('[data-testid="ws-event"]', { timeout: 10000 });

    // Verify event appeared in timeline
    const timelineEvents = page.locator('[data-testid="timeline-event"]');
    const eventCount = await timelineEvents.count();
    expect(eventCount).toBeGreaterThan(0);

    // Verify event has expected structure
    const firstEvent = timelineEvents.first();
    await expect(firstEvent).toContainText(/sharingan/i);
  });

  test('should update timeline in real-time', async ({ page }) => {
    // Get initial timeline count
    const timelineEvents = page.locator('[data-testid="timeline-event"]');
    const initialCount = await timelineEvents.count();

    // Run multiple Eyes
    await page.fill('textarea[name="prompt"]', 'implement feature');
    await page.click('button:has-text("Run Sharingan")');

    // Wait for first event
    await page.waitForSelector('[data-testid="timeline-event"]', { timeout: 10000 });

    // Verify count increased
    const newCount = await timelineEvents.count();
    expect(newCount).toBeGreaterThan(initialCount);

    // Run another Eye
    await page.click('button:has-text("Run Jogan")');

    // Wait for second event
    await page.waitForTimeout(2000);

    // Verify count increased again
    const finalCount = await timelineEvents.count();
    expect(finalCount).toBeGreaterThan(newCount);
  });

  test('should switch between tabs correctly', async ({ page }) => {
    // Verify default tab is Overview
    const overviewTab = page.locator('[data-testid="tab-overview"]');
    await expect(overviewTab).toHaveAttribute('aria-selected', 'true');

    // Switch to Evidence tab
    const evidenceTab = page.locator('[data-testid="tab-evidence"]');
    await evidenceTab.click();
    await expect(evidenceTab).toHaveAttribute('aria-selected', 'true');

    // Verify Evidence panel is visible
    const evidencePanel = page.locator('[data-testid="evidence-panel"]');
    await expect(evidencePanel).toBeVisible();

    // Switch to Operations tab
    const operationsTab = page.locator('[data-testid="tab-operations"]');
    await operationsTab.click();
    await expect(operationsTab).toHaveAttribute('aria-selected', 'true');

    // Verify Operations panel is visible
    const operationsPanel = page.locator('[data-testid="operations-panel"]');
    await expect(operationsPanel).toBeVisible();

    // Switch to Eyes tab
    const eyesTab = page.locator('[data-testid="tab-eyes"]');
    await eyesTab.click();
    await expect(eyesTab).toHaveAttribute('aria-selected', 'true');

    // Verify Eyes panel is visible
    const eyesPanel = page.locator('[data-testid="eyes-panel"]');
    await expect(eyesPanel).toBeVisible();

    // Switch to Diagnostics tab
    const diagnosticsTab = page.locator('[data-testid="tab-diagnostics"]');
    await diagnosticsTab.click();
    await expect(diagnosticsTab).toHaveAttribute('aria-selected', 'true');

    // Verify Diagnostics panel is visible
    const diagnosticsPanel = page.locator('[data-testid="diagnostics-panel"]');
    await expect(diagnosticsPanel).toBeVisible();
  });

  test('should enable and use auto-follow mode', async ({ page }) => {
    // Enable auto-follow
    const autoFollowToggle = page.locator('[data-testid="auto-follow-toggle"]');
    await autoFollowToggle.click();

    // Verify toggle is checked
    await expect(autoFollowToggle).toBeChecked();

    // Run multiple Eyes to generate timeline events
    await page.fill('textarea[name="prompt"]', 'test auto-follow');
    await page.click('button:has-text("Run Sharingan")');
    await page.waitForSelector('[data-testid="timeline-event"]');

    // Get last timeline event
    const timelineEvents = page.locator('[data-testid="timeline-event"]');
    const lastEvent = timelineEvents.last();

    // Verify last event is in viewport (auto-scrolled)
    const isInViewport = await lastEvent.isInViewport();
    expect(isInViewport).toBe(true);

    // Scroll up manually
    await page.evaluate(() => {
      const timeline = document.querySelector('[data-testid="timeline"]');
      if (timeline) {
        timeline.scrollTop = 0;
      }
    });

    // Run another Eye
    await page.click('button:has-text("Run Jogan")');
    await page.waitForTimeout(2000);

    // Verify auto-scrolled to new event
    const newLastEvent = timelineEvents.last();
    const stillInViewport = await newLastEvent.isInViewport();
    expect(stillInViewport).toBe(true);
  });

  test('should display session metrics in hero ribbon', async ({ page }) => {
    // Verify hero ribbon is visible
    const heroRibbon = page.locator('[data-testid="hero-ribbon"]');
    await expect(heroRibbon).toBeVisible();

    // Run some Eyes to generate metrics
    await page.fill('textarea[name="prompt"]', 'test metrics');
    await page.click('button:has-text("Run Sharingan")');
    await page.waitForSelector('[data-testid="timeline-event"]');

    // Verify metrics are displayed
    const totalRuns = page.locator('[data-testid="metric-total-runs"]');
    await expect(totalRuns).toBeVisible();
    const runsText = await totalRuns.textContent();
    expect(parseInt(runsText || '0')).toBeGreaterThan(0);

    // Verify latency is displayed
    const avgLatency = page.locator('[data-testid="metric-avg-latency"]');
    await expect(avgLatency).toBeVisible();

    // Verify token usage is displayed
    const totalTokens = page.locator('[data-testid="metric-total-tokens"]');
    await expect(totalTokens).toBeVisible();
  });

  test('should handle session selector', async ({ page }) => {
    // Get current session ID
    const url = page.url();
    const currentSessionId = url.split('/session/')[1];

    // Open session selector
    const sessionSelector = page.locator('[data-testid="session-selector"]');
    await sessionSelector.click();

    // Verify dropdown is visible
    const dropdown = page.locator('[data-testid="session-dropdown"]');
    await expect(dropdown).toBeVisible();

    // Create new session from selector
    await page.click('button:has-text("New Session")');
    await page.waitForURL(/\/session\/.+/);

    // Verify URL changed (new session)
    const newUrl = page.url();
    const newSessionId = newUrl.split('/session/')[1];
    expect(newSessionId).not.toBe(currentSessionId);

    // Verify dashboard loaded for new session
    const timeline = page.locator('[data-testid="timeline"]');
    await expect(timeline).toBeVisible();
  });

  test('should display raw event panel', async ({ page }) => {
    // Run an Eye to generate event
    await page.fill('textarea[name="prompt"]', 'test event');
    await page.click('button:has-text("Run Sharingan")');
    await page.waitForSelector('[data-testid="timeline-event"]');

    // Click on timeline event to view raw data
    const firstEvent = page.locator('[data-testid="timeline-event"]').first();
    await firstEvent.click();

    // Verify raw event panel appears
    const rawEventPanel = page.locator('[data-testid="raw-event-panel"]');
    await expect(rawEventPanel).toBeVisible();

    // Verify JSON structure is displayed
    await expect(rawEventPanel).toContainText(/"eye":/);
    await expect(rawEventPanel).toContainText(/"verdict":/);
    await expect(rawEventPanel).toContainText(/"code":/);

    // Close panel
    await page.click('[data-testid="close-raw-event"]');
    await expect(rawEventPanel).not.toBeVisible();
  });
});
