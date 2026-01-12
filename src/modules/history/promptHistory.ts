/**
 * Prompt History
 *
 * Tracks individual prompts for autocomplete and reuse.
 * Separate from session history - just the prompts themselves.
 */

import { invoke } from "@tauri-apps/api/core";
import type { PromptHistoryEntry, PromptHistoryData } from "./types";

const STORAGE_VERSION = 1;
const HISTORY_FILENAME = "prompt-history.json";
const DEFAULT_MAX_ENTRIES = 500;

/**
 * Get the prompt history file path
 */
async function getHistoryPath(): Promise<string> {
  const appDataDir = await invoke<string>("get_app_data_dir");
  const normalized = appDataDir.replace(/\\/g, "/");
  return `${normalized}/${HISTORY_FILENAME}`;
}

/**
 * Prompt History Manager
 */
class PromptHistoryManager {
  private entries: PromptHistoryEntry[] = [];
  private maxEntries = DEFAULT_MAX_ENTRIES;
  private loaded = false;
  private storagePath: string | null = null;

  /**
   * Load history from storage
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      this.storagePath = await getHistoryPath();

      const exists = await invoke<boolean>("file_exists", { path: this.storagePath });
      if (!exists) {
        this.loaded = true;
        return;
      }

      const result = await invoke<{ content: string }>("read_file", {
        path: this.storagePath,
      });
      const data: PromptHistoryData = JSON.parse(result.content);

      this.entries = data.entries;
      this.maxEntries = data.maxEntries || DEFAULT_MAX_ENTRIES;
      this.loaded = true;
    } catch (e) {
      console.error("Failed to load prompt history:", e);
      this.loaded = true;
    }
  }

  /**
   * Save history to storage
   */
  async save(): Promise<void> {
    if (!this.storagePath) {
      this.storagePath = await getHistoryPath();
    }

    // Keep only maxEntries most recent
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    const data: PromptHistoryData = {
      version: STORAGE_VERSION,
      entries: this.entries,
      maxEntries: this.maxEntries,
    };

    await invoke("write_file_atomic", {
      path: this.storagePath,
      content: JSON.stringify(data, null, 2),
    });
  }

  /**
   * Add a prompt to history
   */
  async addPrompt(
    prompt: string,
    workingDir: string,
    options?: { sessionId?: string; templateId?: string }
  ): Promise<void> {
    await this.load();

    // Deduplicate - if same prompt exists recently, don't add again
    const recent = this.entries.slice(-10);
    if (recent.some((e) => e.prompt === prompt)) {
      return;
    }

    const entry: PromptHistoryEntry = {
      id: crypto.randomUUID(),
      prompt,
      sessionId: options?.sessionId,
      templateId: options?.templateId,
      timestamp: Date.now(),
      workingDir,
    };

    this.entries.push(entry);
    await this.save();
  }

  /**
   * Get recent prompts
   */
  async getRecent(limit = 20): Promise<PromptHistoryEntry[]> {
    await this.load();
    return this.entries.slice(-limit).reverse();
  }

  /**
   * Search prompts
   */
  async search(query: string, limit = 20): Promise<PromptHistoryEntry[]> {
    await this.load();

    const lowerQuery = query.toLowerCase();
    return this.entries
      .filter((e) => e.prompt.toLowerCase().includes(lowerQuery))
      .slice(-limit)
      .reverse();
  }

  /**
   * Get prompts for a specific project
   */
  async getByProject(workingDir: string, limit = 20): Promise<PromptHistoryEntry[]> {
    await this.load();

    return this.entries
      .filter((e) => e.workingDir === workingDir)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get autocomplete suggestions for a prefix
   */
  async getSuggestions(prefix: string, limit = 5): Promise<string[]> {
    await this.load();

    const lowerPrefix = prefix.toLowerCase();
    const matches = this.entries
      .filter((e) => e.prompt.toLowerCase().startsWith(lowerPrefix))
      .map((e) => e.prompt);

    // Deduplicate and return most recent
    return [...new Set(matches)].slice(-limit).reverse();
  }

  /**
   * Clear all history
   */
  async clear(): Promise<void> {
    this.entries = [];
    await this.save();
  }

  /**
   * Get entry count
   */
  async count(): Promise<number> {
    await this.load();
    return this.entries.length;
  }

  /**
   * Set max entries
   */
  async setMaxEntries(max: number): Promise<void> {
    this.maxEntries = max;
    await this.save();
  }

  /**
   * Delete a specific entry
   */
  async deleteEntry(id: string): Promise<boolean> {
    await this.load();

    const index = this.entries.findIndex((e) => e.id === id);
    if (index !== -1) {
      this.entries.splice(index, 1);
      await this.save();
      return true;
    }
    return false;
  }
}

// Singleton instance
export const promptHistory = new PromptHistoryManager();
