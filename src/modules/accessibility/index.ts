/**
 * Accessibility Module
 *
 * Keyboard shortcuts, ARIA utilities, and accessibility helpers.
 */

export {
  KeyboardShortcutManager,
  formatShortcut,
  matchesShortcut,
  createDefaultShortcuts,
} from "./keyboard";

export type {
  KeyboardShortcut,
  ShortcutCategory,
} from "./keyboard";

export {
  createLiveRegion,
  announce,
  FocusTrap,
  createSkipLink,
  prefersReducedMotion,
  prefersHighContrast,
  prefersColorScheme,
  ariaPatterns,
} from "./aria";
