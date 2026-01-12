/**
 * AppShell - Main application layout container
 *
 * This component provides the main layout structure with:
 * - Tab bar for session switching
 * - Sidebar for additional features
 * - Main content area for the active session
 * - Status bar at the bottom
 */

import { useEffect, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { useStore, selectActiveSession, selectSessionList } from "../../core/store";
import { getCLIBridge } from "../../core/cli-bridge";
import { TabBar } from "./TabBar";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";
import { SessionView } from "../messages/SessionView";
import { WelcomeView } from "./WelcomeView";

export function AppShell() {
  const activeSession = useStore(selectActiveSession);
  const sessions = useStore(selectSessionList);
  const sidebarOpen = useStore((state) => state.sidebarOpen);
  const createSession = useStore((state) => state.createSession);
  const setActiveSession = useStore((state) => state.setActiveSession);
  const defaultModel = useStore((state) => state.defaultModel);

  // Ref to track if new session dialog is already open
  const isCreatingSessionRef = useRef(false);

  // Handle new session creation (from tray or hotkey)
  const handleNewSession = useCallback(async () => {
    if (isCreatingSessionRef.current) return;

    try {
      isCreatingSessionRef.current = true;

      const selectedDir = await open({
        directory: true,
        multiple: false,
        title: "Select Project Directory",
      });

      if (!selectedDir) return;

      const workingDir = selectedDir as string;
      const cliBridge = getCLIBridge();

      const sessionId = await cliBridge.spawnInteractive({
        working_dir: workingDir,
        model: defaultModel,
      });

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
      isCreatingSessionRef.current = false;
    }
  }, [defaultModel, createSession]);

  // Listen for tray menu events
  useEffect(() => {
    const unlisten = listen("tray-new-session", () => {
      handleNewSession();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [handleNewSession]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Tab / Ctrl+Shift+Tab: Switch sessions
      if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        const sessionIds = Object.keys(useStore.getState().sessions);
        if (sessionIds.length < 2) return;

        const currentIndex = sessionIds.indexOf(activeSession?.id || "");
        let nextIndex: number;

        if (e.shiftKey) {
          // Previous session
          nextIndex = currentIndex <= 0 ? sessionIds.length - 1 : currentIndex - 1;
        } else {
          // Next session
          nextIndex = currentIndex >= sessionIds.length - 1 ? 0 : currentIndex + 1;
        }

        setActiveSession(sessionIds[nextIndex]);
      }

      // Ctrl+N: New session
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        handleNewSession();
      }

      // Ctrl+W: Close current session
      if (e.ctrlKey && e.key === "w" && activeSession) {
        e.preventDefault();
        const cliBridge = getCLIBridge();
        cliBridge.terminateSession(activeSession.id).catch(console.error);
        useStore.getState().closeSession(activeSession.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSession, setActiveSession, handleNewSession]);

  return (
    <div className="h-screen w-screen flex flex-col bg-primary text-primary overflow-hidden">
      {/* Tab Bar */}
      <TabBar sessions={sessions} activeSession={activeSession} />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && <Sidebar />}

        {/* Session Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeSession ? (
            <SessionView session={activeSession} />
          ) : (
            <WelcomeView />
          )}
        </main>
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}
