/**
 * MCP Server Detail - Detailed view of an MCP server
 *
 * Displays:
 * - Server configuration
 * - Available tools/resources/prompts
 * - Start/stop/restart actions
 * - Enable/disable toggle
 * - Test connection button
 * - Configure/remove buttons
 */

import { useState } from "react";
import { getMCPManager } from "../../modules/mcp";
import type { MCPServer } from "../../modules/mcp/types";

interface MCPServerDetailProps {
  server: MCPServer;
}

export function MCPServerDetail({ server }: MCPServerDetailProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ healthy: boolean; latencyMs?: number; error?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "tools" | "resources" | "prompts">("info");

  const manager = getMCPManager();
  const isManaged = server.scope === "managed";
  const canControl = server.status !== "disabled";

  const handleStart = async () => {
    try {
      await manager.startServer(server.name);
    } catch (error) {
      console.error("Failed to start server:", error);
    }
  };

  const handleStop = async () => {
    try {
      await manager.stopServer(server.name);
    } catch (error) {
      console.error("Failed to stop server:", error);
    }
  };

  const handleRestart = async () => {
    try {
      await manager.restartServer(server.name);
    } catch (error) {
      console.error("Failed to restart server:", error);
    }
  };

  const handleToggleEnabled = async () => {
    try {
      await manager.updateServer({
        name: server.name,
        enabled: !server.enabled,
      });
    } catch (error) {
      console.error("Failed to toggle server:", error);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await manager.testConnection(server.name);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        healthy: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm(`Are you sure you want to remove server "${server.name}"?`)) {
      return;
    }

    try {
      await manager.removeServer(server.name);
    } catch (error) {
      console.error("Failed to remove server:", error);
      alert(`Failed to remove server: ${error}`);
    }
  };

  return (
    <div style={{
      marginTop: "4px",
      padding: "12px",
      backgroundColor: "var(--color-bg-surface)",
      borderRadius: "var(--radius-md)",
      fontSize: "12px",
    }}>
      {/* Action Buttons */}
      <div style={{
        display: "flex",
        gap: "6px",
        marginBottom: "12px",
        flexWrap: "wrap",
      }}>
        {/* Start/Stop */}
        {server.status === "stopped" && canControl && (
          <button
            onClick={handleStart}
            style={{
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "transparent",
              border: "1px solid var(--color-success)",
              color: "var(--color-success)",
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "var(--transition-fast)",
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(130, 230, 190, 0.1)"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            Start
          </button>
        )}

        {(server.status === "connected" || server.status === "connecting") && canControl && (
          <button
            onClick={handleStop}
            style={{
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "transparent",
              border: "1px solid var(--color-error)",
              color: "var(--color-error)",
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "var(--transition-fast)",
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(248, 81, 73, 0.1)"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            Stop
          </button>
        )}

        {/* Restart */}
        {server.status === "connected" && (
          <button
            onClick={handleRestart}
            style={{
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "transparent",
              border: "1px solid var(--color-warning)",
              color: "var(--color-warning)",
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "var(--transition-fast)",
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(210, 153, 34, 0.1)"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            Restart
          </button>
        )}

        {/* Test Connection */}
        <button
          onClick={handleTestConnection}
          disabled={testing}
          style={{
            padding: "4px 8px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "transparent",
            border: "1px solid var(--color-info)",
            color: "var(--color-info)",
            fontSize: "11px",
            fontWeight: 500,
            cursor: testing ? "not-allowed" : "pointer",
            opacity: testing ? 0.6 : 1,
            transition: "var(--transition-fast)",
          }}
          onMouseOver={(e) => !testing && (e.currentTarget.style.backgroundColor = "rgba(88, 166, 255, 0.1)")}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
        >
          {testing ? "Testing..." : "Test"}
        </button>

        {/* Enable/Disable */}
        {!isManaged && (
          <button
            onClick={handleToggleEnabled}
            style={{
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "transparent",
              border: `1px solid ${server.enabled ? "var(--color-text-muted)" : "var(--color-success)"}`,
              color: server.enabled ? "var(--color-text-muted)" : "var(--color-success)",
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "var(--transition-fast)",
            }}
          >
            {server.enabled ? "Disable" : "Enable"}
          </button>
        )}

        {/* Remove */}
        {!isManaged && (
          <button
            onClick={handleRemove}
            style={{
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "transparent",
              border: "1px solid var(--color-error)",
              color: "var(--color-error)",
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              marginLeft: "auto",
              transition: "var(--transition-fast)",
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(248, 81, 73, 0.1)"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            Remove
          </button>
        )}
      </div>

      {/* Test Result */}
      {testResult && (
        <div style={{
          marginBottom: "12px",
          padding: "8px",
          backgroundColor: testResult.healthy ? "rgba(63, 185, 80, 0.1)" : "rgba(248, 81, 73, 0.1)",
          borderRadius: "var(--radius-sm)",
          color: testResult.healthy ? "var(--color-success)" : "var(--color-error)",
        }}>
          {testResult.healthy ? (
            <div>
              Connection healthy
              {testResult.latencyMs && ` (${testResult.latencyMs}ms)`}
            </div>
          ) : (
            <div>Connection failed: {testResult.error}</div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: "4px",
        marginBottom: "8px",
        borderBottom: "1px solid var(--color-border-default)",
      }}>
        {(["info", "tools", "resources", "prompts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "6px 12px",
              border: "none",
              backgroundColor: "transparent",
              color: activeTab === tab ? "var(--color-accent)" : "var(--color-text-secondary)",
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              borderBottom: activeTab === tab ? "2px solid var(--color-accent)" : "none",
              textTransform: "capitalize",
              transition: "var(--transition-fast)",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ color: "var(--color-text-primary)" }}>
        {activeTab === "info" && <InfoTab server={server} />}
        {activeTab === "tools" && <ToolsTab server={server} />}
        {activeTab === "resources" && <ResourcesTab server={server} />}
        {activeTab === "prompts" && <PromptsTab server={server} />}
      </div>
    </div>
  );
}

function InfoTab({ server }: { server: MCPServer }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <InfoRow label="Transport" value={server.transport} />
      <InfoRow label="Scope" value={server.scope} />

      {server.command && <InfoRow label="Command" value={server.command} mono />}
      {server.args && server.args.length > 0 && (
        <InfoRow label="Args" value={server.args.join(" ")} mono />
      )}
      {server.url && <InfoRow label="URL" value={server.url} mono />}

      {server.lastConnected && (
        <InfoRow
          label="Last Connected"
          value={new Date(server.lastConnected).toLocaleString()}
        />
      )}

      {server.processId && <InfoRow label="Process ID" value={String(server.processId)} />}
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ color: "var(--color-text-secondary)", fontSize: "10px", marginBottom: "2px" }}>
        {label}
      </div>
      <div style={{
        fontSize: "11px",
        fontFamily: mono ? "monospace" : "inherit",
        wordBreak: "break-all",
      }}>
        {value}
      </div>
    </div>
  );
}

function ToolsTab({ server }: { server: MCPServer }) {
  const tools = server.capabilities?.tools || [];

  if (tools.length === 0) {
    return (
      <div style={{ padding: "12px", textAlign: "center", color: "var(--color-text-muted)" }}>
        No tools available
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {tools.map((tool) => (
        <div
          key={tool.name}
          style={{
            padding: "8px",
            backgroundColor: "var(--color-bg-overlay)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: "4px" }}>{tool.name}</div>
          {tool.description && (
            <div style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
              {tool.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ResourcesTab({ server }: { server: MCPServer }) {
  const resources = server.capabilities?.resources || [];

  if (resources.length === 0) {
    return (
      <div style={{ padding: "12px", textAlign: "center", color: "var(--color-text-muted)" }}>
        No resources available
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {resources.map((resource) => (
        <div
          key={resource.uri}
          style={{
            padding: "8px",
            backgroundColor: "var(--color-bg-overlay)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: "4px" }}>{resource.name}</div>
          <div style={{ fontSize: "10px", fontFamily: "monospace", color: "var(--color-text-secondary)", marginBottom: "4px" }}>
            {resource.uri}
          </div>
          {resource.description && (
            <div style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
              {resource.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PromptsTab({ server }: { server: MCPServer }) {
  const prompts = server.capabilities?.prompts || [];

  if (prompts.length === 0) {
    return (
      <div style={{ padding: "12px", textAlign: "center", color: "var(--color-text-muted)" }}>
        No prompts available
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {prompts.map((prompt) => (
        <div
          key={prompt.name}
          style={{
            padding: "8px",
            backgroundColor: "var(--color-bg-overlay)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: "4px" }}>{prompt.name}</div>
          {prompt.description && (
            <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "6px" }}>
              {prompt.description}
            </div>
          )}
          {prompt.arguments && prompt.arguments.length > 0 && (
            <div style={{ fontSize: "10px" }}>
              <div style={{ color: "var(--color-text-secondary)", marginBottom: "4px" }}>Arguments:</div>
              {prompt.arguments.map((arg) => (
                <div key={arg.name} style={{ marginLeft: "8px", marginBottom: "2px" }}>
                  <span style={{ fontFamily: "monospace", color: "var(--color-accent)" }}>
                    {arg.name}
                  </span>
                  {arg.required && <span style={{ color: "var(--color-error)" }}>*</span>}
                  {arg.description && (
                    <span style={{ color: "var(--color-text-secondary)" }}> - {arg.description}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
