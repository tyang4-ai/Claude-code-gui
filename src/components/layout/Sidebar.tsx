/**
 * Sidebar - Collapsible sidebar for additional features
 *
 * Contains:
 * - Session history
 * - Quick actions
 * - Module toggles
 */

import { useStore } from "../../core/store";
import { useState } from "react";
import { MCPPanel } from "../mcp/MCPPanel";

export function Sidebar() {
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const yoloMode = useStore((state) => state.yoloMode);
  const setYoloMode = useStore((state) => state.setYoloMode);
  const [activeTab, setActiveTab] = useState<'quick' | 'mcp'>('quick');

  return (
    <aside style={{
      width: '256px',
      backgroundColor: 'var(--color-bg-surface)',
      borderRight: '1px solid var(--color-border-muted)',
      boxShadow: '4px 0 16px rgba(0, 0, 0, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      color: 'var(--color-text-primary)'
    }}>
      {/* Header with Tabs */}
      <div style={{ borderBottom: '1px solid var(--color-border-muted)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('quick')}
              style={{
                padding: '4px 12px',
                background: activeTab === 'quick' ? 'var(--color-bg-elevated)' : 'transparent',
                border: '1px solid',
                borderColor: activeTab === 'quick' ? 'var(--color-border-accent)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
                color: activeTab === 'quick' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                transition: 'all var(--transition-base)'
              }}
            >
              Quick Actions
            </button>
            <button
              onClick={() => setActiveTab('mcp')}
              style={{
                padding: '4px 12px',
                background: activeTab === 'mcp' ? 'var(--color-bg-elevated)' : 'transparent',
                border: '1px solid',
                borderColor: activeTab === 'mcp' ? 'var(--color-border-accent)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
                color: activeTab === 'mcp' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                transition: 'all var(--transition-base)'
              }}
            >
              MCP Servers
            </button>
          </div>
          <button
            style={{
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              transition: 'color var(--transition-fast)'
            }}
            onClick={toggleSidebar}
            aria-label="Close sidebar"
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
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'quick' ? (
          <div style={{ padding: '12px' }}>
            {/* YOLO Mode Toggle */}
            <div style={{
              padding: '12px',
              backgroundColor: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              border: '1px solid var(--color-border-muted)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-base)' }}>YOLO Mode</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Auto-accept all edits</div>
                </div>
                <button
                  style={{
                    position: 'relative',
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: yoloMode ? 'var(--color-accent)' : 'var(--color-bg-overlay)',
                    transition: 'background-color var(--transition-base)'
                  }}
                  onClick={() => setYoloMode(!yoloMode)}
                  role="switch"
                  aria-checked={yoloMode}
                  data-testid="yolo-toggle"
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '4px',
                      left: yoloMode ? '24px' : '4px',
                      width: '16px',
                      height: '16px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: 'left var(--transition-base)',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  />
                </button>
              </div>
            </div>

            {/* Session History Section */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-semibold)',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px'
              }}>
                Recent Sessions
              </h3>
              <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-muted)' }}>No recent sessions</div>
            </div>

            {/* Quick Commands */}
            <div>
              <h3 style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-semibold)',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px'
              }}>
                Quick Commands
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {["/help", "/cost", "/clear", "/compact"].map((cmd) => (
                  <button
                    key={cmd}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--text-base)',
                      fontFamily: 'monospace',
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-accent)',
                      cursor: 'pointer',
                      transition: 'background-color var(--transition-fast)'
                    }}
                    onClick={() => alert(`Command "${cmd}" requires an active session`)}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-overlay)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <MCPPanel />
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid var(--color-border-muted)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-secondary)'
      }}>
        Claude GUI Companion v0.1.0
      </div>
    </aside>
  );
}
