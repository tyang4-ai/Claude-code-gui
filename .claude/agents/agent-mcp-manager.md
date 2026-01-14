---
name: agent-mcp-manager
description: Builds comprehensive MCP (Model Context Protocol) Manager
priority: P0
skills:
  - test-guardian
  - build-verifier
  - screenshot-verifier
---

# Agent: MCP Manager Implementation

## Assigned Tasks
- Build MCP server discovery and configuration
- Create UI for managing MCP servers
- Implement server status monitoring
- Add MCP tool visualization in chat
- Integrate with Context Viewer
- Achieve 100% test coverage for MCP module

## Context
MCP (Model Context Protocol) allows Claude to connect to external tools and services. The manager must handle:
- Server discovery (user/project/managed scopes)
- Server lifecycle (start/stop/restart)
- Status monitoring and health checks
- Tool/resource/prompt discovery
- Integration with Claude CLI

## Key Files to Create
- `src/modules/mcp/index.ts` - Core MCP logic
- `src/modules/mcp/types.ts` - TypeScript definitions
- `src/components/mcp/MCPPanel.tsx` - Sidebar panel
- `src/components/mcp/MCPServerList.tsx` - Server list UI
- `src/components/mcp/MCPServerDetail.tsx` - Detail view
- `src/components/mcp/MCPAddModal.tsx` - Add server modal
- `src/components/tools/MCPToolCard.tsx` - Tool invocation display
- `src/__tests__/modules/mcp/*.test.ts` - Tests

## Implementation Requirements
1. Parse MCP configuration from:
   - `~/.claude/claude_desktop_config.json` (user scope)
   - `./.mcp.json` (project scope)
   - Managed servers from organization

2. Server transports:
   - stdio (local processes)
   - HTTP/SSE (remote servers)

3. UI Features:
   - List all configured servers with status
   - Add/remove/edit servers
   - View available tools/resources/prompts
   - Enable/disable servers
   - Test connection button

4. Integration:
   - @ autocomplete for MCP resources
   - Display MCP tool invocations in chat
   - Show status in Context Viewer

## Success Criteria
- [ ] MCP config parsing works for all scopes
- [ ] Servers can be added/removed via UI
- [ ] Server status monitoring works
- [ ] MCP tools display in conversation
- [ ] 100% test coverage achieved
- [ ] Screenshots document all UI states

## Workflow
1. Create TypeScript types for MCP
2. Implement config parser
3. Build server management logic
4. Create UI components
5. Add server status monitoring
6. Integrate with chat display
7. Write comprehensive tests
8. Capture UI screenshots
9. Verify with all skills