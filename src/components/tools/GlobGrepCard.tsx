/**
 * GlobGrepCard - Display for Glob/Grep tool results (file lists)
 *
 * Features:
 * - File list display
 * - Clickable files to add as @reference
 * - Match count display
 * - Copy file paths
 */

import { useState, useCallback, memo } from "react";

interface FileMatch {
  path: string;
  line?: number;
  content?: string;
}

interface GlobGrepCardProps {
  toolName: "Glob" | "Grep";
  pattern: string;
  files: FileMatch[];
  matchCount?: number;
}

function GlobGrepCardComponent({
  toolName,
  pattern,
  files,
  matchCount,
}: GlobGrepCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const handleCopyPath = useCallback(async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  }, []);

  const handleCopyAll = useCallback(async () => {
    try {
      const paths = files.map((f) => f.path).join("\n");
      await navigator.clipboard.writeText(paths);
      setCopiedPath("all");
      setTimeout(() => setCopiedPath(null), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  }, [files]);

  const handleOpenInVSCode = useCallback(async (path: string, line?: number) => {
    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      const uri = line ? `vscode://file/${path}:${line}` : `vscode://file/${path}`;
      await open(uri);
    } catch (e) {
      console.error("Failed to open in VS Code:", e);
    }
  }, []);

  const isGrep = toolName === "Grep";

  return (
    <div
      className="tool-card glob-grep-card border border-default rounded-lg overflow-hidden"
      data-testid={`${toolName.toLowerCase()}-card`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-tertiary border-b border-default cursor-pointer hover:bg-tertiary/80"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Search icon */}
          <svg
            className="w-4 h-4 text-purple-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          {/* Tool name and pattern */}
          <span className="text-sm font-medium text-primary">{toolName}</span>
          <code className="text-xs text-secondary font-mono truncate max-w-md">
            {pattern}
          </code>

          {/* Match count */}
          <span className="text-xs text-muted">
            ({files.length} {files.length === 1 ? "file" : "files"}
            {matchCount !== undefined && isGrep && `, ${matchCount} matches`})
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Copy all paths button */}
          <button
            className="p-1.5 rounded hover:bg-primary/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyAll();
            }}
            title="Copy all paths"
          >
            {copiedPath === "all" ? (
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

      {/* File list */}
      {isExpanded && (
        <div className="max-h-64 overflow-auto">
          {files.length === 0 ? (
            <div className="px-3 py-4 text-center text-muted text-sm">
              No files found
            </div>
          ) : (
            <div className="divide-y divide-default/50">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-tertiary/50 group"
                >
                  {/* File icon */}
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

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-primary font-mono truncate">
                      {file.path}
                      {file.line && (
                        <span className="text-muted">:{file.line}</span>
                      )}
                    </div>
                    {file.content && (
                      <div className="text-xs text-secondary truncate mt-0.5 font-mono">
                        {file.content}
                      </div>
                    )}
                  </div>

                  {/* Action buttons (shown on hover) */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Copy path */}
                    <button
                      className="p-1 rounded hover:bg-primary/20"
                      onClick={() => handleCopyPath(file.path)}
                      title="Copy path"
                    >
                      {copiedPath === file.path ? (
                        <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>

                    {/* Open in VS Code */}
                    <button
                      className="p-1 rounded hover:bg-primary/20"
                      onClick={() => handleOpenInVSCode(file.path, file.line)}
                      title="Open in VS Code"
                    >
                      <svg className="w-3.5 h-3.5 text-secondary" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.5 0h-9L0 8.5v7l8.5 8.5h9l6.5-6.5v-11L17.5 0zM10 18l-6-6 6-6 1.5 1.5-4.5 4.5 4.5 4.5L10 18zm4 0l-1.5-1.5 4.5-4.5-4.5-4.5L14 6l6 6-6 6z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const GlobGrepCard = memo(GlobGrepCardComponent);
