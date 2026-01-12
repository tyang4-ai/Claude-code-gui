/**
 * Edit Arbiter - Accept/Reject system for file edits
 *
 * This module manages pending file edits, allowing users to review,
 * accept, or reject changes proposed by Claude. It also supports
 * YOLO mode for auto-accepting all edits.
 */

import { invoke } from "@tauri-apps/api/core";
import type { ApplyResult, PendingEdit } from "../types";

interface AuditLogEntry {
  editId: string;
  filePath: string;
  action: "accepted" | "rejected" | "auto-accepted";
  timestamp: number;
  autoAccepted: boolean;
}

interface ConflictInfo {
  type: "external-modification";
  currentContent: string;
}

// Singleton instance
let arbiterInstance: EditArbiter | null = null;

/**
 * Edit Arbiter for managing file edit approvals
 */
export class EditArbiter {
  private queues: Map<string, PendingEdit[]> = new Map();
  private yoloMode = false;
  private auditLog: AuditLogEntry[] = [];

  /**
   * Get the singleton instance
   */
  static getInstance(): EditArbiter {
    if (!arbiterInstance) {
      arbiterInstance = new EditArbiter();
    }
    return arbiterInstance;
  }

  /**
   * Queue an edit for approval
   */
  queueEdit(sessionId: string, edit: PendingEdit): void {
    if (!this.queues.has(sessionId)) {
      this.queues.set(sessionId, []);
    }

    const queue = this.queues.get(sessionId)!;
    queue.push(edit);

    // In YOLO mode, auto-accept immediately
    if (this.yoloMode) {
      this.autoAcceptEdit(edit);
    }
  }

  /**
   * Get all pending edits for a session
   */
  getEditQueue(sessionId: string): PendingEdit[] {
    return this.queues.get(sessionId) || [];
  }

  /**
   * Accept an edit and apply it to the file system
   */
  async acceptEdit(editId: string): Promise<ApplyResult> {
    const edit = this.findEdit(editId);
    if (!edit) {
      throw new Error(`Edit not found: ${editId}`);
    }

    try {
      const result = await invoke<ApplyResult>("apply_edit", {
        path: edit.filePath,
        original_content: edit.originalContent,
        proposed_content: edit.proposedContent,
      });

      if (result.type === "success") {
        this.removeEdit(editId);
        this.logAction(edit, "accepted");
      }

      return result;
    } catch (error) {
      return {
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Reject an edit
   */
  async rejectEdit(editId: string): Promise<void> {
    const edit = this.findEdit(editId);
    if (!edit) {
      throw new Error(`Edit not found: ${editId}`);
    }

    this.removeEdit(editId);
    this.logAction(edit, "rejected");

    // Notify backend about rejection
    await invoke("reject_edit", { editId });
  }

  /**
   * Accept all pending edits for a session
   */
  async acceptAll(sessionId: string): Promise<ApplyResult[]> {
    const queue = this.getEditQueue(sessionId);
    const results: ApplyResult[] = [];

    for (const edit of [...queue]) {
      const result = await this.acceptEdit(edit.id);
      results.push(result);

      // Stop on first conflict
      if (result.type === "conflict") {
        break;
      }
    }

    return results;
  }

  /**
   * Reject all pending edits for a session
   */
  async rejectAll(sessionId: string): Promise<void> {
    const queue = this.getEditQueue(sessionId);
    for (const edit of [...queue]) {
      await this.rejectEdit(edit.id);
    }
  }

  /**
   * Enable or disable YOLO mode
   */
  setYoloMode(enabled: boolean): void {
    this.yoloMode = enabled;

    // If enabling YOLO mode, auto-accept all pending edits
    if (enabled) {
      for (const [, queue] of this.queues) {
        for (const edit of [...queue]) {
          this.autoAcceptEdit(edit);
        }
      }
    }
  }

  /**
   * Check if YOLO mode is enabled
   */
  isYoloMode(): boolean {
    return this.yoloMode;
  }

  /**
   * Check for conflicts with the current file state
   */
  async checkConflicts(edit: PendingEdit): Promise<ConflictInfo | null> {
    try {
      const result = await invoke<{ modified: boolean; current_content?: string }>("check_file_modified", {
        path: edit.filePath,
        expected_hash: edit.originalContent, // This should be a hash in practice
      });

      if (result.modified) {
        return {
          type: "external-modification",
          currentContent: result.current_content || "",
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get the audit log of all edit actions
   */
  getAuditLog(): AuditLogEntry[] {
    return [...this.auditLog];
  }

  /**
   * Clear the audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Get total pending edit count across all sessions
   */
  getPendingCount(): number {
    let count = 0;
    for (const [, queue] of this.queues) {
      count += queue.length;
    }
    return count;
  }

  /**
   * Alias for getPendingCount (for test compatibility)
   */
  getPendingEditCount(): number {
    return this.getPendingCount();
  }

  /**
   * Clear all pending edits for a session
   */
  clearSession(sessionId: string): void {
    this.queues.delete(sessionId);
  }

  /**
   * Internal: Clear all state (for testing)
   */
  _clearAll(): void {
    this.queues.clear();
    this.auditLog = [];
    this.yoloMode = false;
  }

  /**
   * Auto-accept an edit in YOLO mode
   */
  private async autoAcceptEdit(edit: PendingEdit): Promise<void> {
    try {
      const result = await invoke<ApplyResult>("apply_edit", {
        path: edit.filePath,
        originalContent: edit.originalContent,
        proposedContent: edit.proposedContent,
      });

      if (result.type === "success") {
        this.removeEdit(edit.id);
        this.logAction(edit, "auto-accepted");
      }
    } catch (error) {
      console.error("Auto-accept failed:", error);
    }
  }

  /**
   * Find an edit by ID across all sessions
   */
  private findEdit(editId: string): PendingEdit | undefined {
    for (const [, queue] of this.queues) {
      const edit = queue.find((e) => e.id === editId);
      if (edit) return edit;
    }
    return undefined;
  }

  /**
   * Remove an edit from its queue
   */
  private removeEdit(editId: string): void {
    for (const [sessionId, queue] of this.queues) {
      const index = queue.findIndex((e) => e.id === editId);
      if (index !== -1) {
        queue.splice(index, 1);
        if (queue.length === 0) {
          this.queues.delete(sessionId);
        }
        return;
      }
    }
  }

  /**
   * Log an edit action for audit purposes
   */
  private logAction(
    edit: PendingEdit,
    action: "accepted" | "rejected" | "auto-accepted"
  ): void {
    this.auditLog.push({
      editId: edit.id,
      filePath: edit.filePath,
      action,
      timestamp: Date.now(),
      autoAccepted: action === "auto-accepted",
    });
  }
}

/**
 * Get the Edit Arbiter singleton instance
 */
export function getEditArbiter(): EditArbiter {
  return EditArbiter.getInstance();
}
