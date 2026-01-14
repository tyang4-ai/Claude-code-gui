import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🎭 Starting Playwright global setup...');

  // Create directories for test artifacts
  const dirs = [
    './test-results',
    './test-results/screenshots',
    './test-results/videos',
    './screenshots', // For documentation screenshots
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  📁 Created directory: ${dir}`);
    }
  }

  // Clean up old test results if not in CI
  if (!process.env.CI) {
    const testResultsDir = './test-results';
    if (fs.existsSync(testResultsDir)) {
      const files = fs.readdirSync(testResultsDir);
      for (const file of files) {
        const filePath = path.join(testResultsDir, file);
        if (fs.lstatSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      }
      console.log('  🧹 Cleaned up old test results');
    }
  }

  // Optional: Launch browser to warm up if needed
  if (process.env.WARM_UP_BROWSER) {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:1420');
    await page.close();
    await context.close();
    await browser.close();
    console.log('  🔥 Warmed up browser');
  }

  console.log('✅ Playwright global setup complete\n');
}

export default globalSetup;