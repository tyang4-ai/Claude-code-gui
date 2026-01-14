/**
 * Zustand Store - Global state management
 *
 * This module provides the main application state store using Zustand
 * with persistence.
 */

import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { produce } from "immer";
import type {
  Session,
  SessionInfo,
  TranscriptEntry,
  PendingEdit,
  ContentBlock,
} from "../types";
import { getSessionStorage } from "../session-storage";

// ============================================================================
// State Types
// ============================================================================

interface SessionsState {
  sessions: Record<string, Session>;
  activeSessionId: string | null;
}

interface UIState {
  sidebarOpen: boolean;
  theme: "dark" | "light";
}

interface SettingsState {
  yoloMode: boolean;
  defaultModel: string;
  globalHotkey: string;
  promptHistory: string[];
}

interface RootState extends SessionsState, UIState, SettingsState {
  // Session actions
  createSession: (info: SessionInfo) => void;
  closeSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string | null) => void;
  updateSessionStatus: (
    sessionId: string,
    status: SessionInfo["status"]
  ) => void;
  renameSession: (sessionId: string, newName: string) => void;
  appendToTranscript: (sessionId: string, entry: TranscriptEntry) => void;
  updateLastAssistantMessage: (
    sessionId: string,
    content: ContentBlock[]
  ) => void;
  addPendingEdit: (sessionId: string, edit: PendingEdit) => void;
  removePendingEdit: (sessionId: string, editId: string) => void;
  reorderSessions: (fromIndex: number, toIndex: number) => void;
  updateContextWindow: (sessionId: string, used: number, total: number) => void;
  updateSessionCost: (sessionId: string, costUsd: number) => void;

  // UI actions
  toggleSidebar: () => void;
  setTheme: (theme: "dark" | "light") => void;

  // Settings actions
  setYoloMode: (enabled: boolean) => void;
  setDefaultModel: (model: string) => void;
  setGlobalHotkey: (hotkey: string) => void;
  addPromptHistory: (prompt: string) => void;
  clearPromptHistory: () => void;
}

// ============================================================================
// Store Creation
// ============================================================================

export const useStore = create<RootState>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        // Initial state
        sessions: {},
        activeSessionId: null,
        sidebarOpen: true,
        theme: "dark",
        yoloMode: false,
        defaultModel: "sonnet",
        globalHotkey: "CommandOrControl+Shift+Space",
        promptHistory: [],

        // Session actions
        createSession: (info: SessionInfo) =>
          set(
            produce((state: RootState) => {
              state.sessions[info.id] = {
                ...info,
                transcript: [],
                pendingEdits: [],
              };
              state.activeSessionId = info.id;
            })
          ),

        closeSession: (sessionId: string) =>
          set(
            produce((state: RootState) => {
              delete state.sessions[sessionId];

              // If this was the active session, switch to another
              if (state.activeSessionId === sessionId) {
                const sessionIds = Object.keys(state.sessions);
                state.activeSessionId =
                  sessionIds.length > 0 ? sessionIds[0] : null;
              }
            })
          ),

        setActiveSession: (sessionId: string | null) =>
          set(
            produce((state: RootState) => {
              state.activeSessionId = sessionId;
            })
          ),

        updateSessionStatus: (
          sessionId: string,
          status: SessionInfo["status"]
        ) =>
          set(
            produce((state: RootState) => {
              const session = state.sessions[sessionId];
              if (session) {
                session.status = status;
              }
            })
          ),

        renameSession: (sessionId: string, newName: string) =>
          set(
            produce((state: RootState) => {
              const session = state.sessions[sessionId];
              if (session) {
                // Trim whitespace; if empty string, clear the custom name
                const trimmed = newName.trim();
                session.displayName = trimmed || undefined;
              }
            })
          ),

        appendToTranscript: (sessionId: string, entry: TranscriptEntry) =>
          set(
            produce((state: RootState) => {
              const session = state.sessions[sessionId];
              if (session) {
                session.transcript.push(entry);
              }
            })
          ),

        updateLastAssistantMessage: (
          sessionId: string,
          content: ContentBlock[]
        ) =>
          set(
            produce((state: RootState) => {
              const session = state.sessions[sessionId];
              if (session && session.transcript.length > 0) {
                const lastEntry =
                  session.transcript[session.transcript.length - 1];
                if (lastEntry.role === "assistant") {
                  lastEntry.content = content;
                }
              }
            })
          ),

        addPendingEdit: (sessionId: string, edit: PendingEdit) =>
          set(
            produce((state: RootState) => {
              const session = state.sessions[sessionId];
              if (session) {
                session.pendingEdits.push(edit);
              }
            })
          ),

        removePendingEdit: (sessionId: string, editId: string) =>
          set(
            produce((state: RootState) => {
              const session = state.sessions[sessionId];
              if (session) {
                session.pendingEdits = session.pendingEdits.filter(
                  (e) => e.id !== editId
                );
              }
            })
          ),

        reorderSessions: (fromIndex: number, toIndex: number) =>
          set(
            produce((state: RootState) => {
              const sessionIds = Object.keys(state.sessions);
              const [movedId] = sessionIds.splice(fromIndex, 1);
              sessionIds.splice(toIndex, 0, movedId);

              // Rebuild sessions object in new order
              const reordered: Record<string, Session> = {};
              for (const id of sessionIds) {
                reordered[id] = state.sessions[id];
              }
              state.sessions = reordered;
            })
          ),

        updateContextWindow: (sessionId: string, used: number, total: number) =>
          set(
            produce((state: RootState) => {
              const session = state.sessions[sessionId];
              if (session) {
                session.contextTokensUsed = used;
                session.contextTokensTotal = total;
              }
            })
          ),

        updateSessionCost: (sessionId: string, costUsd: number) =>
          set(
            produce((state: RootState) => {
              const session = state.sessions[sessionId];
              if (session) {
                session.total_cost_usd = costUsd;
              }
            })
          ),

        // UI actions
        toggleSidebar: () =>
          set(
            produce((state: RootState) => {
              state.sidebarOpen = !state.sidebarOpen;
            })
          ),

        setTheme: (theme: "dark" | "light") =>
          set(
            produce((state: RootState) => {
              state.theme = theme;
            })
          ),

        // Settings actions
        setYoloMode: (enabled: boolean) =>
          set(
            produce((state: RootState) => {
              state.yoloMode = enabled;
            })
          ),

        setDefaultModel: (model: string) =>
          set(
            produce((state: RootState) => {
              state.defaultModel = model;
            })
          ),

        setGlobalHotkey: (hotkey: string) =>
          set(
            produce((state: RootState) => {
              state.globalHotkey = hotkey;
            })
          ),

        addPromptHistory: (prompt: string) =>
          set(
            produce((state: RootState) => {
              // Remove duplicate if exists
              const existingIndex = state.promptHistory.indexOf(prompt);
              if (existingIndex !== -1) {
                state.promptHistory.splice(existingIndex, 1);
              }
              // Add to beginning (most recent first)
              state.promptHistory.unshift(prompt);
              // Keep max 100 entries
              if (state.promptHistory.length > 100) {
                state.promptHistory = state.promptHistory.slice(0, 100);
              }
            })
          ),

        clearPromptHistory: () =>
          set(
            produce((state: RootState) => {
              state.promptHistory = [];
            })
          ),
      }),
      {
        name: "claude-gui-storage",
        partialize: (state) => ({
          // Only persist settings and UI preferences
          sidebarOpen: state.sidebarOpen,
          theme: state.theme,
          yoloMode: state.yoloMode,
          defaultModel: state.defaultModel,
          globalHotkey: state.globalHotkey,
          promptHistory: state.promptHistory,
        }),
      }
    )
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectActiveSession = (state: RootState): Session | null => {
  if (!state.activeSessionId) return null;
  return state.sessions[state.activeSessionId] || null;
};

export const selectSessionList = (state: RootState): Session[] => {
  return Object.values(state.sessions);
};

export const selectSessionCount = (state: RootState): number => {
  return Object.keys(state.sessions).length;
};

export const selectPendingEditCount = (state: RootState): number => {
  let count = 0;
  for (const session of Object.values(state.sessions)) {
    count += session.pendingEdits.length;
  }
  return count;
};

// ============================================================================
// Session Persistence
// ============================================================================

/**
 * Initialize session persistence - load sessions and set up auto-save
 */
export async function initializeSessionPersistence(): Promise<void> {
  try {
    const storage = getSessionStorage();
    await storage.initialize();

    // Load persisted sessions
    let persistedSessions: Session[] = [];
    try {
      persistedSessions = await storage.loadAllSessions();
    } catch (e) {
      console.warn("Failed to load persisted sessions:", e);
    }

    if (persistedSessions.length > 0) {
      useStore.setState(
        produce((state: RootState) => {
          for (const session of persistedSessions) {
            state.sessions[session.id] = session;
          }
          // Set the most recent session as active if none is active
          if (!state.activeSessionId && persistedSessions.length > 0) {
            state.activeSessionId = persistedSessions[0].id;
          }
        })
      );
    }

    // Set up auto-save subscription
    useStore.subscribe(
      (state) => state.sessions,
      (sessions, prevSessions) => {
        // Find sessions that changed
        for (const [id, session] of Object.entries(sessions)) {
          const prevSession = prevSessions[id];
          if (!prevSession || session !== prevSession) {
            // Session was created or modified - save it
            storage.saveSessionDebounced(session);
          }
        }

        // Find deleted sessions
        for (const id of Object.keys(prevSessions)) {
          if (!sessions[id]) {
            storage.deleteSession(id);
          }
        }
      },
      { equalityFn: Object.is }
    );
  } catch (error) {
    console.error("Session persistence initialization failed:", error);
    // Continue without persistence
  }
}

/**
 * Restore a specific session from storage
 */
export async function restoreSession(sessionId: string): Promise<Session | null> {
  const storage = getSessionStorage();
  const session = await storage.loadSession(sessionId);

  if (session) {
    useStore.setState(
      produce((state: RootState) => {
        state.sessions[session.id] = session;
        state.activeSessionId = session.id;
      })
    );
  }

  return session;
}
