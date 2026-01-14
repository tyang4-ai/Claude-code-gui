/**
 * Tests for MCP Module Main API
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MCPManager, getMCPManager, cleanupMCPManager } from "./index";
import type { AddMCPServerInput, UpdateMCPServerInput } from "./types";

describe("MCPManager", () => {
  let manager: MCPManager;

  beforeEach(() => {
    manager = new MCPManager();
  });

  afterEach(() => {
    manager.cleanup();
  });

  describe("initialize", () => {
    it("should initialize successfully", async () => {
      await manager.initialize("/test/dir");
      expect(manager["initialized"]).toBe(true);
    });

    it("should not initialize twice", async () => {
      await manager.initialize("/test/dir");
      await manager.initialize("/test/dir"); // Should not error
      expect(manager["initialized"]).toBe(true);
    });
  });

  describe("getServers", () => {
    it("should return empty array initially", () => {
      const servers = manager.getServers();
      expect(servers).toHaveLength(0);
    });
  });

  describe("getServersByScope", () => {
    it("should return grouped servers", () => {
      const grouped = manager.getServersByScope();
      expect(grouped.user).toHaveLength(0);
      expect(grouped.project).toHaveLength(0);
      expect(grouped.managed).toHaveLength(0);
    });
  });

  describe("getServer", () => {
    it("should return undefined for non-existent server", () => {
      const server = manager.getServer("nonexistent");
      expect(server).toBeUndefined();
    });
  });

  describe("addServer", () => {
    it("should add a valid server", async () => {
      const input: AddMCPServerInput = {
        name: "test-server",
        transport: "stdio",
        command: "node",
        args: ["server.js"],
        scope: "user",
        autoStart: false,
      };

      await manager.addServer(input);
      const server = manager.getServer("test-server");
      expect(server).toBeDefined();
    });

    it("should reject invalid server configuration", async () => {
      const input: AddMCPServerInput = {
        name: "", // Invalid: empty name
        transport: "stdio",
        command: "node",
        scope: "user",
      };

      await expect(manager.addServer(input)).rejects.toThrow("Invalid server configuration");
    });

    it("should reject stdio server without command", async () => {
      const input: AddMCPServerInput = {
        name: "test",
        transport: "stdio",
        scope: "user",
      };

      await expect(manager.addServer(input)).rejects.toThrow("Invalid server configuration");
    });

    it("should reject HTTP server without URL", async () => {
      const input: AddMCPServerInput = {
        name: "test",
        transport: "http",
        scope: "user",
      };

      await expect(manager.addServer(input)).rejects.toThrow("Invalid server configuration");
    });
  });

  describe("updateServer", () => {
    it("should reject updating non-existent server", async () => {
      const input: UpdateMCPServerInput = {
        name: "nonexistent",
        enabled: false,
      };

      await expect(manager.updateServer(input)).rejects.toThrow("not found");
    });
  });

  describe("removeServer", () => {
    it("should reject removing non-existent server", async () => {
      await expect(manager.removeServer("nonexistent")).rejects.toThrow("not found");
    });

    it("should reject removing managed server", async () => {
      // First add a managed server (mock scenario)
      const input: AddMCPServerInput = {
        name: "managed-server",
        transport: "stdio",
        command: "node",
        scope: "managed",
      };

      await manager.addServer(input);

      await expect(manager.removeServer("managed-server")).rejects.toThrow(
        "Cannot remove managed servers"
      );
    });
  });

  describe("getStatistics", () => {
    it("should return statistics", () => {
      const stats = manager.getStatistics();
      expect(stats.totalServers).toBe(0);
      expect(stats.connectedServers).toBe(0);
      expect(stats.errorServers).toBe(0);
      expect(stats.totalTools).toBe(0);
      expect(stats.totalResources).toBe(0);
      expect(stats.totalPrompts).toBe(0);
      expect(stats.totalInvocations).toBe(0);
    });
  });

  describe("recordInvocation", () => {
    it("should record tool invocation", () => {
      const invocation = {
        id: "test-1",
        serverName: "test-server",
        toolName: "test-tool",
        input: { arg: "value" },
        timestamp: Date.now(),
      };

      manager.recordInvocation(invocation);

      const invocations = manager.getInvocations();
      expect(invocations).toHaveLength(1);
      expect(invocations[0].id).toBe("test-1");
    });
  });

  describe("recordResult", () => {
    it("should record tool result", () => {
      const result = {
        invocationId: "test-1",
        content: { result: "success" },
        isError: false,
        timestamp: Date.now(),
      };

      manager.recordResult(result);

      const retrieved = manager.getResult("test-1");
      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toEqual({ result: "success" });
    });
  });

  describe("getInvocations", () => {
    it("should return empty array initially", () => {
      const invocations = manager.getInvocations();
      expect(invocations).toHaveLength(0);
    });

    it("should return recorded invocations", () => {
      manager.recordInvocation({
        id: "inv-1",
        serverName: "server1",
        toolName: "tool1",
        input: {},
        timestamp: Date.now(),
      });

      manager.recordInvocation({
        id: "inv-2",
        serverName: "server1",
        toolName: "tool2",
        input: {},
        timestamp: Date.now(),
      });

      const invocations = manager.getInvocations();
      expect(invocations).toHaveLength(2);
    });
  });

  describe("getResult", () => {
    it("should return undefined for non-existent result", () => {
      const result = manager.getResult("nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("subscribe", () => {
    it("should call listener on server changes", async () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);

      const input: AddMCPServerInput = {
        name: "test",
        transport: "stdio",
        command: "node",
        scope: "user",
        autoStart: false,
      };

      await manager.addServer(input);

      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });

    it("should stop calling listener after unsubscribe", async () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);
      unsubscribe();

      listener.mockClear();

      const input: AddMCPServerInput = {
        name: "test",
        transport: "stdio",
        command: "node",
        scope: "user",
        autoStart: false,
      };

      await manager.addServer(input);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("should cleanup resources", async () => {
      await manager.initialize("/test/dir");

      const input: AddMCPServerInput = {
        name: "test",
        transport: "stdio",
        command: "node",
        scope: "user",
        autoStart: false,
      };

      await manager.addServer(input);

      manager.cleanup();

      expect(manager["initialized"]).toBe(false);
      expect(manager.getInvocations()).toHaveLength(0);
    });
  });

  describe("startServer and stopServer", () => {
    it("should start and stop servers", async () => {
      await manager.initialize("/test/dir");

      const input: AddMCPServerInput = {
        name: "test-server",
        transport: "stdio",
        command: "node",
        scope: "user",
        autoStart: false,
      };

      await manager.addServer(input);

      // Start the server
      await manager.startServer("test-server");
      let server = manager.getServer("test-server");
      expect(server?.status).toBe("connected");

      // Stop the server
      await manager.stopServer("test-server");
      server = manager.getServer("test-server");
      expect(server?.status).toBe("stopped");
    });

    it("should handle starting non-existent server", async () => {
      await manager.initialize("/test/dir");
      await expect(manager.startServer("non-existent")).rejects.toThrow();
    });

    it("should handle stopping non-existent server", async () => {
      await manager.initialize("/test/dir");
      // Should not throw, returns undefined
      await expect(manager.stopServer("non-existent")).resolves.toBeUndefined();
    });
  });

  describe("getStatistics", () => {
    it("should return correct statistics", async () => {
      await manager.initialize("/test/dir");

      const input1: AddMCPServerInput = {
        name: "server1",
        transport: "stdio",
        command: "node",
        scope: "user",
        autoStart: false,
      };

      const input2: AddMCPServerInput = {
        name: "server2",
        transport: "http",
        url: "http://localhost:3000",
        scope: "project",
        autoStart: false,
      };

      const input3: AddMCPServerInput = {
        name: "server3",
        transport: "sse",
        url: "http://localhost:3001/sse",
        scope: "managed",
        autoStart: false,
      };

      await manager.addServer(input1);
      await manager.addServer(input2);
      await manager.addServer(input3);

      // Start one server
      await manager.startServer("server1");

      const stats = manager.getStatistics();
      expect(stats.totalServers).toBe(3);
      expect(stats.connectedServers).toBe(1);
      expect(stats.errorServers).toBe(0);
      expect(stats.totalTools).toBe(0);
      expect(stats.totalResources).toBe(0);
      expect(stats.totalPrompts).toBe(0);
      expect(stats.totalInvocations).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should handle adding servers with special configurations", async () => {
      await manager.initialize("/test/dir");

      // Server with environment variables
      const input1: AddMCPServerInput = {
        name: "server-with-env",
        transport: "stdio",
        command: "node",
        args: ["--experimental-modules"],
        env: {
          NODE_ENV: "production",
          PORT: "3000",
        },
        scope: "user",
        autoStart: false,
      };

      await manager.addServer(input1);
      const server = manager.getServer("server-with-env");
      expect(server).toBeDefined();
      expect((server as any)?.env?.NODE_ENV).toBe("production");
    });

    it("should handle validation errors for invalid transport configurations", async () => {
      await manager.initialize("/test/dir");

      // HTTP server without URL - should throw validation error
      const invalidInput = {
        name: "invalid-http",
        transport: "http",
        scope: "user",
        autoStart: false,
        // Missing URL for HTTP transport
      } as AddMCPServerInput;

      // Should throw validation error
      await expect(manager.addServer(invalidInput)).rejects.toThrow(
        "URL is required for http transport"
      );
    });

    it("should handle stdio server without command", async () => {
      await manager.initialize("/test/dir");

      const invalidInput = {
        name: "invalid-stdio",
        transport: "stdio",
        scope: "user",
        autoStart: false,
        // Missing command for stdio transport
      } as AddMCPServerInput;

      // Should throw validation error
      await expect(manager.addServer(invalidInput)).rejects.toThrow(
        "Command is required for stdio transport"
      );
    });
  });
});

describe("Global MCP Manager", () => {
  afterEach(() => {
    cleanupMCPManager();
  });

  it("should return singleton instance", () => {
    const manager1 = getMCPManager();
    const manager2 = getMCPManager();
    expect(manager1).toBe(manager2);
  });

  it("should cleanup singleton", () => {
    const manager1 = getMCPManager();
    cleanupMCPManager();
    const manager2 = getMCPManager();
    expect(manager1).not.toBe(manager2);
  });
});
