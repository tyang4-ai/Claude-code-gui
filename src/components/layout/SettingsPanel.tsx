/**
 * SettingsPanel - Centered modal settings panel with category navigation
 */

import React, { useState, type ReactNode } from "react";
import { useStore } from "../../core/store";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsCategory = "appearance" | "editor" | "notifications" | "security" | "data" | "about";

// Icon components
function PaletteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

function KeyboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M7 16h10" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

// Toggle Switch Component
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        border: 'none',
        cursor: 'pointer',
        backgroundColor: checked ? 'var(--color-accent)' : 'var(--color-bg-overlay)',
        transition: 'background-color var(--transition-base)',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '4px',
          left: checked ? '24px' : '4px',
          width: '16px',
          height: '16px',
          backgroundColor: 'white',
          borderRadius: '50%',
          transition: 'left var(--transition-base)',
          boxShadow: 'var(--shadow-sm)',
        }}
      />
    </button>
  );
}

// Settings Group Component
function SettingGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h4
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--font-medium)',
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '12px',
        }}
      >
        {title}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {children}
      </div>
    </div>
  );
}

// Settings Row Component
function SettingRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 0',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, paddingRight: '16px' }}>
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)' }}>
          {label}
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
          {description}
        </p>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<SettingsCategory>("appearance");

  // Store state
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const yoloMode = useStore((state) => state.yoloMode);
  const setYoloMode = useStore((state) => state.setYoloMode);
  const defaultModel = useStore((state) => state.defaultModel);
  const setDefaultModel = useStore((state) => state.setDefaultModel);
  const globalHotkey = useStore((state) => state.globalHotkey);
  const setGlobalHotkey = useStore((state) => state.setGlobalHotkey);

  // Local settings state (these could be moved to the store if needed)
  const [settings, setSettings] = useState({
    notifications: true,
    soundEffects: false,
    autoSave: true,
    compactMode: false,
    syntaxHighlighting: true,
    lineNumbers: true,
    wordWrap: false,
    confirmBeforeRun: true,
    autoApproveReads: false,
  });

  const models = [
    { value: "sonnet", label: "Claude Sonnet" },
    { value: "opus", label: "Claude Opus" },
    { value: "haiku", label: "Claude Haiku" },
  ];

  const sections: { id: SettingsCategory; label: string; icon: () => React.ReactElement }[] = [
    { id: "appearance", label: "Appearance", icon: PaletteIcon },
    { id: "editor", label: "Editor", icon: KeyboardIcon },
    { id: "notifications", label: "Notifications", icon: BellIcon },
    { id: "security", label: "Security", icon: ShieldIcon },
    { id: "data", label: "Data & Storage", icon: DatabaseIcon },
    { id: "about", label: "About", icon: InfoIcon },
  ];

  if (!isOpen) return null;

  const themeOptions = [
    { value: "light" as const, icon: SunIcon, label: "Light" },
    { value: "dark" as const, icon: MoonIcon, label: "Dark" },
    { value: "system" as const, icon: MonitorIcon, label: "System" },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '672px',
          maxHeight: '80vh',
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        {/* Sidebar Navigation */}
        <div
          style={{
            width: '192px',
            backgroundColor: 'rgba(var(--color-bg-overlay), 0.3)',
            borderRight: '1px solid var(--color-border)',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-semibold)',
              padding: '12px',
              color: 'var(--color-text-primary)',
            }}
          >
            Settings
          </h2>
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: 'var(--text-sm)',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all var(--transition-base)',
                    backgroundColor: isActive ? 'rgba(130, 230, 190, 0.15)' : 'transparent',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-overlay)';
                      e.currentTarget.style.color = 'var(--color-text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }
                  }}
                >
                  <Icon />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <h3
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-semibold)',
                textTransform: 'capitalize',
                color: 'var(--color-text-primary)',
              }}
            >
              {activeSection === "data" ? "Data & Storage" : activeSection}
            </h3>
            <button
              onClick={onClose}
              style={{
                padding: '6px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-overlay)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              <CloseIcon />
            </button>
          </div>

          {/* Settings Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
            }}
          >
            {activeSection === "appearance" && (
              <>
                <SettingGroup title="Theme">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {themeOptions.map((option) => {
                      const Icon = option.icon;
                      const isSelected = theme === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => setTheme(option.value)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-md)',
                            border: `1px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                            backgroundColor: isSelected ? 'rgba(130, 230, 190, 0.1)' : 'transparent',
                            color: isSelected ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-base)',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = 'var(--color-text-muted)';
                              e.currentTarget.style.color = 'var(--color-text-primary)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = 'var(--color-border)';
                              e.currentTarget.style.color = 'var(--color-text-secondary)';
                            }
                          }}
                        >
                          <Icon />
                          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)' }}>
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </SettingGroup>

                <SettingGroup title="Display">
                  <SettingRow
                    label="Compact Mode"
                    description="Reduce spacing and padding throughout the UI"
                    checked={settings.compactMode}
                    onChange={(v) => setSettings({ ...settings, compactMode: v })}
                  />
                </SettingGroup>

                <SettingGroup title="Default Model">
                  <select
                    value={defaultModel}
                    onChange={(e) => setDefaultModel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--color-bg-base)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                      fontSize: 'var(--text-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    {models.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </SettingGroup>
              </>
            )}

            {activeSection === "editor" && (
              <>
                <SettingGroup title="Code Display">
                  <SettingRow
                    label="Syntax Highlighting"
                    description="Colorize code based on language syntax"
                    checked={settings.syntaxHighlighting}
                    onChange={(v) => setSettings({ ...settings, syntaxHighlighting: v })}
                  />
                  <SettingRow
                    label="Line Numbers"
                    description="Show line numbers in code blocks"
                    checked={settings.lineNumbers}
                    onChange={(v) => setSettings({ ...settings, lineNumbers: v })}
                  />
                  <SettingRow
                    label="Word Wrap"
                    description="Wrap long lines instead of scrolling"
                    checked={settings.wordWrap}
                    onChange={(v) => setSettings({ ...settings, wordWrap: v })}
                  />
                </SettingGroup>

                <SettingGroup title="Behavior">
                  <SettingRow
                    label="Auto Save Sessions"
                    description="Automatically save conversation history"
                    checked={settings.autoSave}
                    onChange={(v) => setSettings({ ...settings, autoSave: v })}
                  />
                </SettingGroup>

                <SettingGroup title="Global Hotkey">
                  <input
                    type="text"
                    value={globalHotkey}
                    onChange={(e) => setGlobalHotkey(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--color-bg-base)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                      fontSize: 'var(--text-sm)',
                    }}
                    placeholder="e.g., CommandOrControl+Shift+Space"
                  />
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    Show/hide window globally
                  </p>
                </SettingGroup>
              </>
            )}

            {activeSection === "notifications" && (
              <SettingGroup title="Alerts">
                <SettingRow
                  label="Desktop Notifications"
                  description="Show notifications when tasks complete"
                  checked={settings.notifications}
                  onChange={(v) => setSettings({ ...settings, notifications: v })}
                />
                <SettingRow
                  label="Sound Effects"
                  description="Play sounds for events and completions"
                  checked={settings.soundEffects}
                  onChange={(v) => setSettings({ ...settings, soundEffects: v })}
                />
              </SettingGroup>
            )}

            {activeSection === "security" && (
              <>
                <SettingGroup title="Tool Permissions">
                  <SettingRow
                    label="Confirm Before Running"
                    description="Ask for confirmation before executing bash commands"
                    checked={settings.confirmBeforeRun}
                    onChange={(v) => setSettings({ ...settings, confirmBeforeRun: v })}
                  />
                  <SettingRow
                    label="Auto-approve File Reads"
                    description="Allow reading files without confirmation"
                    checked={settings.autoApproveReads}
                    onChange={(v) => setSettings({ ...settings, autoApproveReads: v })}
                  />
                </SettingGroup>

                <SettingGroup title="YOLO Mode">
                  <SettingRow
                    label="Enable YOLO Mode"
                    description="Auto-accept all file edits without confirmation"
                    checked={yoloMode}
                    onChange={setYoloMode}
                  />
                </SettingGroup>
              </>
            )}

            {activeSection === "data" && (
              <SettingGroup title="Storage">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)' }}>
                        Conversation History
                      </p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                        Stored in localStorage
                      </p>
                    </div>
                    <button
                      style={{
                        padding: '6px 12px',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--font-medium)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'transparent',
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-base)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-overlay)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)' }}>
                        Cache
                      </p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                        Temporary data
                      </p>
                    </div>
                    <button
                      style={{
                        padding: '6px 12px',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--font-medium)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'transparent',
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-base)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-overlay)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      Clear Cache
                    </button>
                  </div>
                </div>
              </SettingGroup>
            )}

            {activeSection === "about" && (
              <SettingGroup title="Claude Code GUI">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)' }}>
                      Version
                    </p>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                      1.0.0-beta
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)' }}>
                      Claude Model
                    </p>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                      claude-sonnet-4-20250514
                    </p>
                  </div>
                  <div style={{ paddingTop: '8px', display: 'flex', gap: '8px' }}>
                    <button
                      style={{
                        padding: '6px 12px',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--font-medium)',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        backgroundColor: 'rgba(130, 230, 190, 0.1)',
                        color: 'var(--color-accent)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-base)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(130, 230, 190, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(130, 230, 190, 0.1)';
                      }}
                    >
                      Check for Updates
                    </button>
                    <button
                      style={{
                        padding: '6px 12px',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--font-medium)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'transparent',
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-base)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-overlay)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      View Changelog
                    </button>
                  </div>
                </div>
              </SettingGroup>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
