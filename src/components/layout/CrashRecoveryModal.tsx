/**
 * CrashRecoveryModal - Modal for recovering sessions after a crash
 *
 * Displays sessions that were not cleanly shut down and allows
 * the user to restore or discard them.
 */

import type { Session } from "../../core/types";

export interface CrashRecoveryModalProps {
  /** Sessions that were not cleanly shut down */
  crashedSessions: Session[];

  /** Callback when user wants to restore a session */
  onRestore: (sessionId: string) => void;

  /** Callback when user wants to discard a session */
  onDiscard: (sessionId: string) => void;

  /** Callback when modal should close */
  onClose: () => void;
}

export function CrashRecoveryModal({
  crashedSessions,
  onRestore,
  onDiscard,
  onClose,
}: CrashRecoveryModalProps) {
  if (crashedSessions.length === 0) return null;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getSessionName = (session: Session) => {
    if (session.displayName) return session.displayName;
    // Extract folder name from working_dir
    const parts = session.working_dir.split(/[/\\]/);
    return parts[parts.length - 1] || session.id.slice(0, 8);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          zIndex: 1000,
          animation: "fadeIn 0.15s ease-out",
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(550px, 90vw)",
          maxHeight: "80vh",
          backgroundColor: "#1e3a4a",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          zIndex: 1001,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "slideDown 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #2a4a5a",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {/* Warning Icon */}
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "rgba(233, 196, 106, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#e9c46a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 600,
                color: "#e8e8e8",
              }}
            >
              Session Recovery
            </h2>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "13px",
                color: "#8a9ba8",
              }}
            >
              {crashedSessions.length === 1
                ? "1 session was not properly closed"
                : `${crashedSessions.length} sessions were not properly closed`}
            </p>
          </div>
        </div>

        {/* Sessions List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 0",
          }}
        >
          {crashedSessions.map((session) => (
            <div
              key={session.id}
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #2a4a5a",
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              {/* Session Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#e8e8e8",
                    marginBottom: "4px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {getSessionName(session)}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#8a9ba8",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={session.working_dir}
                >
                  {session.working_dir}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#6a7a8a",
                    marginTop: "4px",
                    display: "flex",
                    gap: "12px",
                  }}
                >
                  <span>Created: {formatDate(session.created_at)}</span>
                  <span>Messages: {session.transcript.length}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <button
                  onClick={() => onDiscard(session.id)}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 500,
                    backgroundColor: "transparent",
                    border: "1px solid #4a5a6a",
                    borderRadius: "6px",
                    color: "#a8b8c8",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#2a3a4a";
                    e.currentTarget.style.borderColor = "#5a6a7a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderColor = "#4a5a6a";
                  }}
                >
                  Discard
                </button>
                <button
                  onClick={() => onRestore(session.id)}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 500,
                    backgroundColor: "#2a9d8f",
                    border: "none",
                    borderRadius: "6px",
                    color: "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#3ab09f";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#2a9d8f";
                  }}
                >
                  Restore
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #2a4a5a",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => {
              // Discard all sessions
              crashedSessions.forEach((s) => onDiscard(s.id));
              onClose();
            }}
            style={{
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 500,
              backgroundColor: "transparent",
              border: "1px solid #e76f51",
              borderRadius: "6px",
              color: "#e76f51",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(231, 111, 81, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Discard All
          </button>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 500,
                backgroundColor: "transparent",
                border: "1px solid #4a5a6a",
                borderRadius: "6px",
                color: "#a8b8c8",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#2a3a4a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Decide Later
            </button>
            <button
              onClick={() => {
                // Restore all sessions
                crashedSessions.forEach((s) => onRestore(s.id));
                onClose();
              }}
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 500,
                backgroundColor: "#2a9d8f",
                border: "none",
                borderRadius: "6px",
                color: "#ffffff",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#3ab09f";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#2a9d8f";
              }}
            >
              Restore All
            </button>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) translateY(0);
          }
        }
      `}</style>
    </>
  );
}
