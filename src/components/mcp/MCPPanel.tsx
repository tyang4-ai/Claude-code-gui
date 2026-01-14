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
      backgroundColor: "#1d3d47",
      color: "#e8e8e8",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px",
        borderBottom: "1px solid #2a9d8f",
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
              borderRadius: "4px",
              backgroundColor: "#2a9d8f",
              border: "none",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#238277"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#2a9d8f"}
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
              backgroundColor: "#264653",
              borderRadius: "4px",
              textAlign: "center",
            }}>
              <div style={{ color: "#a0a0a0", marginBottom: "2px" }}>Servers</div>
              <div style={{ fontSize: "16px", fontWeight: 600 }}>{stats.totalServers}</div>
            </div>
            <div style={{
              padding: "6px",
              backgroundColor: "#264653",
              borderRadius: "4px",
              textAlign: "center",
            }}>
              <div style={{ color: "#a0a0a0", marginBottom: "2px" }}>Connected</div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: "#2a9d8f" }}>
                {stats.connectedServers}
              </div>
            </div>
            <div style={{
              padding: "6px",
              backgroundColor: "#264653",
              borderRadius: "4px",
              textAlign: "center",
            }}>
              <div style={{ color: "#a0a0a0", marginBottom: "2px" }}>Tools</div>
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
                borderRadius: "4px",
                border: "none",
                backgroundColor: selectedScope === scope ? "#2a9d8f" : "transparent",
                color: selectedScope === scope ? "#fff" : "#a0a0a0",
                fontSize: "11px",
                fontWeight: 500,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
              onMouseOver={(e) => {
                if (selectedScope !== scope) {
                  e.currentTarget.style.backgroundColor = "#264653";
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
                  color: "#a0a0a0",
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
                  color: "#a0a0a0",
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
                  color: "#a0a0a0",
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
                color: "#6b6b6b",
                fontSize: "14px",
              }}>
                No MCP servers configured
                <br />
                <button
                  onClick={() => setShowAddModal(true)}
                  style={{
                    marginTop: "12px",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    backgroundColor: "#2a9d8f",
                    border: "none",
                    color: "#fff",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
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
                color: "#6b6b6b",
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
