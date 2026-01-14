# Claude Code GUI Companion

## Multi-Agent Development System

### For All Agents

#### Before Starting Work
1. **Load Context:**
   - Read this CLAUDE.md file for project context
   - Read DEVELOPMENT_PLAN.md for your assigned tasks
   - Check `.claude/file-claims.json` for file ownership
   - Review your agent definition in `.claude/agents/`

2. **Claim Your Files:**
   - Update file-claims.json before editing
   - Respect SHARED files (coordinate changes)
   - Don't edit files claimed by other agents

#### During Work
1. **Quality Standards:**
   - 100% test coverage for core modules
   - 95% test coverage for components
   - TypeScript strict mode (no `any`)
   - All tests must pass

2. **Verification Requirements:**
   - Run `test-guardian` skill after code changes
   - Run `build-verifier` before marking complete
   - Run `screenshot-verifier` for UI features

3. **Git Commits:**
   ```
   [agent-name] feat|fix|test: Brief description

   Detailed explanation

   Related: DEVELOPMENT_PLAN.md tasks
   ```

#### Completing Work
1. Mark tasks complete in DEVELOPMENT_PLAN.md
2. Update coverage percentage
3. Report back to main session

### Available Skills
- **test-guardian** - Enforce 100% coverage
- **build-verifier** - Verify compilation
- **screenshot-verifier** - Capture UI

---

## Project Overview

A Tauri 2.0 + React + TypeScript desktop application that wraps the Claude Code CLI with a graphical interface. Designed for power users who want quick access, multi-session management, and visibility into costs/context.

**Repository:** https://github.com/tyang4-ai/Claude-code-gui

## Current State (2026-01-13)

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
- **Command Palette (Ctrl+P)** - fuzzy search commands
- **Settings Panel** - model selection, hotkey config
- **Usage Dashboard** - cost tracking with charts
- **Session Browser** - search/resume old sessions
- **Context Viewer** - CLAUDE.md, hooks, MCP status
- **Skills Browser** - browse and manage skills
- **Modern UI with glass effects** - Raycast/Arc-style polish

### UI Design System (Phase 1 Complete)
- Deep dark color palette (#0f1419 base)
- Blue accent color (#58a6ff)
- Glass/frosted modal effects with backdrop blur
- Shadow system for visual depth
- Consistent 8px border radius

### Partially Implemented
- CLI Bridge: Interface exists, needs integration testing
- Edit Arbiter: Queue logic exists, Accept/Reject UI needs wiring
- Templates module: Types/storage exist, no UI

### Needs Polish (Phase 2)
- Tool cards (BashCard, EditCard, ReadCard, GlobGrepCard)
- SessionBrowser, ContextViewer, SkillsBrowser modals (still use old teal colors)

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

1. **UI Polish Phase 2** - Update remaining components to design system
2. Wire up CLI Bridge in SessionView
3. Complete Edit Arbiter Accept/Reject workflow
4. Add Templates UI

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
