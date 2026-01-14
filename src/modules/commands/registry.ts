/**
 * Command Registry
 *
 * Central registry for all commands available in the palette.
 */

import type { Command, CommandCategory, CommandRegistration } from "./types";
import { fuzzySearchMultiField, type FuzzyMatch } from "./fuzzy-search";

/**
 * Recent command tracking
 */
interface RecentCommandData {
  commandId: string;
  lastUsed: number;
  useCount: number;
}

/**
 * Command Registry - manages all available commands
 */
class CommandRegistry {
  private commands: Map<string, CommandRegistration> = new Map();
  private listeners: Set<() => void> = new Set();
  private recentCommands: Map<string, RecentCommandData> = new Map();
  private readonly MAX_RECENT = 10;

  /**
   * Register a command
   */
  register(command: Command, priority = 0): void {
    this.commands.set(command.id, { command, priority });
    this.notifyListeners();
  }

  /**
   * Register multiple commands
   */
  registerAll(commands: Array<{ command: Command; priority?: number }>): void {
    for (const { command, priority = 0 } of commands) {
      this.commands.set(command.id, { command, priority });
    }
    this.notifyListeners();
  }

  /**
   * Unregister a command
   */
  unregister(id: string): void {
    this.commands.delete(id);
    this.notifyListeners();
  }

  /**
   * Get a command by ID
   */
  get(id: string): Command | undefined {
    return this.commands.get(id)?.command;
  }

  /**
   * Get all commands, optionally filtered by category
   */
  getAll(category?: CommandCategory): Command[] {
    let registrations = Array.from(this.commands.values());

    if (category) {
      registrations = registrations.filter((r) => r.command.category === category);
    }

    // Sort by priority (descending) then by label
    registrations.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.command.label.localeCompare(b.command.label);
    });

    return registrations.map((r) => r.command);
  }

  /**
   * Search commands by query using fuzzy matching
   */
  search(query: string, limit = 20): Array<{ command: Command; match: FuzzyMatch }> {
    const allCommands = Array.from(this.commands.values())
      .map((r) => r.command)
      .filter((cmd) => !cmd.enabled || cmd.enabled());

    if (!query.trim()) {
      return allCommands.slice(0, limit).map((command) => ({
        command,
        match: {
          target: command.label,
          score: 1,
          matchedIndices: [],
        },
      }));
    }

    // Use fuzzy search across multiple fields
    const results = fuzzySearchMultiField(
      query,
      allCommands,
      [
        (cmd) => cmd.label,
        (cmd) => cmd.description || "",
        (cmd) => cmd.keywords?.join(" ") || "",
        (cmd) => cmd.category,
      ],
      limit
    );

    return results.map((r) => ({
      command: r.item,
      match: r.match,
    }));
  }

  /**
   * Execute a command by ID
   */
  async execute(id: string): Promise<boolean> {
    const command = this.get(id);
    if (!command) return false;

    if (command.enabled && !command.enabled()) {
      return false;
    }

    try {
      await command.action();
      this.trackRecentCommand(id);
      return true;
    } catch (e) {
      console.error(`Command ${id} failed:`, e);
      return false;
    }
  }

  /**
   * Track a command as recently used
   */
  private trackRecentCommand(id: string): void {
    const existing = this.recentCommands.get(id);

    if (existing) {
      existing.lastUsed = Date.now();
      existing.useCount++;
    } else {
      this.recentCommands.set(id, {
        commandId: id,
        lastUsed: Date.now(),
        useCount: 1,
      });
    }

    // Keep only MAX_RECENT items
    if (this.recentCommands.size > this.MAX_RECENT) {
      const sorted = Array.from(this.recentCommands.values()).sort(
        (a, b) => b.lastUsed - a.lastUsed
      );

      this.recentCommands.clear();
      for (let i = 0; i < this.MAX_RECENT; i++) {
        this.recentCommands.set(sorted[i].commandId, sorted[i]);
      }
    }

    // Persist to localStorage
    this.persistRecentCommands();
  }

  /**
   * Get recent commands
   */
  getRecentCommands(): Command[] {
    const recent = Array.from(this.recentCommands.values())
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .map((r) => this.get(r.commandId))
      .filter((cmd): cmd is Command => cmd !== undefined);

    return recent;
  }

  /**
   * Persist recent commands to localStorage
   */
  private persistRecentCommands(): void {
    try {
      const data = Array.from(this.recentCommands.values());
      localStorage.setItem("command-palette-recent", JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to persist recent commands:", e);
    }
  }

  /**
   * Load recent commands from localStorage
   */
  loadRecentCommands(): void {
    try {
      const data = localStorage.getItem("command-palette-recent");
      if (data) {
        const recent: RecentCommandData[] = JSON.parse(data);
        this.recentCommands.clear();
        for (const item of recent) {
          this.recentCommands.set(item.commandId, item);
        }
      }
    } catch (e) {
      console.warn("Failed to load recent commands:", e);
    }
  }

  /**
   * Subscribe to registry changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners of changes
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  /**
   * Get command count
   */
  count(): number {
    return this.commands.size;
  }

  /**
   * Clear all commands
   */
  clear(): void {
    this.commands.clear();
    this.notifyListeners();
  }
}

// Singleton instance
export const commandRegistry = new CommandRegistry();

/**
 * Register default commands
 */
export function registerDefaultCommands(handlers: {
  newSession: () => void;
  closeSession: () => void;
  showSettings: () => void;
  showUsage: () => void;
  showHistory: () => void;
  toggleYoloMode: () => void;
  clearChat: () => void;
  interruptSession: () => void;
  showHelp: () => void;
}): void {
  commandRegistry.registerAll([
    // Session commands
    {
      command: {
        id: "session.new",
        label: "New Session",
        description: "Start a new Claude session",
        category: "session",
        shortcut: "Ctrl+N",
        icon: "plus",
        action: handlers.newSession,
      },
      priority: 100,
    },
    {
      command: {
        id: "session.close",
        label: "Close Session",
        description: "Close the current session",
        category: "session",
        shortcut: "Ctrl+W",
        icon: "x",
        action: handlers.closeSession,
      },
      priority: 90,
    },
    {
      command: {
        id: "session.interrupt",
        label: "Interrupt",
        description: "Stop Claude's current response",
        category: "session",
        shortcut: "Escape",
        icon: "stop",
        keywords: ["stop", "cancel", "abort"],
        action: handlers.interruptSession,
      },
      priority: 85,
    },
    {
      command: {
        id: "session.clear",
        label: "Clear Chat",
        description: "Clear the current conversation",
        category: "session",
        icon: "trash",
        action: handlers.clearChat,
      },
      priority: 80,
    },

    // Navigation commands
    {
      command: {
        id: "nav.history",
        label: "Session History",
        description: "Browse previous sessions",
        category: "navigation",
        icon: "history",
        keywords: ["sessions", "past", "previous"],
        action: handlers.showHistory,
      },
      priority: 70,
    },
    {
      command: {
        id: "nav.usage",
        label: "Usage Dashboard",
        description: "View API usage and costs",
        category: "navigation",
        icon: "chart",
        keywords: ["cost", "spending", "tokens", "budget"],
        action: handlers.showUsage,
      },
      priority: 60,
    },

    // Settings commands
    {
      command: {
        id: "settings.open",
        label: "Settings",
        description: "Open application settings",
        category: "settings",
        shortcut: "Ctrl+,",
        icon: "cog",
        keywords: ["preferences", "config", "options"],
        action: handlers.showSettings,
      },
      priority: 50,
    },
    {
      command: {
        id: "settings.yolo",
        label: "Toggle YOLO Mode",
        description: "Auto-accept all file edits",
        category: "settings",
        icon: "bolt",
        keywords: ["auto", "accept", "trust"],
        action: handlers.toggleYoloMode,
      },
      priority: 40,
    },

    // Help commands
    {
      command: {
        id: "help.show",
        label: "Help",
        description: "Show help and documentation",
        category: "help",
        shortcut: "F1",
        icon: "question",
        keywords: ["docs", "documentation", "guide"],
        action: handlers.showHelp,
      },
      priority: 30,
    },
  ]);
}
