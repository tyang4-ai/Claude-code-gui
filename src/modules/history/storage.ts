/**
 * Session History Storage
 *
 * Persists sessions to disk for browsing and resume functionality.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  PersistedSession,
  SessionSummary,
  SessionSearchOptions,
  SessionStorageData,
} from "./types";
import type { Session, TranscriptEntry } from "../../core/types";

const STORAGE_VERSION = 1;
const SESSIONS_FILENAME = "sessions.json";
const MAX_SESSIONS = 1000; // Keep last 1000 sessions

/**
 * Get the sessions storage file path
 */
async function getSessionsPath(): Promise<string> {
  const appDataDir = await invoke<string>("get_app_data_dir");
  const normalized = appDataDir.replace(/\\/g, "/");
  return `${normalized}/${SESSIONS_FILENAME}`;
}

/**
 * Session History Storage Manager
 */
class SessionHistoryStorage {
  private sessions: Map<string, PersistedSession> = new Map();
  private loaded = false;
  private storagePath: string | null = null;

  /**
   * Load sessions from storage
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      this.storagePath = await getSessionsPath();

      const exists = await invoke<boolean>("file_exists", { path: this.storagePath });
      if (!exists) {
        this.loaded = true;
        return;
      }

      const result = await invoke<{ content: string }>("read_file", {
        path: this.storagePath,
      });
      const data: SessionStorageData = JSON.parse(result.content);

      for (const session of data.sessions) {
        this.sessions.set(session.id, session);
      }

      this.loaded = true;
    } catch (e) {
      console.error("Failed to load sessions:", e);
      this.loaded = true;
    }
  }

  /**
   * Save sessions to storage
   */
  async save(): Promise<void> {
    if (!this.storagePath) {
      this.storagePath = await getSessionsPath();
    }

    // Sort by updatedAt descending and limit to MAX_SESSIONS
    const sortedSessions = Array.from(this.sessions.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_SESSIONS);

    // Update the map to only contain kept sessions
    this.sessions.clear();
    for (const session of sortedSessions) {
      this.sessions.set(session.id, session);
    }

    const data: SessionStorageData = {
      version: STORAGE_VERSION,
      sessions: sortedSessions,
    };

    await invoke("write_file_atomic", {
      path: this.storagePath,
      content: JSON.stringify(data, null, 2),
    });
  }

  /**
   * Save or update a session
   */
  async saveSession(session: Session): Promise<void> {
    await this.load();

    const existing = this.sessions.get(session.id);
    const now = Date.now();

    const persisted: PersistedSession = {
      id: session.id,
      claudeSessionId: session.claude_session_id,
      title: existing?.title || this.generateTitle(session),
      workingDir: session.working_dir,
      model: session.model,
      status: session.status,
      createdAt: existing?.createdAt || session.created_at || now,
      updatedAt: now,
      promptCount: session.prompt_count,
      totalCostUsd: session.total_cost_usd,
      transcript: session.transcript,
      isPinned: existing?.isPinned || false,
      tags: existing?.tags || [],
    };

    this.sessions.set(session.id, persisted);
    await this.save();
  }

  /**
   * Generate a title from the session
   */
  private generateTitle(session: Session): string {
    // Try to get first user prompt
    const firstUserEntry = session.transcript.find((e) => e.role === "user");
    if (firstUserEntry && firstUserEntry.role === "user") {
      const content = firstUserEntry.content;
      // Truncate to 50 chars
      return content.length > 50 ? content.slice(0, 47) + "..." : content;
    }

    // Fallback to project name
    const projectName = session.working_dir.split(/[/\\]/).pop() || "Session";
    return `${projectName} - ${new Date(session.created_at).toLocaleDateString()}`;
  }

  /**
   * Get a session by ID
   */
  async getSession(id: string): Promise<PersistedSession | null> {
    await this.load();
    return this.sessions.get(id) || null;
  }

  /**
   * Get all session summaries
   */
  async getAllSummaries(options?: SessionSearchOptions): Promise<SessionSummary[]> {
    await this.load();

    let sessions = Array.from(this.sessions.values());

    // Apply filters
    if (options?.query) {
      const lowerQuery = options.query.toLowerCase();
      sessions = sessions.filter(
        (s) =>
          s.title.toLowerCase().includes(lowerQuery) ||
          this.transcriptContains(s.transcript, lowerQuery)
      );
    }

    if (options?.workingDir) {
      sessions = sessions.filter((s) => s.workingDir === options.workingDir);
    }

    if (options?.tags && options.tags.length > 0) {
      sessions = sessions.filter((s) =>
        options.tags!.some((tag) => s.tags.includes(tag))
      );
    }

    if (options?.startDate) {
      sessions = sessions.filter((s) => s.createdAt >= options.startDate!);
    }

    if (options?.endDate) {
      sessions = sessions.filter((s) => s.createdAt <= options.endDate!);
    }

    if (options?.pinnedOnly) {
      sessions = sessions.filter((s) => s.isPinned);
    }

    // Sort: pinned first, then by updatedAt descending
    sessions.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return b.updatedAt - a.updatedAt;
    });

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    sessions = sessions.slice(offset, offset + limit);

    // Convert to summaries
    return sessions.map((s) => this.toSummary(s));
  }

  /**
   * Check if transcript contains query text
   */
  private transcriptContains(transcript: TranscriptEntry[], query: string): boolean {
    for (const entry of transcript) {
      if (entry.role === "user") {
        if (entry.content.toLowerCase().includes(query)) {
          return true;
        }
      } else if (entry.role === "assistant") {
        for (const block of entry.content) {
          if (block.type === "text" && block.text.toLowerCase().includes(query)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Convert persisted session to summary
   */
  private toSummary(session: PersistedSession): SessionSummary {
    // Get preview text from first assistant response
    let previewText: string | undefined;
    const firstAssistant = session.transcript.find((e) => e.role === "assistant");
    if (firstAssistant && firstAssistant.role === "assistant") {
      for (const block of firstAssistant.content) {
        if (block.type === "text") {
          previewText = block.text.slice(0, 100);
          break;
        }
      }
    }

    return {
      id: session.id,
      claudeSessionId: session.claudeSessionId,
      title: session.title,
      workingDir: session.workingDir,
      model: session.model,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      promptCount: session.promptCount,
      totalCostUsd: session.totalCostUsd,
      isPinned: session.isPinned,
      tags: session.tags,
      previewText,
    };
  }

  /**
   * Update session title
   */
  async updateTitle(id: string, title: string): Promise<void> {
    await this.load();

    const session = this.sessions.get(id);
    if (session) {
      session.title = title;
      session.updatedAt = Date.now();
      await this.save();
    }
  }

  /**
   * Toggle pin status
   */
  async togglePin(id: string): Promise<boolean> {
    await this.load();

    const session = this.sessions.get(id);
    if (session) {
      session.isPinned = !session.isPinned;
      session.updatedAt = Date.now();
      await this.save();
      return session.isPinned;
    }
    return false;
  }

  /**
   * Add tag to session
   */
  async addTag(id: string, tag: string): Promise<void> {
    await this.load();

    const session = this.sessions.get(id);
    if (session && !session.tags.includes(tag)) {
      session.tags.push(tag);
      session.updatedAt = Date.now();
      await this.save();
    }
  }

  /**
   * Remove tag from session
   */
  async removeTag(id: string, tag: string): Promise<void> {
    await this.load();

    const session = this.sessions.get(id);
    if (session) {
      session.tags = session.tags.filter((t) => t !== tag);
      session.updatedAt = Date.now();
      await this.save();
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(id: string): Promise<boolean> {
    await this.load();

    const deleted = this.sessions.delete(id);
    if (deleted) {
      await this.save();
    }
    return deleted;
  }

  /**
   * Get all unique tags
   */
  async getAllTags(): Promise<string[]> {
    await this.load();

    const tags = new Set<string>();
    for (const session of this.sessions.values()) {
      for (const tag of session.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }

  /**
   * Get sessions grouped by working directory
   */
  async getSessionsByProject(): Promise<Map<string, SessionSummary[]>> {
    await this.load();

    const byProject = new Map<string, SessionSummary[]>();

    for (const session of this.sessions.values()) {
      const summary = this.toSummary(session);
      const existing = byProject.get(session.workingDir) || [];
      existing.push(summary);
      byProject.set(session.workingDir, existing);
    }

    // Sort each project's sessions by date
    for (const [, sessions] of byProject) {
      sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    return byProject;
  }

  /**
   * Get total session count
   */
  async count(): Promise<number> {
    await this.load();
    return this.sessions.size;
  }

  /**
   * Force reload from disk
   */
  async reload(): Promise<void> {
    this.loaded = false;
    this.sessions.clear();
    await this.load();
  }
}

// Singleton instance
export const sessionHistoryStorage = new SessionHistoryStorage();
