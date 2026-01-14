/**
 * MCP Server Manager
 *
 * Manages the lifecycle of MCP servers:
 * - Starting/stopping servers
 * - Monitoring server health
 * - Fetching capabilities
 * - Handling errors and reconnection
 */

import type {
  MCPServer,
  MCPServerConfig,
  MCPServerStatus,
  MCPCapabilities,
  MCPErrorType,
  MCPHealthCheck,
} from "./types";
import { configToServer } from "./config-parser";

/**
 * Server manager class
 */
export class MCPServerManager {
  private servers: Map<string, MCPServer> = new Map();
  private healthCheckIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private reconnectTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private listeners: Set<(servers: MCPServer[]) => void> = new Set();

  /**
   * Initialize manager with server configurations
   */
  initialize(configs: MCPServerConfig[]): void {
    // Clear existing state
    this.cleanup();

    // Create server instances
    for (const config of configs) {
      const server = configToServer(config);
      this.servers.set(server.name, server);

      // Auto-start if configured
      if (config.enabled && config.autoStart) {
        this.startServer(server.name).catch((err) => {
          console.error(`Failed to auto-start server ${server.name}:`, err);
        });
      }
    }

    this.notifyListeners();
  }

  /**
   * Add a new server
   */
  async addServer(config: MCPServerConfig): Promise<void> {
    if (this.servers.has(config.name)) {
      throw new Error(`Server ${config.name} already exists`);
    }

    const server = configToServer(config);
    this.servers.set(server.name, server);

    if (config.enabled && config.autoStart) {
      await this.startServer(server.name);
    }

    this.notifyListeners();
  }

  /**
   * Remove a server
   */
  async removeServer(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (!server) {
      return;
    }

    // Stop the server first
    await this.stopServer(name);

    // Remove from map
    this.servers.delete(name);

    this.notifyListeners();
  }

  /**
   * Update server configuration
   */
  async updateServer(name: string, updates: Partial<MCPServerConfig>): Promise<void> {
    const server = this.servers.get(name);
    if (!server) {
      throw new Error(`Server ${name} not found`);
    }

    // Check if we need to restart
    const needsRestart =
      server.status === "connected" &&
      (updates.command !== undefined ||
        updates.args !== undefined ||
        updates.env !== undefined ||
        updates.url !== undefined ||
        updates.headers !== undefined);

    // Update config
    Object.assign(server, updates);

    // Handle enabled state change
    if (updates.enabled !== undefined) {
      if (updates.enabled && server.status === "disabled") {
        server.status = "stopped";
        if (server.autoStart) {
          await this.startServer(name);
        }
      } else if (!updates.enabled && server.status !== "disabled") {
        await this.stopServer(name);
        server.status = "disabled";
      }
    }

    // Restart if needed
    if (needsRestart) {
      await this.stopServer(name);
      await this.startServer(name);
    }

    this.notifyListeners();
  }

  /**
   * Start a server
   */
  async startServer(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (!server) {
      throw new Error(`Server ${name} not found`);
    }

    if (server.status === "connected" || server.status === "connecting") {
      return; // Already started
    }

    if (server.status === "disabled") {
      throw new Error(`Server ${name} is disabled`);
    }

    try {
      this.updateServerStatus(name, "connecting");

      // Call Rust backend to start the server
      await this.invokeStartServer(server);

      // Fetch capabilities
      const capabilities = await this.fetchCapabilities(server);

      // Update server state
      server.status = "connected";
      server.capabilities = capabilities;
      server.lastConnected = Date.now();
      server.error = undefined;

      // Start health monitoring
      this.startHealthCheck(name);

      this.notifyListeners();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.handleServerError(name, "connection_failed", errorMessage);
      throw error;
    }
  }

  /**
   * Stop a server
   */
  async stopServer(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (!server) {
      return;
    }

    if (server.status === "stopped" || server.status === "disabled") {
      return;
    }

    try {
      // Stop health check
      this.stopHealthCheck(name);

      // Cancel any reconnect attempts
      this.cancelReconnect(name);

      // Call Rust backend to stop the server
      await this.invokeStopServer(server);

      // Update status
      server.status = server.enabled ? "stopped" : "disabled";
      server.capabilities = undefined;
      server.processId = undefined;

      this.notifyListeners();
    } catch (error) {
      console.error(`Failed to stop server ${name}:`, error);
    }
  }

  /**
   * Restart a server
   */
  async restartServer(name: string): Promise<void> {
    await this.stopServer(name);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Brief delay
    await this.startServer(name);
  }

  /**
   * Test connection to a server
   */
  async testConnection(name: string): Promise<MCPHealthCheck> {
    const server = this.servers.get(name);
    if (!server) {
      throw new Error(`Server ${name} not found`);
    }

    const startTime = Date.now();

    try {
      const healthy = await this.invokeHealthCheck(server);
      const latencyMs = Date.now() - startTime;

      return {
        serverName: name,
        healthy,
        latencyMs,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        serverName: name,
        healthy: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get all servers
   */
  getServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get a specific server
   */
  getServer(name: string): MCPServer | undefined {
    return this.servers.get(name);
  }

  /**
   * Subscribe to server changes
   */
  subscribe(listener: (servers: MCPServer[]) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    // Stop all health checks
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();

    // Cancel all reconnect attempts
    for (const timeout of this.reconnectTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.reconnectTimeouts.clear();

    // Stop all servers
    for (const name of this.servers.keys()) {
      this.stopServer(name).catch((err) => {
        console.error(`Failed to stop server ${name}:`, err);
      });
    }

    // Clear the servers Map after stopping them
    this.servers.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private updateServerStatus(name: string, status: MCPServerStatus): void {
    const server = this.servers.get(name);
    if (server) {
      server.status = status;
      this.notifyListeners();
    }
  }

  private handleServerError(name: string, type: MCPErrorType, message: string): void {
    const server = this.servers.get(name);
    if (server) {
      server.status = "error";
      server.error = message;
      this.notifyListeners();

      // Schedule reconnect for transient errors
      if (type === "timeout" || type === "connection_failed") {
        this.scheduleReconnect(name);
      }
    }
  }

  private startHealthCheck(name: string): void {
    // Clear any existing health check
    this.stopHealthCheck(name);

    // Health check every 30 seconds
    const interval = setInterval(() => {
      this.performHealthCheck(name);
    }, 30000);

    this.healthCheckIntervals.set(name, interval);
  }

  private stopHealthCheck(name: string): void {
    const interval = this.healthCheckIntervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(name);
    }
  }

  private async performHealthCheck(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (!server || server.status !== "connected") {
      return;
    }

    try {
      const healthy = await this.invokeHealthCheck(server);
      if (!healthy) {
        this.handleServerError(name, "connection_failed", "Health check failed");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.handleServerError(name, "timeout", errorMessage);
    }
  }

  private scheduleReconnect(name: string): void {
    // Cancel any existing reconnect
    this.cancelReconnect(name);

    // Reconnect after 5 seconds
    const timeout = setTimeout(() => {
      this.startServer(name).catch((err) => {
        console.error(`Reconnect failed for ${name}:`, err);
      });
    }, 5000);

    this.reconnectTimeouts.set(name, timeout);
  }

  private cancelReconnect(name: string): void {
    const timeout = this.reconnectTimeouts.get(name);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(name);
    }
  }

  private notifyListeners(): void {
    const servers = this.getServers();
    for (const listener of this.listeners) {
      listener(servers);
    }
  }

  // ============================================================================
  // Rust Backend Integration (to be implemented)
  // ============================================================================

  private async invokeStartServer(server: MCPServer): Promise<void> {
    // TODO: Call Rust backend via Tauri IPC
    // For now, simulate successful start
    console.log("Starting MCP server:", server.name);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  private async invokeStopServer(server: MCPServer): Promise<void> {
    // TODO: Call Rust backend via Tauri IPC
    console.log("Stopping MCP server:", server.name);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  private async fetchCapabilities(server: MCPServer): Promise<MCPCapabilities> {
    // TODO: Call Rust backend to fetch capabilities
    // For now, return empty capabilities
    console.log("Fetching capabilities for:", server.name);
    return {
      tools: [],
      resources: [],
      prompts: [],
    };
  }

  private async invokeHealthCheck(_server: MCPServer): Promise<boolean> {
    // TODO: Call Rust backend for health check
    // For now, return true
    return true;
  }
}

/**
 * Global singleton instance
 */
let serverManagerInstance: MCPServerManager | null = null;

/**
 * Get the global server manager instance
 */
export function getServerManager(): MCPServerManager {
  if (!serverManagerInstance) {
    serverManagerInstance = new MCPServerManager();
  }
  return serverManagerInstance;
}

/**
 * Initialize the server manager with configurations
 */
export function initializeServerManager(configs: MCPServerConfig[]): void {
  const manager = getServerManager();
  manager.initialize(configs);
}

/**
 * Cleanup the server manager
 */
export function cleanupServerManager(): void {
  if (serverManagerInstance) {
    serverManagerInstance.cleanup();
    serverManagerInstance = null;
  }
}
