/**
 * TabBar - Browser-style session tabs
 *
 * Displays all active sessions as tabs with:
 * - Session name (project directory)
 * - Status indicator (thinking, idle, error)
 * - Close button
 * - New session button
 */

import { useCallback, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useStore } from "../../core/store";
import { getCLIBridge } from "../../core/cli-bridge";
import type { Session } from "../../core/types";

interface TabBarProps {
  sessions: Session[];
  activeSession: Session | null;
}

export function TabBar({ sessions, activeSession }: TabBarProps) {
  const [isCreating, setIsCreating] = useState(false);

  const setActiveSession = useStore((state) => state.setActiveSession);
  const closeSession = useStore((state) => state.closeSession);
  const createSession = useStore((state) => state.createSession);
  const defaultModel = useStore((state) => state.defaultModel);

  const handleNewSession = useCallback(async () => {
    if (isCreating) return;

    try {
      setIsCreating(true);

      // Open folder picker dialog
      const selectedDir = await open({
        directory: true,
        multiple: false,
        title: "Select Project Directory",
      });

      if (!selectedDir) {
        // User cancelled
        return;
      }

      const workingDir = selectedDir as string;
      const cliBridge = getCLIBridge();

      // Spawn interactive CLI session
      const sessionId = await cliBridge.spawnInteractive({
        working_dir: workingDir,
        model: defaultModel,
      });

      // Add session to store
      createSession({
        id: sessionId,
        working_dir: workingDir,
        model: defaultModel,
        status: "idle",
        created_at: Date.now(),
        prompt_count: 0,
        total_cost_usd: 0,
      });

    } catch (error) {
      console.error("Failed to create session:", error);
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, defaultModel, createSession]);

  const handleCloseSession = useCallback(async (sessionId: string) => {
    try {
      const cliBridge = getCLIBridge();
      await cliBridge.terminateSession(sessionId);
    } catch (error) {
      console.error("Failed to terminate session:", error);
    }
    closeSession(sessionId);
  }, [closeSession]);

  const getProjectName = (workingDir: string): string => {
    const parts = workingDir.split(/[/\\]/);
    return parts[parts.length - 1] || workingDir;
  };

  const getStatusColor = (status: Session["status"]): string => {
    switch (status) {
      case "thinking":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      case "idle":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div
      className="flex items-center h-10 bg-secondary border-b border-default px-2 gap-1"
      role="tablist"
      aria-label="Session tabs"
    >
      {sessions.map((session) => (
        <div
          key={session.id}
          role="tab"
          aria-selected={session.id === activeSession?.id}
          tabIndex={0}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-t-md cursor-pointer
            transition-colors text-sm
            ${
              session.id === activeSession?.id
                ? "bg-primary text-primary"
                : "bg-tertiary text-secondary hover:bg-primary/50"
            }
          `}
          onClick={() => setActiveSession(session.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setActiveSession(session.id);
            }
          }}
        >
          {/* Status indicator */}
          <div
            className={`w-2 h-2 rounded-full ${getStatusColor(session.status)}`}
            data-testid={
              session.status === "thinking" ? "thinking-indicator" : undefined
            }
            aria-label={`Status: ${session.status}`}
          />

          {/* Project name */}
          <span className="max-w-32 truncate">
            {getProjectName(session.working_dir)}
          </span>

          {/* Close button */}
          <button
            className="ml-1 p-0.5 rounded hover:bg-tertiary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleCloseSession(session.id);
            }}
            aria-label="Close tab"
            data-testid="close-tab-button"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ))}

      {/* New session button */}
      <button
        className="flex items-center justify-center w-8 h-8 rounded hover:bg-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleNewSession}
        disabled={isCreating}
        aria-label={isCreating ? "Creating session..." : "New session"}
        data-testid="new-session-button"
      >
        {isCreating ? (
          <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        )}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings button */}
      <button
        className="flex items-center justify-center w-8 h-8 rounded hover:bg-tertiary transition-colors"
        aria-label="Settings"
        data-testid="settings-button"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
    </div>
  );
}
