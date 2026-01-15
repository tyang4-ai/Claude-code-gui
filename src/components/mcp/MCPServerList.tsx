/**
 * MCP Server List - List of MCP servers with status
 *
 * Displays:
 * - Server name and transport type
 * - Status indicator
 * - Enable/disable toggle
 * - Quick actions (start/stop/configure)
 */

import { useState } from "react";
import type { MCPServer } from "../../modules/mcp/types";
import { MCPServerDetail } from "./MCPServerDetail";

interface MCPServerListProps {
  servers: MCPServer[];
}

export function MCPServerList({ servers }: MCPServerListProps) {
  const [expandedServer, setExpandedServer] = useState<string | null>(null);

  const toggleExpand = (serverName: string) => {
    setExpandedServer(expandedServer === serverName ? null : serverName);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {servers.map((server) => (
        <div key={server.name}>
          <MCPServerListItem
            server={server}
            isExpanded={expandedServer === server.name}
            onToggleExpand={() => toggleExpand(server.name)}
          />
          {expandedServer === server.name && (
            <MCPServerDetail server={server} />
          )}
        </div>
      ))}
    </div>
  );
}

interface MCPServerListItemProps {
  server: MCPServer;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function MCPServerListItem({ server, isExpanded, onToggleExpand }: MCPServerListItemProps) {
  const statusColors = {
    connected: "var(--color-success)",
    connecting: "var(--color-warning)",
    error: "var(--color-error)",
    stopped: "var(--color-text-muted)",
    disabled: "var(--color-text-muted)",
  };

  const statusLabels = {
    connected: "Connected",
    connecting: "Connecting...",
    error: "Error",
    stopped: "Stopped",
    disabled: "Disabled",
  };

  return (
    <div
      style={{
        padding: "8px",
        backgroundColor: "var(--color-bg-overlay)",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        transition: "var(--transition-fast)",
      }}
      onClick={onToggleExpand}
      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--color-bg-elevated)"}
      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "var(--color-bg-overlay)"}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        {/* Left: Status indicator + Name */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
          {/* Status indicator */}
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: statusColors[server.status],
              flexShrink: 0,
            }}
            title={statusLabels[server.status]}
          />

          {/* Server info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: "13px",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {server.name}
            </div>
            <div style={{
              fontSize: "11px",
              color: "var(--color-text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}>
              <span>{server.transport}</span>
              {server.capabilities && (
                <>
                  <span>•</span>
                  <span>{server.capabilities.tools.length} tools</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Expand arrow */}
        <svg
          style={{
            width: "16px",
            height: "16px",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform var(--transition-fast)",
            color: "var(--color-text-secondary)",
            flexShrink: 0,
          }}
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

      {/* Error message */}
      {server.status === "error" && server.error && (
        <div style={{
          marginTop: "8px",
          padding: "6px 8px",
          backgroundColor: "rgba(var(--color-error), 0.1)",
          borderRadius: "var(--radius-sm)",
          fontSize: "11px",
          color: "var(--color-error)",
        }}>
          {server.error}
        </div>
      )}
    </div>
  );
}
