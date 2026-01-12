import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
  emit: vi.fn(),
}));

// Mock window.__TAURI__ for Tauri environment detection
Object.defineProperty(window, '__TAURI__', {
  value: {
    invoke: vi.fn(),
  },
  writable: true,
});

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});
