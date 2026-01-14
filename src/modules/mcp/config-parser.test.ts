/**
 * Tests for MCP Config Parser
 */

import { describe, it, expect } from "vitest";
import {
  parseMCPConfigFile,
  configToServer,
  mergeServerConfigs,
  validateServerConfig,
  serializeConfigFile,
  filterByScope,
  groupByScope,
} from "./config-parser";
import type { MCPServerConfig } from "./types";

describe("parseMCPConfigFile", () => {
  it("should parse valid config file", () => {
    const content = JSON.stringify({
      mcpServers: {
        "test-server": {
          command: "node",
          args: ["server.js"],
          env: { API_KEY: "test" },
        },
      },
    });

    const configs = parseMCPConfigFile(content, "user");

    expect(configs).toHaveLength(1);
    expect(configs[0].name).toBe("test-server");
    expect(configs[0].command).toBe("node");
    expect(configs[0].scope).toBe("user");
    expect(configs[0].enabled).toBe(true);
  });

  it("should handle disabled servers", () => {
    const content = JSON.stringify({
      mcpServers: {
        "disabled-server": {
          command: "node",
          disabled: true,
        },
      },
    });

    const configs = parseMCPConfigFile(content, "user");

    expect(configs).toHaveLength(1);
    expect(configs[0].enabled).toBe(false);
  });

  it("should parse HTTP/SSE servers", () => {
    const content = JSON.stringify({
      mcpServers: {
        "http-server": {
          url: "http://localhost:3000",
          headers: { Authorization: "Bearer token" },
        },
      },
    });

    const configs = parseMCPConfigFile(content, "project");

    expect(configs).toHaveLength(1);
    expect(configs[0].transport).toBe("http");
    expect(configs[0].url).toBe("http://localhost:3000");
  });

  it("should return empty array for invalid JSON", () => {
    const configs = parseMCPConfigFile("invalid json", "user");
    expect(configs).toHaveLength(0);
  });

  it("should return empty array when no mcpServers", () => {
    const content = JSON.stringify({});
    const configs = parseMCPConfigFile(content, "user");
    expect(configs).toHaveLength(0);
  });

  it("should skip servers with missing required fields", () => {
    const content = JSON.stringify({
      mcpServers: {
        "no-command": {
          args: ["test"],
        },
      },
    });

    const configs = parseMCPConfigFile(content, "user");
    expect(configs).toHaveLength(0);
  });
});

describe("configToServer", () => {
  it("should convert enabled config to server with stopped status", () => {
    const config: MCPServerConfig = {
      name: "test",
      transport: "stdio",
      command: "node",
      scope: "user",
      enabled: true,
    };

    const server = configToServer(config);

    expect(server.status).toBe("stopped");
    expect(server.name).toBe("test");
  });

  it("should convert disabled config to server with disabled status", () => {
    const config: MCPServerConfig = {
      name: "test",
      transport: "stdio",
      command: "node",
      scope: "user",
      enabled: false,
    };

    const server = configToServer(config);

    expect(server.status).toBe("disabled");
  });
});

describe("mergeServerConfigs", () => {
  it("should merge configs from multiple sources", () => {
    const userConfigs: MCPServerConfig[] = [
      {
        name: "server1",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: true,
      },
    ];

    const projectConfigs: MCPServerConfig[] = [
      {
        name: "server2",
        transport: "stdio",
        command: "python",
        scope: "project",
        enabled: true,
      },
    ];

    const merged = mergeServerConfigs(userConfigs, projectConfigs);

    expect(merged).toHaveLength(2);
    expect(merged.find((c) => c.name === "server1")).toBeDefined();
    expect(merged.find((c) => c.name === "server2")).toBeDefined();
  });

  it("should prioritize project scope over user scope", () => {
    const userConfigs: MCPServerConfig[] = [
      {
        name: "server1",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: true,
      },
    ];

    const projectConfigs: MCPServerConfig[] = [
      {
        name: "server1",
        transport: "stdio",
        command: "python",
        scope: "project",
        enabled: false,
      },
    ];

    const merged = mergeServerConfigs(userConfigs, projectConfigs);

    expect(merged).toHaveLength(1);
    expect(merged[0].command).toBe("python");
    expect(merged[0].scope).toBe("project");
  });

  it("should prioritize managed scope over project scope", () => {
    const projectConfigs: MCPServerConfig[] = [
      {
        name: "server1",
        transport: "stdio",
        command: "node",
        scope: "project",
        enabled: true,
      },
    ];

    const managedConfigs: MCPServerConfig[] = [
      {
        name: "server1",
        transport: "http",
        url: "http://localhost:3000",
        scope: "managed",
        enabled: true,
      },
    ];

    const merged = mergeServerConfigs(projectConfigs, managedConfigs);

    expect(merged).toHaveLength(1);
    expect(merged[0].transport).toBe("http");
    expect(merged[0].scope).toBe("managed");
  });
});

describe("validateServerConfig", () => {
  it("should validate valid stdio config", () => {
    const config: MCPServerConfig = {
      name: "test-server",
      transport: "stdio",
      command: "node",
      scope: "user",
      enabled: true,
    };

    const result = validateServerConfig(config);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should validate valid HTTP config", () => {
    const config: MCPServerConfig = {
      name: "http-server",
      transport: "http",
      url: "http://localhost:3000",
      scope: "project",
      enabled: true,
    };

    const result = validateServerConfig(config);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject empty name", () => {
    const config: MCPServerConfig = {
      name: "",
      transport: "stdio",
      command: "node",
      scope: "user",
      enabled: true,
    };

    const result = validateServerConfig(config);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Server name is required");
  });

  it("should reject invalid characters in name", () => {
    const config: MCPServerConfig = {
      name: "test server!",
      transport: "stdio",
      command: "node",
      scope: "user",
      enabled: true,
    };

    const result = validateServerConfig(config);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject stdio without command", () => {
    const config: MCPServerConfig = {
      name: "test",
      transport: "stdio",
      scope: "user",
      enabled: true,
    };

    const result = validateServerConfig(config);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Command is required for stdio transport");
  });

  it("should reject HTTP without URL", () => {
    const config: MCPServerConfig = {
      name: "test",
      transport: "http",
      scope: "user",
      enabled: true,
    };

    const result = validateServerConfig(config);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("URL is required for http transport");
  });

  it("should reject invalid URL", () => {
    const config: MCPServerConfig = {
      name: "test",
      transport: "http",
      url: "not a url",
      scope: "user",
      enabled: true,
    };

    const result = validateServerConfig(config);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Invalid URL format");
  });
});

describe("serializeConfigFile", () => {
  it("should serialize single server", () => {
    const configs: MCPServerConfig[] = [
      {
        name: "test-server",
        transport: "stdio",
        command: "node",
        args: ["server.js"],
        scope: "user",
        enabled: true,
      },
    ];

    const json = serializeConfigFile(configs);
    const parsed = JSON.parse(json);

    expect(parsed.mcpServers).toBeDefined();
    expect(parsed.mcpServers["test-server"]).toBeDefined();
    expect(parsed.mcpServers["test-server"].command).toBe("node");
    expect(parsed.mcpServers["test-server"].args).toEqual(["server.js"]);
  });

  it("should serialize disabled server", () => {
    const configs: MCPServerConfig[] = [
      {
        name: "test",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: false,
      },
    ];

    const json = serializeConfigFile(configs);
    const parsed = JSON.parse(json);

    expect(parsed.mcpServers["test"].disabled).toBe(true);
  });

  it("should serialize HTTP server", () => {
    const configs: MCPServerConfig[] = [
      {
        name: "http-server",
        transport: "http",
        url: "http://localhost:3000",
        headers: { Authorization: "Bearer token" },
        scope: "project",
        enabled: true,
      },
    ];

    const json = serializeConfigFile(configs);
    const parsed = JSON.parse(json);

    expect(parsed.mcpServers["http-server"].url).toBe("http://localhost:3000");
    expect(parsed.mcpServers["http-server"].headers).toEqual({
      Authorization: "Bearer token",
    });
  });
});

describe("filterByScope", () => {
  const configs: MCPServerConfig[] = [
    {
      name: "user1",
      transport: "stdio",
      command: "node",
      scope: "user",
      enabled: true,
    },
    {
      name: "project1",
      transport: "stdio",
      command: "python",
      scope: "project",
      enabled: true,
    },
    {
      name: "managed1",
      transport: "http",
      url: "http://localhost:3000",
      scope: "managed",
      enabled: true,
    },
  ];

  it("should filter by user scope", () => {
    const filtered = filterByScope(configs, "user");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("user1");
  });

  it("should filter by project scope", () => {
    const filtered = filterByScope(configs, "project");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("project1");
  });

  it("should filter by managed scope", () => {
    const filtered = filterByScope(configs, "managed");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("managed1");
  });
});

describe("groupByScope", () => {
  it("should group configs by scope", () => {
    const configs: MCPServerConfig[] = [
      {
        name: "user1",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: true,
      },
      {
        name: "user2",
        transport: "stdio",
        command: "python",
        scope: "user",
        enabled: true,
      },
      {
        name: "project1",
        transport: "stdio",
        command: "go",
        scope: "project",
        enabled: true,
      },
    ];

    const grouped = groupByScope(configs);

    expect(grouped.user).toHaveLength(2);
    expect(grouped.project).toHaveLength(1);
    expect(grouped.managed).toHaveLength(0);
  });

  it("should handle empty array", () => {
    const grouped = groupByScope([]);

    expect(grouped.user).toHaveLength(0);
    expect(grouped.project).toHaveLength(0);
    expect(grouped.managed).toHaveLength(0);
  });
});
