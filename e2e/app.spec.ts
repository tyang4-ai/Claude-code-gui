import { test, expect } from '@playwright/test';

test.describe('Claude GUI Companion', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to load
    await expect(page.locator('#root')).toBeVisible();
  });
});
