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
    connected: "#2a9d8f",
    connecting: "#f39c12",
    error: "#e74c3c",
    stopped: "#6b6b6b",
    disabled: "#4b5563",
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
        backgroundColor: "#264653",
        borderRadius: "6px",
        cursor: "pointer",
        transition: "background-color 0.2s",
      }}
      onClick={onToggleExpand}
      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#2d5561"}
      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#264653"}
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
              color: "#a0a0a0",
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
            transition: "transform 0.2s",
            color: "#a0a0a0",
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
          backgroundColor: "rgba(231, 76, 60, 0.1)",
          borderRadius: "4px",
          fontSize: "11px",
          color: "#e74c3c",
        }}>
          {server.error}
        </div>
      )}
    </div>
  );
}
