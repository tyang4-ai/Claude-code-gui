/**
 * Tests for MCP Server Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MCPServerManager } from "./server-manager";
import type { MCPServerConfig } from "./types";

describe("MCPServerManager", () => {
  let manager: MCPServerManager;

  beforeEach(() => {
    manager = new MCPServerManager();
  });

  afterEach(() => {
    manager.cleanup();
  });

  describe("initialize", () => {
    it("should initialize with empty configs", () => {
      manager.initialize([]);
      const servers = manager.getServers();
      expect(servers).toHaveLength(0);
    });

    it("should initialize with server configs", () => {
      const configs: MCPServerConfig[] = [
        {
          name: "test-server",
          transport: "stdio",
          command: "node",
          scope: "user",
          enabled: true,
          autoStart: false,
        },
      ];

      manager.initialize(configs);
      const servers = manager.getServers();

      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe("test-server");
      expect(servers[0].status).toBe("stopped");
    });

    it("should create disabled servers", () => {
      const configs: MCPServerConfig[] = [
        {
          name: "disabled-server",
          transport: "stdio",
          command: "node",
          scope: "user",
          enabled: false,
        },
      ];

      manager.initialize(configs);
      const servers = manager.getServers();

      expect(servers).toHaveLength(1);
      expect(servers[0].status).toBe("disabled");
    });
  });

  describe("addServer", () => {
    it("should add a new server", async () => {
      const config: MCPServerConfig = {
        name: "new-server",
        transport: "stdio",
        command: "python",
        scope: "project",
        enabled: true,
        autoStart: false,
      };

      await manager.addServer(config);
      const server = manager.getServer("new-server");

      expect(server).toBeDefined();
      expect(server?.name).toBe("new-server");
    });

    it("should reject duplicate server names", async () => {
      const config: MCPServerConfig = {
        name: "duplicate",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: true,
      };

      await manager.addServer(config);
      await expect(manager.addServer(config)).rejects.toThrow("already exists");
    });
  });

  describe("removeServer", () => {
    it("should remove a server", async () => {
      const config: MCPServerConfig = {
        name: "to-remove",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: true,
        autoStart: false,
      };

      await manager.addServer(config);
      expect(manager.getServer("to-remove")).toBeDefined();

      await manager.removeServer("to-remove");
      expect(manager.getServer("to-remove")).toBeUndefined();
    });

    it("should handle removing non-existent server", async () => {
      await expect(manager.removeServer("nonexistent")).resolves.toBeUndefined();
    });
  });

  describe("updateServer", () => {
    it("should update server configuration", async () => {
      const config: MCPServerConfig = {
        name: "update-test",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: true,
        autoStart: false,
      };

      await manager.addServer(config);
      await manager.updateServer("update-test", { command: "python" });

      const server = manager.getServer("update-test");
      expect(server?.command).toBe("python");
    });

    it("should reject updating non-existent server", async () => {
      await expect(
        manager.updateServer("nonexistent", { enabled: false })
      ).rejects.toThrow("not found");
    });
  });

  describe("getServers", () => {
    it("should return all servers", () => {
      const configs: MCPServerConfig[] = [
        {
          name: "server1",
          transport: "stdio",
          command: "node",
          scope: "user",
          enabled: true,
          autoStart: false,
        },
        {
          name: "server2",
          transport: "http",
          url: "http://localhost:3000",
          scope: "project",
          enabled: true,
          autoStart: false,
        },
      ];

      manager.initialize(configs);
      const servers = manager.getServers();

      expect(servers).toHaveLength(2);
    });
  });

  describe("getServer", () => {
    it("should return specific server", () => {
      const configs: MCPServerConfig[] = [
        {
          name: "test",
          transport: "stdio",
          command: "node",
          scope: "user",
          enabled: true,
          autoStart: false,
        },
      ];

      manager.initialize(configs);
      const server = manager.getServer("test");

      expect(server).toBeDefined();
      expect(server?.name).toBe("test");
    });

    it("should return undefined for non-existent server", () => {
      const server = manager.getServer("nonexistent");
      expect(server).toBeUndefined();
    });
  });

  describe("subscribe", () => {
    it("should notify listeners on server changes", async () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);

      const config: MCPServerConfig = {
        name: "test",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: true,
        autoStart: false,
      };

      await manager.addServer(config);

      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });

    it("should stop notifying after unsubscribe", async () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);

      unsubscribe();
      listener.mockClear();

      const config: MCPServerConfig = {
        name: "test",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: true,
        autoStart: false,
      };

      await manager.addServer(config);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("should cleanup resources", async () => {
      const configs: MCPServerConfig[] = [
        {
          name: "test",
          transport: "stdio",
          command: "node",
          scope: "user",
          enabled: true,
          autoStart: false,
        },
      ];

      manager.initialize(configs);

      // Allow time for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));

      manager.cleanup();

      const servers = manager.getServers();
      expect(servers).toHaveLength(0);
    });
  });

  describe("startServer", () => {
    it("should start a stopped server", async () => {
      const configs: MCPServerConfig[] = [
        {
          name: "test-server",
          transport: "stdio",
          command: "node",
          scope: "user",
          enabled: true,
          autoStart: false,
        },
      ];

      manager.initialize(configs);

      // Start the server
      await manager.startServer("test-server");

      const servers = manager.getServers();
      expect(servers[0].status).toBe("connected");
    });

    it("should reject starting non-existent server", async () => {
      await expect(manager.startServer("non-existent")).rejects.toThrow(
        "Server non-existent not found"
      );
    });

    it("should reject starting disabled server", async () => {
      const configs: MCPServerConfig[] = [
        {
          name: "disabled",
          transport: "stdio",
          command: "node",
          scope: "user",
          enabled: false,
          autoStart: false,
        },
      ];

      manager.initialize(configs);

      await expect(manager.startServer("disabled")).rejects.toThrow(
        "Server disabled is disabled"
      );
    });

    it("should handle starting already connected server", async () => {
      const configs: MCPServerConfig[] = [
        {
          name: "test-server",
          transport: "stdio",
          command: "node",
          scope: "user",
          enabled: true,
          autoStart: false,
        },
      ];

      manager.initialize(configs);

      // Start the server
      await manager.startServer("test-server");

      // Try to start again
      await manager.startServer("test-server");

      const servers = manager.getServers();
      expect(servers[0].status).toBe("connected");
    });

    it("should auto-start servers on initialization", async () => {
      const configs: MCPServerConfig[] = [
        {
          name: "auto-start",
          transport: "stdio",
          command: "node",
          scope: "user",
          enabled: true,
          autoStart: true,
        },
      ];

      manager.initialize(configs);

      // Wait for auto-start to complete
      await new Promise(resolve => setTimeout(resolve, 600));

      const servers = manager.getServers();
      expect(servers[0].status).toBe("connected");
    });
  });

  describe("stopServer", () => {
    it("should stop a running server", async () => {
      const configs: MCPServerConfig[] = [
        {
          name: "test-server",
          transport: "stdio",
          command: "node",
          scope: "user",
          enabled: true,
          autoStart: false,
        },
      ];

      manager.initialize(configs);

      // Start then stop the server
      await manager.startServer("test-server");
      await manager.stopServer("test-server");

      const servers = manager.getServers();
      expect(servers[0].status).toBe("stopped");
    });

    it("should handle stopping non-existent server gracefully", async () => {
      // Should not throw, just return early
      await expect(manager.stopServer("non-existent")).resolves.toBeUndefined();
    });

    it("should handle stopping already stopped server", async () => {
      const configs: MCPServerConfig[] = [
        {
          name: "test-server",
          transport: "stdio",
          command: "node",
          scope: "user",
          enabled: true,
          autoStart: false,
        },
      ];

      manager.initialize(configs);

      // Stop without starting
      await manager.stopServer("test-server");

      const servers = manager.getServers();
      expect(servers[0].status).toBe("stopped");
    });
  });

  describe("error handling", () => {
    it("should handle initialization with duplicate server names", () => {
      const configs: MCPServerConfig[] = [
        {
          name: "duplicate",
          transport: "stdio",
          command: "node",
          scope: "user",
          enabled: true,
          autoStart: false,
        },
        {
          name: "duplicate",
          transport: "stdio",
          command: "node",
          scope: "project",
          enabled: true,
          autoStart: false,
        },
      ];

      manager.initialize(configs);

      const servers = manager.getServers();
      // Should only have one server with the duplicate name
      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe("duplicate");
    });

    it("should clear servers on re-initialization", () => {
      const configs1: MCPServerConfig[] = [
        {
          name: "server1",
          transport: "stdio",
          command: "node",
          scope: "user",
          enabled: true,
          autoStart: false,
        },
      ];

      const configs2: MCPServerConfig[] = [
        {
          name: "server2",
          transport: "stdio",
          command: "node",
          scope: "user",
          enabled: true,
          autoStart: false,
        },
      ];

      manager.initialize(configs1);
      expect(manager.getServers()).toHaveLength(1);
      expect(manager.getServers()[0].name).toBe("server1");

      manager.initialize(configs2);
      expect(manager.getServers()).toHaveLength(1);
      expect(manager.getServers()[0].name).toBe("server2");
    });
  });

  describe("HTTP transport servers", () => {
    it("should create HTTP server configuration", () => {
      const configs: MCPServerConfig[] = [
        {
          name: "http-server",
          transport: "http",
          url: "http://localhost:3000",
          scope: "user",
          enabled: true,
          autoStart: false,
        },
      ];

      manager.initialize(configs);
      const servers = manager.getServers();

      expect(servers).toHaveLength(1);
      expect(servers[0].transport).toBe("http");
      expect((servers[0] as any).url).toBe("http://localhost:3000");
    });
  });

  describe("SSE transport servers", () => {
    it("should create SSE server configuration", () => {
      const configs: MCPServerConfig[] = [
        {
          name: "sse-server",
          transport: "sse",
          url: "http://localhost:3000/events",
          scope: "user",
          enabled: true,
          autoStart: false,
        },
      ];

      manager.initialize(configs);
      const servers = manager.getServers();

      expect(servers).toHaveLength(1);
      expect(servers[0].transport).toBe("sse");
      expect((servers[0] as any).url).toBe("http://localhost:3000/events");
    });
  });
});
