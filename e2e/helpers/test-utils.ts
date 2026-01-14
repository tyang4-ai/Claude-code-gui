import { Page, Locator, expect } from '@playwright/test';
import path from 'path';

/**
 * Production-grade E2E test utilities
 */
export class TestUtils {
  constructor(private page: Page) {}

  /**
   * Take a screenshot with automatic naming
   */
  async screenshot(name: string, options?: { fullPage?: boolean; clip?: any }) {
    const timestamp = Date.now();
    const fileName = `${timestamp}-${name.replace(/\s+/g, '-')}.png`;

    await this.page.screenshot({
      path: path.join('test-results', 'screenshots', fileName),
      fullPage: options?.fullPage ?? true,
      clip: options?.clip,
    });

    return fileName;
  }

  /**
   * Take a documentation screenshot (saved permanently)
   */
  async docScreenshot(name: string) {
    const fileName = `doc-${name.replace(/\s+/g, '-')}.png`;

    await this.page.screenshot({
      path: path.join('test-results', fileName),
      fullPage: true,
    });

    return fileName;
  }

  /**
   * Wait for app to be fully loaded
   */
  async waitForAppReady() {
    // Wait for the main app container
    await this.page.waitForSelector('[data-testid="app-shell"]', {
      state: 'visible',
      timeout: 10000,
    });

    // Wait for any loading spinners to disappear
    await this.page.waitForSelector('[data-testid="loading"]', {
      state: 'hidden',
      timeout: 5000,
    }).catch(() => {}); // Ignore if no loading spinner

    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Create a new session
   */
  async createNewSession(workingDir?: string) {
    // Click new session button or use keyboard shortcut
    if (await this.page.locator('[data-testid="new-session-btn"]').isVisible()) {
      await this.page.click('[data-testid="new-session-btn"]');
    } else {
      await this.page.keyboard.press('Control+N');
    }

    // Wait for session to be created
    await this.page.waitForSelector('[data-testid="session-view"]', {
      state: 'visible',
      timeout: 5000,
    });

    // Set working directory if provided
    if (workingDir) {
      await this.page.fill('[data-testid="working-dir-input"]', workingDir);
    }
  }

  /**
   * Send a message in the current session
   */
  async sendMessage(message: string) {
    const inputArea = this.page.locator('[data-testid="input-area"]');
    await inputArea.fill(message);

    // Take screenshot before sending
    await this.screenshot('before-send-message');

    // Send with Ctrl+Enter
    await this.page.keyboard.press('Control+Enter');

    // Wait for response
    await this.waitForResponse();
  }

  /**
   * Wait for Claude's response
   */
  async waitForResponse() {
    // Wait for thinking indicator to appear and disappear
    const thinkingIndicator = this.page.locator('[data-testid="thinking-indicator"]');

    try {
      await thinkingIndicator.waitFor({ state: 'visible', timeout: 2000 });
      await thinkingIndicator.waitFor({ state: 'hidden', timeout: 30000 });
    } catch {
      // If no thinking indicator, wait for message to appear
      await this.page.waitForSelector('[data-testid="assistant-message"]', {
        state: 'visible',
        timeout: 30000,
      });
    }
  }

  /**
   * Open command palette
   */
  async openCommandPalette() {
    await this.page.keyboard.press('Control+P');
    await this.page.waitForSelector('[data-testid="command-palette"]', {
      state: 'visible',
      timeout: 2000,
    });
  }

  /**
   * Search in command palette
   */
  async searchCommand(query: string) {
    await this.openCommandPalette();
    await this.page.fill('[data-testid="command-palette-input"]', query);
    await this.page.waitForTimeout(500); // Wait for search to complete
  }

  /**
   * Accept an edit in the Edit Arbiter
   */
  async acceptEdit(editIndex: number = 0) {
    const editCard = this.page.locator('[data-testid="edit-card"]').nth(editIndex);
    await editCard.locator('[data-testid="accept-edit-btn"]').click();

    // Take screenshot after accepting
    await this.screenshot('after-accept-edit');
  }

  /**
   * Reject an edit in the Edit Arbiter
   */
  async rejectEdit(editIndex: number = 0) {
    const editCard = this.page.locator('[data-testid="edit-card"]').nth(editIndex);
    await editCard.locator('[data-testid="reject-edit-btn"]').click();

    // Take screenshot after rejecting
    await this.screenshot('after-reject-edit');
  }

  /**
   * Switch to a different session tab
   */
  async switchToSession(sessionIndex: number) {
    const tab = this.page.locator('[data-testid="session-tab"]').nth(sessionIndex);
    await tab.click();
    await this.page.waitForTimeout(500); // Wait for tab switch animation
  }

  /**
   * Check if an element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    return (await this.page.locator(selector).count()) > 0;
  }

  /**
   * Visual regression test helper
   */
  async compareWithBaseline(name: string) {
    await expect(this.page).toHaveScreenshot(`baseline-${name}.png`, {
      fullPage: true,
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  }

  /**
   * Test accessibility
   */
  async testAccessibility(options?: { includeNotices?: boolean }) {
    // This would integrate with axe-core or similar
    // For now, basic keyboard navigation test
    const focusableElements = await this.page.locator(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).all();

    for (const element of focusableElements) {
      const isVisible = await element.isVisible();
      if (isVisible) {
        const hasAriaLabel = await element.getAttribute('aria-label');
        const hasAriaDescribedBy = await element.getAttribute('aria-describedby');
        const hasText = await element.textContent();

        expect(
          hasAriaLabel || hasAriaDescribedBy || hasText,
          `Element should have accessible label`
        ).toBeTruthy();
      }
    }
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation() {
    // Tab through all focusable elements
    const focusableElements = await this.page.locator(
      'button:visible, [href]:visible, input:visible, select:visible, textarea:visible, [tabindex]:not([tabindex="-1"]):visible'
    ).count();

    for (let i = 0; i < focusableElements; i++) {
      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(100);
    }

    // Test escape key closes modals
    if (await this.elementExists('[data-testid="modal"]')) {
      await this.page.keyboard.press('Escape');
      await expect(this.page.locator('[data-testid="modal"]')).toBeHidden();
    }
  }

  /**
   * Performance measurement helper
   */
  async measurePerformance(action: () => Promise<void>, name: string) {
    const startTime = Date.now();
    await action();
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`⏱️ ${name}: ${duration}ms`);

    // Fail if too slow
    expect(duration).toBeLessThan(2000); // 2 second max for most operations

    return duration;
  }
}