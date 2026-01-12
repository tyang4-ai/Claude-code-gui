/**
 * Keyboard Shortcuts
 *
 * Centralized keyboard shortcut management for accessibility.
 */

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  id: string;
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  category: ShortcutCategory;
  action: () => void;
  enabled?: () => boolean;
}

/**
 * Shortcut category
 */
export type ShortcutCategory =
  | "session"
  | "navigation"
  | "editing"
  | "general";

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.shift) parts.push("Shift");
  if (shortcut.alt) parts.push("Alt");
  if (shortcut.meta) parts.push("Cmd");

  // Format special keys
  const keyDisplay = formatKey(shortcut.key);
  parts.push(keyDisplay);

  return parts.join("+");
}

/**
 * Format a key name for display
 */
function formatKey(key: string): string {
  const specialKeys: Record<string, string> = {
    " ": "Space",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    Escape: "Esc",
    Enter: "Enter",
    Tab: "Tab",
    Backspace: "Backspace",
    Delete: "Del",
  };

  return specialKeys[key] || key.toUpperCase();
}

/**
 * Check if an event matches a shortcut
 */
export function matchesShortcut(e: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const ctrlMatch = shortcut.ctrl === (e.ctrlKey || e.metaKey);
  const shiftMatch = shortcut.shift === e.shiftKey;
  const altMatch = shortcut.alt === e.altKey;
  const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

  return ctrlMatch && shiftMatch && altMatch && keyMatch;
}

/**
 * Keyboard Shortcut Manager
 */
export class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private enabled = true;
  private handler: ((e: KeyboardEvent) => void) | null = null;

  /**
   * Register a shortcut
   */
  register(shortcut: KeyboardShortcut): void {
    this.shortcuts.set(shortcut.id, shortcut);
  }

  /**
   * Register multiple shortcuts
   */
  registerAll(shortcuts: KeyboardShortcut[]): void {
    for (const shortcut of shortcuts) {
      this.shortcuts.set(shortcut.id, shortcut);
    }
  }

  /**
   * Unregister a shortcut
   */
  unregister(id: string): void {
    this.shortcuts.delete(id);
  }

  /**
   * Get all shortcuts
   */
  getAll(category?: ShortcutCategory): KeyboardShortcut[] {
    let shortcuts = Array.from(this.shortcuts.values());
    if (category) {
      shortcuts = shortcuts.filter((s) => s.category === category);
    }
    return shortcuts;
  }

  /**
   * Get shortcuts grouped by category
   */
  getGrouped(): Map<ShortcutCategory, KeyboardShortcut[]> {
    const grouped = new Map<ShortcutCategory, KeyboardShortcut[]>();

    for (const shortcut of this.shortcuts.values()) {
      const existing = grouped.get(shortcut.category) || [];
      existing.push(shortcut);
      grouped.set(shortcut.category, existing);
    }

    return grouped;
  }

  /**
   * Enable/disable shortcut handling
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Start listening for keyboard events
   */
  start(): void {
    if (this.handler) return;

    this.handler = (e: KeyboardEvent) => {
      if (!this.enabled) return;

      // Don't handle shortcuts when typing in inputs (unless explicitly enabled)
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Only handle Escape in inputs
        if (e.key !== "Escape") return;
      }

      for (const shortcut of this.shortcuts.values()) {
        if (matchesShortcut(e, shortcut)) {
          // Check if shortcut is enabled
          if (shortcut.enabled && !shortcut.enabled()) {
            continue;
          }

          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener("keydown", this.handler);
  }

  /**
   * Stop listening for keyboard events
   */
  stop(): void {
    if (this.handler) {
      window.removeEventListener("keydown", this.handler);
      this.handler = null;
    }
  }
}

// Default shortcuts for the application
export function createDefaultShortcuts(handlers: {
  newSession: () => void;
  closeSession: () => void;
  nextTab: () => void;
  prevTab: () => void;
  commandPalette: () => void;
  settings: () => void;
  acceptEdit: () => void;
  rejectEdit: () => void;
  interrupt: () => void;
  focusInput: () => void;
}): KeyboardShortcut[] {
  return [
    // Session shortcuts
    {
      id: "new-session",
      key: "n",
      ctrl: true,
      description: "New session",
      category: "session",
      action: handlers.newSession,
    },
    {
      id: "close-session",
      key: "w",
      ctrl: true,
      description: "Close session",
      category: "session",
      action: handlers.closeSession,
    },
    {
      id: "interrupt",
      key: "Escape",
      description: "Interrupt Claude",
      category: "session",
      action: handlers.interrupt,
    },

    // Navigation shortcuts
    {
      id: "next-tab",
      key: "Tab",
      ctrl: true,
      description: "Next tab",
      category: "navigation",
      action: handlers.nextTab,
    },
    {
      id: "prev-tab",
      key: "Tab",
      ctrl: true,
      shift: true,
      description: "Previous tab",
      category: "navigation",
      action: handlers.prevTab,
    },
    {
      id: "command-palette",
      key: "p",
      ctrl: true,
      description: "Command palette",
      category: "navigation",
      action: handlers.commandPalette,
    },
    {
      id: "focus-input",
      key: "/",
      description: "Focus input",
      category: "navigation",
      action: handlers.focusInput,
    },

    // Editing shortcuts
    {
      id: "accept-edit",
      key: "1",
      ctrl: true,
      description: "Accept edit",
      category: "editing",
      action: handlers.acceptEdit,
    },
    {
      id: "reject-edit",
      key: "2",
      ctrl: true,
      description: "Reject edit",
      category: "editing",
      action: handlers.rejectEdit,
    },

    // General shortcuts
    {
      id: "settings",
      key: ",",
      ctrl: true,
      description: "Open settings",
      category: "general",
      action: handlers.settings,
    },
  ];
}
