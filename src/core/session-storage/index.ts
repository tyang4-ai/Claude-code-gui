/**
 * Session Persistence Service
 *
 * Handles saving and restoring sessions to/from disk.
 * Sessions are stored in ~/.claude-companion/sessions/
 */

import type { Session, TranscriptEntry } from "../types";

// Helper to dynamically import invoke
async function invokeCmd<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

// Persisted session format (what we save to disk)
interface PersistedSession {
  id: string;
  claude_session_id?: string;
  working_dir: string;
  model: string;
  created_at: number;
  last_accessed: number;
  prompt_count: number;
  total_cost_usd: number;
  transcript: TranscriptEntry[];
  displayName?: string; // Custom user-defined name for the session
  cleanShutdown?: boolean; // false = potential crash, true = clean exit
}

// Singleton instance
let storageInstance: SessionStorage | null = null;

export class SessionStorage {
  private sessionsDir: string | null = null;
  private saveQueue: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private saveDebounceMs = 5000;

  static getInstance(): SessionStorage {
    if (!storageInstance) {
      storageInstance = new SessionStorage();
    }
    return storageInstance;
  }

  /**
   * Initialize the storage service
   */
  async initialize(): Promise<void> {
    if (this.sessionsDir) return;

    try {
      const homeDir = await this.getHomeDir();
      if (homeDir) {
        this.sessionsDir = `${homeDir}/.claude-companion/sessions`;
      } else {
        this.sessionsDir = "./.claude-companion/sessions";
      }

      // Ensure directory exists
      try {
        await invokeCmd("ensure_dir", { path: this.sessionsDir });
      } catch (e) {
        console.debug("ensure_dir failed, will create on first save:", e);
      }
    } catch (error) {
      console.error("Failed to initialize session storage:", error);
      // Fallback to local directory
      this.sessionsDir = "./.claude-companion/sessions";
    }
  }

  private async getHomeDir(): Promise<string> {
    try {
      return await invokeCmd<string>("get_home_dir");
    } catch {
      // Fallback - use Tauri API to get home directory
      return "";
    }
  }

  /**
   * Save a session to disk
   * Note: cleanShutdown is set to false on every save; call markCleanShutdown()
   * on clean exit to mark it as cleanly shut down.
   */
  async saveSession(session: Session): Promise<void> {
    if (!this.sessionsDir) {
      await this.initialize();
    }

    const persisted: PersistedSession = {
      id: session.id,
      claude_session_id: session.claude_session_id,
      working_dir: session.working_dir,
      model: session.model,
      created_at: session.created_at,
      last_accessed: Date.now(),
      prompt_count: session.prompt_count,
      total_cost_usd: session.total_cost_usd,
      transcript: session.transcript,
      displayName: session.displayName,
      cleanShutdown: false, // Always save as potentially unclean
    };

    const path = `${this.sessionsDir}/${session.id}.json`;
    const content = JSON.stringify(persisted, null, 2);

    try {
      await invokeCmd("write_file_atomic", { path, content });
    } catch (error) {
      console.error(`Failed to save session ${session.id}:`, error);
    }
  }

  /**
   * Save a session with debouncing (for auto-save)
   */
  saveSessionDebounced(session: Session): void {
    // Cancel any pending save for this session
    const existing = this.saveQueue.get(session.id);
    if (existing) {
      clearTimeout(existing);
    }

    // Schedule new save
    const timeout = setTimeout(() => {
      this.saveSession(session);
      this.saveQueue.delete(session.id);
    }, this.saveDebounceMs);

    this.saveQueue.set(session.id, timeout);
  }

  /**
   * Load a specific session from disk
   */
  async loadSession(sessionId: string): Promise<Session | null> {
    if (!this.sessionsDir) {
      await this.initialize();
    }

    const path = `${this.sessionsDir}/${sessionId}.json`;

    try {
      const content = await invokeCmd<string>("read_file", { path });
      const persisted: PersistedSession = JSON.parse(content);

      return {
        id: persisted.id,
        claude_session_id: persisted.claude_session_id,
        working_dir: persisted.working_dir,
        model: persisted.model,
        created_at: persisted.created_at,
        status: "idle",
        prompt_count: persisted.prompt_count || 0,
        total_cost_usd: persisted.total_cost_usd || 0,
        transcript: persisted.transcript,
        pendingEdits: [],
        displayName: persisted.displayName,
      };
    } catch (error) {
      console.warn(`Failed to load session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Load all persisted sessions
   */
  async loadAllSessions(): Promise<Session[]> {
    if (!this.sessionsDir) {
      await this.initialize();
    }

    const sessions: Session[] = [];

    try {
      const files = await invokeCmd<string[]>("list_files", {
        path: this.sessionsDir,
        pattern: "*.json",
      });

      for (const file of files) {
        try {
          const content = await invokeCmd<string>("read_file", { path: file });
          const persisted: PersistedSession = JSON.parse(content);

          sessions.push({
            id: persisted.id,
            claude_session_id: persisted.claude_session_id,
            working_dir: persisted.working_dir,
            model: persisted.model,
            created_at: persisted.created_at,
            status: "idle",
            prompt_count: persisted.prompt_count || 0,
            total_cost_usd: persisted.total_cost_usd || 0,
            transcript: persisted.transcript,
            pendingEdits: [],
            displayName: persisted.displayName,
          });
        } catch (error) {
          console.warn(`Failed to load session from ${file}:`, error);
        }
      }
    } catch (error) {
      console.debug("No persisted sessions found:", error);
    }

    // Sort by last accessed (most recent first)
    sessions.sort((a, b) => b.created_at - a.created_at);

    return sessions;
  }

  /**
   * Delete a session from disk
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (!this.sessionsDir) {
      await this.initialize();
    }

    // Cancel any pending save
    const pending = this.saveQueue.get(sessionId);
    if (pending) {
      clearTimeout(pending);
      this.saveQueue.delete(sessionId);
    }

    const path = `${this.sessionsDir}/${sessionId}.json`;

    try {
      await invokeCmd("delete_file", { path });
    } catch (error) {
      console.warn(`Failed to delete session ${sessionId}:`, error);
    }
  }

  /**
   * Get list of session IDs without loading full content
   */
  async getSessionIds(): Promise<string[]> {
    if (!this.sessionsDir) {
      await this.initialize();
    }

    try {
      const files = await invokeCmd<string[]>("list_files", {
        path: this.sessionsDir,
        pattern: "*.json",
      });

      return files.map((f) => {
        const filename = f.split(/[/\\]/).pop() || "";
        return filename.replace(/\.json$/, "");
      });
    } catch {
      return [];
    }
  }

  /**
   * Flush all pending saves immediately
   */
  async flushPendingSaves(): Promise<void> {
    const pendingSessionIds = Array.from(this.saveQueue.keys());

    for (const sessionId of pendingSessionIds) {
      const timeout = this.saveQueue.get(sessionId);
      if (timeout) {
        clearTimeout(timeout);
        this.saveQueue.delete(sessionId);
      }
    }

    // Note: We can't actually save here because we don't have the session data
    // The caller should ensure sessions are saved before calling this
  }

  /**
   * Set the debounce time for auto-save
   */
  setDebounceTime(ms: number): void {
    this.saveDebounceMs = ms;
  }

  /**
   * Mark a session as cleanly shut down
   * Call this on clean application exit for all active sessions
   */
  async markCleanShutdown(sessionId: string): Promise<void> {
    if (!this.sessionsDir) {
      await this.initialize();
    }

    const path = `${this.sessionsDir}/${sessionId}.json`;

    try {
      const content = await invokeCmd<string>("read_file", { path });
      const persisted: PersistedSession = JSON.parse(content);
      persisted.cleanShutdown = true;

      const updatedContent = JSON.stringify(persisted, null, 2);
      await invokeCmd("write_file_atomic", { path, content: updatedContent });
    } catch (error) {
      console.warn(`Failed to mark session ${sessionId} as clean shutdown:`, error);
    }
  }

  /**
   * Mark all persisted sessions as cleanly shut down
   */
  async markAllCleanShutdown(): Promise<void> {
    const sessionIds = await this.getSessionIds();
    await Promise.all(sessionIds.map(id => this.markCleanShutdown(id)));
  }

  /**
   * Detect sessions that were not cleanly shut down (potential crash recovery)
   * Returns sessions where cleanShutdown is false or undefined
   */
  async detectCrashedSessions(): Promise<Session[]> {
    if (!this.sessionsDir) {
      await this.initialize();
    }

    const crashedSessions: Session[] = [];

    try {
      const files = await invokeCmd<string[]>("list_files", {
        path: this.sessionsDir,
        pattern: "*.json",
      });

      for (const file of files) {
        try {
          const content = await invokeCmd<string>("read_file", { path: file });
          const persisted: PersistedSession = JSON.parse(content);

          // Check if session was not cleanly shut down
          if (!persisted.cleanShutdown) {
            crashedSessions.push({
              id: persisted.id,
              claude_session_id: persisted.claude_session_id,
              working_dir: persisted.working_dir,
              model: persisted.model,
              created_at: persisted.created_at,
              status: "idle",
              prompt_count: persisted.prompt_count || 0,
              total_cost_usd: persisted.total_cost_usd || 0,
              transcript: persisted.transcript,
              pendingEdits: [],
              displayName: persisted.displayName,
            });
          }
        } catch (error) {
          console.warn(`Failed to check session from ${file}:`, error);
        }
      }
    } catch (error) {
      console.debug("No persisted sessions to check for crashes:", error);
    }

    // Sort by last accessed (most recent first based on created_at)
    crashedSessions.sort((a, b) => b.created_at - a.created_at);

    return crashedSessions;
  }
}

/**
 * Get the SessionStorage singleton instance
 */
export function getSessionStorage(): SessionStorage {
  return SessionStorage.getInstance();
}
