/**
 * MCP Add Modal - Modal for adding new MCP servers
 *
 * Features:
 * - Form to configure new server
 * - Transport selection (stdio, http, sse)
 * - Scope selection (user, project)
 * - Validation
 * - Test connection before saving
 */

import { useState } from "react";
import { getMCPManager } from "../../modules/mcp";
import type { MCPTransport, AddMCPServerInput } from "../../modules/mcp/types";
import { validateServerConfig } from "../../modules/mcp/config-parser";

interface MCPAddModalProps {
  onClose: () => void;
}

export function MCPAddModal({ onClose }: MCPAddModalProps) {
  const [name, setName] = useState("");
  const [transport, setTransport] = useState<MCPTransport>("stdio");
  const [scope, setScope] = useState<"user" | "project">("project");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [url, setUrl] = useState("");
  const [envVars, setEnvVars] = useState("");
  const [headers, setHeaders] = useState("");
  const [autoStart, setAutoStart] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    // Build input
    const input: AddMCPServerInput = {
      name: name.trim(),
      transport,
      scope,
      autoStart,
    };

    // Add transport-specific fields
    if (transport === "stdio") {
      input.command = command.trim();
      if (args.trim()) {
        input.args = args.trim().split(/\s+/);
      }
    } else {
      input.url = url.trim();
    }

    // Parse env vars
    if (envVars.trim()) {
      try {
        const env: Record<string, string> = {};
        for (const line of envVars.split("\n")) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#")) {
            const [key, ...valueParts] = trimmed.split("=");
            if (key) {
              env[key.trim()] = valueParts.join("=").trim();
            }
          }
        }
        input.env = env;
      } catch (error) {
        setErrors(["Invalid environment variables format"]);
        return;
      }
    }

    // Parse headers
    if (headers.trim() && (transport === "http" || transport === "sse")) {
      try {
        const headerObj: Record<string, string> = {};
        for (const line of headers.split("\n")) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#")) {
            const [key, ...valueParts] = trimmed.split(":");
            if (key) {
              headerObj[key.trim()] = valueParts.join(":").trim();
            }
          }
        }
        input.headers = headerObj;
      } catch (error) {
        setErrors(["Invalid headers format"]);
        return;
      }
    }

    // Validate
    const validation = validateServerConfig({
      ...input,
      enabled: true,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    // Save
    setSaving(true);
    try {
      const manager = getMCPManager();
      await manager.addServer(input);
      onClose();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      setSaving(false);
    }
  };

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
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--color-bg-surface)",
          borderRadius: "var(--radius-lg)",
          width: "90%",
          maxWidth: "500px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          color: "var(--color-text-primary)",
          boxShadow: "var(--shadow-xl)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "16px",
          borderBottom: "1px solid var(--color-border-default)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>
            Add MCP Server
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              fontSize: "20px",
              padding: "0",
              width: "24px",
              height: "24px",
              transition: "var(--transition-fast)",
            }}
            onMouseOver={(e) => e.currentTarget.style.color = "var(--color-text-primary)"}
            onMouseOut={(e) => e.currentTarget.style.color = "var(--color-text-secondary)"}
            aria-label="Close"
          >
            x
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {/* Errors */}
          {errors.length > 0 && (
            <div style={{
              marginBottom: "16px",
              padding: "12px",
              backgroundColor: "rgba(248, 81, 73, 0.1)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-error)",
              fontSize: "12px",
            }}>
              {errors.map((error, i) => (
                <div key={i}>{error}</div>
              ))}
            </div>
          )}

          {/* Server Name */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "6px", color: "var(--color-text-secondary)" }}>
              Server Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-mcp-server"
              required
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border-default)",
                backgroundColor: "var(--color-bg-overlay)",
                color: "var(--color-text-primary)",
                fontSize: "13px",
              }}
            />
            <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "4px" }}>
              Alphanumeric characters, hyphens, and underscores only
            </div>
          </div>

          {/* Transport */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "6px", color: "var(--color-text-secondary)" }}>
              Transport *
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["stdio", "http", "sse"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTransport(t)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "var(--radius-sm)",
                    border: transport === t ? "2px solid var(--color-accent)" : "1px solid var(--color-border-default)",
                    backgroundColor: transport === t ? "rgba(130, 230, 190, 0.15)" : "transparent",
                    color: transport === t ? "var(--color-accent)" : "var(--color-text-secondary)",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                    textTransform: "uppercase",
                    transition: "var(--transition-fast)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Scope */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "6px", color: "var(--color-text-secondary)" }}>
              Scope *
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["user", "project"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "var(--radius-sm)",
                    border: scope === s ? "2px solid var(--color-accent)" : "1px solid var(--color-border-default)",
                    backgroundColor: scope === s ? "rgba(130, 230, 190, 0.15)" : "transparent",
                    color: scope === s ? "var(--color-accent)" : "var(--color-text-secondary)",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "var(--transition-fast)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "4px" }}>
              {scope === "user" ? "~/.claude/claude_desktop_config.json" : "./.mcp.json"}
            </div>
          </div>

          {/* Transport-specific fields */}
          {transport === "stdio" ? (
            <>
              {/* Command */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", marginBottom: "6px", color: "var(--color-text-secondary)" }}>
                  Command *
                </label>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="node"
                  required
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border-default)",
                    backgroundColor: "var(--color-bg-overlay)",
                    color: "var(--color-text-primary)",
                    fontSize: "13px",
                    fontFamily: "monospace",
                  }}
                />
              </div>

              {/* Args */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", marginBottom: "6px", color: "var(--color-text-secondary)" }}>
                  Arguments
                </label>
                <input
                  type="text"
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder="path/to/server.js --flag value"
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border-default)",
                    backgroundColor: "var(--color-bg-overlay)",
                    color: "var(--color-text-primary)",
                    fontSize: "13px",
                    fontFamily: "monospace",
                  }}
                />
              </div>
            </>
          ) : (
            <>
              {/* URL */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", marginBottom: "6px", color: "var(--color-text-secondary)" }}>
                  URL *
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="http://localhost:3000"
                  required
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border-default)",
                    backgroundColor: "var(--color-bg-overlay)",
                    color: "var(--color-text-primary)",
                    fontSize: "13px",
                    fontFamily: "monospace",
                  }}
                />
              </div>

              {/* Headers */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", marginBottom: "6px", color: "var(--color-text-secondary)" }}>
                  Headers
                </label>
                <textarea
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                  placeholder="Authorization: Bearer token&#10;Content-Type: application/json"
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border-default)",
                    backgroundColor: "var(--color-bg-overlay)",
                    color: "var(--color-text-primary)",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    resize: "vertical",
                  }}
                />
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                  One header per line (Key: Value)
                </div>
              </div>
            </>
          )}

          {/* Environment Variables */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "6px", color: "var(--color-text-secondary)" }}>
              Environment Variables
            </label>
            <textarea
              value={envVars}
              onChange={(e) => setEnvVars(e.target.value)}
              placeholder="API_KEY=your_key&#10;DEBUG=true"
              rows={3}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border-default)",
                backgroundColor: "var(--color-bg-overlay)",
                color: "var(--color-text-primary)",
                fontSize: "12px",
                fontFamily: "monospace",
                resize: "vertical",
              }}
            />
            <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "4px" }}>
              One variable per line (KEY=value)
            </div>
          </div>

          {/* Auto-start */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontSize: "13px",
            }}>
              <input
                type="checkbox"
                checked={autoStart}
                onChange={(e) => setAutoStart(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              Auto-start server when enabled
            </label>
          </div>
        </form>

        {/* Footer */}
        <div style={{
          padding: "16px",
          borderTop: "1px solid var(--color-border-default)",
          display: "flex",
          gap: "8px",
          justifyContent: "flex-end",
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border-default)",
              backgroundColor: "transparent",
              color: "var(--color-text-secondary)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "var(--transition-fast)",
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--color-bg-overlay)"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-accent)",
              backgroundColor: saving ? "var(--color-bg-overlay)" : "transparent",
              color: saving ? "var(--color-text-muted)" : "var(--color-accent)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: saving ? "not-allowed" : "pointer",
              transition: "var(--transition-fast)",
            }}
            onMouseOver={(e) => !saving && (e.currentTarget.style.backgroundColor = "rgba(130, 230, 190, 0.1)")}
            onMouseOut={(e) => !saving && (e.currentTarget.style.backgroundColor = "transparent")}
          >
            {saving ? "Adding..." : "Add Server"}
          </button>
        </div>
      </div>
    </div>
  );
}
