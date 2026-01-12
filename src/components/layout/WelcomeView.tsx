/**
 * WelcomeView - Displayed when no session is active
 */

export function WelcomeView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-6">
        <svg
          className="w-16 h-16 text-secondary mx-auto"
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
      <h1 className="text-2xl font-semibold mb-2">
        Welcome to Claude GUI Companion
      </h1>
      <p className="text-secondary mb-6 max-w-md">
        A modern GUI for Claude Code CLI. Start a new session to begin
        working with Claude.
      </p>
      <div className="flex gap-4">
        <button
          className="px-4 py-2 bg-tertiary hover:bg-tertiary/80 rounded-lg transition-colors flex items-center gap-2"
          data-testid="new-session-button"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Session
        </button>
        <button className="px-4 py-2 border border-default hover:bg-tertiary rounded-lg transition-colors">
          Open Recent
        </button>
      </div>
      <div className="mt-8 text-sm text-muted">
        <p>
          Press <kbd className="px-1.5 py-0.5 bg-tertiary rounded text-xs">Ctrl+Shift+Space</kbd> to
          show/hide this window
        </p>
      </div>
    </div>
  );
}
