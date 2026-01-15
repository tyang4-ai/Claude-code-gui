import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';
import { enableMapSet } from 'immer';

// Enable Immer MapSet plugin for Set and Map support in Zustand stores
enableMapSet();

// Mock Tauri APIs with complete implementation
const mockInvoke = vi.fn();
const mockListen = vi.fn(() => Promise.resolve(() => {}));
const mockEmit = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: mockListen,
  emit: mockEmit,
  TauriEvent: {
    WINDOW_RESIZED: 'tauri://window-resized',
    WINDOW_CLOSE_REQUESTED: 'tauri://window-close-requested',
  },
}));

// Mock all Tauri plugins
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
  message: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
  open: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-shell', () => ({
  Command: class {
    constructor(public program: string, public args?: string[]) {}
    execute = vi.fn();
    spawn = vi.fn();
  },
}));

// Mock window.__TAURI__ for Tauri environment detection
Object.defineProperty(window, '__TAURI__', {
  value: {
    invoke: mockInvoke,
    event: {
      listen: mockListen,
      emit: mockEmit,
    },
  },
  writable: true,
});

// Mock localStorage for testing
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Export mocks for test usage
export { mockInvoke, mockListen, mockEmit };

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});
