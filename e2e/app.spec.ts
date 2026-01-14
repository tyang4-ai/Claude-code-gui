import { test, expect } from '@playwright/test';
import { TestUtils } from './helpers/test-utils';

test.describe('Claude GUI Companion - Core Features', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await page.goto('/');
    await utils.waitForAppReady();
  });

  test('should load the application successfully', async ({ page }) => {
    // Take documentation screenshot of initial state
    await utils.docScreenshot('01-app-loaded');

    // Verify main elements are present
    await expect(page.locator('#root')).toBeVisible();

    // Check for main app components (adjust selectors as needed)
    const appShell = page.locator('[data-testid="app-shell"], .app-shell, #app-shell').first();
    if (await appShell.count() > 0) {
      await expect(appShell).toBeVisible();
    }
  });

  test('should create a new session', async ({ page }) => {
    await utils.createNewSession();
    await utils.docScreenshot('02-new-session');

    // Verify session view is visible (adjust selectors as needed)
    const sessionView = page.locator('[data-testid="session-view"], .session-view').first();
    if (await sessionView.count() > 0) {
      await expect(sessionView).toBeVisible();
    }
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    // Test Ctrl+N for new session
    await page.keyboard.press('Control+N');
    await page.waitForTimeout(500);

    // Test Ctrl+P for command palette (when implemented)
    await page.keyboard.press('Control+P');
    await page.waitForTimeout(500);

    // Take screenshot of keyboard navigation
    await utils.screenshot('keyboard-shortcuts');
  });

  test('should capture screenshots at key points', async ({ page }) => {
    // Welcome view
    await utils.docScreenshot('welcome-view');

    // Create session
    await utils.createNewSession();
    await utils.docScreenshot('session-created');

    // Test input area if it exists
    const inputArea = page.locator('[data-testid="input-area"], .input-area, textarea').first();
    if (await inputArea.count() > 0) {
      await inputArea.fill('Test message for screenshot');
      await utils.docScreenshot('input-filled');
    }
  });

  test('should measure performance metrics', async ({ page }) => {
    // Measure app load time
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`⏱️ App load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000); // 3 second max

    // Measure session creation if possible
    if (await page.locator('[data-testid="new-session-btn"], button:has-text("New Session")').count() > 0) {
      await utils.measurePerformance(
        async () => await utils.createNewSession(),
        'Create new session'
      );
    }
  });
});

test.describe('Claude GUI Companion - Visual Testing', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await page.goto('/');
  });

  test('should capture UI documentation screenshots', async ({ page }) => {
    // Capture various UI states for documentation
    const screenshots = [
      { name: 'initial-load', wait: 1000 },
      { name: 'dark-theme', wait: 500 },
    ];

    for (const { name, wait } of screenshots) {
      await page.waitForTimeout(wait);
      await utils.docScreenshot(name);
    }
  });

  test('should test responsive design', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-full-hd' },
      { width: 1366, height: 768, name: 'desktop-standard' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 812, name: 'mobile' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      await utils.screenshot(viewport.name);
    }
  });
});
