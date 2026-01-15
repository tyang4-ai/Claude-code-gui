/**
 * MCP Panel - Sidebar panel for MCP server management
 *
 * Displays:
 * - List of all MCP servers grouped by scope
 * - Server status indicators
 * - Add/configure buttons
 * - Quick stats
 */

import { useState, useEffect } from "react";
import { getMCPManager } from "../../modules/mcp";
import type { MCPServer, MCPStatistics } from "../../modules/mcp/types";
import { MCPServerList } from "./MCPServerList";
import { MCPAddModal } from "./MCPAddModal";

export function MCPPanel() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [stats, setStats] = useState<MCPStatistics | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedScope, setSelectedScope] = useState<"all" | "user" | "project" | "managed">("all");

  // Subscribe to server updates
  useEffect(() => {
    const manager = getMCPManager();

    const updateState = () => {
      setServers(manager.getServers());
      setStats(manager.getStatistics());
    };

    updateState();
    const unsubscribe = manager.subscribe(updateState);

    return () => {
      unsubscribe();
    };
  }, []);

  // Filter servers by scope
  const filteredServers = selectedScope === "all"
    ? servers
    : servers.filter(s => s.scope === selectedScope);

  // Group servers by scope
  const serversByScope = {
    user: servers.filter(s => s.scope === "user"),
    project: servers.filter(s => s.scope === "project"),
    managed: servers.filter(s => s.scope === "managed"),
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      backgroundColor: "var(--color-bg-surface)",
      color: "var(--color-text-primary)",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px",
        borderBottom: "1px solid var(--color-border-default)",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}>
          <h2 style={{
            fontSize: "14px",
            fontWeight: 600,
            margin: 0,
          }}>
            MCP Servers
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "transparent",
              border: "1px solid var(--color-accent)",
              color: "var(--color-accent)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "var(--transition-fast)",
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(130, 230, 190, 0.1)"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            aria-label="Add MCP server"
          >
            + Add
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
            fontSize: "11px",
          }}>
            <div style={{
              padding: "6px",
              backgroundColor: "var(--color-bg-overlay)",
              borderRadius: "var(--radius-sm)",
              textAlign: "center",
            }}>
              <div style={{ color: "var(--color-text-secondary)", marginBottom: "2px" }}>Servers</div>
              <div style={{ fontSize: "16px", fontWeight: 600 }}>{stats.totalServers}</div>
            </div>
            <div style={{
              padding: "6px",
              backgroundColor: "var(--color-bg-overlay)",
              borderRadius: "var(--radius-sm)",
              textAlign: "center",
            }}>
              <div style={{ color: "var(--color-text-secondary)", marginBottom: "2px" }}>Connected</div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-success)" }}>
                {stats.connectedServers}
              </div>
            </div>
            <div style={{
              padding: "6px",
              backgroundColor: "var(--color-bg-overlay)",
              borderRadius: "var(--radius-sm)",
              textAlign: "center",
            }}>
              <div style={{ color: "var(--color-text-secondary)", marginBottom: "2px" }}>Tools</div>
              <div style={{ fontSize: "16px", fontWeight: 600 }}>{stats.totalTools}</div>
            </div>
          </div>
        )}

        {/* Scope Filter */}
        <div style={{
          display: "flex",
          gap: "4px",
          marginTop: "8px",
          fontSize: "11px",
        }}>
          {(["all", "user", "project", "managed"] as const).map((scope) => (
            <button
              key={scope}
              onClick={() => setSelectedScope(scope)}
              style={{
                flex: 1,
                padding: "4px 6px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                backgroundColor: selectedScope === scope ? "rgba(130, 230, 190, 0.15)" : "transparent",
                color: selectedScope === scope ? "var(--color-accent)" : "var(--color-text-secondary)",
                fontSize: "11px",
                fontWeight: 500,
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "var(--transition-fast)",
              }}
              onMouseOver={(e) => {
                if (selectedScope !== scope) {
                  e.currentTarget.style.backgroundColor = "var(--color-bg-overlay)";
                }
              }}
              onMouseOut={(e) => {
                if (selectedScope !== scope) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              {scope}
            </button>
          ))}
        </div>
      </div>

      {/* Server List */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "8px",
      }}>
        {selectedScope === "all" ? (
          <>
            {serversByScope.user.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                }}>
                  User Servers
                </h3>
                <MCPServerList servers={serversByScope.user} />
              </div>
            )}

            {serversByScope.project.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                }}>
                  Project Servers
                </h3>
                <MCPServerList servers={serversByScope.project} />
              </div>
            )}

            {serversByScope.managed.length > 0 && (
              <div>
                <h3 style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                }}>
                  Managed Servers
                </h3>
                <MCPServerList servers={serversByScope.managed} />
              </div>
            )}

            {servers.length === 0 && (
              <div style={{
                padding: "24px",
                textAlign: "center",
                color: "var(--color-text-muted)",
                fontSize: "14px",
              }}>
                No MCP servers configured
                <br />
                <button
                  onClick={() => setShowAddModal(true)}
                  style={{
                    marginTop: "12px",
                    padding: "6px 12px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "transparent",
                    border: "1px solid var(--color-accent)",
                    color: "var(--color-accent)",
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "var(--transition-fast)",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(130, 230, 190, 0.1)"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  Add Your First Server
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <MCPServerList servers={filteredServers} />
            {filteredServers.length === 0 && (
              <div style={{
                padding: "24px",
                textAlign: "center",
                color: "var(--color-text-muted)",
                fontSize: "14px",
              }}>
                No {selectedScope} servers
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <MCPAddModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
