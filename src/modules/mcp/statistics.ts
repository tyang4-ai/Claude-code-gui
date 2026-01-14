/**
 * MCP Statistics
 *
 * Calculates statistics and metrics for MCP servers.
 */

import type { MCPServer, MCPStatistics, MCPToolInvocation } from "./types";

/**
 * Calculate MCP statistics from current server state
 */
export function calculateStatistics(
  servers: MCPServer[],
  invocations: MCPToolInvocation[]
): MCPStatistics {
  let totalTools = 0;
  let totalResources = 0;
  let totalPrompts = 0;
  let connectedServers = 0;
  let errorServers = 0;

  for (const server of servers) {
    if (server.status === "connected") {
      connectedServers++;

      if (server.capabilities) {
        totalTools += server.capabilities.tools.length;
        totalResources += server.capabilities.resources.length;
        totalPrompts += server.capabilities.prompts.length;
      }
    } else if (server.status === "error") {
      errorServers++;
    }
  }

  return {
    totalServers: servers.length,
    connectedServers,
    errorServers,
    totalTools,
    totalResources,
    totalPrompts,
    totalInvocations: invocations.length,
  };
}

/**
 * Get server health percentage
 */
export function getServerHealthPercentage(servers: MCPServer[]): number {
  if (servers.length === 0) return 0;

  const enabledServers = servers.filter((s) => s.status !== "disabled");
  if (enabledServers.length === 0) return 0;

  const healthyServers = enabledServers.filter((s) => s.status === "connected");
  return Math.round((healthyServers.length / enabledServers.length) * 100);
}

/**
 * Get servers by status
 */
export function getServersByStatus(servers: MCPServer[]): Record<string, MCPServer[]> {
  const result: Record<string, MCPServer[]> = {
    connected: [],
    connecting: [],
    error: [],
    stopped: [],
    disabled: [],
  };

  for (const server of servers) {
    result[server.status].push(server);
  }

  return result;
}

/**
 * Find servers with specific tool
 */
export function findServersWithTool(servers: MCPServer[], toolName: string): MCPServer[] {
  return servers.filter((server) => {
    if (!server.capabilities) return false;
    return server.capabilities.tools.some((tool) => tool.name === toolName);
  });
}

/**
 * Find servers with specific resource
 */
export function findServersWithResource(servers: MCPServer[], resourceUri: string): MCPServer[] {
  return servers.filter((server) => {
    if (!server.capabilities) return false;
    return server.capabilities.resources.some((resource) => resource.uri === resourceUri);
  });
}

/**
 * Get all available tools across all servers
 */
export function getAllAvailableTools(servers: MCPServer[]): Array<{ serverName: string; toolName: string; description?: string }> {
  const tools: Array<{ serverName: string; toolName: string; description?: string }> = [];

  for (const server of servers) {
    if (server.status === "connected" && server.capabilities) {
      for (const tool of server.capabilities.tools) {
        tools.push({
          serverName: server.name,
          toolName: tool.name,
          description: tool.description,
        });
      }
    }
  }

  return tools;
}

/**
 * Get all available resources across all servers
 */
export function getAllAvailableResources(servers: MCPServer[]): Array<{ serverName: string; uri: string; name: string; description?: string }> {
  const resources: Array<{ serverName: string; uri: string; name: string; description?: string }> = [];

  for (const server of servers) {
    if (server.status === "connected" && server.capabilities) {
      for (const resource of server.capabilities.resources) {
        resources.push({
          serverName: server.name,
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
        });
      }
    }
  }

  return resources;
}
