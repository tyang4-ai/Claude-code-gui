/**
 * MCP Tool Card - Display MCP tool invocations in chat
 *
 * Shows:
 * - Server name
 * - Tool name
 * - Input parameters
 * - Result (if available)
 * - Expandable details
 */

import { useState } from "react";
import type { MCPToolInvocation, MCPToolResult } from "../../modules/mcp/types";

interface MCPToolCardProps {
  invocation: MCPToolInvocation;
  result?: MCPToolResult;
}

export function MCPToolCard({ invocation, result }: MCPToolCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasResult = result !== undefined;
  const isError = result?.isError || false;

  return (
    <div
      style={{
        margin: "8px 0",
        padding: "12px",
        backgroundColor: "#264653",
        borderRadius: "8px",
        borderLeft: `4px solid ${isError ? "#e74c3c" : "#3498db"}`,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
          {/* Icon */}
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              backgroundColor: "#3498db",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              style={{ width: "20px", height: "20px", color: "#fff" }}
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
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "#e8e8e8",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              MCP: {invocation.toolName}
            </div>
            <div style={{
              fontSize: "11px",
              color: "#a0a0a0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {invocation.serverName}
              {hasResult && (
                <>
                  {" • "}
                  <span style={{ color: isError ? "#e74c3c" : "#2a9d8f" }}>
                    {isError ? "Error" : "Success"}
                  </span>
                </>
              )}
              {!hasResult && (
                <>
                  {" • "}
                  <span style={{ color: "#f39c12" }}>Running...</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Expand Arrow */}
        <svg
          style={{
            width: "16px",
            height: "16px",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
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

      {/* Expanded Details */}
      {expanded && (
        <div style={{ marginTop: "12px", fontSize: "12px" }}>
          {/* Input */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#a0a0a0",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              Input
            </div>
            <pre
              style={{
                padding: "8px",
                backgroundColor: "#1d3d47",
                borderRadius: "4px",
                fontSize: "11px",
                fontFamily: "monospace",
                overflow: "auto",
                margin: 0,
                color: "#e8e8e8",
              }}
            >
              {JSON.stringify(invocation.input, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {hasResult && result && (
            <div>
              <div style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#a0a0a0",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                {isError ? "Error" : "Result"}
              </div>
              <pre
                style={{
                  padding: "8px",
                  backgroundColor: isError ? "rgba(231, 76, 60, 0.1)" : "#1d3d47",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  overflow: "auto",
                  margin: 0,
                  color: isError ? "#e74c3c" : "#e8e8e8",
                }}
              >
                {typeof result.content === "string"
                  ? result.content
                  : JSON.stringify(result.content, null, 2)}
              </pre>
            </div>
          )}

          {/* Timestamp */}
          <div style={{
            marginTop: "8px",
            fontSize: "10px",
            color: "#6b6b6b",
            textAlign: "right",
          }}>
            {new Date(invocation.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
