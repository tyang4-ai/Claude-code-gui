---
name: agent-command-palette
description: Implements Command Palette with fuzzy search (Ctrl+P)
priority: P1
skills:
  - test-guardian
  - build-verifier
  - screenshot-verifier
---

# Agent: Command Palette Implementation

## Assigned Tasks
- Build Command Palette UI component
- Implement fuzzy search algorithm
- Create command registry system
- Wire keyboard shortcut (Ctrl+P)
- Add all core commands
- Achieve 100% test coverage

## Context
The Command Palette is a critical power-user feature providing quick access to all application commands via fuzzy search. Similar to VS Code's Ctrl+P.

## Key Files to Create
- `src/components/layout/CommandPalette.tsx` - Main UI
- `src/modules/commands/registry.ts` - Command system
- `src/modules/commands/fuzzy-search.ts` - Search algorithm
- `src/modules/commands/types.ts` - TypeScript definitions
- `src/__tests__/components/CommandPalette.test.tsx` - Tests

## Implementation Requirements
1. Core Features:
   - Fuzzy search (e.g., "ns" matches "New Session")
   - Keyboard navigation (arrow keys, Enter, Escape)
   - Command categories (Session, File, View, Settings)
   - Recent commands at top
   - Keyboard shortcuts displayed

2. Commands to Include:
   - New Session (Ctrl+N)
   - Close Session (Ctrl+W)
   - Switch Session (by name)
   - Toggle Sidebar
   - Open Settings
   - Toggle YOLO Mode
   - Search Sessions
   - Export Session
   - View Usage Dashboard
   - Open MCP Manager

3. UI Design:
   - Modal overlay
   - Search input at top
   - Filtered results below
   - Keyboard shortcut hints
   - Category grouping

## Success Criteria
- [ ] Opens with Ctrl+P globally
- [ ] Fuzzy search works accurately
- [ ] All commands functional
- [ ] Keyboard navigation smooth
- [ ] Recent commands tracked
- [ ] 100% test coverage achieved
- [ ] Screenshots of all states

## Workflow
1. Create command registry system
2. Implement fuzzy search algorithm
3. Build CommandPalette component
4. Style with dark theme
5. Wire keyboard shortcut
6. Add all commands
7. Implement recent commands
8. Write tests
9. Capture screenshots