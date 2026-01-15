/**
 * EditCard - Display for Edit/Write tool results with diff view
 *
 * Features:
 * - Advanced diff visualization with DiffViewer
 * - Accept/Reject buttons with visual feedback
 * - YOLO mode auto-accept
 * - Open in VS Code
 * - Conflict detection with resolution modal
 * - Success/error animations
 */

import { useState, useCallback, useEffect, memo } from "react";
import { getEditArbiter } from "../../core/edit-arbiter";
import { useStore } from "../../core/store";
import type { PendingEdit, ApplyResult, ApplyConflictResult } from "../../core/types";
import { DiffViewer } from "./DiffViewer";

interface EditCardProps {
  toolId: string;
  sessionId: string;
  filePath: string;
  pendingEdit?: PendingEdit;
}

function EditCardComponent({
  toolId,
  sessionId,
  filePath,
  pendingEdit,
}: EditCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const yoloMode = useStore((state) => state.yoloMode);
  const removePendingEdit = useStore((state) => state.removePendingEdit);

  // Handle accept
  const handleAccept = useCallback(async () => {
    if (!pendingEdit || isApplying) return;

    setIsApplying(true);
    try {
      const arbiter = getEditArbiter();
      const result = await arbiter.acceptEdit(toolId);
      setApplyResult(result);

      if (result.type === "success") {
        // Show success animation
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 2000);
        removePendingEdit(sessionId, toolId);
      } else if (result.type === "conflict") {
        // Show conflict modal
        setShowConflictModal(true);
      }
    } catch (error) {
      console.error("Failed to accept edit:", error);
      setApplyResult({
        type: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsApplying(false);
    }
  }, [pendingEdit, isApplying, toolId, sessionId, removePendingEdit]);

  // Handle reject
  const handleReject = useCallback(async () => {
    if (!pendingEdit || isApplying) return;

    setIsApplying(true);
    try {
      const arbiter = getEditArbiter();
      await arbiter.rejectEdit(toolId);
      removePendingEdit(sessionId, toolId);
      setApplyResult({ type: "success" });
    } catch (error) {
      console.error("Failed to reject edit:", error);
    } finally {
      setIsApplying(false);
    }
  }, [pendingEdit, isApplying, toolId, sessionId, removePendingEdit]);

  // Auto-accept in YOLO mode
  useEffect(() => {
    if (yoloMode && pendingEdit && !applyResult) {
      handleAccept();
    }
  }, [yoloMode, pendingEdit, applyResult, handleAccept]);

  // Open in VS Code diff view
  const handleOpenInVSCode = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(`vscode://file/${filePath}`);
    } catch (e) {
      console.error("Failed to open in VS Code:", e);
    }
  }, [filePath]);

  const isPending = pendingEdit && !applyResult;

  // Calculate stats from diff
  const diffStats = pendingEdit?.diff
    ? calculateDiffStats(pendingEdit.diff)
    : { added: 0, removed: 0 };

  return (
    <div
      className={`tool-card edit-card border rounded-xl overflow-hidden relative ${
        isPending
          ? "border-amber-500/50"
          : applyResult?.type === "success"
          ? "border-green-500/50"
          : applyResult?.type === "conflict"
          ? "border-red-500/50"
          : "border-default"
      }`}
      data-testid="edit-card"
    >
      {/* Colored left accent border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
        style={{ backgroundColor: 'var(--color-tool-edit)' }}
      />

      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b cursor-pointer"
        style={{
          backgroundColor: 'var(--color-bg-surface)',
          borderColor: 'var(--color-border-default)',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-overlay)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-surface)'}
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="edit-card-header"
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Edit icon */}
          <svg
            className="w-4 h-4 flex-shrink-0"
            style={{ color: 'var(--color-tool-edit)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>

          {/* Tool name and file path */}
          <span className="text-sm font-medium" style={{ color: 'var(--color-tool-edit)' }}>Edit</span>
          <span className="text-xs text-secondary font-mono truncate">
            {filePath}
          </span>

          {/* Diff stats */}
          <span className="text-xs">
            <span className="text-green-400">+{diffStats.added}</span>
            {" / "}
            <span className="text-red-400">-{diffStats.removed}</span>
          </span>

          {/* Status badges */}
          {isPending && (
            <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
              Pending
            </span>
          )}
          {applyResult?.type === "success" && (
            <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
              Applied
            </span>
          )}
          {applyResult?.type === "conflict" && (
            <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
              Conflict
            </span>
          )}
          {applyResult?.type === "error" && (
            <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
              Error
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Action buttons (only when pending) */}
          {isPending && (
            <>
              <button
                className="px-2 py-1 text-xs rounded transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAccept();
                }}
                disabled={isApplying}
                data-testid="accept-button"
              >
                {isApplying ? "..." : "Accept"}
              </button>
              <button
                className="px-2 py-1 text-xs rounded transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-error)', color: 'white' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleReject();
                }}
                disabled={isApplying}
                data-testid="reject-button"
              >
                Reject
              </button>
            </>
          )}

          {/* VS Code button */}
          <button
            className="p-1.5 rounded hover:bg-primary/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenInVSCode();
            }}
            title="Open in VS Code"
          >
            <svg className="w-4 h-4 text-secondary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.5 0h-9L0 8.5v7l8.5 8.5h9l6.5-6.5v-11L17.5 0zM10 18l-6-6 6-6 1.5 1.5-4.5 4.5 4.5 4.5L10 18zm4 0l-1.5-1.5 4.5-4.5-4.5-4.5L14 6l6 6-6 6z"/>
            </svg>
          </button>

          {/* Expand/collapse chevron */}
          <svg
            className={`w-4 h-4 text-muted transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Preview line when collapsed */}
      {!isExpanded && pendingEdit?.diff && (
        <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', padding: '4px 12px 8px', fontFamily: 'monospace', backgroundColor: 'var(--color-bg-base)' }}>
          {pendingEdit.diff.split('\n').find(line => line.startsWith('+') && !line.startsWith('+++'))?.substring(0, 80) ||
           pendingEdit.diff.split('\n').find(line => line.startsWith('-') && !line.startsWith('---'))?.substring(0, 80) ||
           'Changes pending...'}
          {pendingEdit.diff.length > 80 ? '...' : ''}
        </div>
      )}

      {/* Result message */}
      {applyResult && applyResult.type !== "success" && (
        <div
          className={`px-3 py-2 text-sm ${
            applyResult.type === "conflict"
              ? "bg-amber-900/20 text-amber-400"
              : "bg-red-900/20 text-red-400"
          }`}
        >
          {applyResult.type === "conflict" && (
            <>
              <strong>Conflict:</strong> The file was modified externally.
              Please resolve manually.
            </>
          )}
          {applyResult.type === "error" && (
            <>
              <strong>Error:</strong> {applyResult.message}
            </>
          )}
        </div>
      )}

      {/* Diff content */}
      {isExpanded && pendingEdit?.diff && (
        <DiffViewer diff={pendingEdit.diff} filePath={filePath} />
      )}

      {/* Conflict Resolution Modal */}
      {showConflictModal && applyResult?.type === "conflict" && (
        <ConflictModal
          conflict={applyResult}
          filePath={filePath}
          onClose={() => {
            setShowConflictModal(false);
            removePendingEdit(sessionId, toolId);
          }}
          onResolve={async () => {
            setShowConflictModal(false);
            removePendingEdit(sessionId, toolId);
          }}
        />
      )}

      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <div
          className="absolute inset-0 bg-green-500/10 flex items-center justify-center pointer-events-none animate-fade-in-out"
          data-testid="success-animation"
        >
          <div className="bg-green-500/90 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="font-medium">Edit applied successfully</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Calculate diff stats
function calculateDiffStats(diff: string): { added: number; removed: number } {
  const lines = diff.split("\n");
  let added = 0;
  let removed = 0;

  for (const line of lines) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      added++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      removed++;
    }
  }

  return { added, removed };
}

// Conflict Resolution Modal
interface ConflictModalProps {
  conflict: ApplyConflictResult;
  filePath: string;
  onClose: () => void;
  onResolve: () => Promise<void>;
}

function ConflictModal({
  conflict,
  filePath,
  onClose,
  onResolve,
}: ConflictModalProps) {
  const [isResolving, setIsResolving] = useState(false);

  const handleOpenInEditor = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(`vscode://file/${filePath}`);
    } catch (e) {
      console.error("Failed to open in editor:", e);
    }
  }, [filePath]);

  const handleManualResolve = useCallback(async () => {
    setIsResolving(true);
    try {
      await onResolve();
    } finally {
      setIsResolving(false);
    }
  }, [onResolve]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 animate-fade-in"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
      data-testid="conflict-modal"
    >
      <div
        className="rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
        style={{
          backgroundColor: 'var(--glass-bg)',
          backdropFilter: 'blur(var(--glass-blur))',
          WebkitBackdropFilter: 'blur(var(--glass-blur))',
          border: '1px solid var(--color-error)',
          boxShadow: 'var(--shadow-xl)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            borderBottom: '1px solid var(--color-error)',
            backgroundColor: 'rgba(248, 81, 73, 0.1)',
          }}
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-6 h-6 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-red-400">
              Merge Conflict Detected
            </h3>
          </div>
          <button
            className="p-1 hover:bg-primary/20 rounded transition-colors"
            onClick={onClose}
            data-testid="close-conflict-modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto max-h-[60vh]">
          <p className="text-secondary mb-4">
            The file <code className="font-mono text-amber-400">{filePath}</code> has been
            modified externally since this edit was proposed. You need to resolve the
            conflict manually.
          </p>

          {/* Three-way diff preview */}
          <div className="space-y-3">
            {/* Base content */}
            <div className="rounded" style={{ border: '1px solid var(--color-border-default)' }}>
              <div className="px-3 py-2" style={{ backgroundColor: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border-default)' }}>
                <span className="text-xs font-medium text-muted">
                  Base (Original)
                </span>
              </div>
              <pre className="p-3 text-xs font-mono text-secondary overflow-x-auto max-h-32">
                {conflict.base_content}
              </pre>
            </div>

            {/* Current content */}
            <div className="border border-amber-500/50 rounded">
              <div className="px-3 py-2 bg-amber-900/20 border-b border-amber-500/50">
                <span className="text-xs font-medium text-amber-400">
                  Current (In File)
                </span>
              </div>
              <pre className="p-3 text-xs font-mono text-secondary overflow-x-auto max-h-32">
                {conflict.current_content}
              </pre>
            </div>

            {/* Proposed content */}
            <div className="border border-cyan-500/50 rounded">
              <div className="px-3 py-2 bg-cyan-900/20 border-b border-cyan-500/50">
                <span className="text-xs font-medium text-cyan-400">
                  Proposed (From Edit)
                </span>
              </div>
              <pre className="p-3 text-xs font-mono text-secondary overflow-x-auto max-h-32">
                {conflict.proposed_content}
              </pre>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-4 p-3 rounded" style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-default)' }}>
            <h4 className="text-sm font-medium text-primary mb-2">
              Resolution Steps:
            </h4>
            <ol className="text-xs text-secondary space-y-1 list-decimal list-inside">
              <li>Open the file in your editor to see the full context</li>
              <li>Manually merge the changes from both versions</li>
              <li>Save the file with your resolved changes</li>
              <li>Click "Mark as Resolved" below to dismiss this conflict</li>
            </ol>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}>
          <button
            className="px-4 py-2 text-sm rounded transition-colors"
            style={{ backgroundColor: 'var(--color-bg-overlay)', color: 'var(--color-text-primary)' }}
            onClick={handleOpenInEditor}
            data-testid="open-in-editor"
          >
            Open in Editor
          </button>
          <button
            className="px-4 py-2 text-sm rounded transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
            onClick={handleManualResolve}
            disabled={isResolving}
            data-testid="mark-resolved"
          >
            {isResolving ? "Marking..." : "Mark as Resolved"}
          </button>
        </div>
      </div>
    </div>
  );
}

export const EditCard = memo(EditCardComponent);
