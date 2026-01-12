/**
 * Context Viewer Module
 *
 * Detects and displays CLAUDE.md files, hooks, and MCP server status.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  ClaudeFile,
  HookConfig,
  MCPServer,
  ClaudeSettings,
  ContextInfo,
} from "./types";

/**
 * Context Manager - discovers and displays project context
 */
export class ContextManager {
  private static instance: ContextManager | null = null;
  private homeDir: string | null = null;

  static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  /**
   * Get home directory (cached)
   */
  private async getHomeDir(): Promise<string> {
    if (!this.homeDir) {
      this.homeDir = await invoke<string>("get_home_dir");
    }
    return this.homeDir;
  }

  /**
   * Get full context info for a project
   */
  async getContext(workingDir: string): Promise<ContextInfo> {
    const [claudeFiles, hooks, mcpServers, settings] = await Promise.all([
      this.getClaudeFiles(workingDir),
      this.getHooks(workingDir),
      this.getMCPServers(workingDir),
      this.getSettings(workingDir),
    ]);

    return {
      claudeFiles,
      hooks,
      mcpServers,
      settings,
      workingDir,
    };
  }

  // === CLAUDE.md Files ===

  /**
   * Get all CLAUDE.md files that apply to this project
   */
  async getClaudeFiles(workingDir: string): Promise<ClaudeFile[]> {
    const homeDir = await this.getHomeDir();
    const files: ClaudeFile[] = [];

    // Check locations in order of precedence
    const locations = [
      { path: `${homeDir}/.claude/CLAUDE.md`, scope: "global" as const },
      { path: `${workingDir}/CLAUDE.md`, scope: "project" as const },
      { path: `${workingDir}/.claude/CLAUDE.md`, scope: "local" as const },
    ];

    for (const loc of locations) {
      const normalizedPath = loc.path.replace(/\\/g, "/");
      const exists = await this.fileExists(normalizedPath);

      const file: ClaudeFile = {
        path: normalizedPath,
        scope: loc.scope,
        exists,
      };

      if (exists) {
        try {
          const result = await invoke<{ content: string }>("read_file", {
            path: normalizedPath,
          });
          file.content = result.content;
        } catch (e) {
          console.warn(`Failed to read ${normalizedPath}:`, e);
        }
      }

      files.push(file);
    }

    return files;
  }

  /**
   * Read content of a CLAUDE.md file
   */
  async readClaudeFile(path: string): Promise<string | null> {
    try {
      const result = await invoke<{ content: string }>("read_file", { path });
      return result.content;
    } catch {
      return null;
    }
  }

  // === Hooks ===

  /**
   * Get all configured hooks
   */
  async getHooks(workingDir: string): Promise<HookConfig[]> {
    const homeDir = await this.getHomeDir();
    const hooks: HookConfig[] = [];

    // Check global hooks
    const globalHooksPath = `${homeDir}/.claude/settings.json`;
    const globalHooks = await this.parseHooksFromSettings(globalHooksPath, "global");
    hooks.push(...globalHooks);

    // Check project hooks
    const projectHooksPath = `${workingDir}/.claude/settings.json`;
    const projectHooks = await this.parseHooksFromSettings(projectHooksPath, "project");
    hooks.push(...projectHooks);

    return hooks;
  }

  /**
   * Parse hooks from a settings.json file
   */
  private async parseHooksFromSettings(
    path: string,
    scope: "global" | "project"
  ): Promise<HookConfig[]> {
    const normalizedPath = path.replace(/\\/g, "/");
    const hooks: HookConfig[] = [];

    try {
      const exists = await this.fileExists(normalizedPath);
      if (!exists) return hooks;

      const result = await invoke<{ content: string }>("read_file", {
        path: normalizedPath,
      });
      const settings = JSON.parse(result.content);

      // Parse hooks from settings
      if (settings.hooks && typeof settings.hooks === "object") {
        for (const [event, config] of Object.entries(settings.hooks)) {
          if (typeof config === "object" && config !== null) {
            const hookConfig = config as { command?: string; enabled?: boolean };
            if (hookConfig.command) {
              hooks.push({
                name: `${scope}-${event}`,
                event: event as HookConfig["event"],
                command: hookConfig.command,
                enabled: hookConfig.enabled !== false,
                scope,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to parse hooks from ${path}:`, e);
    }

    return hooks;
  }

  // === MCP Servers ===

  /**
   * Get configured MCP servers
   */
  async getMCPServers(workingDir: string): Promise<MCPServer[]> {
    const homeDir = await this.getHomeDir();
    const servers: MCPServer[] = [];

    // Check global MCP config
    const globalMCPPath = `${homeDir}/.claude/mcp.json`;
    const globalServers = await this.parseMCPConfig(globalMCPPath, "global");
    servers.push(...globalServers);

    // Check project MCP config
    const projectMCPPath = `${workingDir}/.claude/mcp.json`;
    const projectServers = await this.parseMCPConfig(projectMCPPath, "project");
    servers.push(...projectServers);

    return servers;
  }

  /**
   * Parse MCP config file
   */
  private async parseMCPConfig(
    path: string,
    scope: "global" | "project"
  ): Promise<MCPServer[]> {
    const normalizedPath = path.replace(/\\/g, "/");
    const servers: MCPServer[] = [];

    try {
      const exists = await this.fileExists(normalizedPath);
      if (!exists) return servers;

      const result = await invoke<{ content: string }>("read_file", {
        path: normalizedPath,
      });
      const config = JSON.parse(result.content);

      // Parse servers from config
      if (config.mcpServers && typeof config.mcpServers === "object") {
        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
          if (typeof serverConfig === "object" && serverConfig !== null) {
            const sc = serverConfig as {
              command?: string;
              args?: string[];
              env?: Record<string, string>;
            };
            if (sc.command) {
              servers.push({
                name,
                command: sc.command,
                args: sc.args,
                env: sc.env,
                status: "stopped", // Will be updated by actual status check
                scope,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to parse MCP config from ${path}:`, e);
    }

    return servers;
  }

  // === Settings ===

  /**
   * Get Claude settings
   */
  async getSettings(workingDir: string): Promise<ClaudeSettings> {
    const homeDir = await this.getHomeDir();
    let settings: ClaudeSettings = {};

    // Load global settings first
    const globalPath = `${homeDir}/.claude/settings.json`;
    const globalSettings = await this.parseSettings(globalPath);
    settings = { ...settings, ...globalSettings };

    // Override with project settings
    const projectPath = `${workingDir}/.claude/settings.json`;
    const projectSettings = await this.parseSettings(projectPath);
    settings = { ...settings, ...projectSettings };

    return settings;
  }

  /**
   * Parse settings from a settings.json file
   */
  private async parseSettings(path: string): Promise<ClaudeSettings> {
    const normalizedPath = path.replace(/\\/g, "/");
    const settings: ClaudeSettings = {};

    try {
      const exists = await this.fileExists(normalizedPath);
      if (!exists) return settings;

      const result = await invoke<{ content: string }>("read_file", {
        path: normalizedPath,
      });
      const config = JSON.parse(result.content);

      if (config.model) settings.model = config.model;
      if (config.allowedTools) settings.allowedTools = config.allowedTools;
      if (config.disallowedTools) settings.disallowedTools = config.disallowedTools;
      if (config.permissionMode) settings.permissionMode = config.permissionMode;
      if (config.customInstructions) settings.customInstructions = config.customInstructions;
    } catch (e) {
      console.warn(`Failed to parse settings from ${path}:`, e);
    }

    return settings;
  }

  // === Utility ===

  /**
   * Check if a file exists
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      return await invoke<boolean>("file_exists", { path });
    } catch {
      return false;
    }
  }

  /**
   * Get a summary of active context
   */
  async getContextSummary(workingDir: string): Promise<{
    hasClaudeMd: boolean;
    activeHooks: number;
    mcpServers: number;
    model: string | undefined;
  }> {
    const context = await this.getContext(workingDir);

    return {
      hasClaudeMd: context.claudeFiles.some((f) => f.exists),
      activeHooks: context.hooks.filter((h) => h.enabled).length,
      mcpServers: context.mcpServers.length,
      model: context.settings.model,
    };
  }
}

/**
 * Get the ContextManager singleton
 */
export function getContextManager(): ContextManager {
  return ContextManager.getInstance();
}

// Re-export types
export type {
  ClaudeFile,
  HookConfig,
  HookEvent,
  MCPServer,
  MCPServerStatus,
  ClaudeSettings,
  ContextInfo,
} from "./types";
