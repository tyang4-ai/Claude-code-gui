/**
 * Context Viewer Types
 *
 * Types for displaying CLAUDE.md files, hooks, and MCP status.
 */

/**
 * CLAUDE.md file location
 */
export interface ClaudeFile {
  path: string;
  scope: "global" | "project" | "local";
  exists: boolean;
  content?: string;
  lastModified?: number;
}

/**
 * Hook configuration
 */
export interface HookConfig {
  name: string;
  event: HookEvent;
  command: string;
  enabled: boolean;
  scope: "global" | "project";
}

/**
 * Hook event types
 */
export type HookEvent =
  | "pre-tool-use"
  | "post-tool-use"
  | "pre-message"
  | "post-message"
  | "user-prompt-submit"
  | "stop";

/**
 * MCP server status
 */
export interface MCPServer {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  status: MCPServerStatus;
  error?: string;
  scope: "global" | "project";
}

/**
 * MCP server status
 */
export type MCPServerStatus = "connected" | "connecting" | "error" | "stopped";

/**
 * Claude settings (from .claude/settings.json)
 */
export interface ClaudeSettings {
  model?: string;
  allowedTools?: string[];
  disallowedTools?: string[];
  permissionMode?: "default" | "acceptEdits" | "bypassPermissions";
  customInstructions?: string;
}

/**
 * Full context info
 */
export interface ContextInfo {
  claudeFiles: ClaudeFile[];
  hooks: HookConfig[];
  mcpServers: MCPServer[];
  settings: ClaudeSettings;
  workingDir: string;
}
