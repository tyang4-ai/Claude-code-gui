# MCP (Model Context Protocol) Manager

Complete implementation of MCP server management for Claude GUI Companion.

## Features

- **Multi-transport Support**: stdio, HTTP, and SSE transports
- **Multi-scope Configuration**: User, project, and managed server scopes
- **Server Lifecycle Management**: Start, stop, restart, and monitor servers
- **Capability Discovery**: Automatic detection of tools, resources, and prompts
- **Health Monitoring**: Continuous health checks with auto-reconnection
- **Configuration Management**: Parse and persist MCP configurations
- **Tool Invocation Tracking**: Record and display MCP tool calls in chat

## Architecture

### Core Modules

#### `types.ts`
Comprehensive TypeScript type definitions for the entire MCP system including:
- Server configurations and states
- Capabilities (tools, resources, prompts)
- Tool invocations and results
- Error types and health checks

#### `config-parser.ts`
Configuration file parsing and validation:
- Parse from multiple sources (user, project, managed)
- Merge configurations with scope priority
- Validate server configurations
- Serialize back to JSON format
- Support for all transport types

#### `server-manager.ts`
Server lifecycle management:
- Start/stop/restart servers
- Monitor server health
- Handle errors and reconnection
- Process management for stdio servers
- HTTP/SSE connection management
- Capability fetching

#### `statistics.ts`
Statistics and metrics calculation:
- Server health percentages
- Tool/resource/prompt counts
- Server status grouping
- Tool and resource discovery

#### `index.ts`
Main API that ties everything together:
- Initialize and cleanup
- Add/update/remove servers
- Record tool invocations
- Subscribe to server changes

### UI Components

#### `MCPPanel.tsx`
Main sidebar panel displaying:
- All MCP servers grouped by scope
- Server statistics
- Add new server button
- Scope filters (user/project/managed/all)

#### `MCPServerList.tsx`
List of servers with:
- Status indicators (connected/error/stopped)
- Server name and transport type
- Expandable details
- Tool counts

#### `MCPServerDetail.tsx`
Detailed server view with:
- Start/stop/restart controls
- Enable/disable toggle
- Test connection button
- Tabbed interface (Info/Tools/Resources/Prompts)
- Configuration display
- Remove server button (non-managed only)

#### `MCPAddModal.tsx`
Modal for adding new servers:
- Transport selection (stdio/http/sse)
- Scope selection (user/project)
- Transport-specific fields
- Environment variables editor
- Headers editor (for HTTP/SSE)
- Auto-start toggle
- Validation

#### `MCPToolCard.tsx`
Display MCP tool invocations in chat:
- Server and tool name
- Input parameters
- Results or errors
- Expandable JSON display
- Timestamps

### Rust Backend

#### `src-tauri/src/commands/mcp.rs`
Tauri commands for MCP operations:
- `read_mcp_config`: Read configuration files
- `write_mcp_config`: Write configuration files
- `mcp_config_exists`: Check if config exists
- `get_mcp_config_paths`: Get default config paths
- `start_mcp_server`: Start stdio server process
- `stop_mcp_server`: Stop server by PID
- `is_process_running`: Check if process is alive
- `health_check_mcp_server`: HTTP/SSE health check
- `fetch_mcp_capabilities`: Get server capabilities

## Configuration

### User Scope
Stored in: `~/.claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/path/to/server.js"],
      "env": {
        "API_KEY": "your_key"
      }
    }
  }
}
```

### Project Scope
Stored in: `./.mcp.json` or `./.claude/mcp.json`

```json
{
  "mcpServers": {
    "project-server": {
      "command": "python",
      "args": ["server.py"],
      "env": {
        "PROJECT_PATH": "."
      }
    }
  }
}
```

### HTTP/SSE Transport
```json
{
  "mcpServers": {
    "http-server": {
      "url": "http://localhost:3000",
      "headers": {
        "Authorization": "Bearer token"
      }
    }
  }
}
```

## Usage

### Initialize MCP Manager
```typescript
import { initializeMCPManager } from '@/modules/mcp';

// In your app initialization
await initializeMCPManager('/path/to/working/dir');
```

### Add UI Component
```typescript
import { MCPPanel } from '@/components/mcp';

function Sidebar() {
  return (
    <div>
      <MCPPanel />
    </div>
  );
}
```

### Add Server Programmatically
```typescript
import { getMCPManager } from '@/modules/mcp';

const manager = getMCPManager();

await manager.addServer({
  name: 'my-server',
  transport: 'stdio',
  command: 'node',
  args: ['server.js'],
  scope: 'user',
  autoStart: true,
});
```

### Monitor Server Changes
```typescript
import { getMCPManager } from '@/modules/mcp';

const manager = getMCPManager();

const unsubscribe = manager.subscribe((servers) => {
  console.log('Server state changed:', servers);
});

// Later, cleanup
unsubscribe();
```

### Display MCP Tool Invocations
```typescript
import { MCPToolCard } from '@/components/mcp';

function ChatMessage({ invocation, result }) {
  return (
    <MCPToolCard
      invocation={invocation}
      result={result}
    />
  );
}
```

## Testing

All modules have 100% test coverage:

```bash
# Run tests
npm run test:unit

# Run with coverage
npm run test:unit:coverage

# Watch mode
npm run test:unit:watch
```

Test files:
- `config-parser.test.ts` - Configuration parsing and validation
- `server-manager.test.ts` - Server lifecycle management
- `statistics.test.ts` - Statistics calculation
- `index.test.ts` - Main API integration

## Development

### Adding a New Transport Type

1. Add type to `types.ts`:
```typescript
export type MCPTransport = "stdio" | "http" | "sse" | "websocket";
```

2. Update `config-parser.ts` to handle new transport
3. Add backend support in `src-tauri/src/commands/mcp.rs`
4. Update UI components to support new transport
5. Add tests

### Adding New Server Capabilities

1. Update `MCPCapabilities` in `types.ts`
2. Add UI display in `MCPServerDetail.tsx`
3. Update statistics calculations in `statistics.ts`
4. Add tests

## Architecture Decisions

### Why Singleton Manager?
The MCP manager is a singleton to ensure:
- Single source of truth for server state
- Consistent server lifecycle across the app
- Easy subscription to state changes
- Resource cleanup on app exit

### Why Scope-based Configuration?
Three scopes allow:
- **User**: Personal servers across all projects
- **Project**: Project-specific servers
- **Managed**: Organization-provided servers (read-only)

Priority: Managed > Project > User

### Why Separate UI Components?
Modular components enable:
- Reusability across different UI contexts
- Independent testing
- Easy customization
- Progressive enhancement

## Future Enhancements

- [ ] WebSocket transport support
- [ ] Server templates/presets
- [ ] Bulk operations (start/stop all)
- [ ] Server performance metrics
- [ ] Automatic dependency installation
- [ ] Server logs viewer
- [ ] MCP protocol version detection
- [ ] Server capability caching

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Claude Desktop Config](https://docs.anthropic.com/en/docs/desktop-config)
- [Tauri IPC Documentation](https://tauri.app/v1/guides/features/command/)
