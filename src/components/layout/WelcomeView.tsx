/**
 * WelcomeView - Displayed when no session is active
 */

import { useCallback, useState, useEffect } from "react";
import { useStore } from "../../core/store";
import { getCLIBridge } from "../../core/cli-bridge";

// Check if running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

export function WelcomeView() {
  const [isCreating, setIsCreating] = useState(false);
  const [showPathInput, setShowPathInput] = useState(false);
  const [pathInput, setPathInput] = useState("");
  const [inBrowserMode, setInBrowserMode] = useState(false);
  const createSession = useStore((state) => state.createSession);
  const defaultModel = useStore((state) => state.defaultModel);

  useEffect(() => {
    setInBrowserMode(!isTauri());
  }, []);

  const handleNewSession = useCallback(async () => {
    if (isCreating) return;

    // If in browser mode, show path input instead of native dialog
    if (inBrowserMode) {
      setShowPathInput(true);
      return;
    }

    try {
      setIsCreating(true);

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
      setIsCreating(false);
    }
  }, [isCreating, defaultModel, createSession, inBrowserMode]);

  const handleCreateWithPath = useCallback(() => {
    if (!pathInput.trim()) return;

    const workingDir = pathInput.trim();
    const sessionId = `session-${Date.now()}`;

    createSession({
      id: sessionId,
      working_dir: workingDir,
      model: defaultModel,
      status: "idle",
      created_at: Date.now(),
      prompt_count: 0,
      total_cost_usd: 0,
    });

    setShowPathInput(false);
    setPathInput("");
  }, [pathInput, defaultModel, createSession]);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      textAlign: 'center',
      color: '#e8e8e8'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <svg
          style={{ width: '64px', height: '64px', color: '#2a9d8f', margin: '0 auto' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px', color: '#e8e8e8' }}>
        Welcome to Claude GUI Companion
      </h1>
      <p style={{ color: '#a0a0a0', marginBottom: '24px', maxWidth: '400px' }}>
        A modern GUI for Claude Code CLI. Start a new session to begin
        working with Claude.
      </p>
      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          style={{
            padding: '10px 20px',
            backgroundColor: '#2a9d8f',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            cursor: isCreating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 500,
            fontSize: '14px',
            opacity: isCreating ? 0.7 : 1,
          }}
          onClick={handleNewSession}
          disabled={isCreating}
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
          {isCreating ? "Creating..." : "New Session"}
        </button>
        <button
          style={{
            padding: '10px 20px',
            backgroundColor: 'transparent',
            border: '1px solid #2a9d8f',
            borderRadius: '8px',
            color: '#2a9d8f',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '14px',
          }}
          onClick={() => alert('Recent sessions feature coming soon!')}
        >
          Open Recent
        </button>
      </div>
      <div style={{ marginTop: '32px', fontSize: '14px', color: '#a0a0a0' }}>
        <p>
          Press <kbd style={{ padding: '2px 6px', backgroundColor: '#1d3d47', borderRadius: '4px', fontSize: '12px', color: '#e9c46a' }}>Ctrl+Shift+Space</kbd> to
          show/hide this window
        </p>
      </div>

      {/* Browser mode indicator */}
      {inBrowserMode && (
        <div style={{ marginTop: '16px', fontSize: '12px', color: '#e9c46a', padding: '8px 16px', backgroundColor: '#1d3d47', borderRadius: '8px' }}>
          Running in browser mode - some features require the Tauri desktop app
        </div>
      )}

      {/* Path input modal for browser mode */}
      {showPathInput && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowPathInput(false)}
        >
          <div
            style={{
              backgroundColor: '#1d3d47',
              borderRadius: '12px',
              padding: '24px',
              width: '500px',
              maxWidth: '90%',
              border: '1px solid #2a9d8f',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#e8e8e8' }}>
              New Session
            </h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#a0a0a0' }}>
              Enter the project directory path:
            </p>
            <input
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateWithPath();
                if (e.key === 'Escape') setShowPathInput(false);
              }}
              placeholder="C:\Users\...\my-project"
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                backgroundColor: '#264653',
                border: '1px solid #2a9d8f',
                borderRadius: '8px',
                color: '#e8e8e8',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              data-testid="path-input"
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPathInput(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid #a0a0a0',
                  borderRadius: '6px',
                  color: '#a0a0a0',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWithPath}
                disabled={!pathInput.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: pathInput.trim() ? '#2a9d8f' : '#4a4a4a',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  cursor: pathInput.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                }}
              >
                Create Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
