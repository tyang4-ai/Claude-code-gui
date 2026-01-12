# Claude Code GUI Companion

## Project Overview

A Tauri 2.0 + React + TypeScript desktop application that wraps the Claude Code CLI with a graphical interface. Designed for power users who want quick access, multi-session management, and visibility into costs/context.

**Repository:** https://github.com/tyang4-ai/Claude-code-gui

## Current State (2026-01-11)

### Working Features
- Multi-session tabs with Ctrl+Tab switching
- Session persistence to localStorage
- Stream-JSON parsing from CLI (Rust backend)
- Tool card visualization (Bash, Edit, Read, GlobGrep)
- @ file autocomplete with trie-based indexing
- YOLO mode toggle (auto-accept edits)
- Global hotkey registration (Ctrl+Shift+Space)
- System tray with menu
- Virtual scrolling for long conversations
- Markdown rendering with syntax highlighting (Shiki)
- Dark theme

### Partially Implemented
- CLI Bridge: Interface exists, needs integration testing
- Edit Arbiter: Queue logic exists, Accept/Reject UI needs wiring
- Skills auto-activation: Rules engine works, browser UI incomplete
- Templates module: Types/storage exist, no UI

### Not Yet Implemented
- Command Palette (Ctrl+P)
- Session Browser (search/resume old sessions)
- Usage Dashboard (cost tracking UI)
- Context Viewer (CLAUDE.md, hooks, MCP status)
- Settings Panel
- Prompt History UI

## Tech Stack
- **Frontend:** React 19, TypeScript, Zustand, TailwindCSS
- **Backend:** Rust, Tauri 2.0
- **Testing:** Vitest (unit), Playwright (e2e)

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode (frontend + Tauri)
npm run tauri dev

# Build frontend only
npm run build

# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Build release
npm run tauri build
```

## Project Structure

```
src/
├── components/
│   ├── input/          # InputArea with @ autocomplete
│   ├── layout/         # AppShell, TabBar, Sidebar, StatusBar
│   ├── messages/       # MessageList, AssistantMessage, ToolCard
│   └── tools/          # BashCard, EditCard, ReadCard, GlobGrepCard
├── core/
│   ├── cli-bridge/     # Communication with Claude CLI
│   ├── edit-arbiter/   # Accept/Reject edit workflow
│   ├── file-index/     # File search indexing
│   ├── session-storage/# Persistence
│   ├── store/          # Zustand global state
│   └── types.ts        # TypeScript definitions
└── modules/
    ├── accessibility/  # ARIA, keyboard navigation
    ├── commands/       # Command registry
    ├── context/        # CLAUDE.md viewer (stub)
    ├── history/        # Session history (stub)
    ├── onboarding/     # Glossary, tips (stub)
    ├── skills/         # Auto-activation rules
    ├── templates/      # Prompt templates (stub)
    └── usage/          # Cost tracking (stub)

src-tauri/
├── src/
│   ├── commands/       # Tauri IPC commands
│   │   ├── files.rs    # File operations
│   │   ├── session.rs  # Session management
│   │   └── system.rs   # Git, VS Code integration
│   ├── services/
│   │   ├── parser.rs   # Stream-JSON parsing
│   │   └── process.rs  # CLI process spawning
│   ├── lib.rs          # Tauri plugin setup
│   └── main.rs         # Entry point, tray, hotkey
└── tauri.conf.json     # Tauri configuration
```

## Known Issues

1. **App hasn't been fully tested** - Run `npm run tauri dev` to verify current state
2. **CLI integration not wired** - SessionView.handleSubmit() may only log, not call CLI
3. **No git hooks** - Consider adding pre-commit linting

## Next Steps (Priority Order)

1. Test `npm run tauri dev` - document what works/breaks
2. Wire up CLI Bridge in SessionView
3. Implement Command Palette (Ctrl+P)
4. Add Usage Dashboard UI

## Vision Documents

See `~/.claude/plans/` for detailed plans:
- `smooth-tinkering-axolotl.md` - Architecture & module system
- `vectorized-noodling-zephyr.md` - Feature specifications
- `ticklish-shimmying-deer.md` - Gap analysis & implementation details

## Contributing

When making changes:
1. Create a feature branch
2. Make small, focused commits
3. Test with `npm run tauri dev`
4. Update this CLAUDE.md if adding new features
