/**
 * Session History Module
 *
 * Provides session persistence, browsing, and export functionality.
 */

import { sessionHistoryStorage } from "./storage";
import { exportSession, generateExportFilename } from "./export";
import type {
  PersistedSession,
  SessionSummary,
  SessionSearchOptions,
  ExportFormat,
} from "./types";
import type { Session } from "../../core/types";

/**
 * Session History Manager - main API for session history
 */
export class SessionHistoryManager {
  private static instance: SessionHistoryManager | null = null;

  static getInstance(): SessionHistoryManager {
    if (!SessionHistoryManager.instance) {
      SessionHistoryManager.instance = new SessionHistoryManager();
    }
    return SessionHistoryManager.instance;
  }

  // === Session Persistence ===

  /**
   * Save an active session to history
   */
  async saveSession(session: Session): Promise<void> {
    return sessionHistoryStorage.saveSession(session);
  }

  /**
   * Get a session by ID
   */
  async getSession(id: string): Promise<PersistedSession | null> {
    return sessionHistoryStorage.getSession(id);
  }

  /**
   * Get all session summaries with optional filtering
   */
  async getSessions(options?: SessionSearchOptions): Promise<SessionSummary[]> {
    return sessionHistoryStorage.getAllSummaries(options);
  }

  /**
   * Search sessions by query
   */
  async searchSessions(query: string): Promise<SessionSummary[]> {
    return sessionHistoryStorage.getAllSummaries({ query });
  }

  /**
   * Get sessions grouped by project
   */
  async getSessionsByProject(): Promise<Map<string, SessionSummary[]>> {
    return sessionHistoryStorage.getSessionsByProject();
  }

  /**
   * Get pinned sessions
   */
  async getPinnedSessions(): Promise<SessionSummary[]> {
    return sessionHistoryStorage.getAllSummaries({ pinnedOnly: true });
  }

  // === Session Management ===

  /**
   * Update session title
   */
  async updateTitle(id: string, title: string): Promise<void> {
    return sessionHistoryStorage.updateTitle(id, title);
  }

  /**
   * Toggle session pin status
   */
  async togglePin(id: string): Promise<boolean> {
    return sessionHistoryStorage.togglePin(id);
  }

  /**
   * Add tag to session
   */
  async addTag(id: string, tag: string): Promise<void> {
    return sessionHistoryStorage.addTag(id, tag);
  }

  /**
   * Remove tag from session
   */
  async removeTag(id: string, tag: string): Promise<void> {
    return sessionHistoryStorage.removeTag(id, tag);
  }

  /**
   * Delete a session
   */
  async deleteSession(id: string): Promise<boolean> {
    return sessionHistoryStorage.deleteSession(id);
  }

  /**
   * Get all unique tags
   */
  async getAllTags(): Promise<string[]> {
    return sessionHistoryStorage.getAllTags();
  }

  // === Export ===

  /**
   * Export a session to the specified format
   */
  async exportSession(
    sessionId: string,
    format: ExportFormat
  ): Promise<{ content: string; filename: string } | null> {
    const session = await sessionHistoryStorage.getSession(sessionId);
    if (!session) return null;

    return {
      content: exportSession(session, format),
      filename: generateExportFilename(session, format),
    };
  }

  /**
   * Export multiple sessions to markdown
   */
  async exportMultipleSessions(
    sessionIds: string[],
    format: ExportFormat
  ): Promise<string> {
    const exports: string[] = [];

    for (const id of sessionIds) {
      const session = await sessionHistoryStorage.getSession(id);
      if (session) {
        exports.push(exportSession(session, format));
      }
    }

    if (format === "markdown") {
      return exports.join("\n\n---\n\n");
    } else if (format === "json") {
      return `[${exports.join(",\n")}]`;
    } else {
      return exports.join("\n\n" + "=".repeat(60) + "\n\n");
    }
  }

  // === Statistics ===

  /**
   * Get total session count
   */
  async getSessionCount(): Promise<number> {
    return sessionHistoryStorage.count();
  }

  /**
   * Get total cost across all sessions
   */
  async getTotalCost(): Promise<number> {
    const sessions = await sessionHistoryStorage.getAllSummaries();
    return sessions.reduce((sum, s) => sum + s.totalCostUsd, 0);
  }

  /**
   * Get cost for a specific time period
   */
  async getCostForPeriod(startDate: number, endDate: number): Promise<number> {
    const sessions = await sessionHistoryStorage.getAllSummaries({
      startDate,
      endDate,
    });
    return sessions.reduce((sum, s) => sum + s.totalCostUsd, 0);
  }

  // === Utility ===

  /**
   * Force reload from disk
   */
  async reload(): Promise<void> {
    return sessionHistoryStorage.reload();
  }
}

/**
 * Get the SessionHistoryManager singleton
 */
export function getSessionHistoryManager(): SessionHistoryManager {
  return SessionHistoryManager.getInstance();
}

// Re-export types
export type {
  PersistedSession,
  SessionSummary,
  SessionSearchOptions,
  ExportFormat,
  PromptHistoryEntry,
} from "./types";

// Re-export export utilities
export { exportSession, generateExportFilename } from "./export";
