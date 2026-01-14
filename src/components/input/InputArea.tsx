/**
 * InputArea - Main prompt input with @ autocomplete
 */

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from "react";
import { getFileIndex } from "../../core/file-index";
import { useStore } from "../../core/store";

interface FileEntry {
  path: string;
  name: string;
  relativePath: string;
  isDirectory: boolean;
}

interface InputAreaProps {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
  placeholder?: string;
  workingDir?: string;
}

export function InputArea({
  onSubmit,
  disabled = false,
  placeholder = "Type a message... (Ctrl+Enter to send)",
  workingDir = "",
}: InputAreaProps) {
  const [value, setValue] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState("");
  const [autocompleteResults, setAutocompleteResults] = useState<FileEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const promptHistory = useStore((state) => state.promptHistory);
  const addPromptHistory = useStore((state) => state.addPromptHistory);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize file index when working directory changes
  useEffect(() => {
    if (workingDir) {
      getFileIndex().buildIndex(workingDir);
    }
  }, [workingDir]);

  // Handle autocomplete search with debounce
  useEffect(() => {
    if (!showAutocomplete || !autocompleteQuery) {
      setAutocompleteResults([]);
      return;
    }

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce search by 100ms
    debounceRef.current = setTimeout(() => {
      const fileIndex = getFileIndex();
      const results = fileIndex.search(autocompleteQuery, 10);
      setAutocompleteResults(results);
      setSelectedIndex(0);
    }, 100);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [showAutocomplete, autocompleteQuery]);

  // Find @ trigger position in text
  const findAtTrigger = useCallback((text: string, cursorPos: number) => {
    // Look backwards from cursor to find @
    let atPos = -1;
    for (let i = cursorPos - 1; i >= 0; i--) {
      const char = text[i];
      if (char === "@") {
        atPos = i;
        break;
      }
      // Stop if we hit whitespace or another special char
      if (/[\s\n]/.test(char)) {
        break;
      }
    }

    if (atPos === -1) return null;

    // Extract query after @
    const query = text.slice(atPos + 1, cursorPos);

    // Don't show autocomplete if query contains spaces
    if (/\s/.test(query)) return null;

    return { position: atPos, query };
  }, []);

  // Handle text change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const newCursorPos = e.target.selectionStart;

      setValue(newValue);
      setCursorPosition(newCursorPos);
      // Reset history navigation when user types
      setHistoryIndex(-1);

      // Check for @ trigger
      const trigger = findAtTrigger(newValue, newCursorPos);
      if (trigger) {
        setShowAutocomplete(true);
        setAutocompleteQuery(trigger.query);
      } else {
        setShowAutocomplete(false);
        setAutocompleteQuery("");
      }
    },
    [findAtTrigger]
  );

  // Handle autocomplete selection
  const handleSelectFile = useCallback(
    (file: FileEntry) => {
      const trigger = findAtTrigger(value, cursorPosition);
      if (!trigger) return;

      // Replace @query with @filepath
      const before = value.slice(0, trigger.position);
      const after = value.slice(cursorPosition);
      const newValue = `${before}@${file.relativePath}${after}`;

      setValue(newValue);
      setShowAutocomplete(false);
      setAutocompleteQuery("");

      // Focus textarea and set cursor position
      if (textareaRef.current) {
        const newCursorPos = trigger.position + file.relativePath.length + 1;
        textareaRef.current.focus();
        setTimeout(() => {
          textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      }
    },
    [value, cursorPosition, findAtTrigger]
  );

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      addPromptHistory(trimmed);
      onSubmit(trimmed);
      setValue("");
      setShowAutocomplete(false);
      setHistoryIndex(-1);
    }
  }, [value, disabled, onSubmit, addPromptHistory]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Handle autocomplete navigation
      if (showAutocomplete && autocompleteResults.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < autocompleteResults.length - 1 ? prev + 1 : 0
          );
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : autocompleteResults.length - 1
          );
          return;
        }
        if (e.key === "Enter" && !e.ctrlKey) {
          e.preventDefault();
          handleSelectFile(autocompleteResults[selectedIndex]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setShowAutocomplete(false);
          return;
        }
        if (e.key === "Tab") {
          e.preventDefault();
          handleSelectFile(autocompleteResults[selectedIndex]);
          return;
        }
      }

      // History navigation - when input is empty and no autocomplete showing
      if (e.key === "ArrowUp" && value === "" && !showAutocomplete && promptHistory.length > 0) {
        e.preventDefault();
        const newIndex = Math.min(historyIndex + 1, promptHistory.length - 1);
        setHistoryIndex(newIndex);
        setValue(promptHistory[newIndex] || "");
        return;
      }
      if (e.key === "ArrowDown" && historyIndex >= 0 && !showAutocomplete) {
        e.preventDefault();
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setValue(newIndex >= 0 ? promptHistory[newIndex] : "");
        return;
      }

      // Submit on Ctrl+Enter
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [showAutocomplete, autocompleteResults, selectedIndex, handleSelectFile, handleSubmit, value, promptHistory, historyIndex]
  );

  // Auto-resize textarea
  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{
      borderTop: '1px solid var(--color-border-muted)',
      backgroundColor: 'var(--color-bg-surface)',
      padding: '16px'
    }}>
      <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                handleChange(e);
                handleInput();
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                resize: 'none',
                backgroundColor: 'var(--color-bg-base)',
                border: '1px solid var(--color-border-default)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-base)',
                minHeight: '48px',
                maxHeight: '200px',
                outline: 'none',
                boxShadow: 'var(--shadow-inset)',
                boxSizing: 'border-box',
                transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
                opacity: disabled ? 0.5 : 1,
                cursor: disabled ? 'not-allowed' : 'text'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-accent)';
                e.target.style.boxShadow = 'var(--shadow-glow)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-border-default)';
                e.target.style.boxShadow = 'var(--shadow-inset)';
              }}
              rows={1}
              data-testid="prompt-input"
            />

            {/* Autocomplete dropdown */}
            {showAutocomplete && autocompleteResults.length > 0 && (
              <div
                ref={autocompleteRef}
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  marginBottom: '4px',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  overflow: 'hidden',
                  zIndex: 10
                }}
                data-testid="autocomplete-dropdown"
              >
                <div style={{ maxHeight: '256px', overflowY: 'auto' }}>
                  {autocompleteResults.map((file, index) => (
                    <button
                      key={file.path}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: index === selectedIndex ? 'var(--color-bg-overlay)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color var(--transition-fast)'
                      }}
                      onClick={() => handleSelectFile(file)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <svg
                        style={{ width: '16px', height: '16px', color: 'var(--color-text-secondary)', flexShrink: 0 }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-primary)' }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.relativePath}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div style={{ padding: '6px 12px', backgroundColor: 'var(--color-bg-overlay)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>
                    <kbd style={{ padding: '2px 4px', backgroundColor: 'var(--color-bg-base)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)' }}>Tab</kbd>{" "}
                    or{" "}
                    <kbd style={{ padding: '2px 4px', backgroundColor: 'var(--color-bg-base)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)' }}>Enter</kbd>{" "}
                    to select
                  </span>
                  <span>
                    <kbd style={{ padding: '2px 4px', backgroundColor: 'var(--color-bg-base)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)' }}>Esc</kbd>{" "}
                    to close
                  </span>
                </div>
              </div>
            )}

            {/* No results message */}
            {showAutocomplete && autocompleteQuery && autocompleteResults.length === 0 && (
              <div
                ref={autocompleteRef}
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  marginBottom: '4px',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '12px',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                No files matching "{autocompleteQuery}"
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: disabled || !value.trim()
                ? 'var(--color-bg-overlay)'
                : 'linear-gradient(135deg, var(--color-accent) 0%, #388bfd 100%)',
              color: disabled || !value.trim() ? 'var(--color-text-muted)' : 'white',
              cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
              boxShadow: disabled || !value.trim() ? 'none' : 'var(--shadow-sm)',
              transition: 'all var(--transition-fast)'
            }}
            aria-label="Send message"
            data-testid="send-button"
          >
            <svg
              style={{ width: '20px', height: '20px' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>

        {/* Keyboard shortcut hint */}
        <div style={{ marginTop: '8px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'right' }}>
          Press{" "}
          <kbd style={{ padding: '2px 6px', backgroundColor: 'var(--color-bg-overlay)', borderRadius: 'var(--radius-sm)' }}>Ctrl+Enter</kbd>{" "}
          to send | Type{" "}
          <kbd style={{ padding: '2px 6px', backgroundColor: 'var(--color-bg-overlay)', borderRadius: 'var(--radius-sm)' }}>@</kbd>{" "}
          for file autocomplete
        </div>
      </div>
    </div>
  );
}
