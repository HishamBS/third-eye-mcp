import { test, expect, type Page } from '@playwright/test';

/**
 * Full Pipeline E2E Test
 * Tests complete user workflow from provider configuration to pipeline execution
 */

const API_URL = process.env.API_URL || 'http://127.0.0.1:7070';
const UI_URL = process.env.UI_URL || 'http://127.0.0.1:3300';

test.describe('Full Pipeline Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto(UI_URL);

    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('should complete end-to-end pipeline workflow', async ({ page }) => {
    // Step 1: Configure Provider
    await test.step('Configure AI Provider', async () => {
      await page.click('a[href="/models"]');
      await page.waitForURL('**/models');

      // Add Groq provider key
      const providerSelect = page.locator('select').first();
      await providerSelect.selectOption('groq');

      const apiKeyInput = page.locator('input[type="password"]');
      await apiKeyInput.fill(process.env.GROQ_API_KEY || 'test-key-for-e2e');

      const saveButton = page.getByRole('button', { name: /save/i });
      await saveButton.click();

      // Verify success message
      await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 5000 });
    });

    // Step 2: Create Custom Persona
    await test.step('Create Custom Persona', async () => {
      await page.click('a[href="/personas"]');
      await page.waitForURL('**/personas');

      // Click "Create Persona" button
      const createButton = page.getByRole('button', { name: /create/i });
      await createButton.click();

      // Fill persona form
      await page.locator('input[name="name"]').fill('E2E Test Reviewer');
      await page.locator('textarea[name="systemPrompt"]').fill(
        'You are a thorough code reviewer focused on security and best practices.'
      );

      // Save persona
      const savePersonaButton = page.getByRole('button', { name: /save/i });
      await savePersonaButton.click();

      await expect(page.getByText('E2E Test Reviewer')).toBeVisible();
    });

    // Step 3: Create Pipeline
    await test.step('Create Pipeline Workflow', async () => {
      await page.click('a[href="/pipelines"]');
      await page.waitForURL('**/pipelines');

      // Click "Create Pipeline" button
      const createPipelineBtn = page.getByRole('button', { name: /create pipeline/i });
      await createPipelineBtn.click();

      // Fill pipeline details
      await page.locator('input[name="name"]').fill('E2E Security Review');
      await page.locator('textarea[name="description"]').fill(
        'Multi-stage security review pipeline for E2E testing'
      );

      // Configure pipeline steps using visual builder
      // Step 1: Sharingan - Code Review
      const addStepButton = page.getByRole('button', { name: /add step/i });
      await addStepButton.click();

      await page.locator('select[name="eye"]').first().selectOption('sharingan');
      await page.locator('input[name="stepName"]').first().fill('Initial Review');

      // Step 2: Rinnegan - Requirement Validation
      await addStepButton.click();
      const eyeSelects = page.locator('select[name="eye"]');
      await eyeSelects.nth(1).selectOption('rinnegan');
      await page.locator('input[name="stepName"]').nth(1).fill('Validate Requirements');

      // Step 3: Tenseigan - Decision Making
      await addStepButton.click();
      await eyeSelects.nth(2).selectOption('tenseigan');
      await page.locator('input[name="stepName"]').nth(2).fill('Final Decision');

      // Save pipeline
      const savePipelineBtn = page.getByRole('button', { name: /save pipeline/i });
      await savePipelineBtn.click();

      await expect(page.getByText('E2E Security Review')).toBeVisible();
    });

    // Step 4: Execute Pipeline via Prompt
    await test.step('Execute Pipeline with Test Input', async () => {
      await page.click('a[href="/prompts"]');
      await page.waitForURL('**/prompts');

      // Enter test prompt
      const promptTextarea = page.locator('textarea[placeholder*="prompt" i]');
      await promptTextarea.fill(`
Review this code for security issues:

function login(username, password) {
  const query = "SELECT * FROM users WHERE username='" + username + "' AND password='" + password + "'";
  return db.execute(query);
}
      `.trim());

      // Select the pipeline we created
      const pipelineSelect = page.locator('select[name="pipeline"]');
      await pipelineSelect.selectOption('E2E Security Review');

      // Execute
      const executeButton = page.getByRole('button', { name: /execute/i });
      await executeButton.click();

      // Wait for execution to complete (may take a few seconds)
      await page.waitForSelector('[data-testid="execution-complete"]', {
        timeout: 30000
      });

      // Verify results are displayed
      await expect(page.getByText(/sql injection/i)).toBeVisible({ timeout: 5000 });
    });

    // Step 5: Verify Session History
    await test.step('Verify Session was Recorded', async () => {
      await page.click('a[href="/monitor"]');
      await page.waitForURL('**/monitor');

      // Find the session we just created
      const sessionRow = page.locator('tr').filter({ hasText: 'E2E Security Review' }).first();
      await expect(sessionRow).toBeVisible();

      // Click to view session details
      await sessionRow.click();

      // Verify session details page shows our pipeline steps
      await expect(page.getByText('Initial Review')).toBeVisible();
      await expect(page.getByText('Validate Requirements')).toBeVisible();
      await expect(page.getByText('Final Decision')).toBeVisible();

      // Verify evidence trail
      const evidenceSection = page.locator('[data-testid="evidence-trail"]');
      await expect(evidenceSection).toBeVisible();
    });

    // Step 6: Export Results
    await test.step('Export Session Results', async () => {
      // Click export button
      const exportButton = page.getByRole('button', { name: /export/i });
      await exportButton.click();

      // Select JSON format
      const formatSelect = page.locator('select[name="format"]');
      await formatSelect.selectOption('json');

      // Download
      const downloadPromise = page.waitForEvent('download');
      const downloadButton = page.getByRole('button', { name: /download/i });
      await downloadButton.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/session.*\.json/);
    });

    // Step 7: Verify Audit Log
    await test.step('Check Audit Log for All Actions', async () => {
      await page.click('a[href="/audit"]');
      await page.waitForURL('**/audit');

      // Verify key actions were logged
      const auditTable = page.locator('table');

      await expect(auditTable.getByText(/provider.*configured/i)).toBeVisible();
      await expect(auditTable.getByText(/persona.*created/i)).toBeVisible();
      await expect(auditTable.getByText(/pipeline.*created/i)).toBeVisible();
      await expect(auditTable.getByText(/pipeline.*executed/i)).toBeVisible();
      await expect(auditTable.getByText(/session.*exported/i)).toBeVisible();
    });
  });

  test('should handle pipeline with conditional branching', async ({ page }) => {
    await test.step('Create Conditional Pipeline', async () => {
      await page.click('a[href="/pipelines"]');
      await page.waitForURL('**/pipelines');

      const createButton = page.getByRole('button', { name: /create pipeline/i });
      await createButton.click();

      await page.locator('input[name="name"]').fill('Conditional Review');

      // Add conditional step
      const addStepButton = page.getByRole('button', { name: /add step/i });
      await addStepButton.click();

      // Configure as conditional
      const conditionalCheckbox = page.locator('input[name="conditional"]');
      await conditionalCheckbox.check();

      // Set up true/false branches
      await page.locator('select[name="trueNext"]').selectOption('approve');
      await page.locator('select[name="falseNext"]').selectOption('reject');

      await page.getByRole('button', { name: /save pipeline/i }).click();
    });

    await test.step('Execute Conditional Pipeline', async () => {
      await page.click('a[href="/prompts"]');

      const promptTextarea = page.locator('textarea[placeholder*="prompt" i]');
      await promptTextarea.fill('Is 2+2=4?');

      const pipelineSelect = page.locator('select[name="pipeline"]');
      await pipelineSelect.selectOption('Conditional Review');

      const executeButton = page.getByRole('button', { name: /execute/i });
      await executeButton.click();

      // Verify it took the "true" branch
      await expect(page.getByText(/approve/i)).toBeVisible({ timeout: 30000 });
    });
  });

  test('should handle errors gracefully', async ({ page }) => {
    await test.step('Execute Pipeline with Invalid Configuration', async () => {
      await page.click('a[href="/prompts"]');

      const promptTextarea = page.locator('textarea[placeholder*="prompt" i]');
      await promptTextarea.fill('Test prompt');

      // Try to execute without selecting a pipeline
      const executeButton = page.getByRole('button', { name: /execute/i });
      await executeButton.click();

      // Verify error message
      await expect(page.getByText(/select a pipeline/i)).toBeVisible();
    });

    await test.step('Handle API Error', async () => {
      // Mock API failure
      await page.route(`${API_URL}/api/pipelines/execute`, route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({
            error: {
              type: 'about:blank',
              title: 'Internal Server Error',
              status: 500,
              detail: 'Pipeline execution failed'
            }
          })
        });
      });

      const promptTextarea = page.locator('textarea[placeholder*="prompt" i]');
      await promptTextarea.fill('Test error handling');

      const pipelineSelect = page.locator('select[name="pipeline"]');
      await pipelineSelect.selectOption({ index: 1 });

      const executeButton = page.getByRole('button', { name: /execute/i });
      await executeButton.click();

      // Verify error is displayed to user
      await expect(page.getByText(/pipeline execution failed/i)).toBeVisible();
    });
  });

  test('should support real-time updates via WebSocket', async ({ page }) => {
    await test.step('Monitor Pipeline Execution in Real-Time', async () => {
      // Open monitor page in split view
      await page.click('a[href="/monitor"]');
      await page.waitForURL('**/monitor');

      // Enable live mode
      const liveModeToggle = page.locator('input[type="checkbox"][name="liveMode"]');
      await liveModeToggle.check();

      // Open prompts page in new tab to execute pipeline
      const promptsPage = await page.context().newPage();
      await promptsPage.goto(`${UI_URL}/prompts`);

      const promptTextarea = promptsPage.locator('textarea[placeholder*="prompt" i]');
      await promptTextarea.fill('Real-time test');

      const pipelineSelect = promptsPage.locator('select[name="pipeline"]');
      await pipelineSelect.selectOption({ index: 1 });

      const executeButton = promptsPage.getByRole('button', { name: /execute/i });
      await executeButton.click();

      // Verify monitor page shows real-time updates
      await expect(page.locator('[data-testid="live-session"]').first()).toBeVisible({
        timeout: 10000
      });

      await promptsPage.close();
    });
  });

  test('should verify MCP integration', async ({ page }) => {
    await test.step('Check MCP Server Status', async () => {
      await page.click('a[href="/connection"]');
      await page.waitForURL('**/connection');

      // Verify MCP server is running
      const statusIndicator = page.locator('[data-testid="mcp-status"]');
      await expect(statusIndicator).toHaveText(/running/i);

      // Verify overseer tool is available
      const toolsList = page.locator('[data-testid="mcp-tools"]');
      await expect(toolsList.getByText('overseer')).toBeVisible();
    });

    await test.step('Execute via MCP', async () => {
      // Test MCP integration by calling overseer tool
      const response = await page.evaluate(async (apiUrl) => {
        const res = await fetch(`${apiUrl}/api/mcp/tools/overseer/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'What is 2+2?' }]
          })
        });
        return res.json();
      }, API_URL);

      expect(response).toHaveProperty('result');
      expect(response.result).toContain('4');
    });
  });
});

test.describe('Performance Tests', () => {
  test('should handle multiple concurrent pipeline executions', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);

    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

    // Execute 3 pipelines concurrently
    await Promise.all(pages.map(async (page, index) => {
      await page.goto(`${UI_URL}/prompts`);

      const promptTextarea = page.locator('textarea[placeholder*="prompt" i]');
      await promptTextarea.fill(`Concurrent test ${index + 1}`);

      const pipelineSelect = page.locator('select[name="pipeline"]');
      await pipelineSelect.selectOption({ index: 1 });

      const executeButton = page.getByRole('button', { name: /execute/i });
      await executeButton.click();

      await page.waitForSelector('[data-testid="execution-complete"]', {
        timeout: 30000
      });
    }));

    // Verify all executions completed
    for (const page of pages) {
      await expect(page.getByTestId('execution-complete')).toBeVisible();
    }

    // Cleanup
    await Promise.all(contexts.map(ctx => ctx.close()));
  });

  test('should load large session history efficiently', async ({ page }) => {
    await page.goto(`${UI_URL}/monitor`);

    // Measure load time
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Verify pagination works with large dataset
    const paginationControls = page.locator('[data-testid="pagination"]');
    await expect(paginationControls).toBeVisible();

    // Test pagination
    const nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();

    await page.waitForLoadState('networkidle');

    // Verify page changed
    const pageIndicator = page.locator('[data-testid="current-page"]');
    await expect(pageIndicator).toHaveText('2');
  });
});
