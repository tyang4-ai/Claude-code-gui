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

**Documentation:** See `docs/USER_MANUAL.md` for comprehensive user guide

## Current State (2026-01-13)

### UI Polish Status: COMPLETE

Both Phase 1 and Phase 2 of UI polish are complete. The application now uses a consistent modern design system.

### Working Features

#### Core Functionality
- Multi-session tabs with Ctrl+Tab switching
- Session persistence to localStorage
- Stream-JSON parsing from CLI (Rust backend)
- @ file autocomplete with trie-based indexing
- YOLO mode toggle (auto-accept edits)
- Global hotkey registration (Ctrl+Shift+Space)
- System tray with menu
- Virtual scrolling for long conversations
- Markdown rendering with syntax highlighting (Shiki)
- Prompt history navigation (Arrow Up/Down)
- Session renaming (double-click tab)

#### Tool Cards (Phase 2 Complete)
- **BashCard** - Terminal commands with ANSI colors, exit codes
- **EditCard** - File diffs with Accept/Reject, conflict resolution
- **ReadCard** - File content with syntax highlighting
- **GlobGrepCard** - Search results with file lists

#### Navigation & Panels
- **Command Palette (Ctrl+P)** - Fuzzy search commands with categories
- **Settings Panel (Ctrl+,)** - Model selection, YOLO mode, hotkey config
- **Usage Dashboard** - Cost tracking with charts and export
- **Session Browser (Ctrl+H)** - Search/filter/resume old sessions
- **Context Viewer (Ctrl+K)** - CLAUDE.md, hooks, MCP server status
- **Skills Browser** - Browse, activate, and manage skills
- **Keyboard Shortcuts Modal (Ctrl+?)** - Full shortcut reference

### UI Design System

The application uses a modern dark theme with glass effects:

```css
/* Color Palette */
--color-bg-base: #0f1419       /* Deepest background */
--color-bg-surface: #1a1f26    /* Cards, panels */
--color-bg-elevated: #242b35   /* Modals, dropdowns */
--color-bg-overlay: #2d3640    /* Hover states */

--color-text-primary: #e6edf3  /* Main text */
--color-text-secondary: #8b949e /* Secondary */
--color-text-muted: #484f58    /* Disabled */

--color-accent-primary: #58a6ff /* Primary blue */
--color-accent-success: #3fb950
--color-accent-warning: #d29922
--color-accent-error: #f85149

/* Glass Effect */
--glass-bg: rgba(26, 31, 38, 0.85)
--glass-blur: 16px

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.3)
--shadow-md: 0 4px 8px rgba(0,0,0,0.3)
--shadow-lg: 0 8px 24px rgba(0,0,0,0.4)
--shadow-xl: 0 16px 48px rgba(0,0,0,0.5)
```

### Partially Implemented
- CLI Bridge: Interface exists, needs integration testing
- Edit Arbiter: Queue logic exists, Accept/Reject UI needs wiring
- Templates module: Types/storage exist, no UI

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

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+P` | Command Palette |
| `Ctrl+N` | New Session |
| `Ctrl+W` | Close Session |
| `Ctrl+H` | Session Browser |
| `Ctrl+K` | Context Viewer |
| `Ctrl+,` | Settings |
| `Ctrl+?` | Keyboard Shortcuts |
| `Ctrl+Tab` | Next Session |
| `Ctrl+Shift+Tab` | Previous Session |
| `Ctrl+1-9` | Jump to Session |
| `Ctrl+Enter` | Send Message |
| `@` | File Autocomplete |
| `Escape` | Close Modal / Interrupt |

## Project Structure

```
src/
├── components/
│   ├── input/          # InputArea with @ autocomplete
│   ├── layout/         # AppShell, TabBar, Sidebar, StatusBar
│   │   ├── CommandPalette.tsx
│   │   ├── ContextViewer.tsx
│   │   ├── SessionBrowser.tsx
│   │   ├── SettingsPanel.tsx
│   │   ├── SkillsBrowser.tsx
│   │   └── UsageDashboard.tsx
│   ├── messages/       # MessageList, AssistantMessage, ToolCard
│   └── tools/          # BashCard, EditCard, ReadCard, GlobGrepCard
├── core/
│   ├── cli-bridge/     # Communication with Claude CLI
│   ├── edit-arbiter/   # Accept/Reject edit workflow
│   ├── file-index/     # File search indexing
│   ├── session-storage/# Persistence
│   ├── store/          # Zustand global state
│   └── types.ts        # TypeScript definitions
├── modules/
│   ├── accessibility/  # ARIA, keyboard navigation
│   ├── commands/       # Command registry + fuzzy search
│   ├── context/        # CLAUDE.md file watcher
│   ├── history/        # Session history search
│   ├── mcp/            # MCP server management
│   ├── onboarding/     # Glossary, tips
│   ├── skills/         # Skill discovery + activation
│   ├── templates/      # Prompt templates
│   └── usage/          # Cost tracking + aggregation
└── index.css           # Design system tokens

src-tauri/
├── src/
│   ├── commands/       # Tauri IPC commands
│   │   ├── files.rs    # File operations
│   │   ├── mcp.rs      # MCP server commands
│   │   ├── session.rs  # Session management
│   │   └── system.rs   # Git, VS Code integration
│   ├── services/
│   │   ├── parser.rs   # Stream-JSON parsing
│   │   └── process.rs  # CLI process spawning
│   ├── lib.rs          # Tauri plugin setup
│   └── main.rs         # Entry point, tray, hotkey
└── tauri.conf.json     # Tauri configuration

docs/
└── USER_MANUAL.md      # Comprehensive user documentation
```

## Recent Commits

```
811823b feat: UI Polish Phase 2 - Tool cards and modal components
8c43377 feat: UI Polish Phase 1 - Modern design system with glass effects
a318c31 Fix Tauri 2.0 plugin configuration
000ba77 Add CLAUDE.md project documentation
c83ed17 Initial commit: Claude Code GUI Companion
```

## Known Issues

1. **CLI integration not wired** - SessionView.handleSubmit() may only log, not call CLI
2. **No git hooks** - Consider adding pre-commit linting
3. **Tests need updating** - Some tests may be outdated after UI changes

## Next Steps (Priority Order)

1. Wire up CLI Bridge in SessionView
2. Complete Edit Arbiter Accept/Reject workflow
3. Add Templates UI (Ctrl+T)
4. End-to-end testing with actual Claude CLI
5. Add pre-commit hooks for linting

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
5. See `docs/USER_MANUAL.md` for feature documentation

---

## Session Management

**IMPORTANT:** After completing each fix or development phase:

1. **Update `SESSION.md`** in project root with:
   - Current date
   - Task completion status
   - Notes for next session

2. **Keep it current** - SESSION.md is the single source of truth for:
   - What's working
   - What's in progress
   - What's next

3. **Archive details** - Move verbose notes to `docs/session-notes/` to keep SESSION.md scannable

This ensures continuity between Claude Code sessions.