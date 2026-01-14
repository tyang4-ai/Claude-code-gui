# Claude GUI Companion - User Manual

> **Version:** 0.1.0
> **Platform:** Windows, macOS, Linux (Tauri 2.0)
> **Last Updated:** January 2026

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Interface Overview](#interface-overview)
4. [Session Management](#session-management)
5. [Command Palette](#command-palette)
6. [Input Area & File Autocomplete](#input-area--file-autocomplete)
7. [Tool Cards](#tool-cards)
8. [Session Browser](#session-browser)
9. [Usage Dashboard](#usage-dashboard)
10. [Context Viewer](#context-viewer)
11. [Skills Browser](#skills-browser)
12. [Settings](#settings)
13. [Keyboard Shortcuts](#keyboard-shortcuts)
14. [System Integration](#system-integration)
15. [Troubleshooting](#troubleshooting)

---

## Introduction

Claude GUI Companion is a desktop application that provides a graphical interface for the Claude Code CLI. It's designed for power users who want:

- **Multi-session management** with browser-style tabs
- **Visual tool cards** showing Bash commands, file edits, and search results
- **Cost tracking** and usage analytics
- **Quick access** via global hotkey
- **Context awareness** with CLAUDE.md, hooks, and MCP server visibility

The application wraps the Claude Code CLI, providing a rich visual experience while maintaining all the power of the command-line tool.

---

## Getting Started

### First Launch

1. **Start the application** - Launch Claude GUI Companion from your applications menu or desktop shortcut
2. **Create your first session** - Click the **+** button in the tab bar or press `Ctrl+N`
3. **Select a project folder** - Choose the directory where you want Claude to work
4. **Start chatting** - Type your message and press `Ctrl+Enter` to send

### Quick Start Tips

- Press `Ctrl+P` anytime to open the **Command Palette** for quick navigation
- Enable **YOLO Mode** in the sidebar to auto-accept file edits
- Use `@` in the input area to reference files in your project
- Press `Ctrl+Shift+Space` (global hotkey) to show/hide the app from anywhere

---

## Interface Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ ☰  │ Session 1 ✕ │ Session 2 ✕ │  +  │                         ⚙  │  ← Tab Bar
├─────┬───────────────────────────────────────────────────────────────┤
│     │                                                               │
│  S  │                    Message History                            │
│  I  │                                                               │
│  D  │  ┌─────────────────────────────────────────────────────────┐  │
│  E  │  │ User: How do I fix this bug?                            │  │
│  B  │  └─────────────────────────────────────────────────────────┘  │
│  A  │                                                               │
│  R  │  ┌─────────────────────────────────────────────────────────┐  │
│     │  │ Assistant: Let me look at the code...                   │  │
│     │  │ ┌─────────────────────────────────────────────────────┐ │  │
│     │  │ │ $ cat src/main.ts               [BashCard]          │ │  │
│     │  │ └─────────────────────────────────────────────────────┘ │  │
│     │  └─────────────────────────────────────────────────────────┘  │
│     │                                                               │
├─────┴───────────────────────────────────────────────────────────────┤
│  Type a message... (Ctrl+Enter to send)                    [@] [→]  │  ← Input Area
├─────────────────────────────────────────────────────────────────────┤
│ Session: my-project │ Model: sonnet │ Cost: $0.0012 │ ● Connected   │  ← Status Bar
└─────────────────────────────────────────────────────────────────────┘
```

### Main Components

| Component | Description |
|-----------|-------------|
| **Tab Bar** | Browser-style tabs for multiple sessions, plus settings button |
| **Sidebar** | Quick actions, YOLO mode toggle, recent sessions, MCP servers |
| **Message History** | Scrollable conversation with tool cards |
| **Input Area** | Text input with @ file autocomplete |
| **Status Bar** | Session info, model, cost, connection status |

---

## Session Management

### Creating a New Session

| Method | How |
|--------|-----|
| Tab Bar | Click the **+** button |
| Keyboard | Press `Ctrl+N` |
| Command Palette | Press `Ctrl+P`, type "new session" |

After clicking, a folder picker dialog opens. Select your project directory to start the session.

### Switching Between Sessions

| Method | How |
|--------|-----|
| Click Tab | Click on any tab to switch |
| Keyboard | `Ctrl+Tab` (next), `Ctrl+Shift+Tab` (previous) |
| Direct Jump | `Ctrl+1` through `Ctrl+9` for specific tabs |

### Renaming Sessions

| Method | How |
|--------|-----|
| Double-click | Double-click the tab name to edit inline |
| Right-click | Right-click tab → "Rename" |
| Command Palette | `Ctrl+P` → "Rename Session" |

### Closing Sessions

| Method | How |
|--------|-----|
| Close Button | Click the **✕** on the tab |
| Keyboard | `Ctrl+W` |
| Command Palette | `Ctrl+P` → "Close Session" |

### Session Status Indicators

The tab shows a colored dot indicating session state:

| Color | Status |
|-------|--------|
| 🟢 Green | Idle, ready for input |
| 🔵 Blue | Thinking, processing request |
| 🔴 Red | Error occurred |
| 🟡 Yellow | Waiting for user action (e.g., edit approval) |

---

## Command Palette

The Command Palette is your central hub for navigating the application quickly.

### Opening the Command Palette

Press `Ctrl+P` from anywhere in the app.

### Using the Command Palette

1. **Start typing** to fuzzy search commands
2. **Arrow Up/Down** to navigate results
3. **Enter** to execute the selected command
4. **Escape** to close

### Command Categories

Commands are color-coded by category:

| Badge | Category | Examples |
|-------|----------|----------|
| 🔴 SESSION | Session management | New Session, Close Session, Clear Chat |
| 🔵 NAVIGATION | Panel navigation | Session Browser, Usage Dashboard, Context Viewer |
| 🟡 SETTINGS | Configuration | Open Settings |
| 🟣 SKILLS | Skill management | Skills Browser |
| ⚪ HELP | Help & docs | Keyboard Shortcuts |

### Available Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| New Session | Start a new Claude session | `Ctrl+N` |
| Close Session | Close the current session | `Ctrl+W` |
| Clear Chat | Clear the current conversation | - |
| Interrupt | Stop Claude's current response | `Escape` |
| Session History | Open Session Browser | `Ctrl+H` |
| Usage Dashboard | View usage analytics | - |
| Context Viewer | View CLAUDE.md, hooks, MCP | `Ctrl+K` |
| Skills Browser | Browse and manage skills | - |
| Settings | Open Settings panel | `Ctrl+,` |
| Keyboard Shortcuts | View all shortcuts | `Ctrl+?` |

---

## Input Area & File Autocomplete

### Sending Messages

| Action | How |
|--------|-----|
| Send message | `Ctrl+Enter` or click the send button |
| New line | `Enter` (without Ctrl) |

### @ File Autocomplete

Reference files in your project by typing `@`:

1. Type `@` to trigger autocomplete
2. Continue typing to filter files
3. Use **Arrow Up/Down** to navigate
4. Press **Enter** or **Tab** to select
5. Press **Escape** to cancel

**Example:**
```
@src/main  →  Shows: src/main.ts, src/main.css, etc.
```

The autocomplete uses a trie-based index for fast fuzzy matching across your entire project.

### Prompt History

Navigate through your previous messages:

| Action | How |
|--------|-----|
| Previous message | `Arrow Up` (when input is empty) |
| Next message | `Arrow Down` (when viewing history) |

---

## Tool Cards

Tool cards provide rich visualizations of Claude's actions. Each tool type has a specialized card.

### BashCard (Terminal Commands)

Displays shell commands and their output.

```
┌─────────────────────────────────────────────────┐
│ $ npm install                          ✓ 0     │
├─────────────────────────────────────────────────┤
│ added 150 packages in 2.3s                      │
│                                                 │
│ 12 packages are looking for funding             │
│   run `npm fund` for details                    │
└─────────────────────────────────────────────────┘
```

| Element | Description |
|---------|-------------|
| Command | The executed command (with $ prefix) |
| Exit Code | ✓ 0 (success) or ✗ 1 (error) |
| Output | Command output with ANSI colors preserved |
| Copy Button | Appears on hover - copy command or output |

### EditCard (File Modifications)

Shows proposed or applied file changes with a diff view.

```
┌─────────────────────────────────────────────────┐
│ 📝 src/utils.ts                    +3 -1       │
├─────────────────────────────────────────────────┤
│   function calculate(x) {                       │
│ -   return x * 2;                               │
│ +   // Apply multiplier                         │
│ +   const multiplier = 3;                       │
│ +   return x * multiplier;                      │
│   }                                             │
├─────────────────────────────────────────────────┤
│ [Accept]  [Reject]  [Open in VS Code]           │
└─────────────────────────────────────────────────┘
```

| Status | Description |
|--------|-------------|
| **Pending** | Waiting for your approval (Accept/Reject buttons visible) |
| **Applied** | Change was accepted and applied |
| **Rejected** | Change was rejected |
| **Conflict** | File changed since edit was proposed |

**YOLO Mode:** When enabled, edits are automatically accepted without confirmation.

**Conflict Resolution:** If a conflict occurs, a modal appears with three-way diff showing:
- Original content
- Current file content
- Proposed changes

### ReadCard (File Reading)

Shows file contents that Claude read.

```
┌─────────────────────────────────────────────────┐
│ 📄 package.json                    Lines 1-25  │
├─────────────────────────────────────────────────┤
│ {                                               │
│   "name": "my-project",                         │
│   "version": "1.0.0",                           │
│   ...                                           │
└─────────────────────────────────────────────────┘
```

| Element | Description |
|---------|-------------|
| File Path | The file that was read |
| Line Range | Which lines were read (if partial) |
| Content | Syntax-highlighted file content |
| Copy Button | Copy file contents |

### GlobGrepCard (File Search)

Shows file search results from Glob or Grep operations.

```
┌─────────────────────────────────────────────────┐
│ 🔍 Grep: "useState"           12 files, 28 matches │
├─────────────────────────────────────────────────┤
│ 📄 src/App.tsx                                  │
│ 📄 src/components/Button.tsx                    │
│ 📄 src/hooks/useAuth.ts                         │
│ ...                                             │
└─────────────────────────────────────────────────┘
```

| Element | Description |
|---------|-------------|
| Pattern | The search pattern used |
| Results Count | Number of matching files and total matches |
| File List | Clickable list of matching files |
| Copy Path | Copy individual file paths |

---

## Session Browser

The Session Browser lets you search, filter, and resume previous sessions.

### Opening Session Browser

| Method | How |
|--------|-----|
| Keyboard | `Ctrl+H` |
| Command Palette | `Ctrl+P` → "Session History" |

### Features

#### Search
Type in the search box to filter sessions by name or content.

#### Filters
Click **Filters** to access advanced filtering:

| Filter | Description |
|--------|-------------|
| Date Range | Filter by start/end date |
| Cost Range | Filter by min/max cost (USD) |
| Prompt Count | Filter by number of messages |
| Tags | Filter by assigned tags |
| Directory | Filter by working directory |

#### Sorting
Click column headers or use the sort dropdown:

| Sort Option | Description |
|-------------|-------------|
| Date (Newest) | Most recent first |
| Date (Oldest) | Oldest first |
| Cost (Highest) | Most expensive first |
| Cost (Lowest) | Cheapest first |
| Prompts | Most messages first |
| Title | Alphabetical |

#### Actions

| Action | How |
|--------|-----|
| Resume Session | Double-click or select + click "Resume" |
| Preview Session | Hover to see first 3 messages |
| Pin Session | Click pin icon (favorites stay at top) |
| Export Session | Click export icon (JSON format) |
| Delete Session | Click delete icon (with confirmation) |
| Multi-select | Check multiple sessions for bulk export |
| Import Sessions | Click "Import" button, select JSON file |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| ↑/↓ | Navigate sessions |
| Enter | Resume selected session |
| Escape | Close browser |

---

## Usage Dashboard

Track your Claude API usage and costs over time.

### Opening Usage Dashboard

| Method | How |
|--------|-----|
| Command Palette | `Ctrl+P` → "Usage Dashboard" |

### Metrics Displayed

| Metric | Description |
|--------|-------------|
| **Total Cost** | Cumulative spend in USD |
| **Sessions** | Number of sessions |
| **Messages** | Total prompts sent |
| **Input Tokens** | Tokens sent to Claude |
| **Output Tokens** | Tokens received from Claude |
| **Avg Duration** | Average session length |

### Charts

| Chart | Description |
|-------|-------------|
| **Cost Over Time** | Daily cost breakdown (line chart) |
| **Messages Over Time** | Daily message count (bar chart) |
| **Cost by Model** | Spending per model (pie chart) |
| **Top Projects** | Highest-cost projects (ranked list) |

### Time Period Selector

| Period | Description |
|--------|-------------|
| Last 24 Hours | Past day |
| Last 7 Days | Past week (default) |
| Last 30 Days | Past month |
| All Time | Complete history |

### Budget Alerts

If you've configured a budget limit, alerts appear when:
- 🟡 **Warning**: Approaching 80% of budget
- 🔴 **Exceeded**: Over budget limit

### Export Options

| Format | Description |
|--------|-------------|
| CSV Records | Individual usage records |
| CSV Summary | Aggregated summary |
| JSON | Full data export |

---

## Context Viewer

View and understand Claude's context: CLAUDE.md files, hooks, and MCP servers.

### Opening Context Viewer

| Method | How |
|--------|-----|
| Keyboard | `Ctrl+K` |
| Command Palette | `Ctrl+P` → "Context Viewer" |

### Tabs

#### CLAUDE.md Tab

Shows project and global CLAUDE.md instruction files.

| Element | Description |
|---------|-------------|
| Project CLAUDE.md | Instructions in your project directory |
| Global CLAUDE.md | Global instructions (~/.claude/CLAUDE.md) |
| Copy Button | Copy file contents |
| Auto-refresh | Updates when files change on disk |

#### Hooks Tab

Lists configured Claude Code hooks.

| Column | Description |
|--------|-------------|
| Event | Hook trigger (pre-commit, post-commit, etc.) |
| Scope | Global or project-specific |
| Status | Enabled/disabled |
| Command | The command that runs |

**CLI Flags Reference** - Quick reference for common CLI options:
- `--yolo` - Auto-accept edits
- `--resume` - Resume previous session
- `--model` - Select model
- `--dangerously-skip-permissions` - Skip permission checks
- And more...

#### MCP Servers Tab

Shows Model Context Protocol server status.

| Column | Description |
|--------|-------------|
| Name | Server name |
| Status | Connected, Connecting, Error, Stopped |
| Scope | Global or project |
| Command | Server command and arguments |

Status indicators:
- 🟢 Connected - Server is running
- 🔵 Connecting - Establishing connection
- 🔴 Error - Connection failed (hover for details)
- ⚪ Stopped - Server not running

#### Settings Tab

Displays current Claude configuration.

| Setting | Description |
|---------|-------------|
| Model | Current model selection |
| Permission Mode | Trust level setting |
| Allowed Tools | Enabled tool categories |
| Disallowed Tools | Blocked tool categories |
| Custom Instructions | Additional instructions if configured |

### Search

Use the search box to filter across all tabs. Match counts are shown per tab.

---

## Skills Browser

Browse, activate, and manage Claude Code skills.

### Opening Skills Browser

| Method | How |
|--------|-----|
| Command Palette | `Ctrl+P` → "Skills Browser" |

### View Modes

| Mode | Description |
|------|-------------|
| **Grid** | Card layout with visual previews |
| **List** | Compact table layout |

### Filtering

#### By Category
- Development
- Writing
- Analysis
- Testing
- Documentation
- DevOps

#### By Status
- All
- Enabled
- Disabled

### Search

Type in the search box to filter by skill name or description.

### Actions

| Action | How |
|--------|-----|
| Enable/Disable | Click toggle on skill card |
| View Details | Click skill card |
| Bulk Select | Check multiple skills |
| Export Skills | Select skills → Click "Export" |
| Import Skills | Click "Import" → Select JSON file |
| Refresh | Click refresh button or `Ctrl+R` |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Ctrl+A | Select all skills |
| Ctrl+Shift+A | Clear selection |
| Ctrl+F | Focus search |
| Ctrl+R | Refresh skills list |
| Ctrl+E | Export selected |
| Ctrl+I | Import skills |
| Escape | Close or clear selection |

---

## Settings

Configure application preferences.

### Opening Settings

| Method | How |
|--------|-----|
| Tab Bar | Click the ⚙ gear icon |
| Keyboard | `Ctrl+,` |
| Command Palette | `Ctrl+P` → "Settings" |

### Available Settings

#### Default Model

Select the default Claude model for new sessions:

| Model | Description |
|-------|-------------|
| Claude Sonnet | Balanced performance and cost |
| Claude Opus | Highest capability |
| Claude Haiku | Fastest, most economical |

#### YOLO Mode

Toggle automatic acceptance of file edits.

| State | Behavior |
|-------|----------|
| **On** | All file edits are automatically applied |
| **Off** | Each edit requires manual Accept/Reject |

⚠️ **Warning:** YOLO Mode applies changes without review. Use with caution.

#### Dark Mode

Toggle between dark and light themes.

| Theme | Description |
|-------|-------------|
| Dark | Deep dark theme (default) |
| Light | Light theme |

#### Global Hotkey

Configure the keyboard shortcut to show/hide the app from anywhere.

| Default | `CommandOrControl+Shift+Space` |
|---------|--------------------------------|

Enter a new hotkey combination to change. Format: `Modifier+Key`
- Modifiers: `Ctrl`, `Alt`, `Shift`, `CommandOrControl`
- Example: `Ctrl+Alt+C`

### Settings Persistence

All settings are saved to localStorage and persist between sessions.

---

## Keyboard Shortcuts

### Quick Reference

Press `Ctrl+?` or `Ctrl+/` to view the keyboard shortcuts modal.

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+P` | Open Command Palette |
| `Ctrl+N` | New Session |
| `Ctrl+W` | Close Session |
| `Ctrl+H` | Session Browser |
| `Ctrl+K` | Context Viewer |
| `Ctrl+,` | Settings |
| `Ctrl+?` | Keyboard Shortcuts Help |
| `Ctrl+Tab` | Next Session |
| `Ctrl+Shift+Tab` | Previous Session |
| `Ctrl+1-9` | Jump to Session 1-9 |
| `Escape` | Close modal / Interrupt Claude |

### Input Area

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Send message |
| `@` | Trigger file autocomplete |
| `↑` | Previous prompt (when empty) |
| `↓` | Next prompt (in history) |
| `Enter` | Select autocomplete item |
| `Tab` | Select autocomplete item |
| `Escape` | Close autocomplete |

### Command Palette

| Shortcut | Action |
|----------|--------|
| `↑/↓` | Navigate commands |
| `Enter` | Execute command |
| `Escape` | Close palette |

### Session Browser

| Shortcut | Action |
|----------|--------|
| `↑/↓` | Navigate sessions |
| `Enter` | Resume session |
| `Escape` | Close browser |

### System

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+Space` | Global hotkey (show/hide app) |

---

## System Integration

### System Tray

The app minimizes to the system tray when closed:

| Action | Result |
|--------|--------|
| Click tray icon | Show/hide app window |
| Right-click tray | Opens menu with "New Session" option |

### Global Hotkey

Press `Ctrl+Shift+Space` (or your custom hotkey) from anywhere to:
- Show the app if hidden
- Hide the app if visible
- Focus the app if in background

### VS Code Integration

Click "Open in VS Code" on EditCards to open the file directly in VS Code at the relevant line.

### File Watching

The Context Viewer automatically updates when CLAUDE.md files change on disk.

---

## Troubleshooting

### Common Issues

#### App Won't Start

1. Check if another instance is running
2. Try restarting your computer
3. Check the logs in `~/.claude-gui-companion/logs/`

#### Session Not Responding

1. Click the **Interrupt** button or press `Escape`
2. Check your internet connection
3. Try closing and reopening the session

#### File Autocomplete Not Working

1. Wait for initial file indexing to complete
2. Check that you're in a valid project directory
3. Try refreshing with a new session

#### Global Hotkey Not Working

1. Check if another app is using the same hotkey
2. Try changing the hotkey in Settings
3. Restart the application

#### Edit Conflicts

When you see a conflict on an EditCard:
1. Click the card to open the conflict resolution modal
2. Review the three-way diff
3. Choose to apply the edit or mark as resolved
4. Alternatively, click "Open in Editor" to resolve manually

### Crash Recovery

If the app crashes, on next launch you'll see a recovery dialog:
- Click **Restore** to recover unsaved sessions
- Click **Discard** to start fresh

### Getting Help

- Press `Ctrl+P` → type "help" for help commands
- Visit the GitHub repository for issues and documentation
- Check CLAUDE.md files for project-specific instructions

---

## Appendix

### Data Storage Locations

| Data | Location |
|------|----------|
| Settings | localStorage (browser) |
| Sessions | localStorage (browser) |
| Logs | `~/.claude-gui-companion/logs/` |
| Skills | `~/.claude/commands/` |

### Supported File Types

The @ autocomplete indexes all files in your project except:
- `node_modules/`
- `.git/`
- `dist/`, `build/`, `out/`
- Binary files

### Model Comparison

| Model | Speed | Capability | Cost |
|-------|-------|------------|------|
| Haiku | ⚡⚡⚡ | ⭐⭐ | $ |
| Sonnet | ⚡⚡ | ⭐⭐⭐ | $$ |
| Opus | ⚡ | ⭐⭐⭐⭐ | $$$ |

---

*Claude GUI Companion is not officially affiliated with Anthropic. Claude is a trademark of Anthropic, PBC.*
