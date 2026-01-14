/**
 * MCP (Model Context Protocol) Types
 *
 * Type definitions for the MCP manager system.
 */

/**
 * MCP transport types
 */
export type MCPTransport = "stdio" | "http" | "sse";

/**
 * MCP server status
 */
export type MCPServerStatus =
  | "connected"
  | "connecting"
  | "error"
  | "stopped"
  | "disabled";

/**
 * MCP server scope
 */
export type MCPServerScope = "user" | "project" | "managed";

/**
 * MCP tool definition
 */
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

/**
 * MCP resource definition
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP prompt definition
 */
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * MCP server capabilities
 */
export interface MCPCapabilities {
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
}

/**
 * MCP server configuration
 */
export interface MCPServerConfig {
  name: string;
  transport: MCPTransport;
  command?: string; // For stdio transport
  args?: string[];
  env?: Record<string, string>;
  url?: string; // For http/sse transports
  headers?: Record<string, string>;
  scope: MCPServerScope;
  enabled: boolean;
  autoStart?: boolean;
}

/**
 * MCP server runtime state
 */
export interface MCPServer extends MCPServerConfig {
  status: MCPServerStatus;
  capabilities?: MCPCapabilities;
  error?: string;
  lastConnected?: number;
  processId?: number; // For stdio servers
}

/**
 * MCP configuration file format (claude_desktop_config.json)
 */
export interface MCPConfigFile {
  mcpServers?: Record<string, MCPServerConfigFile>;
}

/**
 * Server configuration in config file
 */
export interface MCPServerConfigFile {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  disabled?: boolean;
}

/**
 * MCP tool invocation in chat
 */
export interface MCPToolInvocation {
  id: string;
  serverName: string;
  toolName: string;
  input: Record<string, unknown>;
  timestamp: number;
}

/**
 * MCP tool result
 */
export interface MCPToolResult {
  invocationId: string;
  content: unknown;
  isError: boolean;
  timestamp: number;
}

/**
 * MCP connection error types
 */
export type MCPErrorType =
  | "connection_failed"
  | "authentication_failed"
  | "timeout"
  | "invalid_config"
  | "process_crashed"
  | "unknown";

/**
 * MCP error details
 */
export interface MCPError {
  type: MCPErrorType;
  message: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

/**
 * MCP server health check result
 */
export interface MCPHealthCheck {
  serverName: string;
  healthy: boolean;
  latencyMs?: number;
  error?: string;
  timestamp: number;
}

/**
 * MCP manager state
 */
export interface MCPManagerState {
  servers: Record<string, MCPServer>;
  invocations: MCPToolInvocation[];
  results: Record<string, MCPToolResult>;
  errors: Record<string, MCPError[]>;
}

/**
 * MCP server add input
 */
export interface AddMCPServerInput {
  name: string;
  transport: MCPTransport;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  scope: MCPServerScope;
  autoStart?: boolean;
}

/**
 * MCP server update input
 */
export interface UpdateMCPServerInput {
  name: string;
  enabled?: boolean;
  autoStart?: boolean;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

/**
 * MCP config source
 */
export interface MCPConfigSource {
  path: string;
  scope: MCPServerScope;
  exists: boolean;
  lastModified?: number;
}

/**
 * MCP statistics
 */
export interface MCPStatistics {
  totalServers: number;
  connectedServers: number;
  errorServers: number;
  totalTools: number;
  totalResources: number;
  totalPrompts: number;
  totalInvocations: number;
}
