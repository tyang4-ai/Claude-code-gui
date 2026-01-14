/**
 * ContextViewer Component
 *
 * Displays project context including CLAUDE.md files, hooks configuration,
 * and MCP server status with file watching, search, and copy-to-clipboard.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getContextManager, type ContextInfo, type ClaudeFile, type HookConfig, type MCPServer } from "../../modules/context";
import { getMCPManager } from "../../modules/mcp";
import { getFileWatcher } from "../../modules/context/file-watcher";

type TabType = "claude-md" | "hooks" | "mcp" | "settings";

export interface ContextViewerProps {
  isOpen: boolean;
  workingDir?: string;
  onClose?: () => void;
}

export function ContextViewer({ isOpen, workingDir = ".", onClose }: ContextViewerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("claude-md");
  const [context, setContext] = useState<ContextInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Load context
  const loadContext = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const manager = getContextManager();
      const contextInfo = await manager.getContext(workingDir);

      // Get MCP server status
      try {
        const mcpManager = getMCPManager();
        const mcpServers = mcpManager.getServers();
        // Map MCP manager servers to context MCPServer format
        contextInfo.mcpServers = mcpServers.map(server => ({
          name: server.name,
          command: server.command || "",
          args: server.args,
          env: server.env,
          status: server.status === "disabled" ? "stopped" : server.status,
          error: server.error,
          scope: server.scope === "user" ? "global" : "project",
        }));
      } catch (e) {
        console.warn("Failed to load MCP servers:", e);
      }

      setContext(contextInfo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load context");
    } finally {
      setLoading(false);
    }
  }, [workingDir]);

  // Set up file watching for CLAUDE.md files
  useEffect(() => {
    const watcher = getFileWatcher();
    const watchedPaths: string[] = [];

    const setupWatching = async () => {
      if (!context) return;

      for (const file of context.claudeFiles) {
        if (file.exists) {
          await watcher.watch(
            file.path,
            (path, content) => {
              // Update the specific file's content
              setContext((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  claudeFiles: prev.claudeFiles.map((f) =>
                    f.path === path ? { ...f, content } : f
                  ),
                };
              });
            },
            (path, error) => {
              console.error(`File watch error for ${path}:`, error);
            }
          );
          watchedPaths.push(file.path);
        }
      }
    };

    setupWatching();

    return () => {
      watchedPaths.forEach((path) => watcher.unwatch(path));
    };
  }, [context]);

  // Initial load
  useEffect(() => {
    loadContext();
  }, [loadContext]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPath(label);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  }, []);

  // Filter content based on search query
  const filteredContent = useMemo(() => {
    if (!searchQuery.trim()) return null;

    const query = searchQuery.toLowerCase();
    const results: Array<{ type: string; label: string; content: string }> = [];

    // Search in CLAUDE.md files
    if (context) {
      context.claudeFiles.forEach((file) => {
        if (file.content && file.content.toLowerCase().includes(query)) {
          results.push({
            type: "CLAUDE.md",
            label: `${file.scope} (${file.path})`,
            content: file.content,
          });
        }
      });

      // Search in hooks
      context.hooks.forEach((hook) => {
        if (
          hook.name.toLowerCase().includes(query) ||
          hook.command.toLowerCase().includes(query)
        ) {
          results.push({
            type: "Hook",
            label: hook.name,
            content: hook.command,
          });
        }
      });

      // Search in MCP servers
      context.mcpServers.forEach((server) => {
        if (
          server.name.toLowerCase().includes(query) ||
          server.command.toLowerCase().includes(query)
        ) {
          results.push({
            type: "MCP Server",
            label: server.name,
            content: `${server.command} ${server.args?.join(" ") || ""}`,
          });
        }
      });
    }

    return results;
  }, [context, searchQuery]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "#a0a0a0",
      }}>
        Loading context...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: "#1d3d47",
            borderRadius: "12px",
            padding: "24px",
            minWidth: "300px",
            border: "1px solid #2a9d8f",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "18px", fontWeight: 600, color: "#e8e8e8" }}>Context Viewer</span>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#a0a0a0",
                cursor: "pointer",
                fontSize: "20px",
                padding: "4px",
              }}
            >
              ×
            </button>
          </div>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            color: "#ff6b6b",
            padding: "20px",
          }}>
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
              Error Loading Context
            </div>
            <div style={{ fontSize: "14px", textAlign: "center" }}>{error}</div>
            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button
                onClick={loadContext}
                style={{
                  padding: "8px 16px",
                  background: "#2a9d8f",
                  border: "none",
                  borderRadius: "4px",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Retry
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  border: "1px solid #a0a0a0",
                  borderRadius: "4px",
                  color: "#a0a0a0",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#1a1a1a",
        color: "#e8e8e8",
      }}
      data-testid="context-viewer"
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #2a9d8f",
          backgroundColor: "#1d3d47",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <svg
            style={{ width: "20px", height: "20px", color: "#2a9d8f" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span style={{ fontWeight: 600, fontSize: "16px" }}>Context</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: "4px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#e8e8e8",
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Close context viewer"
          >
            <svg
              style={{ width: "20px", height: "20px" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #333" }}>
        <input
          type="text"
          placeholder="Search context..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            background: "#264653",
            border: "1px solid #2a9d8f",
            borderRadius: "4px",
            color: "#e8e8e8",
            fontSize: "14px",
            outline: "none",
          }}
          data-testid="context-search"
        />
      </div>

      {/* Search Results */}
      {filteredContent && filteredContent.length > 0 && (
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid #333",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: "12px", color: "#a0a0a0", marginBottom: "8px" }}>
            Found {filteredContent.length} result(s)
          </div>
          {filteredContent.map((result, idx) => (
            <div
              key={idx}
              style={{
                padding: "8px",
                marginBottom: "8px",
                background: "#264653",
                borderRadius: "4px",
                fontSize: "13px",
              }}
            >
              <div style={{ color: "#2a9d8f", fontWeight: 600 }}>
                {result.type}: {result.label}
              </div>
              <div
                style={{
                  marginTop: "4px",
                  color: "#c0c0c0",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {result.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          padding: "0 16px",
          borderBottom: "1px solid #333",
          backgroundColor: "#1d3d47",
        }}
      >
        {(["claude-md", "hooks", "mcp", "settings"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "12px 16px",
              background: activeTab === tab ? "#264653" : "transparent",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid #2a9d8f" : "2px solid transparent",
              color: activeTab === tab ? "#2a9d8f" : "#a0a0a0",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: activeTab === tab ? 600 : 400,
              transition: "all 0.2s",
            }}
            data-testid={`tab-${tab}`}
          >
            {tab === "claude-md" && "CLAUDE.md"}
            {tab === "hooks" && "Hooks"}
            {tab === "mcp" && "MCP Servers"}
            {tab === "settings" && "Settings"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
        }}
        data-testid="context-content"
      >
        {activeTab === "claude-md" && context && (
          <ClaudeMdTab
            files={context.claudeFiles}
            onCopy={handleCopy}
            copiedPath={copiedPath}
          />
        )}
        {activeTab === "hooks" && context && (
          <HooksTab hooks={context.hooks} onCopy={handleCopy} />
        )}
        {activeTab === "mcp" && context && (
          <MCPTab servers={context.mcpServers} onCopy={handleCopy} />
        )}
        {activeTab === "settings" && context && (
          <SettingsTab settings={context.settings} onCopy={handleCopy} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Tab Components
// ============================================================================

interface ClaudeMdTabProps {
  files: ClaudeFile[];
  onCopy: (text: string, label: string) => void;
  copiedPath: string | null;
}

function ClaudeMdTab({ files, onCopy, copiedPath }: ClaudeMdTabProps) {
  const existingFiles = files.filter((f) => f.exists);

  if (existingFiles.length === 0) {
    return (
      <div style={{ color: "#a0a0a0", fontSize: "14px" }}>
        No CLAUDE.md files found in this project.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {existingFiles.map((file) => (
        <div key={file.path}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
            }}
          >
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#2a9d8f" }}>
                {file.scope.toUpperCase()}
              </div>
              <div style={{ fontSize: "12px", color: "#a0a0a0", fontFamily: "monospace" }}>
                {file.path}
              </div>
            </div>
            <button
              onClick={() => onCopy(file.content || "", file.path)}
              style={{
                padding: "6px 12px",
                background: copiedPath === file.path ? "#2a9d8f" : "#264653",
                border: "none",
                borderRadius: "4px",
                color: "white",
                cursor: "pointer",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              data-testid={`copy-${file.scope}`}
            >
              <svg
                style={{ width: "14px", height: "14px" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {copiedPath === file.path ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                )}
              </svg>
              {copiedPath === file.path ? "Copied!" : "Copy"}
            </button>
          </div>
          <div
            style={{
              background: "#0d1117",
              borderRadius: "8px",
              padding: "16px",
              border: "1px solid #30363d",
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const isInline = !match;
                  return !isInline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus as Record<string, React.CSSProperties>}
                      language={match[1]}
                      PreTag="div"
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code
                      className={className}
                      style={{
                        background: "#264653",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        fontSize: "0.9em",
                      }}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                h1: ({ children }) => (
                  <h1 style={{ color: "#2a9d8f", fontSize: "24px", marginBottom: "16px" }}>
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 style={{ color: "#2a9d8f", fontSize: "20px", marginBottom: "12px", marginTop: "24px" }}>
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 style={{ color: "#2a9d8f", fontSize: "16px", marginBottom: "8px", marginTop: "16px" }}>
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p style={{ marginBottom: "12px", lineHeight: "1.6" }}>{children}</p>
                ),
                ul: ({ children }) => (
                  <ul style={{ marginLeft: "20px", marginBottom: "12px" }}>{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol style={{ marginLeft: "20px", marginBottom: "12px" }}>{children}</ol>
                ),
                a: ({ children, href }) => (
                  <a href={href} style={{ color: "#2a9d8f", textDecoration: "underline" }}>
                    {children}
                  </a>
                ),
              }}
            >
              {file.content || ""}
            </ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
}

// CLI Flags Reference - common Claude Code CLI options
const CLI_FLAGS_REFERENCE = [
  { name: "--yolo", desc: "Auto-accept all edits without confirmation (YOLO mode)" },
  { name: "--resume", desc: "Resume a previous session by ID" },
  { name: "--model", desc: "Specify model (opus, sonnet, haiku)" },
  { name: "--dangerously-skip-permissions", desc: "Skip all permission prompts" },
  { name: "--no-git", desc: "Disable git integration" },
  { name: "--print", desc: "Print mode - output to stdout without interactive UI" },
  { name: "--max-tokens", desc: "Maximum tokens for response" },
  { name: "--context-window", desc: "Override context window size" },
  { name: "--verbose", desc: "Enable verbose logging" },
  { name: "--output-format", desc: "Output format (json, stream-json, text)" },
  { name: "--system-prompt", desc: "Custom system prompt file path" },
  { name: "--allowedTools", desc: "Comma-separated list of allowed tools" },
  { name: "--disallowedTools", desc: "Comma-separated list of disallowed tools" },
];

interface HooksTabProps {
  hooks: HookConfig[];
  onCopy: (text: string, label: string) => void;
}

function HooksTab({ hooks, onCopy }: HooksTabProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Configured Hooks Section */}
      <div>
        <h3 style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#2a9d8f",
          marginBottom: "12px",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          Configured Hooks
        </h3>
        {hooks.length === 0 ? (
          <div style={{ color: "#a0a0a0", fontSize: "14px", padding: "12px", background: "#264653", borderRadius: "8px" }}>
            No hooks configured for this project.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {hooks.map((hook) => (
              <div
                key={hook.name}
                style={{
                  padding: "16px",
                  background: "#264653",
                  borderRadius: "8px",
                  border: "1px solid #2a9d8f",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#2a9d8f" }}>
                      {hook.event}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        background: hook.scope === "global" ? "#4a9eff" : "#ff9800",
                        borderRadius: "12px",
                        color: "white",
                      }}
                    >
                      {hook.scope}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        background: hook.enabled ? "#2a9d8f" : "#666",
                        borderRadius: "12px",
                        color: "white",
                      }}
                    >
                      {hook.enabled ? "enabled" : "disabled"}
                    </span>
                  </div>
                  <button
                    onClick={() => onCopy(hook.command, hook.name)}
                    style={{
                      padding: "4px 8px",
                      background: "#1d3d47",
                      border: "none",
                      borderRadius: "4px",
                      color: "#2a9d8f",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                    data-testid={`copy-hook-${hook.event}`}
                  >
                    Copy
                  </button>
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontFamily: "monospace",
                    color: "#c0c0c0",
                    background: "#1a1a1a",
                    padding: "8px",
                    borderRadius: "4px",
                  }}
                >
                  {hook.command}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CLI Flags Reference Section */}
      <div>
        <h3 style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#2a9d8f",
          marginBottom: "12px",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          CLI Flags Reference
        </h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "8px"
        }}>
          {CLI_FLAGS_REFERENCE.map((flag) => (
            <div
              key={flag.name}
              style={{
                padding: "12px",
                background: "#264653",
                borderRadius: "6px",
                border: "1px solid #1d3d47",
              }}
              data-testid={`cli-flag-${flag.name.replace(/^--/, '')}`}
            >
              <div style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#4a9eff",
                fontFamily: "monospace",
                marginBottom: "4px"
              }}>
                {flag.name}
              </div>
              <div style={{ fontSize: "12px", color: "#a0a0a0", lineHeight: 1.4 }}>
                {flag.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface MCPTabProps {
  servers: MCPServer[];
  onCopy: (text: string, label: string) => void;
}

function MCPTab({ servers, onCopy }: MCPTabProps) {
  if (servers.length === 0) {
    return (
      <div style={{ color: "#a0a0a0", fontSize: "14px" }}>
        No MCP servers configured for this project.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {servers.map((server) => (
        <div
          key={server.name}
          style={{
            padding: "16px",
            background: "#264653",
            borderRadius: "8px",
            border: `1px solid ${getStatusColor(server.status)}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "16px", fontWeight: 600 }}>{server.name}</span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  background: getStatusColor(server.status),
                  borderRadius: "12px",
                  color: "white",
                }}
              >
                {server.status}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  background: server.scope === "global" ? "#4a9eff" : "#ff9800",
                  borderRadius: "12px",
                  color: "white",
                }}
              >
                {server.scope}
              </span>
            </div>
            <button
              onClick={() =>
                onCopy(
                  `${server.command} ${server.args?.join(" ") || ""}`,
                  server.name
                )
              }
              style={{
                padding: "4px 8px",
                background: "#1d3d47",
                border: "none",
                borderRadius: "4px",
                color: "#2a9d8f",
                cursor: "pointer",
                fontSize: "12px",
              }}
              data-testid={`copy-mcp-${server.name}`}
            >
              Copy Command
            </button>
          </div>
          <div
            style={{
              fontSize: "13px",
              fontFamily: "monospace",
              color: "#c0c0c0",
              background: "#1a1a1a",
              padding: "8px",
              borderRadius: "4px",
              marginBottom: "8px",
            }}
          >
            {server.command} {server.args?.join(" ")}
          </div>
          {server.env && Object.keys(server.env).length > 0 && (
            <div style={{ fontSize: "12px", color: "#a0a0a0", marginTop: "8px" }}>
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>Environment:</div>
              {Object.entries(server.env).map(([key, value]) => (
                <div key={key} style={{ marginLeft: "8px", fontFamily: "monospace" }}>
                  {key}={value}
                </div>
              ))}
            </div>
          )}
          {server.error && (
            <div
              style={{
                marginTop: "8px",
                padding: "8px",
                background: "#ff6b6b33",
                border: "1px solid #ff6b6b",
                borderRadius: "4px",
                fontSize: "12px",
                color: "#ff6b6b",
              }}
            >
              Error: {server.error}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface SettingsTabProps {
  settings: import("../../modules/context").ClaudeSettings;
  onCopy: (text: string, label: string) => void;
}

function SettingsTab({ settings, onCopy }: SettingsTabProps) {
  const settingsJson = JSON.stringify(settings, null, 2);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#2a9d8f" }}>
          Claude Settings
        </h3>
        <button
          onClick={() => onCopy(settingsJson, "settings")}
          style={{
            padding: "6px 12px",
            background: "#264653",
            border: "none",
            borderRadius: "4px",
            color: "white",
            cursor: "pointer",
            fontSize: "12px",
          }}
          data-testid="copy-settings"
        >
          Copy All
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {settings.model && (
          <SettingItem label="Model" value={settings.model} />
        )}
        {settings.permissionMode && (
          <SettingItem label="Permission Mode" value={settings.permissionMode} />
        )}
        {settings.allowedTools && settings.allowedTools.length > 0 && (
          <SettingItem
            label="Allowed Tools"
            value={settings.allowedTools.join(", ")}
          />
        )}
        {settings.disallowedTools && settings.disallowedTools.length > 0 && (
          <SettingItem
            label="Disallowed Tools"
            value={settings.disallowedTools.join(", ")}
          />
        )}
        {settings.customInstructions && (
          <SettingItem
            label="Custom Instructions"
            value={settings.customInstructions}
            multiline
          />
        )}
        {Object.keys(settings).length === 0 && (
          <div style={{ color: "#a0a0a0", fontSize: "14px" }}>
            No custom settings configured.
          </div>
        )}
      </div>
    </div>
  );
}

interface SettingItemProps {
  label: string;
  value: string;
  multiline?: boolean;
}

function SettingItem({ label, value, multiline }: SettingItemProps) {
  return (
    <div
      style={{
        padding: "12px",
        background: "#264653",
        borderRadius: "8px",
        border: "1px solid #2a9d8f",
      }}
    >
      <div style={{ fontSize: "12px", color: "#a0a0a0", marginBottom: "6px" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: "14px",
          color: "#e8e8e8",
          fontFamily: multiline ? "inherit" : "monospace",
          whiteSpace: multiline ? "pre-wrap" : "nowrap",
          overflow: multiline ? "auto" : "hidden",
          textOverflow: multiline ? "clip" : "ellipsis",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getStatusColor(status: string): string {
  switch (status) {
    case "connected":
      return "#2a9d8f";
    case "connecting":
      return "#ff9800";
    case "error":
      return "#ff6b6b";
    case "stopped":
      return "#666";
    default:
      return "#666";
  }
}
