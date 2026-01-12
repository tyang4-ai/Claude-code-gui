/**
 * Sidebar - Collapsible sidebar for additional features
 *
 * Contains:
 * - Session history
 * - Quick actions
 * - Module toggles
 */

import { useStore } from "../../core/store";

export function Sidebar() {
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const yoloMode = useStore((state) => state.yoloMode);
  const setYoloMode = useStore((state) => state.setYoloMode);

  return (
    <aside className="w-64 bg-secondary border-r border-default flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-default">
        <span className="font-semibold text-sm">Quick Actions</span>
        <button
          className="p-1 rounded hover:bg-tertiary transition-colors"
          onClick={toggleSidebar}
          aria-label="Close sidebar"
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
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* YOLO Mode Toggle */}
        <div className="p-3 bg-tertiary rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">YOLO Mode</div>
              <div className="text-xs text-secondary">Auto-accept all edits</div>
            </div>
            <button
              className={`
                relative w-11 h-6 rounded-full transition-colors
                ${yoloMode ? "bg-green-500" : "bg-gray-600"}
              `}
              onClick={() => setYoloMode(!yoloMode)}
              role="switch"
              aria-checked={yoloMode}
              data-testid="yolo-toggle"
            >
              <span
                className={`
                  absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform
                  ${yoloMode ? "translate-x-5" : "translate-x-0"}
                `}
              />
            </button>
          </div>
        </div>

        {/* Session History Section */}
        <div>
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
            Recent Sessions
          </h3>
          <div className="text-sm text-muted">No recent sessions</div>
        </div>

        {/* Quick Commands */}
        <div>
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
            Quick Commands
          </h3>
          <div className="space-y-1">
            {["/help", "/cost", "/clear", "/compact"].map((cmd) => (
              <button
                key={cmd}
                className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-tertiary transition-colors font-mono"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-default text-xs text-muted">
        Claude GUI Companion v0.1.0
      </div>
    </aside>
  );
}
