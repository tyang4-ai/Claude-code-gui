/**
 * ReadCard - Display for Read tool results
 *
 * Features:
 * - Syntax highlighting based on file extension
 * - Line numbers
 * - Copy to clipboard
 * - Open in VS Code
 * - Collapsible for large files
 */

import { useState, useCallback, memo } from "react";
import { CodeBlock } from "../messages/CodeBlock";

interface ReadCardProps {
  filePath: string;
  content: string;
  startLine?: number;
  endLine?: number;
}

function ReadCardComponent({
  filePath,
  content,
  startLine,
  endLine,
}: ReadCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const lineCount = content.split("\n").length;
  const lineRange = startLine && endLine
    ? `Lines ${startLine}-${endLine}`
    : `${lineCount} lines`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  }, [content]);

  const handleOpenInVSCode = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      const line = startLine || 1;
      await open(`vscode://file/${filePath}:${line}`);
    } catch (e) {
      console.error("Failed to open in VS Code:", e);
    }
  }, [filePath, startLine]);

  return (
    <div
      className="tool-card read-card border border-default rounded-lg overflow-hidden"
      data-testid="read-card"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-tertiary border-b border-default cursor-pointer hover:bg-tertiary/80"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* File icon */}
          <svg
            className="w-4 h-4 text-blue-400 flex-shrink-0"
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

          {/* Tool name and file path */}
          <span className="text-sm font-medium text-primary">Read</span>
          <span className="text-xs text-secondary font-mono truncate">
            {filePath}
          </span>
          <span className="text-xs text-muted">({lineRange})</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Copy button */}
          <button
            className="p-1.5 rounded hover:bg-primary/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            title="Copy to clipboard"
          >
            {copied ? (
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          {/* VS Code button */}
          <button
            className="p-1.5 rounded hover:bg-primary/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenInVSCode();
            }}
            title="Open in VS Code"
          >
            <svg className="w-4 h-4 text-secondary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.5 0h-9L0 8.5v7l8.5 8.5h9l6.5-6.5v-11L17.5 0zM10 18l-6-6 6-6 1.5 1.5-4.5 4.5 4.5 4.5L10 18zm4 0l-1.5-1.5 4.5-4.5-4.5-4.5L14 6l6 6-6 6z"/>
            </svg>
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

      {/* Preview line when collapsed */}
      {!isExpanded && content && (
        <div style={{ color: '#a0a0a0', fontSize: '12px', padding: '4px 12px 8px', fontFamily: 'monospace', backgroundColor: '#0d1117' }}>
          {content.split('\n')[0].substring(0, 80)}{content.length > 80 || content.includes('\n') ? '...' : ''}
        </div>
      )}

      {/* Content */}
      {isExpanded && (
        <div className="max-h-96 overflow-auto">
          <CodeBlock
            code={content}
            filename={filePath}
            showLineNumbers={true}
            maxHeight={380}
          />
        </div>
      )}
    </div>
  );
}

export const ReadCard = memo(ReadCardComponent);
