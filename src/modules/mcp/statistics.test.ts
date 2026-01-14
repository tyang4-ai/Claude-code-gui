/**
 * Tests for MCP Statistics
 */

import { describe, it, expect } from "vitest";
import {
  calculateStatistics,
  getServerHealthPercentage,
  getServersByStatus,
  findServersWithTool,
  findServersWithResource,
  getAllAvailableTools,
  getAllAvailableResources,
} from "./statistics";
import type { MCPServer, MCPToolInvocation } from "./types";

describe("calculateStatistics", () => {
  it("should calculate stats for empty servers", () => {
    const stats = calculateStatistics([], []);

    expect(stats.totalServers).toBe(0);
    expect(stats.connectedServers).toBe(0);
    expect(stats.errorServers).toBe(0);
    expect(stats.totalTools).toBe(0);
    expect(stats.totalResources).toBe(0);
    expect(stats.totalPrompts).toBe(0);
    expect(stats.totalInvocations).toBe(0);
  });

  it("should count connected servers", () => {
    const servers: MCPServer[] = [
      {
        name: "server1",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: true,
        status: "connected",
        capabilities: {
          tools: [{ name: "tool1" }],
          resources: [],
          prompts: [],
        },
      },
      {
        name: "server2",
        transport: "stdio",
        command: "python",
        scope: "user",
        enabled: true,
        status: "connected",
        capabilities: {
          tools: [{ name: "tool2" }, { name: "tool3" }],
          resources: [{ uri: "file://test", name: "test" }],
          prompts: [],
        },
      },
    ];

    const stats = calculateStatistics(servers, []);

    expect(stats.totalServers).toBe(2);
    expect(stats.connectedServers).toBe(2);
    expect(stats.errorServers).toBe(0);
    expect(stats.totalTools).toBe(3);
    expect(stats.totalResources).toBe(1);
  });

  it("should count error servers", () => {
    const servers: MCPServer[] = [
      {
        name: "server1",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: true,
        status: "error",
        error: "Failed to connect",
      },
      {
        name: "server2",
        transport: "stdio",
        command: "python",
        scope: "user",
        enabled: true,
        status: "error",
        error: "Timeout",
      },
    ];

    const stats = calculateStatistics(servers, []);

    expect(stats.totalServers).toBe(2);
    expect(stats.connectedServers).toBe(0);
    expect(stats.errorServers).toBe(2);
  });

  it("should count invocations", () => {
    const invocations: MCPToolInvocation[] = [
      {
        id: "1",
        serverName: "server1",
        toolName: "tool1",
        input: {},
        timestamp: Date.now(),
      },
      {
        id: "2",
        serverName: "server1",
        toolName: "tool2",
        input: {},
        timestamp: Date.now(),
      },
    ];

    const stats = calculateStatistics([], invocations);

    expect(stats.totalInvocations).toBe(2);
  });
});

describe("getServerHealthPercentage", () => {
  it("should return 0 for empty servers", () => {
    const percentage = getServerHealthPercentage([]);
    expect(percentage).toBe(0);
  });

  it("should return 0 when all servers disabled", () => {
    const servers: MCPServer[] = [
      {
        name: "server1",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: false,
        status: "disabled",
      },
    ];

    const percentage = getServerHealthPercentage(servers);
    expect(percentage).toBe(0);
  });

  it("should return 100 when all enabled servers are connected", () => {
    const servers: MCPServer[] = [
      {
        name: "server1",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: true,
        status: "connected",
      },
      {
        name: "server2",
        transport: "stdio",
        command: "python",
        scope: "user",
        enabled: true,
        status: "connected",
      },
    ];

    const percentage = getServerHealthPercentage(servers);
    expect(percentage).toBe(100);
  });

  it("should return 50 when half are connected", () => {
    const servers: MCPServer[] = [
      {
        name: "server1",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: true,
        status: "connected",
      },
      {
        name: "server2",
        transport: "stdio",
        command: "python",
        scope: "user",
        enabled: true,
        status: "error",
      },
    ];

    const percentage = getServerHealthPercentage(servers);
    expect(percentage).toBe(50);
  });
});

describe("getServersByStatus", () => {
  it("should group servers by status", () => {
    const servers: MCPServer[] = [
      {
        name: "server1",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: true,
        status: "connected",
      },
      {
        name: "server2",
        transport: "stdio",
        command: "python",
        scope: "user",
        enabled: true,
        status: "error",
      },
      {
        name: "server3",
        transport: "stdio",
        command: "go",
        scope: "user",
        enabled: true,
        status: "stopped",
      },
    ];

    const grouped = getServersByStatus(servers);

    expect(grouped.connected).toHaveLength(1);
    expect(grouped.error).toHaveLength(1);
    expect(grouped.stopped).toHaveLength(1);
    expect(grouped.connecting).toHaveLength(0);
    expect(grouped.disabled).toHaveLength(0);
  });
});

describe("findServersWithTool", () => {
  const servers: MCPServer[] = [
    {
      name: "server1",
      transport: "stdio",
      command: "node",
      scope: "user",
      enabled: true,
      status: "connected",
      capabilities: {
        tools: [
          { name: "read_file" },
          { name: "write_file" },
        ],
        resources: [],
        prompts: [],
      },
    },
    {
      name: "server2",
      transport: "stdio",
      command: "python",
      scope: "user",
      enabled: true,
      status: "connected",
      capabilities: {
        tools: [{ name: "execute_python" }],
        resources: [],
        prompts: [],
      },
    },
  ];

  it("should find servers with specific tool", () => {
    const found = findServersWithTool(servers, "read_file");
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe("server1");
  });

  it("should return empty array when tool not found", () => {
    const found = findServersWithTool(servers, "nonexistent_tool");
    expect(found).toHaveLength(0);
  });

  it("should not find tool in servers without capabilities", () => {
    const serversWithoutCaps: MCPServer[] = [
      {
        name: "server1",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: true,
        status: "stopped",
      },
    ];

    const found = findServersWithTool(serversWithoutCaps, "read_file");
    expect(found).toHaveLength(0);
  });
});

describe("findServersWithResource", () => {
  const servers: MCPServer[] = [
    {
      name: "server1",
      transport: "stdio",
      command: "node",
      scope: "user",
      enabled: true,
      status: "connected",
      capabilities: {
        tools: [],
        resources: [
          { uri: "file:///project", name: "Project Files" },
          { uri: "file:///docs", name: "Docs" },
        ],
        prompts: [],
      },
    },
    {
      name: "server2",
      transport: "stdio",
      command: "python",
      scope: "user",
      enabled: true,
      status: "connected",
      capabilities: {
        tools: [],
        resources: [{ uri: "file:///data", name: "Data" }],
        prompts: [],
      },
    },
  ];

  it("should find servers with specific resource", () => {
    const found = findServersWithResource(servers, "file:///project");
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe("server1");
  });

  it("should return empty array when resource not found", () => {
    const found = findServersWithResource(servers, "file:///nonexistent");
    expect(found).toHaveLength(0);
  });
});

describe("getAllAvailableTools", () => {
  it("should get all tools from connected servers", () => {
    const servers: MCPServer[] = [
      {
        name: "server1",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: true,
        status: "connected",
        capabilities: {
          tools: [
            { name: "tool1", description: "Tool 1" },
            { name: "tool2" },
          ],
          resources: [],
          prompts: [],
        },
      },
      {
        name: "server2",
        transport: "stdio",
        command: "python",
        scope: "user",
        enabled: true,
        status: "connected",
        capabilities: {
          tools: [{ name: "tool3", description: "Tool 3" }],
          resources: [],
          prompts: [],
        },
      },
    ];

    const tools = getAllAvailableTools(servers);

    expect(tools).toHaveLength(3);
    expect(tools[0].serverName).toBe("server1");
    expect(tools[0].toolName).toBe("tool1");
    expect(tools[0].description).toBe("Tool 1");
  });

  it("should not include tools from disconnected servers", () => {
    const servers: MCPServer[] = [
      {
        name: "server1",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: true,
        status: "stopped",
        capabilities: {
          tools: [{ name: "tool1" }],
          resources: [],
          prompts: [],
        },
      },
    ];

    const tools = getAllAvailableTools(servers);
    expect(tools).toHaveLength(0);
  });
});

describe("getAllAvailableResources", () => {
  it("should get all resources from connected servers", () => {
    const servers: MCPServer[] = [
      {
        name: "server1",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: true,
        status: "connected",
        capabilities: {
          tools: [],
          resources: [
            { uri: "file:///project", name: "Project", description: "Project files" },
          ],
          prompts: [],
        },
      },
      {
        name: "server2",
        transport: "stdio",
        command: "python",
        scope: "user",
        enabled: true,
        status: "connected",
        capabilities: {
          tools: [],
          resources: [
            { uri: "file:///data", name: "Data" },
          ],
          prompts: [],
        },
      },
    ];

    const resources = getAllAvailableResources(servers);

    expect(resources).toHaveLength(2);
    expect(resources[0].serverName).toBe("server1");
    expect(resources[0].uri).toBe("file:///project");
    expect(resources[0].description).toBe("Project files");
  });

  it("should return empty array for disconnected servers", () => {
    const servers: MCPServer[] = [
      {
        name: "server1",
        transport: "stdio",
        command: "node",
        scope: "user",
        enabled: true,
        status: "error",
      },
    ];

    const resources = getAllAvailableResources(servers);
    expect(resources).toHaveLength(0);
  });
});
