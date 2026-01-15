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
        backgroundColor: "var(--color-bg-overlay)",
        borderRadius: "var(--radius-md)",
        borderLeft: `4px solid ${isError ? "var(--color-error)" : "var(--color-info)"}`,
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
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-info)",
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
              color: "var(--color-text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              MCP: {invocation.toolName}
            </div>
            <div style={{
              fontSize: "11px",
              color: "var(--color-text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {invocation.serverName}
              {hasResult && (
                <>
                  {" • "}
                  <span style={{ color: isError ? "var(--color-error)" : "var(--color-success)" }}>
                    {isError ? "Error" : "Success"}
                  </span>
                </>
              )}
              {!hasResult && (
                <>
                  {" • "}
                  <span style={{ color: "var(--color-warning)" }}>Running...</span>
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

      {/* Expanded Details */}
      {expanded && (
        <div style={{ marginTop: "12px", fontSize: "12px" }}>
          {/* Input */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              Input
            </div>
            <pre
              style={{
                padding: "8px",
                backgroundColor: "var(--color-bg-surface)",
                borderRadius: "var(--radius-sm)",
                fontSize: "11px",
                fontFamily: "monospace",
                overflow: "auto",
                margin: 0,
                color: "var(--color-text-primary)",
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
                color: "var(--color-text-secondary)",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                {isError ? "Error" : "Result"}
              </div>
              <pre
                style={{
                  padding: "8px",
                  backgroundColor: isError ? "rgba(248, 81, 73, 0.1)" : "var(--color-bg-surface)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  overflow: "auto",
                  margin: 0,
                  color: isError ? "var(--color-error)" : "var(--color-text-primary)",
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
            color: "var(--color-text-muted)",
            textAlign: "right",
          }}>
            {new Date(invocation.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
