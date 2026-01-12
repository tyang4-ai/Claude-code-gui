/**
 * EditCard - Display for Edit/Write tool results with diff view
 *
 * Features:
 * - Unified diff display
 * - Accept/Reject buttons
 * - YOLO mode auto-accept
 * - Open in VS Code
 * - Conflict detection display
 */

import { useState, useCallback, useEffect, memo } from "react";
import { getEditArbiter } from "../../core/edit-arbiter";
import { useStore } from "../../core/store";
import type { PendingEdit, ApplyResult } from "../../core/types";

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
  const [isExpanded, setIsExpanded] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);

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
        removePendingEdit(sessionId, toolId);
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
      className={`tool-card edit-card border rounded-lg overflow-hidden ${
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
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-tertiary border-b border-default cursor-pointer hover:bg-tertiary/80"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="edit-card-header"
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Edit icon */}
          <svg
            className="w-4 h-4 text-amber-400 flex-shrink-0"
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
          <span className="text-sm font-medium text-primary">Edit</span>
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
                className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50"
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
                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
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
        <div className="max-h-96 overflow-auto bg-[#0d1117]">
          <DiffView diff={pendingEdit.diff} />
        </div>
      )}
    </div>
  );
}

// Diff view component
function DiffView({ diff }: { diff: string }) {
  const lines = diff.split("\n");

  return (
    <div className="font-mono text-xs p-3">
      {lines.map((line, i) => {
        let className = "text-secondary";
        let bgClass = "";

        if (line.startsWith("+") && !line.startsWith("+++")) {
          className = "text-green-400";
          bgClass = "bg-green-900/20";
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          className = "text-red-400";
          bgClass = "bg-red-900/20";
        } else if (line.startsWith("@@")) {
          className = "text-cyan-400";
          bgClass = "bg-cyan-900/10";
        } else if (line.startsWith("diff ") || line.startsWith("index ")) {
          className = "text-muted";
        }

        return (
          <div
            key={i}
            className={`${className} ${bgClass} px-2 whitespace-pre leading-relaxed`}
          >
            {line || " "}
          </div>
        );
      })}
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

export const EditCard = memo(EditCardComponent);
