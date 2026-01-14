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
          borderRadius: "var(--radius-lg)",
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
            padding: "16px",
            borderBottom: "1px solid var(--color-border-muted)",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            style={{
              width: "100%",
              padding: "12px 16px",
              fontSize: "var(--text-lg)",
              backgroundColor: "var(--color-bg-base)",
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-text-primary)",
              outline: "none",
              transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--color-accent)";
              e.target.style.boxShadow = "var(--shadow-glow)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--color-border-default)";
              e.target.style.boxShadow = "none";
            }}
          />
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

          {results.length > 0 && !query && (
            <div
              style={{
                padding: "8px 16px",
                fontSize: "var(--text-xs)",
                fontWeight: "var(--font-semibold)",
                color: "var(--color-text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Recent Commands
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
            padding: "12px 16px",
            borderTop: "1px solid var(--color-border-muted)",
            display: "flex",
            gap: "16px",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-secondary)",
          }}
        >
          <div>
            <kbd style={kbdStyle}>↑</kbd> <kbd style={kbdStyle}>↓</kbd> Navigate
          </div>
          <div>
            <kbd style={kbdStyle}>Enter</kbd> Execute
          </div>
          <div>
            <kbd style={kbdStyle}>Esc</kbd> Close
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
        padding: "12px 16px",
        cursor: "pointer",
        backgroundColor: isSelected ? "var(--color-bg-overlay)" : "transparent",
        borderLeft: isSelected ? "3px solid var(--color-accent)" : "3px solid transparent",
        transition: "all var(--transition-fast)",
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

        {/* Right: Category + Shortcut */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          {/* Category badge */}
          <div
            style={{
              fontSize: "10px",
              padding: "2px 8px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: getCategoryColor(command.category),
              color: "#fff",
              fontWeight: "var(--font-semibold)",
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            }}
          >
            {command.category}
          </div>

          {/* Keyboard shortcut */}
          {command.shortcut && (
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
              {command.shortcut.split("+").map((key, i, arr) => (
                <span key={i}>
                  <kbd style={kbdStyle}>{key}</kbd>
                  {i < arr.length - 1 && <span style={{ margin: "0 2px" }}>+</span>}
                </span>
              ))}
            </div>
          )}
        </div>
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

/**
 * Get color for command category badge
 */
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    session: "#f85149",    // Error red
    navigation: "#58a6ff", // Accent blue
    settings: "#d29922",   // Warning amber
    skill: "#a371f7",      // Purple
    file: "#58a6ff",       // Accent blue
    action: "#3fb950",     // Success green
    help: "#8b949e",       // Secondary gray
  };

  return colors[category] || "#6c757d";
}
