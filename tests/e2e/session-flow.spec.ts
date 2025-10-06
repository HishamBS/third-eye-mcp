import { test, expect } from '@playwright/test';

/**
 * E2E Test: Complete Session Flow
 *
 * Tests the full user journey through a Third Eye MCP session:
 * 1. Start new session
 * 2. Run Sharingan → receives clarifications
 * 3. Answer clarifications → Jogan confirms intent
 * 4. Run Rinnegan plan → review plan
 * 5. Run Mangekyo gates → approve code
 * 6. View final approval → export session
 */

test.describe('Complete Session Flow', () => {
  let sessionId: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should complete full clarification workflow', async ({ page }) => {
    // Step 1: Start new session
    await page.click('button:has-text("New Session")');
    await page.waitForURL(/\/session\/.+/);

    // Extract session ID from URL
    const url = page.url();
    sessionId = url.split('/session/')[1];
    expect(sessionId).toBeTruthy();

    // Step 2: Run Sharingan with ambiguous input
    await page.fill('textarea[name="prompt"]', 'make it better');
    await page.click('button:has-text("Run Sharingan")');

    // Wait for Sharingan to complete
    await page.waitForSelector('[data-eye="sharingan"]');

    // Verify clarifications panel appears
    const clarificationsPanel = page.locator('[data-testid="clarifications-panel"]');
    await expect(clarificationsPanel).toBeVisible();

    // Verify ambiguity score is displayed
    const ambiguityScore = page.locator('[data-testid="ambiguity-score"]');
    await expect(ambiguityScore).toBeVisible();
    const scoreText = await ambiguityScore.textContent();
    expect(parseInt(scoreText || '0')).toBeGreaterThan(50);

    // Step 3: Answer clarifying questions
    const clarificationInput = page.locator('textarea[data-testid="clarification-answer"]').first();
    await clarificationInput.fill('I want to implement user authentication with JWT tokens and bcrypt password hashing');
    await page.click('button:has-text("Submit Answer")');

    // Wait for validation
    await page.waitForSelector('[data-testid="clarification-valid"]');

    // Verify answer was accepted
    const validationStatus = page.locator('[data-testid="clarification-valid"]');
    await expect(validationStatus).toHaveText(/accepted|valid/i);

    // Step 4: Run Jogan for intent confirmation
    await page.click('button:has-text("Run Jogan")');
    await page.waitForSelector('[data-eye="jogan"]');

    // Verify intent confirmation
    const intentConfirmation = page.locator('[data-testid="intent-confirmation"]');
    await expect(intentConfirmation).toBeVisible();
    await expect(intentConfirmation).toContainText(/authentication|JWT/i);

    // Verify verdict is APPROVED
    const joganVerdict = page.locator('[data-eye="jogan"] [data-testid="verdict"]');
    await expect(joganVerdict).toHaveText('APPROVED');
  });

  test('should complete full planning workflow', async ({ page }) => {
    // Start session with clear intent
    await page.click('button:has-text("New Session")');
    await page.waitForURL(/\/session\/.+/);

    // Run Rinnegan for requirements
    await page.fill('textarea[name="prompt"]', 'Build a user authentication system with JWT, bcrypt, and email verification');
    await page.click('button:has-text("Run Rinnegan")');
    await page.selectOption('select[name="rinnegan-mode"]', 'requirements');

    // Wait for Rinnegan to complete
    await page.waitForSelector('[data-eye="rinnegan"]');

    // Verify requirements are displayed
    const requirementsPanel = page.locator('[data-testid="requirements-panel"]');
    await expect(requirementsPanel).toBeVisible();

    // Verify key requirements are listed
    await expect(requirementsPanel).toContainText(/JWT|bcrypt|email/i);

    // Run Rinnegan for plan review
    await page.click('button:has-text("Generate Plan")');
    await page.waitForSelector('[data-eye="rinnegan"][data-mode="review"]');

    // Verify plan is displayed
    const planPanel = page.locator('[data-testid="plan-panel"]');
    await expect(planPanel).toBeVisible();

    // Verify plan has sections
    await expect(planPanel).toContainText(/Step|Phase|Task/i);

    // Verify no blockers
    const blockers = page.locator('[data-testid="blockers"]');
    const blockerCount = await blockers.count();
    expect(blockerCount).toBe(0);
  });

  test('should complete full code review workflow', async ({ page }) => {
    // Start session
    await page.click('button:has-text("New Session")');
    await page.waitForURL(/\/session\/.+/);

    // Run Mangekyo scaffold gate
    await page.click('button:has-text("Run Mangekyo")');
    await page.selectOption('select[name="mangekyo-gate"]', 'scaffold');

    // Wait for scaffold review
    await page.waitForSelector('[data-eye="mangekyo"][data-gate="scaffold"]');

    // Verify file structure is displayed
    const scaffoldPanel = page.locator('[data-testid="scaffold-panel"]');
    await expect(scaffoldPanel).toBeVisible();

    // Run implementation gate
    await page.click('button:has-text("Next Gate")');
    await page.selectOption('select[name="mangekyo-gate"]', 'impl');
    await page.waitForSelector('[data-eye="mangekyo"][data-gate="impl"]');

    // Verify code quality checks
    const implPanel = page.locator('[data-testid="impl-panel"]');
    await expect(implPanel).toBeVisible();

    // Run tests gate
    await page.click('button:has-text("Next Gate")');
    await page.selectOption('select[name="mangekyo-gate"]', 'tests');
    await page.waitForSelector('[data-eye="mangekyo"][data-gate="tests"]');

    // Verify test coverage
    const testsPanel = page.locator('[data-testid="tests-panel"]');
    await expect(testsPanel).toBeVisible();

    // Run docs gate
    await page.click('button:has-text("Next Gate")');
    await page.selectOption('select[name="mangekyo-gate"]', 'docs');
    await page.waitForSelector('[data-eye="mangekyo"][data-gate="docs"]');

    // Verify documentation checks
    const docsPanel = page.locator('[data-testid="docs-panel"]');
    await expect(docsPanel).toBeVisible();
  });

  test('should export session in multiple formats', async ({ page }) => {
    // Start session and run some Eyes
    await page.click('button:has-text("New Session")');
    await page.waitForURL(/\/session\/.+/);

    // Run Sharingan
    await page.fill('textarea[name="prompt"]', 'implement user auth');
    await page.click('button:has-text("Run Sharingan")');
    await page.waitForSelector('[data-eye="sharingan"]');

    // Open export menu
    await page.click('button[data-testid="export-button"]');

    // Test JSON export
    const [jsonDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export as JSON")'),
    ]);
    expect(jsonDownload.suggestedFilename()).toMatch(/\.json$/);

    // Verify JSON content
    const jsonPath = await jsonDownload.path();
    expect(jsonPath).toBeTruthy();

    // Test Markdown export
    const [mdDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export as Markdown")'),
    ]);
    expect(mdDownload.suggestedFilename()).toMatch(/\.md$/);

    // Test CSV export
    const [csvDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export as CSV")'),
    ]);
    expect(csvDownload.suggestedFilename()).toMatch(/\.csv$/);
  });

  test('should handle order guard violations gracefully', async ({ page }) => {
    // Start session
    await page.click('button:has-text("New Session")');
    await page.waitForURL(/\/session\/.+/);

    // Try to run Jogan without Sharingan first (order violation)
    await page.click('button:has-text("Run Jogan")');

    // Wait for error message
    await page.waitForSelector('[data-testid="order-guard-error"]');

    // Verify error message
    const errorMessage = page.locator('[data-testid="order-guard-error"]');
    await expect(errorMessage).toContainText(/prerequisite|order|sequence/i);

    // Verify suggestion is provided
    const suggestion = page.locator('[data-testid="order-guard-suggestion"]');
    await expect(suggestion).toBeVisible();
    await expect(suggestion).toContainText(/sharingan|run.*first/i);
  });

  test('should handle WebSocket reconnection', async ({ page }) => {
    // Start session
    await page.click('button:has-text("New Session")');
    await page.waitForURL(/\/session\/.+/);

    // Verify WebSocket connected
    const wsStatus = page.locator('[data-testid="ws-status"]');
    await expect(wsStatus).toHaveText(/connected/i);

    // Simulate disconnect (close tab and reopen)
    await page.close();
    const newPage = await page.context().newPage();
    await newPage.goto(page.url());

    // Verify reconnection
    const newWsStatus = newPage.locator('[data-testid="ws-status"]');
    await expect(newWsStatus).toHaveText(/connected|reconnected/i);

    // Verify missed events were replayed
    const timeline = newPage.locator('[data-testid="timeline"]');
    await expect(timeline).toBeVisible();
  });
});
