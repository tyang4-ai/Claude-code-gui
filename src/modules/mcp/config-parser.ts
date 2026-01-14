/**
 * MCP Config Parser
 *
 * Parses MCP server configurations from various sources:
 * - User scope: ~/.claude/claude_desktop_config.json
 * - Project scope: ./.mcp.json or ./.claude/mcp.json
 * - Managed: Organization-provided configs
 */

import type {
  MCPConfigFile,
  MCPServer,
  MCPServerConfig,
  MCPServerConfigFile,
  MCPServerScope,
  MCPConfigSource,
} from "./types";

/**
 * Parse MCP config file content
 */
export function parseMCPConfigFile(
  content: string,
  scope: MCPServerScope
): MCPServerConfig[] {
  try {
    const config: MCPConfigFile = JSON.parse(content);

    if (!config.mcpServers) {
      return [];
    }

    const servers: MCPServerConfig[] = [];

    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      const server = parseServerConfig(name, serverConfig, scope);
      if (server) {
        servers.push(server);
      }
    }

    return servers;
  } catch (error) {
    console.error("Failed to parse MCP config file:", error);
    return [];
  }
}

/**
 * Parse individual server configuration
 */
function parseServerConfig(
  name: string,
  config: MCPServerConfigFile,
  scope: MCPServerScope
): MCPServerConfig | null {
  try {
    // Determine transport type
    let transport: "stdio" | "http" | "sse" = "stdio";

    if (config.url) {
      // Check if it's SSE or HTTP based on URL or config
      transport = config.url.includes("/events") ? "sse" : "http";
    }

    const serverConfig: MCPServerConfig = {
      name,
      transport,
      scope,
      enabled: !config.disabled,
      autoStart: !config.disabled,
    };

    // Add transport-specific fields
    if (transport === "stdio") {
      if (!config.command) {
        console.warn(`MCP server ${name} missing command for stdio transport`);
        return null;
      }
      serverConfig.command = config.command;
      serverConfig.args = config.args;
      serverConfig.env = config.env;
    } else {
      if (!config.url) {
        console.warn(`MCP server ${name} missing url for ${transport} transport`);
        return null;
      }
      serverConfig.url = config.url;
      serverConfig.headers = config.headers;
    }

    return serverConfig;
  } catch (error) {
    console.error(`Failed to parse MCP server config for ${name}:`, error);
    return null;
  }
}

/**
 * Convert server config to server with runtime state
 */
export function configToServer(config: MCPServerConfig): MCPServer {
  return {
    ...config,
    status: config.enabled ? "stopped" : "disabled",
  };
}

/**
 * Merge multiple config sources (later sources override earlier ones)
 */
export function mergeServerConfigs(
  ...configArrays: MCPServerConfig[][]
): MCPServerConfig[] {
  const serverMap = new Map<string, MCPServerConfig>();

  for (const configs of configArrays) {
    for (const config of configs) {
      // Higher priority scopes override lower priority
      // Priority: managed > project > user
      const existing = serverMap.get(config.name);

      if (!existing || getScopePriority(config.scope) >= getScopePriority(existing.scope)) {
        serverMap.set(config.name, config);
      }
    }
  }

  return Array.from(serverMap.values());
}

/**
 * Get scope priority for conflict resolution
 */
function getScopePriority(scope: MCPServerScope): number {
  switch (scope) {
    case "user":
      return 1;
    case "project":
      return 2;
    case "managed":
      return 3;
    default:
      return 0;
  }
}

/**
 * Validate server configuration
 */
export function validateServerConfig(config: MCPServerConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate name
  if (!config.name || config.name.trim().length === 0) {
    errors.push("Server name is required");
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(config.name)) {
    errors.push("Server name can only contain alphanumeric characters, hyphens, and underscores");
  }

  // Validate transport-specific fields
  if (config.transport === "stdio") {
    if (!config.command) {
      errors.push("Command is required for stdio transport");
    }
  } else {
    if (!config.url) {
      errors.push(`URL is required for ${config.transport} transport`);
    } else {
      try {
        new URL(config.url);
      } catch {
        errors.push("Invalid URL format");
      }
    }
  }

  // Validate environment variables
  if (config.env) {
    for (const [key, value] of Object.entries(config.env)) {
      if (typeof value !== "string") {
        errors.push(`Environment variable ${key} must be a string`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get default config paths for each scope
 */
export function getDefaultConfigPaths(workingDir: string): MCPConfigSource[] {
  // Use window location or fallback for home directory
  const homeDir = "~"; // Will be resolved by Tauri backend

  return [
    {
      path: `${homeDir}/.claude/claude_desktop_config.json`,
      scope: "user",
      exists: false, // Will be checked by caller
    },
    {
      path: `${workingDir}/.mcp.json`,
      scope: "project",
      exists: false,
    },
    {
      path: `${workingDir}/.claude/mcp.json`,
      scope: "project",
      exists: false,
    },
  ];
}

/**
 * Serialize server config to file format
 */
export function serverConfigToFile(config: MCPServerConfig): MCPServerConfigFile {
  const fileConfig: MCPServerConfigFile = {
    command: config.command || "",
    disabled: !config.enabled,
  };

  if (config.args) {
    fileConfig.args = config.args;
  }

  if (config.env) {
    fileConfig.env = config.env;
  }

  if (config.url) {
    fileConfig.url = config.url;
  }

  if (config.headers) {
    fileConfig.headers = config.headers;
  }

  return fileConfig;
}

/**
 * Serialize multiple server configs to full config file
 */
export function serializeConfigFile(configs: MCPServerConfig[]): string {
  const configFile: MCPConfigFile = {
    mcpServers: {},
  };

  for (const config of configs) {
    configFile.mcpServers![config.name] = serverConfigToFile(config);
  }

  return JSON.stringify(configFile, null, 2);
}

/**
 * Filter configs by scope
 */
export function filterByScope(
  configs: MCPServerConfig[],
  scope: MCPServerScope
): MCPServerConfig[] {
  return configs.filter((c) => c.scope === scope);
}

/**
 * Group configs by scope
 */
export function groupByScope(
  configs: MCPServerConfig[]
): Record<MCPServerScope, MCPServerConfig[]> {
  return {
    user: filterByScope(configs, "user"),
    project: filterByScope(configs, "project"),
    managed: filterByScope(configs, "managed"),
  };
}
