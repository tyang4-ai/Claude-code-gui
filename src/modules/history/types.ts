/**
 * Session History Types
 *
 * Types for session persistence, browsing, and export.
 */

import type { TranscriptEntry, SessionStatus } from "../../core/types";

/**
 * Persisted session record
 */
export interface PersistedSession {
  id: string;
  claudeSessionId?: string; // For --resume
  title: string; // Auto-generated or user-set
  workingDir: string;
  model: string;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  promptCount: number;
  totalCostUsd: number;
  transcript: TranscriptEntry[];
  isPinned: boolean;
  tags: string[];
}

/**
 * Session summary for listing (without full transcript)
 */
export interface SessionSummary {
  id: string;
  claudeSessionId?: string;
  title: string;
  workingDir: string;
  model: string;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  promptCount: number;
  totalCostUsd: number;
  isPinned: boolean;
  tags: string[];
  previewText?: string; // First 100 chars of first response
}

/**
 * Session search options
 */
export interface SessionSearchOptions {
  query?: string;
  workingDir?: string;
  tags?: string[];
  startDate?: number;
  endDate?: number;
  pinnedOnly?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Session export format
 */
export type ExportFormat = "markdown" | "json" | "text";

/**
 * Session storage format
 */
export interface SessionStorageData {
  version: number;
  sessions: PersistedSession[];
}

/**
 * Prompt history entry (separate from sessions)
 */
export interface PromptHistoryEntry {
  id: string;
  prompt: string;
  sessionId?: string;
  templateId?: string;
  timestamp: number;
  workingDir: string;
}

/**
 * Prompt history storage format
 */
export interface PromptHistoryData {
  version: number;
  entries: PromptHistoryEntry[];
  maxEntries: number;
}
