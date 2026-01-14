/**
 * MCP Module - Main Entry Point
 *
 * Provides MCP (Model Context Protocol) server management functionality.
 */

export * from "./types";
export * from "./config-parser";
export * from "./server-manager";
export * from "./statistics";

import type {
  MCPServer,
  MCPServerConfig,
  MCPConfigSource,
  MCPStatistics,
  MCPToolInvocation,
  MCPToolResult,
  AddMCPServerInput,
  UpdateMCPServerInput,
} from "./types";
import {
  mergeServerConfigs,
  validateServerConfig,
  getDefaultConfigPaths,
  groupByScope,
} from "./config-parser";
import {
  getServerManager,
  initializeServerManager,
  cleanupServerManager,
} from "./server-manager";
import { calculateStatistics } from "./statistics";

/**
 * MCP Manager - Main API
 */
export class MCPManager {
  private initialized = false;
  private configSources: MCPConfigSource[] = [];
  private invocations: Map<string, MCPToolInvocation> = new Map();
  private results: Map<string, MCPToolResult> = new Map();

  /**
   * Initialize the MCP manager
   */
  async initialize(workingDir: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.configSources = getDefaultConfigPaths(workingDir);

    // Load configurations from all sources
    const configs = await this.loadAllConfigs();

    // Initialize server manager
    initializeServerManager(configs);

    this.initialized = true;
  }

  /**
   * Load configurations from all sources
   */
  async loadAllConfigs(): Promise<MCPServerConfig[]> {
    const configArrays: MCPServerConfig[][] = [];

    for (const source of this.configSources) {
      try {
        // TODO: Use Tauri IPC to read file
        // For now, simulate empty configs
        const configs: MCPServerConfig[] = [];
        configArrays.push(configs);

        source.exists = false;
      } catch (error) {
        console.error(`Failed to load config from ${source.path}:`, error);
        source.exists = false;
      }
    }

    // Merge all configs (later sources override earlier)
    return mergeServerConfigs(...configArrays);
  }

  /**
   * Reload configurations from disk
   */
  async reloadConfigs(): Promise<void> {
    const configs = await this.loadAllConfigs();
    initializeServerManager(configs);
  }

  /**
   * Get all servers
   */
  getServers(): MCPServer[] {
    const manager = getServerManager();
    return manager.getServers();
  }

  /**
   * Get servers grouped by scope
   */
  getServersByScope(): Record<"user" | "project" | "managed", MCPServer[]> {
    const servers = this.getServers();
    const grouped = groupByScope(servers.map((s) => ({
      ...s,
      enabled: s.status !== "disabled",
    })));
    // Convert MCPServerConfig[] to MCPServer[] by adding status
    return {
      user: grouped.user.map(c => ({ ...c, status: "stopped" as const })),
      project: grouped.project.map(c => ({ ...c, status: "stopped" as const })),
      managed: grouped.managed.map(c => ({ ...c, status: "stopped" as const })),
    };
  }

  /**
   * Get a specific server
   */
  getServer(name: string): MCPServer | undefined {
    const manager = getServerManager();
    return manager.getServer(name);
  }

  /**
   * Add a new server
   */
  async addServer(input: AddMCPServerInput): Promise<void> {
    const config: MCPServerConfig = {
      ...input,
      enabled: true,
    };

    // Validate configuration
    const validation = validateServerConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid server configuration: ${validation.errors.join(", ")}`);
    }

    const manager = getServerManager();
    await manager.addServer(config);

    // Persist to appropriate config file
    await this.saveServerConfig(config);
  }

  /**
   * Update a server
   */
  async updateServer(input: UpdateMCPServerInput): Promise<void> {
    const manager = getServerManager();
    const server = manager.getServer(input.name);

    if (!server) {
      throw new Error(`Server ${input.name} not found`);
    }

    await manager.updateServer(input.name, input);

    // Persist changes
    await this.saveServerConfig(server);
  }

  /**
   * Remove a server
   */
  async removeServer(name: string): Promise<void> {
    const manager = getServerManager();
    const server = manager.getServer(name);

    if (!server) {
      throw new Error(`Server ${name} not found`);
    }

    if (server.scope === "managed") {
      throw new Error("Cannot remove managed servers");
    }

    await manager.removeServer(name);

    // Remove from config file
    await this.removeServerConfig(name, server.scope);
  }

  /**
   * Start a server
   */
  async startServer(name: string): Promise<void> {
    const manager = getServerManager();
    await manager.startServer(name);
  }

  /**
   * Stop a server
   */
  async stopServer(name: string): Promise<void> {
    const manager = getServerManager();
    await manager.stopServer(name);
  }

  /**
   * Restart a server
   */
  async restartServer(name: string): Promise<void> {
    const manager = getServerManager();
    await manager.restartServer(name);
  }

  /**
   * Test connection to a server
   */
  async testConnection(name: string): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    const manager = getServerManager();
    const result = await manager.testConnection(name);
    return {
      healthy: result.healthy,
      latencyMs: result.latencyMs,
      error: result.error,
    };
  }

  /**
   * Get MCP statistics
   */
  getStatistics(): MCPStatistics {
    const servers = this.getServers();
    return calculateStatistics(servers, Array.from(this.invocations.values()));
  }

  /**
   * Record a tool invocation
   */
  recordInvocation(invocation: MCPToolInvocation): void {
    this.invocations.set(invocation.id, invocation);
  }

  /**
   * Record a tool result
   */
  recordResult(result: MCPToolResult): void {
    this.results.set(result.invocationId, result);
  }

  /**
   * Get tool invocations
   */
  getInvocations(): MCPToolInvocation[] {
    return Array.from(this.invocations.values());
  }

  /**
   * Get result for an invocation
   */
  getResult(invocationId: string): MCPToolResult | undefined {
    return this.results.get(invocationId);
  }

  /**
   * Subscribe to server changes
   */
  subscribe(listener: (servers: MCPServer[]) => void): () => void {
    const manager = getServerManager();
    return manager.subscribe(listener);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    cleanupServerManager();
    this.invocations.clear();
    this.results.clear();
    this.initialized = false;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async saveServerConfig(server: MCPServerConfig): Promise<void> {
    // TODO: Implement config file persistence via Tauri IPC
    // Load existing config, update it, and write back
    console.log("Saving server config:", server.name);
  }

  private async removeServerConfig(name: string, _scope: "user" | "project" | "managed"): Promise<void> {
    // TODO: Implement config file update via Tauri IPC
    console.log("Removing server config:", name);
  }
}

/**
 * Global singleton instance
 */
let mcpManagerInstance: MCPManager | null = null;

/**
 * Get the global MCP manager instance
 */
export function getMCPManager(): MCPManager {
  if (!mcpManagerInstance) {
    mcpManagerInstance = new MCPManager();
  }
  return mcpManagerInstance;
}

/**
 * Initialize MCP manager
 */
export async function initializeMCPManager(workingDir: string): Promise<void> {
  const manager = getMCPManager();
  await manager.initialize(workingDir);
}

/**
 * Cleanup MCP manager
 */
export function cleanupMCPManager(): void {
  if (mcpManagerInstance) {
    mcpManagerInstance.cleanup();
    mcpManagerInstance = null;
  }
}
