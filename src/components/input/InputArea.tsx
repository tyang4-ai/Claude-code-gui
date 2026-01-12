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
      onSubmit(trimmed);
      setValue("");
      setShowAutocomplete(false);
    }
  }, [value, disabled, onSubmit]);

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

      // Submit on Ctrl+Enter
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [showAutocomplete, autocompleteResults, selectedIndex, handleSelectFile, handleSubmit]
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
    <div className="border-t border-default bg-secondary p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
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
              className={`
                w-full px-4 py-3 rounded-lg resize-none
                bg-primary border border-default
                text-primary placeholder-muted
                focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
                min-h-[48px] max-h-[200px]
              `}
              rows={1}
              data-testid="prompt-input"
            />

            {/* Autocomplete dropdown */}
            {showAutocomplete && autocompleteResults.length > 0 && (
              <div
                ref={autocompleteRef}
                className="absolute bottom-full left-0 right-0 mb-1 bg-primary border border-default rounded-lg shadow-lg overflow-hidden z-10"
                data-testid="autocomplete-dropdown"
              >
                <div className="max-h-64 overflow-auto">
                  {autocompleteResults.map((file, index) => (
                    <button
                      key={file.path}
                      className={`
                        w-full px-3 py-2 text-left flex items-center gap-2 transition-colors
                        ${index === selectedIndex ? "bg-accent-primary/20" : "hover:bg-tertiary"}
                      `}
                      onClick={() => handleSelectFile(file)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <svg
                        className="w-4 h-4 text-secondary flex-shrink-0"
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
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {file.name}
                        </div>
                        <div className="text-xs text-secondary truncate">
                          {file.relativePath}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="px-3 py-1.5 bg-tertiary text-xs text-secondary flex items-center justify-between">
                  <span>
                    <kbd className="px-1 py-0.5 bg-primary rounded text-xs">Tab</kbd>{" "}
                    or{" "}
                    <kbd className="px-1 py-0.5 bg-primary rounded text-xs">Enter</kbd>{" "}
                    to select
                  </span>
                  <span>
                    <kbd className="px-1 py-0.5 bg-primary rounded text-xs">Esc</kbd>{" "}
                    to close
                  </span>
                </div>
              </div>
            )}

            {/* No results message */}
            {showAutocomplete && autocompleteQuery && autocompleteResults.length === 0 && (
              <div
                ref={autocompleteRef}
                className="absolute bottom-full left-0 right-0 mb-1 bg-primary border border-default rounded-lg shadow-lg p-3 text-sm text-secondary"
              >
                No files matching "{autocompleteQuery}"
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            className={`
              p-3 rounded-lg transition-colors
              ${
                disabled || !value.trim()
                  ? "bg-tertiary text-muted cursor-not-allowed"
                  : "bg-accent-primary text-white hover:bg-accent-primary/80"
              }
            `}
            aria-label="Send message"
            data-testid="send-button"
          >
            <svg
              className="w-5 h-5"
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
        <div className="mt-2 text-xs text-muted text-right">
          Press{" "}
          <kbd className="px-1.5 py-0.5 bg-tertiary rounded">Ctrl+Enter</kbd>{" "}
          to send | Type{" "}
          <kbd className="px-1.5 py-0.5 bg-tertiary rounded">@</kbd>{" "}
          for file autocomplete
        </div>
      </div>
    </div>
  );
}
