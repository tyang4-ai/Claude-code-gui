/**
 * Command Palette Module
 *
 * Provides a command palette (Ctrl+P) for quick actions.
 */

import { commandRegistry, registerDefaultCommands } from "./registry";
import type { Command, CommandCategory, FileReference, PaletteMode } from "./types";

/**
 * Command Palette Manager
 */
export class CommandPaletteManager {
  private static instance: CommandPaletteManager | null = null;
  private isOpen = false;
  private mode: PaletteMode = "commands";
  private openListeners: Set<(isOpen: boolean) => void> = new Set();

  static getInstance(): CommandPaletteManager {
    if (!CommandPaletteManager.instance) {
      CommandPaletteManager.instance = new CommandPaletteManager();
    }
    return CommandPaletteManager.instance;
  }

  // === Palette State ===

  /**
   * Open the command palette
   */
  open(mode: PaletteMode = "commands"): void {
    this.isOpen = true;
    this.mode = mode;
    this.notifyOpenListeners();
  }

  /**
   * Close the command palette
   */
  close(): void {
    this.isOpen = false;
    this.notifyOpenListeners();
  }

  /**
   * Toggle the command palette
   */
  toggle(mode: PaletteMode = "commands"): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(mode);
    }
  }

  /**
   * Check if palette is open
   */
  getIsOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Get current mode
   */
  getMode(): PaletteMode {
    return this.mode;
  }

  /**
   * Set mode
   */
  setMode(mode: PaletteMode): void {
    this.mode = mode;
  }

  /**
   * Subscribe to open state changes
   */
  onOpenChange(listener: (isOpen: boolean) => void): () => void {
    this.openListeners.add(listener);
    return () => this.openListeners.delete(listener);
  }

  private notifyOpenListeners(): void {
    for (const listener of this.openListeners) {
      listener(this.isOpen);
    }
  }

  // === Command Registry Delegation ===

  /**
   * Register a command
   */
  registerCommand(command: Command, priority = 0): void {
    commandRegistry.register(command, priority);
  }

  /**
   * Unregister a command
   */
  unregisterCommand(id: string): void {
    commandRegistry.unregister(id);
  }

  /**
   * Get a command by ID
   */
  getCommand(id: string): Command | undefined {
    return commandRegistry.get(id);
  }

  /**
   * Get all commands
   */
  getAllCommands(category?: CommandCategory): Command[] {
    return commandRegistry.getAll(category);
  }

  /**
   * Search commands
   */
  searchCommands(query: string, limit = 20): Command[] {
    return commandRegistry.search(query, limit).map(result => result.command);
  }

  /**
   * Execute a command
   */
  async executeCommand(id: string): Promise<boolean> {
    return commandRegistry.execute(id);
  }

  // === Keyboard Shortcuts ===

  /**
   * Setup global keyboard shortcuts
   */
  setupKeyboardShortcuts(): () => void {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+P or Cmd+P - Open command palette
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        this.toggle("commands");
      }

      // @ at start of input - File mode
      // (handled by input component)

      // Escape - Close palette
      if (e.key === "Escape" && this.isOpen) {
        e.preventDefault();
        this.close();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }

  // === Skill Commands ===

  /**
   * Register skill commands from discovered skills
   */
  registerSkillCommands(
    skills: Array<{ name: string; description: string }>,
    executeSkill: (name: string) => void
  ): void {
    for (const skill of skills) {
      commandRegistry.register({
        id: `skill.${skill.name}`,
        label: `/${skill.name}`,
        description: skill.description,
        category: "skill",
        keywords: [skill.name, "skill", "command"],
        action: () => executeSkill(skill.name),
      });
    }
  }

  /**
   * Unregister all skill commands
   */
  unregisterSkillCommands(): void {
    const commands = commandRegistry.getAll("skill");
    for (const command of commands) {
      commandRegistry.unregister(command.id);
    }
  }

  // === File References ===

  /**
   * Get file suggestions for @-autocomplete
   */
  getFileSuggestions(
    query: string,
    recentFiles: string[],
    allFiles: string[],
    limit = 10
  ): FileReference[] {
    const lowerQuery = query.toLowerCase();
    const results: FileReference[] = [];
    const seen = new Set<string>();

    // Helper to add file
    const addFile = (path: string, isRecent: boolean) => {
      if (seen.has(path)) return;
      seen.add(path);

      const name = path.split(/[/\\]/).pop() || path;
      if (name.toLowerCase().includes(lowerQuery) || path.toLowerCase().includes(lowerQuery)) {
        results.push({
          path,
          relativePath: path,
          name,
          isRecent,
        });
      }
    };

    // Recent files first
    for (const file of recentFiles) {
      addFile(file, true);
      if (results.length >= limit) break;
    }

    // Then other files
    if (results.length < limit) {
      for (const file of allFiles) {
        addFile(file, false);
        if (results.length >= limit) break;
      }
    }

    return results;
  }
}

/**
 * Get the CommandPaletteManager singleton
 */
export function getCommandPaletteManager(): CommandPaletteManager {
  return CommandPaletteManager.getInstance();
}

// Re-export
export { commandRegistry, registerDefaultCommands };
export type {
  Command,
  CommandCategory,
  FileReference,
  PaletteMode,
  CommandPaletteState,
} from "./types";
