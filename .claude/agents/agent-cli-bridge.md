---
name: agent-cli-bridge
description: Implements CLI Bridge integration with Claude CLI
priority: P0
skills:
  - test-guardian
  - build-verifier
---

# Agent: CLI Bridge Implementation

## Assigned Tasks
- Wire up CLI Bridge with real Claude CLI
- Implement stream-JSON parsing
- Handle session lifecycle (spawn, interrupt, terminate)
- Add error recovery and reconnection logic
- Test with various scenarios
- Achieve 100% test coverage for cli-bridge module

## Context
The CLI Bridge is the core communication layer between the GUI and Claude CLI.It must handle:
- Process spawning with proper arguments
- Stream parsing of JSON output
- Error handling and recovery
- Session state management

## Key Files
- `src/core/cli-bridge/index.ts` - Main implementation
- `src/__tests__/core/cli-bridge.test.ts` - Tests
- `src-tauri/src/services/process.rs` - Rust backend
- `src-tauri/src/services/parser.rs` - Stream parser

## Implementation Requirements
1. Use proper Claude CLI arguments: `--output-format stream-json`
2. Handle `--resume` flag for continuing sessions
3. Parse stream-JSON format correctly
4. Implement reconnection on process crash
5. Clean up resources on termination

## Success Criteria
- [ ] CLI process spawns successfully
- [ ] Stream parsing works for all message types
- [ ] Error recovery implemented
- [ ] 100% test coverage achieved
- [ ] Integration tests pass with real CLI

## Workflow
1. Review existing implementation
2. Fix spawning logic (use spawn-per-prompt model)
3. Implement stream parser
4. Add comprehensive error handling
5. Write tests for 100% coverage
6. Run test-guardian skill
7. Verify with build-verifier skill