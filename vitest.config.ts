import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'src-tauri'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules',
        'src-tauri',
        'src/__tests__',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types.ts',
        '**/*.stories.tsx',
        'src/main.tsx',
        'src/App.tsx', // Will test through E2E
      ],
      // Production-grade coverage requirements
      thresholds: {
        // Core modules require 100% coverage
        'src/core/**/*.{ts,tsx}': {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // Modules require 100% coverage
        'src/modules/**/*.{ts,tsx}': {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // Components require 95% coverage
        'src/components/**/*.{ts,tsx}': {
          lines: 95,
          branches: 95,
          functions: 95,
          statements: 95,
        },
        // Overall project requires 95% coverage
        global: {
          lines: 95,
          branches: 95,
          functions: 95,
          statements: 95,
        },
      },
      // Detailed coverage per file
      reportOnFailure: true,
      skipFull: false,
      perFile: true,
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
