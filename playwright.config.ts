import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report' }]]
    : [['html', { open: 'never' }], ['list']],
  timeout: 30000,

  // Global test configuration
  use: {
    baseURL: 'http://localhost:1420',
    trace: 'on-first-retry',

    // Enhanced screenshot configuration for production testing
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },

    // Video recording for debugging
    video: process.env.CI ? 'retain-on-failure' : 'off',

    // Viewport for consistent screenshots
    viewport: { width: 1280, height: 720 },

    // Accept downloads for export features
    acceptDownloads: true,

    // Ignore HTTPS errors for local development
    ignoreHTTPSErrors: true,

    // Artifacts folder
    testIdAttribute: 'data-testid',
  },

  // Output folder for test artifacts
  outputDir: './test-results',

  // Configure projects for cross-browser testing
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Custom screenshot path for visual regression
        contextOptions: {
          // Save screenshots to organized folders
          recordVideo: {
            dir: './test-results/videos',
          },
        },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
    // Test on different viewport sizes
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
      },
    },
    {
      name: 'tablet',
      use: {
        ...devices['iPad (gen 7)'],
      },
    },
  ],

  // Enhanced web server configuration for Tauri app
  webServer: {
    command: 'npm run tauri dev',
    url: 'http://localhost:1420',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Global setup/teardown
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/global-teardown.ts'),
});
