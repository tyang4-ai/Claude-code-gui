/**
 * SettingsPanel - Dropdown settings panel
 */

import { useStore } from "../../core/store";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const yoloMode = useStore((state) => state.yoloMode);
  const setYoloMode = useStore((state) => state.setYoloMode);
  const defaultModel = useStore((state) => state.defaultModel);
  const setDefaultModel = useStore((state) => state.setDefaultModel);
  const globalHotkey = useStore((state) => state.globalHotkey);
  const setGlobalHotkey = useStore((state) => state.setGlobalHotkey);
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);

  const models = [
    { value: "sonnet", label: "Claude Sonnet" },
    { value: "opus", label: "Claude Opus" },
    { value: "haiku", label: "Claude Haiku" },
  ];

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '44px',
        right: '8px',
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        minWidth: '280px',
        zIndex: 100,
        boxShadow: 'var(--shadow-xl)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--color-border-muted)'
      }}>
        <span style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-lg)' }}>Settings</span>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            transition: 'color var(--transition-fast)'
          }}
          onClick={onClose}
        >
          <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Default Model */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--font-medium)',
          marginBottom: '6px',
          color: 'var(--color-text-primary)'
        }}>
          Default Model
        </label>
        <select
          value={defaultModel}
          onChange={(e) => setDefaultModel(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: 'var(--color-bg-base)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--text-base)',
            cursor: 'pointer'
          }}
        >
          {models.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>

      {/* YOLO Mode */}
      <div style={{
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)' }}>YOLO Mode</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Auto-accept all file edits</div>
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

      {/* Theme */}
      <div style={{
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)' }}>Dark Mode</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Toggle dark/light theme</div>
        </div>
        <button
          style={{
            position: 'relative',
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: theme === 'dark' ? 'var(--color-accent)' : 'var(--color-bg-overlay)',
            transition: 'background-color var(--transition-base)'
          }}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          role="switch"
          aria-checked={theme === 'dark'}
        >
          <span
            style={{
              position: 'absolute',
              top: '4px',
              left: theme === 'dark' ? '24px' : '4px',
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

      {/* Global Hotkey */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--font-medium)',
          marginBottom: '6px',
          color: 'var(--color-text-primary)'
        }}>
          Global Hotkey
        </label>
        <input
          type="text"
          value={globalHotkey}
          onChange={(e) => setGlobalHotkey(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: 'var(--color-bg-base)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--text-base)',
            boxSizing: 'border-box'
          }}
          placeholder="e.g., CommandOrControl+Shift+Space"
        />
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Show/hide window globally
        </div>
      </div>

      {/* Keyboard Shortcuts Info */}
      <div style={{
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: '1px solid var(--color-border-muted)'
      }}>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
          Keyboard Shortcuts
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>New Session</span>
            <kbd style={{ padding: '2px 6px', backgroundColor: 'var(--color-bg-base)', borderRadius: 'var(--radius-sm)', color: 'var(--color-accent)' }}>Ctrl+N</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Close Session</span>
            <kbd style={{ padding: '2px 6px', backgroundColor: 'var(--color-bg-base)', borderRadius: 'var(--radius-sm)', color: 'var(--color-accent)' }}>Ctrl+W</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Switch Tabs</span>
            <kbd style={{ padding: '2px 6px', backgroundColor: 'var(--color-bg-base)', borderRadius: 'var(--radius-sm)', color: 'var(--color-accent)' }}>Ctrl+Tab</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
