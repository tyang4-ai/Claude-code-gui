/**
 * Session Persistence Service
 *
 * Handles saving and restoring sessions to/from disk.
 * Sessions are stored in ~/.claude-companion/sessions/
 */

import { invoke } from "@tauri-apps/api/core";
import type { Session, TranscriptEntry } from "../types";

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
      this.sessionsDir = `${homeDir}/.claude-companion/sessions`;

      // Ensure directory exists
      await invoke("ensure_dir", { path: this.sessionsDir }).catch(() => {
        // Command might not exist, try alternative
        console.debug("ensure_dir not available, sessions will be created on first save");
      });
    } catch (error) {
      console.error("Failed to initialize session storage:", error);
      // Fallback to temp directory
      this.sessionsDir = "./sessions";
    }
  }

  private async getHomeDir(): Promise<string> {
    try {
      return await invoke<string>("get_home_dir");
    } catch {
      // Fallback - use Tauri API to get home directory
      return "";
    }
  }

  /**
   * Save a session to disk
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
    };

    const path = `${this.sessionsDir}/${session.id}.json`;
    const content = JSON.stringify(persisted, null, 2);

    try {
      await invoke("write_file_atomic", { path, content });
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
      const content = await invoke<string>("read_file", { path });
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
      const files = await invoke<string[]>("list_files", {
        path: this.sessionsDir,
        pattern: "*.json",
      });

      for (const file of files) {
        try {
          const content = await invoke<string>("read_file", { path: file });
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
      await invoke("delete_file", { path });
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
      const files = await invoke<string[]>("list_files", {
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
}

/**
 * Get the SessionStorage singleton instance
 */
export function getSessionStorage(): SessionStorage {
  return SessionStorage.getInstance();
}
