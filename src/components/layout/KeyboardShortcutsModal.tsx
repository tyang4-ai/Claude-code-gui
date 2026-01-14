/**
 * KeyboardShortcutsModal Component
 *
 * A modal dialog displaying all keyboard shortcuts organized by category.
 * Features:
 * - Searchable/filterable shortcuts list
 * - Grouped by category (Session, Navigation, Editing, General)
 * - Dark theme matching existing modals
 * - Keyboard navigation support
 */

import { useState, useEffect, useRef, useMemo } from "react";

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  key: string;
  description: string;
  category: ShortcutCategory;
}

type ShortcutCategory = "session" | "navigation" | "editing" | "general";

const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  session: "Session",
  navigation: "Navigation",
  editing: "Editing",
  general: "General",
};

const CATEGORY_ORDER: ShortcutCategory[] = ["session", "navigation", "editing", "general"];

const ALL_SHORTCUTS: Shortcut[] = [
  // Session shortcuts
  { key: "Ctrl+N", description: "New session", category: "session" },
  { key: "Ctrl+W", description: "Close current session", category: "session" },
  { key: "Ctrl+Tab", description: "Switch to next session", category: "session" },
  { key: "Ctrl+Shift+Tab", description: "Switch to previous session", category: "session" },
  { key: "Ctrl+1-9", description: "Switch to session by number", category: "session" },

  // Navigation shortcuts
  { key: "Ctrl+P", description: "Open command palette", category: "navigation" },
  { key: "Ctrl+K", description: "Open context viewer", category: "navigation" },
  { key: "Ctrl+H", description: "Open session history", category: "navigation" },
  { key: "Ctrl+T", description: "Open templates browser", category: "navigation" },
  { key: "Ctrl+,", description: "Open settings", category: "navigation" },
  { key: "Ctrl+? or Ctrl+/", description: "Open keyboard shortcuts help", category: "navigation" },

  // Editing shortcuts
  { key: "Ctrl+1", description: "Accept pending edit", category: "editing" },
  { key: "Ctrl+2", description: "Reject pending edit", category: "editing" },
  { key: "Ctrl+Enter", description: "Send message", category: "editing" },
  { key: "@", description: "Trigger file autocomplete", category: "editing" },

  // General shortcuts
  { key: "Escape", description: "Close modal / Cancel operation", category: "general" },
  { key: "F1", description: "Show help", category: "general" },
  { key: "Ctrl+Shift+Space", description: "Global hotkey (show/hide window)", category: "general" },
];

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter shortcuts based on search query
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) {
      return ALL_SHORTCUTS;
    }

    const query = searchQuery.toLowerCase();
    return ALL_SHORTCUTS.filter(
      (shortcut) =>
        shortcut.key.toLowerCase().includes(query) ||
        shortcut.description.toLowerCase().includes(query) ||
        CATEGORY_LABELS[shortcut.category].toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const groups: Record<ShortcutCategory, Shortcut[]> = {
      session: [],
      navigation: [],
      editing: [],
      general: [],
    };

    for (const shortcut of filteredShortcuts) {
      groups[shortcut.category].push(shortcut);
    }

    return groups;
  }, [filteredShortcuts]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        color: "#e8e8e8",
      }}
      onClick={onClose}
      data-testid="keyboard-shortcuts-backdrop"
    >
      <div
        style={{
          width: "90%",
          maxWidth: "700px",
          maxHeight: "80%",
          backgroundColor: "#1d3d47",
          borderRadius: "12px",
          border: "1px solid #2a9d8f",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid="keyboard-shortcuts-modal"
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #2a9d8f",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 600, margin: 0 }}>
            Keyboard Shortcuts
          </h2>
          <button
            style={buttonStyle}
            onClick={onClose}
            data-testid="close-button"
          >
            Close
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #333" }}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={inputStyle}
            data-testid="search-input"
          />
        </div>

        {/* Shortcuts List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 24px",
          }}
          data-testid="shortcuts-list"
        >
          {filteredShortcuts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#a0a0a0" }}>
              No shortcuts match your search
            </div>
          ) : (
            CATEGORY_ORDER.map((category) => {
              const shortcuts = groupedShortcuts[category];
              if (shortcuts.length === 0) return null;

              return (
                <div key={category} style={{ marginBottom: "24px" }}>
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#2a9d8f",
                      marginBottom: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {CATEGORY_LABELS[category]}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {shortcuts.map((shortcut, index) => (
                      <div
                        key={`${category}-${index}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          backgroundColor: "#264653",
                          borderRadius: "6px",
                          border: "1px solid #2a9d8f40",
                        }}
                        data-testid={`shortcut-${shortcut.key.replace(/[^a-zA-Z0-9]/g, "-")}`}
                      >
                        <span style={{ fontSize: "14px", color: "#e8e8e8" }}>
                          {shortcut.description}
                        </span>
                        <kbd style={kbdStyle}>{shortcut.key}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid #2a9d8f",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
            color: "#a0a0a0",
          }}
        >
          <div>
            {filteredShortcuts.length} shortcut{filteredShortcuts.length !== 1 ? "s" : ""}
          </div>
          <div>
            <kbd style={kbdStyleSmall}>Esc</kbd> Close
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const buttonStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid #2a9d8f",
  backgroundColor: "#264653",
  color: "#e8e8e8",
  fontSize: "14px",
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "6px",
  border: "1px solid #2a9d8f",
  backgroundColor: "#264653",
  color: "#e8e8e8",
  fontSize: "14px",
  outline: "none",
};

const kbdStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: "4px",
  backgroundColor: "#1d3d47",
  color: "#e9c46a",
  fontSize: "13px",
  fontFamily: "monospace",
  fontWeight: 500,
  border: "1px solid #2a9d8f60",
  whiteSpace: "nowrap",
};

const kbdStyleSmall: React.CSSProperties = {
  padding: "2px 6px",
  borderRadius: "4px",
  backgroundColor: "#264653",
  marginRight: "4px",
  fontSize: "11px",
};
