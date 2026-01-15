/**
 * AppShell - Main application layout container
 *
 * This component provides the main layout structure with:
 * - Tab bar for session switching
 * - Sidebar for additional features
 * - Main content area for the active session
 * - Status bar at the bottom
 */

import { useEffect, useCallback, useRef, useMemo, useState } from "react";
import { useStore } from "../../core/store";
import { useShallow } from "zustand/react/shallow";
import { getCLIBridge } from "../../core/cli-bridge";
import { getSessionStorage } from "../../core/session-storage";
import type { Session } from "../../core/types";
import { TabBar } from "./TabBar";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";
import { SessionView } from "../messages/SessionView";
import { type InputAreaHandle } from "../input/InputArea";
import { WelcomeView } from "./WelcomeView";
import { CommandPalette } from "./CommandPalette";
import { SessionBrowser } from "./SessionBrowser";
import { UsageDashboard } from "./UsageDashboard";
import { ContextViewer } from "./ContextViewer";
import { SkillsBrowser } from "./SkillsBrowser";
import { SettingsPanel } from "./SettingsPanel";
import { TemplatesBrowser } from "./TemplatesBrowser";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { CrashRecoveryModal } from "./CrashRecoveryModal";
import { registerDefaultCommands, commandRegistry } from "../../modules/commands/registry";

export function AppShell() {
  const activeSessionId = useStore((state) => state.activeSessionId);
  const sessionsMap = useStore(useShallow((state) => state.sessions));
  const sidebarOpen = useStore((state) => state.sidebarOpen);

  // Memoize derived values to prevent infinite loops
  const sessions = useMemo(() => Object.values(sessionsMap), [sessionsMap]);
  const activeSession = useMemo(() => {
    if (!activeSessionId) return null;
    return sessionsMap[activeSessionId] || null;
  }, [activeSessionId, sessionsMap]);
  const createSession = useStore((state) => state.createSession);
  const setActiveSession = useStore((state) => state.setActiveSession);
  const closeSession = useStore((state) => state.closeSession);
  const setYoloMode = useStore((state) => state.setYoloMode);
  const yoloMode = useStore((state) => state.yoloMode);
  const defaultModel = useStore((state) => state.defaultModel);

  // Command Palette state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Session Browser state
  const [sessionBrowserOpen, setSessionBrowserOpen] = useState(false);

  // Usage Dashboard state
  const [usageDashboardOpen, setUsageDashboardOpen] = useState(false);

  // Context Viewer state
  const [contextViewerOpen, setContextViewerOpen] = useState(false);

  // Skills Browser state
  const [skillsBrowserOpen, setSkillsBrowserOpen] = useState(false);

  // Settings Panel state
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);

  // Templates Browser state
  const [templatesBrowserOpen, setTemplatesBrowserOpen] = useState(false);

  // Keyboard Shortcuts Modal state
  const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = useState(false);

  // Crash Recovery Modal state
  const [crashRecoveryOpen, setCrashRecoveryOpen] = useState(false);
  const [crashedSessions, setCrashedSessions] = useState<Session[]>([]);

  // Ref to track if new session dialog is already open
  const isCreatingSessionRef = useRef(false);

  // Ref to InputArea for template insertion
  const inputAreaRef = useRef<InputAreaHandle>(null);

  // Register commands on mount
  useEffect(() => {
    // Load recent commands from localStorage
    commandRegistry.loadRecentCommands();

    // Register default commands
    registerDefaultCommands({
      newSession: () => handleNewSession(),
      closeSession: () => {
        if (activeSession) {
          const cliBridge = getCLIBridge();
          cliBridge.terminateSession(activeSession.id).catch(console.error);
          closeSession(activeSession.id);
        }
      },
      showSettings: () => {
        setSettingsPanelOpen(true);
      },
      showUsage: () => {
        setUsageDashboardOpen(true);
      },
      showHistory: () => {
        setSessionBrowserOpen(true);
      },
      toggleYoloMode: () => {
        setYoloMode(!yoloMode);
      },
      clearChat: () => {
        // TODO: Implement clear chat
        console.log("Clear chat not yet implemented");
      },
      interruptSession: () => {
        if (activeSession) {
          const cliBridge = getCLIBridge();
          cliBridge.terminateSession(activeSession.id).catch(console.error);
        }
      },
      showHelp: () => {
        setKeyboardShortcutsOpen(true);
      },
    });

    // Register additional commands for new features
    commandRegistry.register({
      id: 'nav.context',
      label: 'Context Viewer',
      description: 'View CLAUDE.md and hooks',
      category: 'navigation',
      shortcut: 'Ctrl+K',
      icon: 'info',
      action: () => setContextViewerOpen(true)
    }, 80);

    commandRegistry.register({
      id: 'nav.skills',
      label: 'Skills Browser',
      description: 'Browse and manage skills',
      category: 'navigation',
      icon: 'bolt',
      action: () => setSkillsBrowserOpen(true)
    }, 81);

    // Register Templates command
    commandRegistry.register({
      id: 'nav.templates',
      label: 'Templates',
      description: 'Browse and manage prompt templates',
      category: 'navigation',
      shortcut: 'Ctrl+T',
      icon: 'template',
      keywords: ['prompt', 'template', 'snippet', 'macro'],
      action: () => setTemplatesBrowserOpen(true)
    }, 82);

    // Register Keyboard Shortcuts command
    commandRegistry.register({
      id: 'help.shortcuts',
      label: 'Keyboard Shortcuts',
      description: 'View all keyboard shortcuts',
      category: 'help',
      shortcut: 'Ctrl+?',
      icon: 'keyboard',
      keywords: ['hotkey', 'keybind', 'shortcut', 'help'],
      action: () => setKeyboardShortcutsOpen(true)
    }, 83);

    // Register session switching commands
    const updateSessionCommands = () => {
      // Remove old session commands
      const allCommands = commandRegistry.getAll();
      allCommands
        .filter((cmd) => cmd.id.startsWith("session.switch."))
        .forEach((cmd) => commandRegistry.unregister(cmd.id));

      // Add new session commands
      Object.values(sessionsMap).forEach((session, index) => {
        const sessionName = session.working_dir.split(/[/\\]/).pop() || session.id;
        commandRegistry.register(
          {
            id: `session.switch.${session.id}`,
            label: `Switch to ${sessionName}`,
            description: session.working_dir,
            category: "session",
            shortcut: index < 9 ? `Ctrl+${index + 1}` : undefined,
            icon: "arrow-right",
            action: () => setActiveSession(session.id),
            keywords: ["switch", "session", sessionName],
          },
          70 + index
        );
      });
    };

    updateSessionCommands();

    // Update session commands when sessions change
    const unsubscribe = useStore.subscribe(
      (state) => state.sessions,
      () => updateSessionCommands()
    );

    return () => {
      unsubscribe();
    };
  }, [activeSession, closeSession, setYoloMode, yoloMode, sessionsMap, setActiveSession, setContextViewerOpen, setSkillsBrowserOpen, setSettingsPanelOpen, setTemplatesBrowserOpen, setKeyboardShortcutsOpen]);

  // Handle new session creation (from tray or hotkey)
  const handleNewSession = useCallback(async () => {
    if (isCreatingSessionRef.current) return;

    try {
      isCreatingSessionRef.current = true;

      // Dynamically import dialog plugin to avoid crash on load
      const { open } = await import("@tauri-apps/plugin-dialog");

      const selectedDir = await open({
        directory: true,
        multiple: false,
        title: "Select Project Directory",
      });

      if (!selectedDir) return;

      const workingDir = selectedDir as string;
      const cliBridge = getCLIBridge();

      const sessionId = await cliBridge.createSession({
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
    let cleanup: (() => void) | null = null;

    // Dynamically import to avoid crashes
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen("tray-new-session", () => {
        handleNewSession();
      }).then((unlisten) => {
        cleanup = unlisten;
      }).catch((error) => {
        console.warn("Failed to listen for tray events:", error);
      });
    }).catch((error) => {
      console.warn("Failed to import event API:", error);
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [handleNewSession]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+P: Open command palette
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Ctrl+H: Open session browser (History)
      if (e.ctrlKey && e.key === "h") {
        e.preventDefault();
        setSessionBrowserOpen(true);
        return;
      }

      // Ctrl+K: Open context viewer
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        setContextViewerOpen(true);
        return;
      }

      // Ctrl+T: Open templates browser
      if (e.ctrlKey && e.key === "t") {
        e.preventDefault();
        setTemplatesBrowserOpen(true);
        return;
      }

      // Ctrl+? or Ctrl+/: Open keyboard shortcuts modal
      if (e.ctrlKey && (e.key === "?" || e.key === "/")) {
        e.preventDefault();
        setKeyboardShortcutsOpen(true);
        return;
      }

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
  }, [activeSession, setActiveSession, handleNewSession, setContextViewerOpen, setTemplatesBrowserOpen, setKeyboardShortcutsOpen]);

  // Handle template insertion
  const handleInsertTemplate = useCallback((content: string) => {
    inputAreaRef.current?.insertText(content);
    setTemplatesBrowserOpen(false);
  }, []);

  // Check for crashed sessions on startup
  useEffect(() => {
    const checkForCrashedSessions = async () => {
      try {
        const storage = getSessionStorage();
        await storage.initialize();
        const crashed = await storage.detectCrashedSessions();
        if (crashed.length > 0) {
          setCrashedSessions(crashed);
          setCrashRecoveryOpen(true);
        }
      } catch (error) {
        console.warn("Failed to check for crashed sessions:", error);
      }
    };

    checkForCrashedSessions();
  }, []);

  // Mark sessions as clean on window unload
  useEffect(() => {
    const handleBeforeUnload = async () => {
      try {
        const storage = getSessionStorage();
        await storage.markAllCleanShutdown();
      } catch (error) {
        console.warn("Failed to mark clean shutdown:", error);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Handle crash recovery actions
  const handleRestoreSession = useCallback((sessionId: string) => {
    const session = crashedSessions.find((s) => s.id === sessionId);
    if (session) {
      // Add session to store
      createSession(session);
      // Remove from crashed sessions list
      setCrashedSessions((prev) => prev.filter((s) => s.id !== sessionId));
      // Mark as clean (since it's now restored)
      getSessionStorage().markCleanShutdown(sessionId).catch(console.error);
    }
  }, [crashedSessions, createSession]);

  const handleDiscardSession = useCallback(async (sessionId: string) => {
    try {
      const storage = getSessionStorage();
      await storage.deleteSession(sessionId);
      setCrashedSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error("Failed to discard session:", error);
    }
  }, []);

  const handleCloseCrashRecovery = useCallback(() => {
    setCrashRecoveryOpen(false);
    // Mark remaining crashed sessions as clean (user chose to decide later)
    crashedSessions.forEach((s) => {
      getSessionStorage().markCleanShutdown(s.id).catch(console.error);
    });
  }, [crashedSessions]);

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--color-bg-base)',
      color: 'var(--color-text-primary)',
      overflow: 'hidden'
    }}>
      {/* Tab Bar */}
      <TabBar sessions={sessions} activeSession={activeSession} />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        {sidebarOpen && <Sidebar />}

        {/* Session Content */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeSession ? (
            <SessionView session={activeSession} inputRef={inputAreaRef} />
          ) : (
            <WelcomeView />
          )}
        </main>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Session Browser */}
      <SessionBrowser
        isOpen={sessionBrowserOpen}
        onClose={() => setSessionBrowserOpen(false)}
      />

      {/* Usage Dashboard */}
      <UsageDashboard
        isOpen={usageDashboardOpen}
        onClose={() => setUsageDashboardOpen(false)}
      />

      {/* Context Viewer */}
      <ContextViewer
        isOpen={contextViewerOpen}
        onClose={() => setContextViewerOpen(false)}
      />

      {/* Skills Browser */}
      <SkillsBrowser
        isOpen={skillsBrowserOpen}
        onClose={() => setSkillsBrowserOpen(false)}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={settingsPanelOpen}
        onClose={() => setSettingsPanelOpen(false)}
      />

      {/* Templates Browser */}
      <TemplatesBrowser
        isOpen={templatesBrowserOpen}
        onClose={() => setTemplatesBrowserOpen(false)}
        onInsertTemplate={handleInsertTemplate}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={keyboardShortcutsOpen}
        onClose={() => setKeyboardShortcutsOpen(false)}
      />

      {/* Crash Recovery Modal */}
      {crashRecoveryOpen && (
        <CrashRecoveryModal
          crashedSessions={crashedSessions}
          onRestore={handleRestoreSession}
          onDiscard={handleDiscardSession}
          onClose={handleCloseCrashRecovery}
        />
      )}
    </div>
  );
}
