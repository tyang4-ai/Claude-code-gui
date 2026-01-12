/**
 * Command Palette Types
 *
 * Types for the command palette system.
 */

/**
 * A command that can be executed from the palette
 */
export interface Command {
  id: string;
  label: string;
  description?: string;
  category: CommandCategory;
  keywords?: string[]; // Additional search terms
  shortcut?: string; // Keyboard shortcut display
  icon?: string; // Icon name or emoji
  action: () => void | Promise<void>;
  enabled?: () => boolean;
}

/**
 * Command category
 */
export type CommandCategory =
  | "session"
  | "navigation"
  | "settings"
  | "skill"
  | "file"
  | "action"
  | "help";

/**
 * Quick file reference (for @-autocomplete)
 */
export interface FileReference {
  path: string;
  relativePath: string;
  name: string;
  isRecent: boolean;
}

/**
 * Command palette state
 */
export interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  mode: PaletteMode;
  selectedIndex: number;
  results: Command[] | FileReference[];
}

/**
 * Palette mode
 */
export type PaletteMode = "commands" | "files" | "skills";

/**
 * Command registration info
 */
export interface CommandRegistration {
  command: Command;
  priority: number; // Higher = appears first in same category
}
