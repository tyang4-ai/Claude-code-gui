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

// SVG Icon components
const TerminalIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const HelpCircleIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DollarSignIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SettingsIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ZapIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const HistoryIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronLeftIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

// QuickAction helper component - displays icon + label + description in a row
interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick?: () => void;
}

function QuickAction({ icon: Icon, label, description, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '8px',
        borderRadius: 'var(--radius-md)',
        background: 'none',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background-color var(--transition-fast)',
        color: 'var(--color-text-primary)'
      }}
      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(88, 166, 255, 0.1)'}
      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <Icon style={{ width: '16px', height: '16px', color: 'var(--color-text-secondary)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', fontFamily: 'monospace' }}>{label}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</div>
      </div>
    </button>
  );
}

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
          <div style={{ display: 'flex', flex: 1 }}>
            <button
              onClick={() => setActiveTab('quick')}
              style={{
                flex: 1,
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'quick' ? '2px solid var(--color-accent)' : '2px solid transparent',
                color: activeTab === 'quick' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-medium)',
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
                position: 'relative'
              }}
            >
              Quick Actions
            </button>
            <button
              onClick={() => setActiveTab('mcp')}
              style={{
                flex: 1,
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'mcp' ? '2px solid var(--color-accent)' : '2px solid transparent',
                color: activeTab === 'mcp' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-medium)',
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
                position: 'relative'
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
              transition: 'color var(--transition-fast)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={toggleSidebar}
            aria-label="Close sidebar"
          >
            <ChevronLeftIcon style={{ width: '16px', height: '16px' }} />
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
              backgroundColor: 'rgba(210, 153, 34, 0.1)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '16px',
              border: '1px solid rgba(210, 153, 34, 0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ZapIcon style={{ width: '16px', height: '16px' }} />
                  <span style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)', color: 'var(--color-warning)' }}>YOLO Mode</span>
                </div>
                <button
                  style={{
                    position: 'relative',
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: yoloMode ? 'var(--color-warning)' : 'var(--color-bg-overlay)',
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
                fontWeight: 'var(--font-medium)',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px'
              }}>
                Recent
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px',
                  color: 'var(--color-text-muted)',
                  fontSize: 'var(--text-sm)'
                }}>
                  <HistoryIcon style={{ width: '16px', height: '16px', opacity: 0.5 }} />
                  <span>No recent sessions</span>
                </div>
              </div>
            </div>

            {/* Quick Commands */}
            <div>
              <h3 style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-medium)',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px'
              }}>
                Commands
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <QuickAction
                  icon={TerminalIcon}
                  label="/clear"
                  description="Clear conversation"
                  onClick={() => alert('Command "/clear" requires an active session')}
                />
                <QuickAction
                  icon={HelpCircleIcon}
                  label="/help"
                  description="Show help"
                  onClick={() => alert('Command "/help" requires an active session')}
                />
                <QuickAction
                  icon={DollarSignIcon}
                  label="/cost"
                  description="Show API cost"
                  onClick={() => alert('Command "/cost" requires an active session')}
                />
                <QuickAction
                  icon={SettingsIcon}
                  label="/config"
                  description="Open settings"
                  onClick={() => alert('Command "/config" requires an active session')}
                />
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
