/**
 * Command Palette Component
 *
 * A modal overlay for quick command execution with fuzzy search.
 * Opens with Ctrl+P, supports keyboard navigation, and shows recent commands.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { commandRegistry } from "../../modules/commands/registry";
import { highlightMatches } from "../../modules/commands/fuzzy-search";
import type { Command } from "../../modules/commands/types";
import type { FuzzyMatch } from "../../modules/commands/fuzzy-search";

export interface CommandPaletteProps {
  /** Whether the palette is open */
  isOpen: boolean;

  /** Callback when palette should close */
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commandsVersion, setCommandsVersion] = useState(0); // Force re-render when commands change
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get search results
  const results = useMemo(() => {
    if (!query.trim()) {
      // Show recent commands when no query
      const recent = commandRegistry.getRecentCommands();

      // If no recent commands, show all commands
      if (recent.length === 0) {
        const allCommands = commandRegistry.getAll();
        return allCommands.map((command) => ({
          command,
          match: {
            target: command.label,
            score: 1,
            matchedIndices: [] as number[],
          },
        }));
      }

      return recent.map((command) => ({
        command,
        match: {
          target: command.label,
          score: 1,
          matchedIndices: [] as number[],
        },
      }));
    }

    return commandRegistry.search(query, 10);
  }, [query, commandsVersion]); // Re-compute when commands change

  // Subscribe to command registry changes
  useEffect(() => {
    const unsubscribe = commandRegistry.subscribe(() => {
      setCommandsVersion(v => v + 1);
    });
    return unsubscribe;
  }, []);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      // Focus input after a brief delay to ensure it's rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current && results.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement && selectedElement.scrollIntoView) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [selectedIndex, results]);

  // Execute selected command
  const executeCommand = useCallback(
    async (command: Command) => {
      try {
        await commandRegistry.execute(command.id);
        onClose();
      } catch (error) {
        console.error("Failed to execute command:", error);
      }
    },
    [onClose]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;

        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;

        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            executeCommand(results[selectedIndex].command);
          }
          break;

        case "Escape":
          e.preventDefault();
          onClose();
          break;

        case "Tab":
          // Prevent tab from leaving the palette
          e.preventDefault();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, executeCommand, onClose]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

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
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 1000,
          animation: "fadeIn 0.15s ease-out",
        }}
        onClick={onClose}
      />

      {/* Palette Modal */}
      <div
        style={{
          position: "fixed",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(600px, 90vw)",
          backgroundColor: "var(--glass-bg)",
          backdropFilter: "blur(var(--glass-blur))",
          WebkitBackdropFilter: "blur(var(--glass-blur))",
          borderRadius: "12px", /* rounded-xl */
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "var(--shadow-xl)",
          zIndex: 1001,
          overflow: "hidden",
          animation: "slideDown 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--color-border-muted)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands..."
            style={{
              flex: 1,
              padding: "8px 0",
              fontSize: "var(--text-base)",
              backgroundColor: "transparent",
              border: "none",
              color: "var(--color-text-primary)",
              outline: "none",
            }}
          />
          <button
            onClick={onClose}
            style={{
              padding: "4px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-secondary)",
              transition: "background-color var(--transition-fast)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-bg-overlay)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          role="listbox"
          aria-label="Commands"
          style={{
            maxHeight: "400px",
            overflowY: "auto",
            padding: "8px 0",
          }}
        >
          {results.length === 0 && (
            <div
              style={{
                padding: "32px 24px",
                textAlign: "center",
                color: "var(--color-text-secondary)",
                fontSize: "var(--text-base)",
              }}
            >
              No commands found
            </div>
          )}

          {results.map((result, index) => (
            <CommandItem
              key={result.command.id}
              command={result.command}
              match={result.match}
              isSelected={index === selectedIndex}
              onClick={() => executeCommand(result.command)}
              onMouseEnter={() => setSelectedIndex(index)}
            />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--color-border-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-secondary)",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <kbd style={kbdStyle}>↑↓</kbd>
              navigate
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <kbd style={kbdStyle}>↵</kbd>
              select
            </span>
          </div>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <kbd style={kbdStyle}>esc</kbd>
            close
          </span>
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
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </>
  );
}

// ============================================================================
// Command Item Component
// ============================================================================

interface CommandItemProps {
  command: Command;
  match: FuzzyMatch;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

function CommandItem({
  command,
  match,
  isSelected,
  onClick,
  onMouseEnter,
}: CommandItemProps) {
  const highlightedLabel = useMemo(
    () => highlightMatches(command.label, match.matchedIndices),
    [command.label, match.matchedIndices]
  );

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        padding: "8px 12px",
        margin: "0 8px",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        backgroundColor: isSelected ? "var(--color-bg-overlay)" : "transparent",
        transition: "background-color var(--transition-fast)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        {/* Left: Icon + Label */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
          {/* Icon */}
          {command.icon && (
            <div
              style={{
                fontSize: "18px",
                opacity: 0.8,
                minWidth: "20px",
                textAlign: "center",
              }}
            >
              {command.icon}
            </div>
          )}

          {/* Label with highlighting */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", marginBottom: "2px" }}>
              {highlightedLabel.map((segment, i) => (
                <span
                  key={i}
                  style={{
                    color: segment.highlighted ? "var(--color-accent)" : "var(--color-text-primary)",
                    fontWeight: segment.highlighted ? "var(--font-semibold)" : "var(--font-medium)",
                  }}
                >
                  {segment.text}
                </span>
              ))}
            </div>

            {/* Description */}
            {command.description && (
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-secondary)",
                  marginTop: "2px",
                }}
              >
                {command.description}
              </div>
            )}
          </div>
        </div>

        {/* Right: Shortcut */}
        {command.shortcut && (
          <kbd
            style={{
              padding: "2px 8px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--color-bg-base)",
              fontSize: "10px",
              fontFamily: "monospace",
              color: "var(--color-text-secondary)",
              flexShrink: 0,
            }}
          >
            {command.shortcut}
          </kbd>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Helper Styles
// ============================================================================

const kbdStyle: React.CSSProperties = {
  padding: "2px 6px",
  fontSize: "10px",
  fontFamily: "monospace",
  backgroundColor: "var(--color-bg-base)",
  border: "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-sm)",
  color: "var(--color-text-secondary)",
  fontWeight: 600,
};

