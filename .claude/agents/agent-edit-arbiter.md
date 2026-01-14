---
name: agent-edit-arbiter
description: Completes Edit Arbiter UI with Accept/Reject workflow
priority: P1
skills:
  - test-guardian
  - build-verifier
  - screenshot-verifier
---

# Agent: Edit Arbiter UI Implementation

## Assigned Tasks
- Complete Accept/Reject button UI
- Wire buttons to edit arbiter logic
- Implement diff viewer with syntax highlighting
- Add conflict resolution UI
- Implement YOLO mode integration
- Achieve 100% test coverage

## Context
The Edit Arbiter manages the critical workflow of reviewing and applying code changes suggested by Claude. Must provide clear UI for:
- Viewing proposed changes (diffs)
- Accepting edits (apply to files)
- Rejecting edits (discard changes)
- YOLO mode (auto-accept when enabled)
- Conflict resolution (file changed externally)

## Key Files
- `src/components/tools/EditCard.tsx` - Main edit UI
- `src/core/edit-arbiter/index.ts` - Core logic (95% coverage exists)
- `src/components/tools/DiffViewer.tsx` - To be created
- `src/__tests__/components/tools/EditCard.test.tsx` - Tests

## Implementation Requirements
1. UI Components:
   - Accept button (green, prominent)
   - Reject button (red, clear warning)
   - Diff viewer with syntax highlighting
   - File path display
   - Conflict warning when applicable

2. Interactions:
   - Accept → Apply edit → Update status → Show success
   - Reject → Discard edit → Update status → Show rejection
   - YOLO mode → Auto-accept without user interaction

3. Visual Design:
   - Clear visual hierarchy
   - Color-coded diff (additions green, deletions red)
   - Loading states during operations
   - Success/error feedback

## Success Criteria
- [ ] Accept/Reject buttons functional
- [ ] Diff viewer shows changes clearly
- [ ] YOLO mode works correctly
- [ ] Conflict resolution UI implemented
- [ ] 100% test coverage achieved
- [ ] Screenshots document all states

## Workflow
1. Review existing EditCard component
2. Add Accept/Reject button UI
3. Create DiffViewer component
4. Wire buttons to edit-arbiter logic
5. Implement success/error feedback
6. Add conflict resolution modal
7. Test YOLO mode integration
8. Write comprehensive tests
9. Capture UI screenshots