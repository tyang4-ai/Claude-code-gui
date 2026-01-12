/**
 * BashCard - Terminal-style display for Bash command results
 *
 * Features:
 * - Terminal-styled output
 * - Command display with copy
 * - Exit code indicator
 * - Scrollable output
 * - ANSI color support (basic)
 */

import { useState, useCallback, useMemo, memo } from "react";

interface BashCardProps {
  command: string;
  output?: string;
  exitCode?: number;
  workingDir?: string;
}

function BashCardComponent({
  command,
  output = "",
  exitCode,
  workingDir,
}: BashCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  const isError = exitCode !== undefined && exitCode !== 0;

  // Parse basic ANSI colors to spans
  const parsedOutput = useMemo(() => {
    return parseAnsiColors(output);
  }, [output]);

  const handleCopyCommand = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCommand(true);
      setTimeout(() => setCopiedCommand(false), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  }, [command]);

  const handleCopyOutput = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  }, [output]);

  const lineCount = output.split("\n").length;

  return (
    <div
      className={`tool-card bash-card border rounded-lg overflow-hidden ${
        isError ? "border-red-500/50" : "border-default"
      }`}
      data-testid="bash-card"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-tertiary border-b border-default cursor-pointer hover:bg-tertiary/80"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Terminal icon */}
          <svg
            className={`w-4 h-4 flex-shrink-0 ${
              isError ? "text-red-400" : "text-green-400"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>

          {/* Tool name */}
          <span className="text-sm font-medium text-primary">Bash</span>

          {/* Command preview */}
          <code className="text-xs text-secondary font-mono truncate max-w-md">
            $ {command}
          </code>

          {/* Exit code badge */}
          {exitCode !== undefined && (
            <span
              className={`px-1.5 py-0.5 text-xs rounded ${
                isError
                  ? "bg-red-500/20 text-red-400"
                  : "bg-green-500/20 text-green-400"
              }`}
            >
              exit {exitCode}
            </span>
          )}

          {/* Line count */}
          {output && (
            <span className="text-xs text-muted">
              ({lineCount} {lineCount === 1 ? "line" : "lines"})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Copy command button */}
          <button
            className="p-1.5 rounded hover:bg-primary/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyCommand();
            }}
            title="Copy command"
          >
            {copiedCommand ? (
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          {/* Expand/collapse chevron */}
          <svg
            className={`w-4 h-4 text-muted transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Terminal output */}
      {isExpanded && (
        <div className="bg-[#0d1117] relative group">
          {/* Copy output button (shown on hover) */}
          {output && (
            <button
              className="absolute top-2 right-2 p-1.5 rounded bg-tertiary/80 hover:bg-tertiary opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopyOutput}
              title="Copy output"
            >
              {copiedOutput ? (
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          )}

          {/* Working directory */}
          {workingDir && (
            <div className="px-3 pt-2 text-xs text-muted font-mono">
              {workingDir}
            </div>
          )}

          {/* Command */}
          <div className="px-3 py-2 font-mono text-sm">
            <span className="text-green-400">$</span>
            <span className="text-primary ml-2">{command}</span>
          </div>

          {/* Output */}
          {output && (
            <div className="px-3 pb-3 max-h-80 overflow-auto">
              <pre
                className="font-mono text-xs text-secondary whitespace-pre-wrap break-words leading-relaxed"
                dangerouslySetInnerHTML={{ __html: parsedOutput }}
              />
            </div>
          )}

          {/* No output message */}
          {!output && exitCode === 0 && (
            <div className="px-3 pb-3 text-xs text-muted italic">
              (no output)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Basic ANSI color parser
function parseAnsiColors(text: string): string {
  // Escape HTML first
  let result = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Color mappings
  const colors: Record<string, string> = {
    "30": "#6e7681", // Black (dim)
    "31": "#f85149", // Red
    "32": "#3fb950", // Green
    "33": "#d29922", // Yellow
    "34": "#58a6ff", // Blue
    "35": "#bc8cff", // Magenta
    "36": "#39c5cf", // Cyan
    "37": "#c9d1d9", // White
    "90": "#6e7681", // Bright Black (Gray)
    "91": "#ff7b72", // Bright Red
    "92": "#7ee787", // Bright Green
    "93": "#e3b341", // Bright Yellow
    "94": "#79c0ff", // Bright Blue
    "95": "#d2a8ff", // Bright Magenta
    "96": "#56d4dd", // Bright Cyan
    "97": "#ffffff", // Bright White
  };

  // Replace ANSI codes
  result = result.replace(
    /\x1b\[([0-9;]+)m/g,
    (_, codes) => {
      const codeList = codes.split(";");
      for (const code of codeList) {
        if (code === "0" || code === "") {
          return "</span>";
        }
        if (colors[code]) {
          return `<span style="color: ${colors[code]}">`;
        }
        if (code === "1") {
          return '<span style="font-weight: bold">';
        }
      }
      return "";
    }
  );

  return result;
}

export const BashCard = memo(BashCardComponent);
