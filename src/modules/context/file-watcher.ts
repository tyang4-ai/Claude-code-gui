/**
 * File Watcher Module
 *
 * Watches CLAUDE.md and other configuration files for changes
 * and triggers reload callbacks.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type WatchCallback = (path: string, content: string) => void;
export type WatchErrorCallback = (path: string, error: Error) => void;

/**
 * File watcher for detecting changes to context files
 */
export class FileWatcher {
  private watchers: Map<string, UnlistenFn> = new Map();
  private pollingIntervals: Map<string, number> = new Map();
  private lastModified: Map<string, number> = new Map();
  private callbacks: Map<string, WatchCallback[]> = new Map();
  private errorCallbacks: Map<string, WatchErrorCallback[]> = new Map();

  /**
   * Watch a file for changes
   */
  async watch(
    path: string,
    callback: WatchCallback,
    errorCallback?: WatchErrorCallback
  ): Promise<void> {
    // Normalize path
    const normalizedPath = path.replace(/\\/g, "/");

    // Add callbacks
    if (!this.callbacks.has(normalizedPath)) {
      this.callbacks.set(normalizedPath, []);
    }
    this.callbacks.get(normalizedPath)!.push(callback);

    if (errorCallback) {
      if (!this.errorCallbacks.has(normalizedPath)) {
        this.errorCallbacks.set(normalizedPath, []);
      }
      this.errorCallbacks.get(normalizedPath)!.push(errorCallback);
    }

    // If already watching, don't start a new watcher
    if (this.watchers.has(normalizedPath)) {
      return;
    }

    // Try to use Tauri file system events if available
    try {
      const unlisten = await this.setupTauriWatcher(normalizedPath);
      if (unlisten) {
        this.watchers.set(normalizedPath, unlisten);
        return;
      }
    } catch (error) {
      console.warn("Tauri watcher unavailable, falling back to polling:", error);
    }

    // Fall back to polling
    await this.setupPollingWatcher(normalizedPath);
  }

  /**
   * Unwatch a file
   */
  async unwatch(path: string): Promise<void> {
    const normalizedPath = path.replace(/\\/g, "/");

    // Remove Tauri watcher
    const unlisten = this.watchers.get(normalizedPath);
    if (unlisten) {
      unlisten();
      this.watchers.delete(normalizedPath);
    }

    // Remove polling
    const interval = this.pollingIntervals.get(normalizedPath);
    if (interval !== undefined) {
      clearInterval(interval);
      this.pollingIntervals.delete(normalizedPath);
    }

    // Clean up state
    this.callbacks.delete(normalizedPath);
    this.errorCallbacks.delete(normalizedPath);
    this.lastModified.delete(normalizedPath);
  }

  /**
   * Unwatch all files
   */
  async unwatchAll(): Promise<void> {
    const paths = Array.from(this.watchers.keys());
    await Promise.all(paths.map((path) => this.unwatch(path)));
  }

  /**
   * Check if a file is being watched
   */
  isWatching(path: string): boolean {
    const normalizedPath = path.replace(/\\/g, "/");
    return (
      this.watchers.has(normalizedPath) ||
      this.pollingIntervals.has(normalizedPath)
    );
  }

  /**
   * Get all watched paths
   */
  getWatchedPaths(): string[] {
    return Array.from(
      new Set([
        ...this.watchers.keys(),
        ...this.pollingIntervals.keys(),
      ])
    );
  }

  /**
   * Manually trigger a check for file changes
   */
  async checkForChanges(path: string): Promise<void> {
    const normalizedPath = path.replace(/\\/g, "/");
    await this.pollFile(normalizedPath);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Set up Tauri-based file watcher (if available)
   */
  private async setupTauriWatcher(path: string): Promise<UnlistenFn | null> {
    try {
      // Listen for file change events from Tauri
      const unlisten = await listen<{ path: string }>(
        "file-changed",
        async (event) => {
          if (event.payload.path === path) {
            await this.handleFileChange(path);
          }
        }
      );

      return unlisten;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set up polling-based file watcher (fallback)
   */
  private async setupPollingWatcher(path: string): Promise<void> {
    // Get initial modified time
    try {
      const metadata = await invoke<{ modified: number }>("get_file_metadata", {
        path,
      });
      this.lastModified.set(path, metadata.modified);
    } catch (error) {
      // File might not exist yet
      this.lastModified.set(path, 0);
    }

    // Poll every 2 seconds
    const interval = setInterval(() => {
      this.pollFile(path);
    }, 2000);

    this.pollingIntervals.set(path, interval as unknown as number);
  }

  /**
   * Poll a file for changes
   */
  private async pollFile(path: string): Promise<void> {
    try {
      const metadata = await invoke<{ modified: number }>("get_file_metadata", {
        path,
      });

      const lastMod = this.lastModified.get(path) || 0;

      if (metadata.modified > lastMod) {
        this.lastModified.set(path, metadata.modified);
        await this.handleFileChange(path);
      }
    } catch (error) {
      // File might have been deleted or is inaccessible
      const callbacks = this.errorCallbacks.get(path) || [];
      for (const callback of callbacks) {
        callback(path, error as Error);
      }
    }
  }

  /**
   * Handle file change by reading content and notifying callbacks
   */
  private async handleFileChange(path: string): Promise<void> {
    try {
      const result = await invoke<{ content: string }>("read_file", { path });
      const callbacks = this.callbacks.get(path) || [];

      for (const callback of callbacks) {
        callback(path, result.content);
      }
    } catch (error) {
      const errorCallbacks = this.errorCallbacks.get(path) || [];
      for (const callback of errorCallbacks) {
        callback(path, error as Error);
      }
    }
  }
}

/**
 * Global file watcher instance
 */
let fileWatcherInstance: FileWatcher | null = null;

/**
 * Get the global file watcher instance
 */
export function getFileWatcher(): FileWatcher {
  if (!fileWatcherInstance) {
    fileWatcherInstance = new FileWatcher();
  }
  return fileWatcherInstance;
}

/**
 * Clean up the global file watcher
 */
export async function cleanupFileWatcher(): Promise<void> {
  if (fileWatcherInstance) {
    await fileWatcherInstance.unwatchAll();
    fileWatcherInstance = null;
  }
}
