# Edit Arbiter UI States

## State Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      Edit Arrives from Claude                 │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  YOLO Mode?   │
                    └───┬───────┬───┘
                        │       │
                 NO ────┘       └──── YES
                 │                    │
                 ▼                    ▼
         ┌──────────────┐     ┌──────────────┐
         │   PENDING    │     │ AUTO-ACCEPT  │
         │              │     │  (in progress)│
         │ [Amber Card] │     └──────┬───────┘
         │ Accept/Reject│            │
         │   Buttons    │            ▼
         └──┬───────┬───┘     ┌──────────────┐
            │       │         │   APPLIED    │
    Reject ─┘       └─Accept  │              │
      │                 │     │ [Green Card] │
      │                 ▼     │  Success ✓   │
      │         ┌──────────┐  └──────────────┘
      │         │File Check│
      │         └────┬─────┘
      │              │
      │     ┌────────┴────────┐
      │     │                 │
      │  Modified?          Clean?
      │     │                 │
      │    YES               NO
      │     │                 │
      │     ▼                 ▼
      │ ┌────────┐    ┌──────────────┐
      │ │CONFLICT│    │   APPLIED    │
      │ │        │    │              │
      │ │[Red    │    │ [Green Card] │
      │ │ Modal] │    │  Success ✓   │
      │ │ 3-way  │    │  Animation   │
      │ │ Diff   │    └──────────────┘
      │ └───┬────┘
      │     │
      │  Manual
      │  Resolve
      │     │
      ▼     ▼
  ┌──────────────┐
  │   REJECTED   │
  │              │
  │ [Removed from│
  │    Queue]    │
  └──────────────┘
```

## Detailed State Descriptions

### 1. PENDING State

**Visual Appearance:**
```
┌─────────────────────────────────────────────────┐
│ 📝 Edit  /path/to/file.ts  +5 / -2  [Pending]  │ ← Amber border
├─────────────────────────────────────────────────┤
│                                                 │
│  Diff content showing changes...                │
│                                                 │
│  [✓ Accept] [✗ Reject] [VS Code Icon] [▼]     │ ← Action buttons
└─────────────────────────────────────────────────┘
```

**Properties:**
- Border: `border-amber-500/50`
- Badge: "Pending" in amber
- Buttons: Accept (green), Reject (red), VS Code
- Diff: Visible and expanded
- Interactive: Yes

**User Actions:**
- Click "Accept" → Transition to APPLYING
- Click "Reject" → Transition to REJECTED
- Click "VS Code" → Opens file in editor
- Click header → Toggle diff visibility

### 2. APPLYING State

**Visual Appearance:**
```
┌─────────────────────────────────────────────────┐
│ 📝 Edit  /path/to/file.ts  +5 / -2  [Pending]  │ ← Amber border
├─────────────────────────────────────────────────┤
│                                                 │
│  Diff content showing changes...                │
│                                                 │
│  [⏳ ...] [✗] [VS Code Icon] [▼]              │ ← Disabled buttons
└─────────────────────────────────────────────────┘
```

**Properties:**
- Border: `border-amber-500/50`
- Badge: "Pending"
- Buttons: Disabled (isApplying = true)
- Text: "..." instead of "Accept"
- Interactive: No (awaiting backend)

**Backend Actions:**
1. Call `arbiter.acceptEdit(toolId)`
2. Invoke Tauri `apply_edit` command
3. Wait for result: success, conflict, or error

### 3. APPLIED State (Success)

**Visual Appearance:**
```
┌─────────────────────────────────────────────────┐
│ 📝 Edit  /path/to/file.ts  +5 / -2  [Applied]  │ ← Green border
├─────────────────────────────────────────────────┤
│                                                 │
│          ┌───────────────────────┐              │
│          │   ✓ Edit applied      │              │ ← 2s animation
│          │   successfully        │              │
│          └───────────────────────┘              │
│                                                 │
│  Diff content showing changes...                │
│                                                 │
│  [VS Code Icon] [▼]                            │ ← No action buttons
└─────────────────────────────────────────────────┘
```

**Properties:**
- Border: `border-green-500/50`
- Badge: "Applied" in green
- Buttons: Only VS Code and collapse
- Animation: Success overlay (2 seconds)
- Interactive: Limited (view only)

**Sequence:**
1. Backend confirms success
2. Show success animation
3. Call `removePendingEdit(sessionId, toolId)`
4. Edit removed from store
5. Animation fades out after 2s

### 4. CONFLICT State

**Visual Appearance:**
```
┌─────────────────────────────────────────────────┐
│ 📝 Edit  /path/to/file.ts  +5 / -2  [Conflict] │ ← Red border
├─────────────────────────────────────────────────┤
│ ⚠️ Conflict: File was modified externally      │ ← Warning banner
├─────────────────────────────────────────────────┤
│                                                 │
│  Diff content showing changes...                │
│                                                 │
└─────────────────────────────────────────────────┘

        ┌──────────────────────────────────────┐
        │  ⚠️ Merge Conflict Detected     [✗] │ ← Modal overlay
        ├──────────────────────────────────────┤
        │ The file /path/to/file.ts has been  │
        │ modified externally...               │
        │                                      │
        │ ┌────────────────────────────────┐  │
        │ │ Base (Original)                 │  │
        │ │ const x = 1;                    │  │
        │ └────────────────────────────────┘  │
        │                                      │
        │ ┌────────────────────────────────┐  │
        │ │ Current (In File) ⚠️           │  │
        │ │ const x = 2; // modified        │  │
        │ └────────────────────────────────┘  │
        │                                      │
        │ ┌────────────────────────────────┐  │
        │ │ Proposed (From Edit)            │  │
        │ │ const x = 3;                    │  │
        │ └────────────────────────────────┘  │
        │                                      │
        │ Resolution Steps:                    │
        │ 1. Open file in editor               │
        │ 2. Manually merge changes            │
        │ 3. Save file                         │
        │ 4. Mark as resolved                  │
        │                                      │
        │ [Open in Editor] [Mark as Resolved] │
        └──────────────────────────────────────┘
```

**Properties:**
- Border: `border-red-500/50`
- Badge: "Conflict" in red
- Modal: Visible with three-way diff
- Warning: Clear explanation
- Buttons: "Open in Editor", "Mark as Resolved"

**User Actions:**
1. Click "Open in Editor" → VS Code opens
2. Manually merge conflicts
3. Save file in editor
4. Click "Mark as Resolved" → Transition to REJECTED
5. Or click [✗] or overlay → Close modal

### 5. ERROR State

**Visual Appearance:**
```
┌─────────────────────────────────────────────────┐
│ 📝 Edit  /path/to/file.ts  +5 / -2  [Error]    │ ← Red border
├─────────────────────────────────────────────────┤
│ ⚠️ Error: Permission denied - cannot write     │ ← Error banner
│    to file                                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  Diff content showing changes...                │
│                                                 │
│  [VS Code Icon] [▼]                            │
└─────────────────────────────────────────────────┘
```

**Properties:**
- Border: `border-red-500/50`
- Badge: "Error" in red
- Banner: Error message displayed
- Buttons: Only VS Code and collapse
- Interactive: Limited (view only)

**Common Errors:**
- File not found
- Permission denied
- Disk full
- Network error (if remote file)

### 6. REJECTED State

**Visual Appearance:**
```
(Component removed from DOM)
```

**Properties:**
- Not displayed
- Removed from pending edits queue
- Logged in audit trail
- No visual representation

**Sequence:**
1. User clicks "Reject"
2. Call `arbiter.rejectEdit(toolId)`
3. Call `removePendingEdit(sessionId, toolId)`
4. Component unmounts
5. Edit removed from store

## State Transitions

### From PENDING

| Action | Target State | Condition |
|--------|--------------|-----------|
| Click Accept | APPLYING | Always |
| Click Reject | REJECTED | Always |
| YOLO Mode | AUTO-ACCEPT | On mount if yoloMode=true |

### From APPLYING

| Result | Target State | Condition |
|--------|--------------|-----------|
| Success | APPLIED | `result.type === "success"` |
| Conflict | CONFLICT | `result.type === "conflict"` |
| Error | ERROR | `result.type === "error"` |

### From APPLIED

| Action | Target State | Condition |
|--------|--------------|-----------|
| Auto | REMOVED | After 2s animation |

### From CONFLICT

| Action | Target State | Condition |
|--------|--------------|-----------|
| Mark Resolved | REJECTED | User confirms |
| Close Modal | CONFLICT | Modal still visible |

### From ERROR

| Action | Target State | Condition |
|--------|--------------|-----------|
| Manual | REJECTED | User manually removes |

## YOLO Mode Flow

```
┌─────────────┐
│ Edit Arrives│
└──────┬──────┘
       │
       ▼
   yoloMode?
       │
      YES
       │
       ▼
┌──────────────┐
│ useEffect    │
│ triggers     │
│ handleAccept │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Applying... │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Applied    │
│   (2s anim)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Removed    │
└──────────────┘
```

**Key Points:**
- Automatic on mount if `yoloMode === true`
- No user interaction required
- Still shows success animation
- Logged as "auto-accepted" in audit trail
- If error/conflict, falls back to manual

## Animation Timings

| Animation | Duration | Easing | Description |
|-----------|----------|--------|-------------|
| Success overlay | 2000ms | ease-in-out | Fade in/out with checkmark |
| Border color change | Instant | - | State transition |
| Modal fade-in | 200ms | ease-in | Conflict modal appears |
| Button hover | 200ms | ease | Color change on hover |
| Chevron rotation | 200ms | ease | Expand/collapse indicator |

## Color Palette

### State Colors

| State | Border | Badge | Background |
|-------|--------|-------|------------|
| Pending | `amber-500/50` | `amber-400` on `amber-500/20` | Default |
| Applied | `green-500/50` | `green-400` on `green-500/20` | Default |
| Conflict | `red-500/50` | `red-400` on `red-500/20` | Default |
| Error | `red-500/50` | `red-400` on `red-500/20` | Default |

### Diff Colors

| Type | Text | Background |
|------|------|------------|
| Addition | `green-400` | `green-900/20` |
| Deletion | `red-400` | `red-900/20` |
| Context | `secondary` | None |
| Hunk | `cyan-400` | `cyan-900/10` |
| Meta | `muted` | None |

### Button Colors

| Type | Background | Hover | Text |
|------|------------|-------|------|
| Accept | `green-600` | `green-700` | White |
| Reject | `red-600` | `red-700` | White |
| VS Code | `primary/20` | `primary/30` | Secondary |

## Accessibility States

### ARIA Labels

```html
<!-- Pending state -->
<div role="region" aria-label="Pending edit for /path/to/file.ts">
  <button aria-label="Accept changes">Accept</button>
  <button aria-label="Reject changes">Reject</button>
</div>

<!-- Applied state -->
<div role="status" aria-label="Edit applied successfully">
  <span aria-live="polite">Applied</span>
</div>

<!-- Conflict state -->
<div role="alertdialog" aria-label="Merge conflict detected">
  <h3 id="conflict-title">Merge Conflict Detected</h3>
  <div aria-describedby="conflict-title">
    <!-- Conflict content -->
  </div>
</div>
```

### Keyboard Navigation

| State | Key | Action |
|-------|-----|--------|
| Pending | Tab | Focus Accept button |
| Pending | Shift+Tab | Focus Reject button |
| Pending | Enter | Activate focused button |
| Modal | Escape | Close modal |
| Modal | Tab | Cycle through buttons |

## Mobile Considerations

While primarily a desktop app, responsive considerations:

- Touch targets: Minimum 44×44px
- Modal: Full-screen on small viewports
- Buttons: Stacked vertically on narrow screens
- Diff: Horizontal scroll for long lines
- Stats: May wrap on small screens

## Edge Cases

### Empty Diff
```
┌─────────────────────────────────────────────────┐
│ 📝 Edit  /path/to/file.ts  +0 / -0  [Pending]  │
├─────────────────────────────────────────────────┤
│ (No changes to display)                         │
└─────────────────────────────────────────────────┘
```

### Very Long File Path
```
┌─────────────────────────────────────────────────┐
│ 📝 Edit  /very/long/path/.../file.ts  [Pending]│ ← Truncated
└─────────────────────────────────────────────────┘
```

### Large Diff
```
┌─────────────────────────────────────────────────┐
│ 📝 Edit  /file.ts  +1000 / -500  [Pending]     │
├─────────────────────────────────────────────────┤
│ ▲                                               │
│ │ Scrollable area with max-height             │
│ │ Virtual scrolling for performance            │
│ ▼                                               │
└─────────────────────────────────────────────────┘
```

## Testing All States

To test each state manually:

1. **PENDING**: Create edit in normal mode
2. **APPLYING**: Click Accept and observe
3. **APPLIED**: Wait for success result
4. **CONFLICT**: Modify file externally, then accept
5. **ERROR**: Try to edit read-only file
6. **REJECTED**: Click Reject button
7. **YOLO**: Enable YOLO mode, create edit

## State Persistence

| State | Persisted? | Storage |
|-------|------------|---------|
| Pending | Yes | Session storage |
| Applying | No | Memory only |
| Applied | No | Removed from storage |
| Conflict | No | Modal state only |
| Error | No | Display only |
| Rejected | No | Removed from storage |

**Note:** Only pending edits are persisted. Once accepted, rejected, or errored, they are removed from storage.

---

This state diagram and documentation ensures complete understanding of all UI states and transitions in the Edit Arbiter system.
