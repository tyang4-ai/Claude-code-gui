/**
 * TabBar - Browser-style session tabs
 *
 * Displays all active sessions as tabs with:
 * - Session name (project directory or custom display name)
 * - Status indicator (thinking, idle, error)
 * - Close button
 * - New session button
 * - Double-click to rename inline
 * - Tooltip with full working directory path
 * - Right-click context menu with Rename option
 */

import { useCallback, useState, useRef, useEffect } from "react";
import { useStore } from "../../core/store";
import { getCLIBridge } from "../../core/cli-bridge";
import { SettingsPanel } from "./SettingsPanel";
import type { Session } from "../../core/types";

interface TabBarProps {
  sessions: Session[];
  activeSession: Session | null;
}

// Context menu state
interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  sessionId: string | null;
}

export function TabBar({ sessions, activeSession }: TabBarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    sessionId: null,
  });
  const editInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const setActiveSession = useStore((state) => state.setActiveSession);
  const closeSession = useStore((state) => state.closeSession);
  const createSession = useStore((state) => state.createSession);
  const renameSession = useStore((state) => state.renameSession);
  const defaultModel = useStore((state) => state.defaultModel);
  const sidebarOpen = useStore((state) => state.sidebarOpen);
  const toggleSidebar = useStore((state) => state.toggleSidebar);

  // Focus input when editing starts
  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSessionId]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };

    if (contextMenu.visible) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [contextMenu.visible]);

  // Start editing a session name
  const startEditing = useCallback((session: Session) => {
    setEditingSessionId(session.id);
    setEditValue(session.displayName || getProjectName(session.working_dir));
  }, []);

  // Finish editing and save
  const finishEditing = useCallback(() => {
    if (editingSessionId) {
      renameSession(editingSessionId, editValue);
      setEditingSessionId(null);
      setEditValue("");
    }
  }, [editingSessionId, editValue, renameSession]);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingSessionId(null);
    setEditValue("");
  }, []);

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      sessionId,
    });
  }, []);

  // Handle rename from context menu
  const handleRenameFromMenu = useCallback(() => {
    if (contextMenu.sessionId) {
      const session = sessions.find((s) => s.id === contextMenu.sessionId);
      if (session) {
        startEditing(session);
      }
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [contextMenu.sessionId, sessions, startEditing]);

  const handleNewSession = useCallback(async () => {
    if (isCreating) return;

    try {
      setIsCreating(true);

      // Dynamically import dialog plugin to avoid crash on load
      const { open } = await import("@tauri-apps/plugin-dialog");

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

      // Create CLI session
      const sessionId = await cliBridge.createSession({
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

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        height: '40px',
        background: 'linear-gradient(180deg, var(--color-bg-surface) 0%, var(--color-bg-base) 100%)',
        borderBottom: '1px solid var(--color-border-muted)',
        padding: '0 8px',
        gap: '4px',
        color: 'var(--color-text-primary)'
      }}
      role="tablist"
      aria-label="Session tabs"
    >
      {/* Sidebar toggle button */}
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-sm)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: sidebarOpen ? 'var(--color-accent)' : 'var(--color-text-primary)',
          transition: 'color var(--transition-fast)'
        }}
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        data-testid="sidebar-toggle"
      >
        <svg
          style={{ width: '16px', height: '16px' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {sessions.map((session) => (
        <div
          key={session.id}
          role="tab"
          aria-selected={session.id === activeSession?.id}
          tabIndex={0}
          title={session.working_dir}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            cursor: 'pointer',
            fontSize: 'var(--text-base)',
            backgroundColor: session.id === activeSession?.id ? 'var(--color-bg-elevated)' : 'transparent',
            color: session.id === activeSession?.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            borderBottom: session.id === activeSession?.id ? '2px solid var(--color-accent)' : '2px solid transparent',
            boxShadow: session.id === activeSession?.id ? 'var(--shadow-sm)' : 'none',
            transition: 'all var(--transition-base)'
          }}
          onClick={() => setActiveSession(session.id)}
          onDoubleClick={() => startEditing(session)}
          onContextMenu={(e) => handleContextMenu(e, session.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setActiveSession(session.id);
            }
            if (e.key === "F2") {
              startEditing(session);
            }
          }}
        >
          {/* Status indicator */}
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: session.status === 'thinking' ? 'var(--color-warning)' : session.status === 'error' ? 'var(--color-error)' : 'var(--color-success)',
              boxShadow: session.status === 'thinking' ? '0 0 6px var(--color-warning)' : 'none'
            }}
            data-testid={
              session.status === "thinking" ? "thinking-indicator" : undefined
            }
            aria-label={`Status: ${session.status}`}
          />

          {/* Project name - editable inline */}
          {editingSessionId === session.id ? (
            <input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={finishEditing}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  finishEditing();
                } else if (e.key === "Escape") {
                  cancelEditing();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '128px',
                padding: '2px 4px',
                fontSize: 'var(--text-base)',
                backgroundColor: 'var(--color-bg-base)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-accent)',
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
                boxShadow: 'var(--shadow-glow)'
              }}
              data-testid="tab-rename-input"
            />
          ) : (
            <span
              style={{ maxWidth: '128px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={`Double-click to rename\n${session.working_dir}`}
            >
              {session.displayName || getProjectName(session.working_dir)}
            </span>
          )}

          {/* Close button */}
          <button
            style={{
              marginLeft: '4px',
              padding: '2px',
              borderRadius: 'var(--radius-sm)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              opacity: 0.7,
              transition: 'opacity var(--transition-fast)'
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleCloseSession(session.id);
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
            aria-label="Close tab"
            data-testid="close-tab-button"
          >
            <svg
              style={{ width: '12px', height: '12px' }}
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
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-sm)',
          background: 'none',
          border: 'none',
          cursor: isCreating ? 'not-allowed' : 'pointer',
          opacity: isCreating ? 0.5 : 1,
          color: 'var(--color-text-primary)',
          transition: 'color var(--transition-fast)'
        }}
        onClick={handleNewSession}
        disabled={isCreating}
        aria-label={isCreating ? "Creating session..." : "New session"}
        data-testid="new-session-button"
      >
        <svg
          style={{ width: '16px', height: '16px' }}
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
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Settings button */}
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-sm)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: showSettings ? 'var(--color-accent)' : 'var(--color-text-primary)',
          transition: 'color var(--transition-fast)'
        }}
        onClick={() => setShowSettings(!showSettings)}
        aria-label="Settings"
        data-testid="settings-button"
      >
        <svg
          style={{ width: '16px', height: '16px' }}
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

      {/* Settings dropdown */}
      {showSettings && (
        <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            minWidth: '120px',
            padding: '4px 0'
          }}
          data-testid="tab-context-menu"
        >
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 12px',
              background: 'none',
              border: 'none',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              fontSize: 'var(--text-base)',
              textAlign: 'left',
              transition: 'background-color var(--transition-fast)'
            }}
            onClick={handleRenameFromMenu}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-overlay)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <svg
              style={{ width: '14px', height: '14px' }}
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
            Rename
          </button>
        </div>
      )}
    </div>
  );
}
