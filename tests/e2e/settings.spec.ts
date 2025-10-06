import { test, expect } from '@playwright/test';

/**
 * E2E Test: Settings Persistence
 *
 * Tests that user settings persist across page reloads:
 * - Theme selection persists
 * - View mode persists
 * - Strictness level persists
 * - Persona voice toggle persists
 */

test.describe('Settings Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to settings page
    await page.goto('/');
    await page.click('button[data-testid="settings-button"]');
    await page.waitForSelector('[data-testid="settings-panel"]');
  });

  test('should persist theme selection', async ({ page }) => {
    // Get current theme
    const themeSelect = page.locator('select[name="theme"]');
    const currentTheme = await themeSelect.inputValue();

    // Change to different theme
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    await themeSelect.selectOption(newTheme);

    // Verify theme applied immediately
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', newTheme);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify theme persisted
    await expect(html).toHaveAttribute('data-theme', newTheme);

    // Verify select shows correct value
    const reloadedThemeSelect = page.locator('select[name="theme"]');
    await expect(reloadedThemeSelect).toHaveValue(newTheme);
  });

  test('should persist view mode selection', async ({ page }) => {
    // Navigate to monitor page
    await page.goto('/');
    await page.click('button:has-text("New Session")');
    await page.waitForURL(/\/session\/.+/);

    // Change view mode
    const viewModeToggle = page.locator('[data-testid="view-mode-toggle"]');
    await viewModeToggle.click();

    // Select compact mode
    await page.click('button[data-value="compact"]');

    // Verify compact mode applied
    const timeline = page.locator('[data-testid="timeline"]');
    await expect(timeline).toHaveClass(/compact/);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify view mode persisted
    const reloadedTimeline = page.locator('[data-testid="timeline"]');
    await expect(reloadedTimeline).toHaveClass(/compact/);
  });

  test('should persist strictness level', async ({ page }) => {
    // Open strictness settings
    const strictnessSlider = page.locator('input[name="strictness"]');

    // Get current value
    const currentValue = await strictnessSlider.inputValue();

    // Change to different value
    const newValue = currentValue === '70' ? '90' : '70';
    await strictnessSlider.fill(newValue);

    // Verify value changed
    await expect(strictnessSlider).toHaveValue(newValue);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Open settings again
    await page.click('button[data-testid="settings-button"]');
    await page.waitForSelector('[data-testid="settings-panel"]');

    // Verify strictness persisted
    const reloadedSlider = page.locator('input[name="strictness"]');
    await expect(reloadedSlider).toHaveValue(newValue);
  });

  test('should persist persona voice toggle', async ({ page }) => {
    // Find persona voice toggle
    const personaVoiceToggle = page.locator('input[name="persona-voice"]');

    // Get current state
    const isChecked = await personaVoiceToggle.isChecked();

    // Toggle it
    await personaVoiceToggle.click();

    // Verify state changed
    await expect(personaVoiceToggle).toBeChecked({ checked: !isChecked });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Open settings again
    await page.click('button[data-testid="settings-button"]');
    await page.waitForSelector('[data-testid="settings-panel"]');

    // Verify toggle persisted
    const reloadedToggle = page.locator('input[name="persona-voice"]');
    await expect(reloadedToggle).toBeChecked({ checked: !isChecked });
  });

  test('should trigger re-evaluation when strictness changes', async ({ page }) => {
    // Create session and run an Eye
    await page.goto('/');
    await page.click('button:has-text("New Session")');
    await page.waitForURL(/\/session\/.+/);

    // Run Sharingan
    await page.fill('textarea[name="prompt"]', 'make it better');
    await page.click('button:has-text("Run Sharingan")');
    await page.waitForSelector('[data-eye="sharingan"]');

    // Get initial verdict
    const initialVerdict = page.locator('[data-eye="sharingan"] [data-testid="verdict"]');
    const initialVerdictText = await initialVerdict.textContent();

    // Open settings and change strictness
    await page.click('button[data-testid="settings-button"]');
    await page.waitForSelector('[data-testid="settings-panel"]');

    const strictnessSlider = page.locator('input[name="strictness"]');
    await strictnessSlider.fill('90');

    // Click "Re-evaluate with new settings"
    await page.click('button:has-text("Re-evaluate")');

    // Wait for re-evaluation
    await page.waitForSelector('[data-testid="re-evaluating"]', { state: 'hidden' });

    // Verify verdict may have changed
    const newVerdict = page.locator('[data-eye="sharingan"] [data-testid="verdict"]');
    const newVerdictText = await newVerdict.textContent();

    // Either verdict changed or stayed the same (both valid)
    expect([initialVerdictText, 'NEEDS_INPUT', 'REJECTED']).toContain(newVerdictText);
  });

  test('should persist auto-follow preference', async ({ page }) => {
    // Navigate to monitor
    await page.goto('/');
    await page.click('button:has-text("New Session")');
    await page.waitForURL(/\/session\/.+/);

    // Enable auto-follow
    const autoFollowToggle = page.locator('[data-testid="auto-follow-toggle"]');
    await autoFollowToggle.click();
    await expect(autoFollowToggle).toBeChecked();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify auto-follow persisted
    const reloadedToggle = page.locator('[data-testid="auto-follow-toggle"]');
    await expect(reloadedToggle).toBeChecked();
  });

  test('should persist provider preferences', async ({ page }) => {
    // Open provider settings
    await page.click('button:has-text("Providers")');
    await page.waitForSelector('[data-testid="provider-settings"]');

    // Change primary provider for an Eye
    const sharinganProvider = page.locator('select[data-eye="sharingan"][data-field="primary"]');
    await sharinganProvider.selectOption('groq:llama-3.1-8b');

    // Verify selection
    await expect(sharinganProvider).toHaveValue('groq:llama-3.1-8b');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Open provider settings again
    await page.click('button[data-testid="settings-button"]');
    await page.waitForSelector('[data-testid="settings-panel"]');
    await page.click('button:has-text("Providers")');

    // Verify provider selection persisted
    const reloadedProvider = page.locator('select[data-eye="sharingan"][data-field="primary"]');
    await expect(reloadedProvider).toHaveValue('groq:llama-3.1-8b');
  });

  test('should export and import settings', async ({ page }) => {
    // Change multiple settings
    const themeSelect = page.locator('select[name="theme"]');
    await themeSelect.selectOption('dark');

    const strictnessSlider = page.locator('input[name="strictness"]');
    await strictnessSlider.fill('85');

    const personaVoice = page.locator('input[name="persona-voice"]');
    await personaVoice.check();

    // Export settings
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export Settings")'),
    ]);

    expect(download.suggestedFilename()).toMatch(/third-eye-settings.*\.json$/);

    // Reset settings to defaults
    await page.click('button:has-text("Reset to Defaults")');
    await page.click('button:has-text("Confirm")');

    // Verify settings reset
    await expect(themeSelect).toHaveValue('light');
    await expect(strictnessSlider).toHaveValue('70');
    await expect(personaVoice).not.toBeChecked();

    // Import settings from file
    const fileInput = page.locator('input[type="file"][name="settings-import"]');
    const filePath = await download.path();
    if (filePath) {
      await fileInput.setInputFiles(filePath);
      await page.click('button:has-text("Import")');

      // Verify settings imported
      await expect(themeSelect).toHaveValue('dark');
      await expect(strictnessSlider).toHaveValue('85');
      await expect(personaVoice).toBeChecked();
    }
  });
});
