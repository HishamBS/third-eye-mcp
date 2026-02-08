import { test, expect } from "@playwright/test";

const UI_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3300";
const API_URL = process.env.API_URL ?? "http://127.0.0.1:7070";

const ALL_EYE_DISPLAY_NAMES = [
  "Overseer",
  "Sharingan",
  "Kyuubi",
  "Jogan",
  "Rinnegan",
  "Mangekyo",
  "Tenseigan",
  "Byakugan",
] as const;

const MOCK_SESSION_EVENTS = [
  {
    id: "evt-1",
    sessionId: "test-session-1",
    type: "eye_call",
    code: "OVERSEER_STARTED",
    md: "Analyzing request...",
    dataJson: { route: ["tenseigan", "byakugan"] },
    createdAt: "2026-02-08T10:00:00Z",
  },
  {
    id: "evt-2",
    sessionId: "test-session-1",
    type: "eye_call",
    code: "TENSEIGAN_STARTED",
    md: "Validating facts and evidence...",
    dataJson: {},
    createdAt: "2026-02-08T10:00:01Z",
  },
  {
    id: "evt-3",
    sessionId: "test-session-1",
    type: "eye_call",
    code: "TENSEIGAN_COMPLETE",
    md: "Fact validation complete. All claims verified.",
    dataJson: { score: 95 },
    createdAt: "2026-02-08T10:00:05Z",
  },
  {
    id: "evt-4",
    sessionId: "test-session-1",
    type: "eye_call",
    code: "OK_ALL_APPROVED",
    md: "Final review passed. Approved for delivery.",
    dataJson: { overallScore: 98 },
    createdAt: "2026-02-08T10:00:10Z",
  },
];

test.describe("Monitor Page - Tactical Layout", () => {
  test("renders tactical layout with header, roster, feed, and pipeline bar", async ({
    page,
  }) => {
    await page.goto(`${UI_URL}/monitor`);
    await page.waitForLoadState("domcontentloaded");

    // HeaderBar shows brand text
    await expect(page.getByText("THIRD EYE")).toBeVisible();

    // View mode toggle buttons
    await expect(page.getByRole("button", { name: "Strategic" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tactical" })).toBeVisible();

    // EyeRoster panel with heading
    await expect(page.getByText("SPECIALIST ROSTER")).toBeVisible();

    // Pipeline progress icons visible at bottom
    const pipelineBar = page.locator('[class*="border-t"]').filter({
      has: page.locator('img[src*="/eyes/"]'),
    });
    await expect(pipelineBar.first()).toBeVisible();

    // IntelPanel headings
    await expect(page.getByText("INTEL FEED")).toBeVisible();
    await expect(page.getByText("QUALITY SCORE")).toBeVisible();

    // Empty state text when no session
    await expect(
      page.getByText("Select a session to begin monitoring"),
    ).toBeVisible();
  });

  test("eye roster shows all 8 specialists with STANDBY badges", async ({
    page,
  }) => {
    await page.goto(`${UI_URL}/monitor`);
    await page.waitForLoadState("domcontentloaded");

    // All 8 eye display names visible
    for (const name of ALL_EYE_DISPLAY_NAMES) {
      await expect(page.getByText(name, { exact: false })).toBeVisible();
    }

    // All should show STANDBY status badges
    const standbyElements = page.getByText("STANDBY");
    await expect(standbyElements.first()).toBeVisible();
    const count = await standbyElements.count();
    expect(count).toBe(8);
  });

  test("loads real session and renders conversation entries", async ({
    page,
  }) => {
    const sessionRes = await fetch(
      `${API_URL}/api/session/0ad370fe-2a06-488d-a5de-dff34b224a1d/events`,
    );

    if (!sessionRes.ok) {
      test.skip();
      return;
    }

    await page.goto(
      `${UI_URL}/monitor?sessionId=0ad370fe-2a06-488d-a5de-dff34b224a1d`,
    );
    await page.waitForLoadState("domcontentloaded");

    // Wait for events to load
    await page.waitForTimeout(2000);

    // Session ID appears in header
    await expect(page.getByText("0ad370fe")).toBeVisible();

    // Should not show empty state
    await expect(page.getByText("Awaiting transmission...")).not.toBeVisible({
      timeout: 3000,
    });
  });

  test("renders with route-intercepted mock session data", async ({ page }) => {
    // Mock the session events API
    await page.route(
      `${API_URL}/api/session/mock-session-1/events`,
      (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: MOCK_SESSION_EVENTS,
          }),
        });
      },
    );

    // Mock clarifications and intent confirmations (empty)
    await page.route(
      `${API_URL}/api/session/mock-session-1/clarifications`,
      (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] }),
        });
      },
    );

    await page.route(
      `${API_URL}/api/session/mock-session-1/intent-confirmations`,
      (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: null }),
        });
      },
    );

    await page.goto(`${UI_URL}/monitor?sessionId=mock-session-1`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for events to process
    await page.waitForTimeout(2000);

    // Session ID should be visible
    await expect(page.getByText("mock-ses")).toBeVisible();

    // Should show conversation entries (not empty state)
    await expect(page.getByText("Awaiting transmission...")).not.toBeVisible({
      timeout: 3000,
    });
  });

  test("has no console errors on initial load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto(`${UI_URL}/monitor`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Filter out expected WebSocket errors (connection refused is expected in test env)
    const unexpectedErrors = errors.filter(
      (e) =>
        !e.includes("WebSocket") &&
        !e.includes("ws://") &&
        !e.includes("Failed to load resource"),
    );

    expect(unexpectedErrors).toHaveLength(0);
  });
});
