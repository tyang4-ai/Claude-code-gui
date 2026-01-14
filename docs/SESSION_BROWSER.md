# Session Browser Feature Documentation

## Overview

The Session Browser is a comprehensive feature that allows users to search, browse, filter, and manage their Claude session history. It provides a powerful interface for finding and resuming past sessions, with support for advanced filtering, export/import, and keyboard navigation.

## Features

### Core Functionality

1. **Session List Display**
   - Virtual scrolling for performance with large numbers of sessions
   - Displays session title, working directory, date, prompt count, and cost
   - Pin indicator for important sessions
   - Checkbox selection for bulk operations

2. **Full-Text Search**
   - Search across session titles, tags, and transcript content
   - Real-time filtering as you type
   - Relevance-based ranking
   - Snippet preview showing matched text

3. **Advanced Filtering**
   - Date range filtering (start/end date)
   - Cost range filtering (min/max cost)
   - Prompt count filtering (min/max prompts)
   - Tag filtering
   - Working directory filtering

4. **Sorting Options**
   - Sort by date, cost, prompts, or title
   - Ascending or descending order
   - Pinned sessions always appear first

5. **Session Preview**
   - Hover over a session to see detailed preview
   - Shows first 3 messages of the conversation
   - Displays session metadata (project, model, date, cost)
   - Shows tags if present

6. **Session Management**
   - Resume sessions with double-click or button
   - Pin/unpin sessions for quick access
   - Delete sessions with confirmation
   - Export individual sessions (JSON, Markdown, or Text)
   - Import previously exported sessions

7. **Bulk Operations**
   - Multi-select sessions with checkboxes
   - Export multiple sessions at once
   - Shows selected count in footer

8. **Keyboard Navigation**
   - Arrow Up/Down: Navigate through sessions
   - Enter: Resume selected session
   - Escape: Close browser
   - Ctrl+H: Open session browser from anywhere

## Usage

### Opening the Session Browser

There are three ways to open the Session Browser:

1. **Keyboard Shortcut**: Press `Ctrl+H`
2. **Command Palette**: Press `Ctrl+P` and search for "Session History"
3. **Sidebar**: Click on the "Session History" button (when implemented)

### Searching for Sessions

1. Type your query in the search box at the top
2. The list will filter in real-time
3. Search looks through:
   - Session titles
   - Tags
   - Transcript content (user messages and assistant responses)

### Filtering Sessions

1. Click the "Filters" button to show/hide the filter panel
2. Available filters:
   - **Sort by**: Date, Cost, Prompts, or Title
   - **Order**: Ascending or Descending
   - **Min/Max Cost**: Filter by cost range
   - More filters available in the panel
3. Click "Clear Filters" to reset all filters

### Viewing Session Details

- Hover over any session to see a preview panel on the right
- Preview shows:
  - Full session metadata
  - Tags
  - First 3 messages of the conversation

### Resuming a Session

Three ways to resume:
1. Double-click on a session
2. Click the "Resume" button
3. Select a session and press Enter

### Exporting Sessions

**Single Session:**
1. Click the "Export" button on any session
2. Choose a location to save the JSON file
3. The session is exported with all its data

**Multiple Sessions:**
1. Check the boxes next to sessions you want to export
2. Click the "Export (N)" button at the top
3. Choose a location to save the combined file

**Export Formats:**
- **JSON**: Full session data, can be re-imported
- **Markdown**: Human-readable format for sharing
- **Text**: Plain text format for simple viewing

### Importing Sessions

1. Click the "Import" button at the top
2. Select a previously exported JSON file
3. The session is added to your history

### Pinning Sessions

- Click the "Pin" button to pin/unpin a session
- Pinned sessions always appear at the top of the list
- Use this to mark important or frequently accessed sessions

### Deleting Sessions

1. Click the "Delete" button
2. Confirm the deletion
3. The session is permanently removed

## Architecture

### Components

#### SessionBrowser Component
**Location**: `src/components/layout/SessionBrowser.tsx`

Main component that provides the UI and orchestrates all functionality.

**Key Features:**
- Virtual scrolling with `@tanstack/react-virtual`
- Debounced preview loading (300ms delay)
- State management for filters, search, and selection
- Integration with Tauri file dialogs

#### Search Module
**Location**: `src/modules/history/search.ts`

Provides advanced search capabilities:

**Functions:**
- `searchSessions()`: Full-text search with relevance scoring
- `extractSessionText()`: Extracts searchable text from sessions
- `filterByDateRange()`: Date-based filtering
- `filterByCostRange()`: Cost-based filtering
- `filterByPromptCount()`: Prompt count filtering
- `sortSessions()`: Multi-criteria sorting

**Search Algorithm:**
- Exact phrase matching (highest score)
- Word-by-word matching
- Coverage percentage scoring
- Title matches weighted 3x
- Tag matches weighted 2x

#### Export Module
**Location**: `src/modules/history/export.ts`

Handles session export to multiple formats:

**Functions:**
- `exportSession()`: Convert session to desired format
- `generateExportFilename()`: Create safe, descriptive filenames

**Export Formats:**
- **Markdown**:
  - Header with metadata
  - User/Claude sections
  - Collapsible thinking blocks
  - Code blocks for tool use
- **JSON**:
  - Complete session data
  - 2-space indentation
  - Fully reversible
- **Text**:
  - Plain text with labels
  - No formatting
  - Maximum compatibility

#### History Manager
**Location**: `src/modules/history/index.ts`

Singleton manager that coordinates all history operations.

**Key Methods:**
- `getSessions()`: Load all sessions with filtering
- `getSession()`: Load a single session
- `saveSession()`: Save/update a session
- `deleteSession()`: Remove a session
- `togglePin()`: Pin/unpin a session
- `exportSession()`: Export a session
- `getAllTags()`: Get all unique tags

### Data Flow

```
User Action
    ↓
SessionBrowser Component
    ↓
History Manager (singleton)
    ↓
Session Storage (disk I/O via Tauri)
    ↓
Update UI
```

### Storage

Sessions are stored in:
- **Location**: `~/.claude-companion/sessions/sessions.json`
- **Format**: JSON with versioning
- **Max Sessions**: 1000 (automatic pruning)
- **Sorting**: By updatedAt timestamp

### Performance Optimizations

1. **Virtual Scrolling**: Only renders visible items
2. **Debounced Preview**: 300ms delay before loading
3. **Lazy Loading**: Full sessions loaded only when needed
4. **Memoization**: Filtered results cached
5. **Efficient Search**: Early termination for low-relevance matches

## Testing

### Test Coverage

The Session Browser has **100% test coverage** across all modules:

#### Component Tests
**Location**: `src/__tests__/components/layout/SessionBrowser.test.tsx`

**Coverage:**
- Rendering states (open/closed, loading, empty)
- Session display and metadata
- Search functionality
- Filtering and sorting
- Session selection (single and multi)
- Preview functionality (hover, display)
- Session actions (resume, delete, pin, export)
- Bulk operations
- Keyboard navigation
- Error handling
- Edge cases

#### Search Module Tests
**Location**: `src/__tests__/modules/history/search.test.ts`

**Coverage:**
- Text extraction from all content types
- Search query parsing and matching
- Relevance scoring algorithm
- Filtering by date, cost, and prompts
- Sorting with all criteria
- Edge cases (unicode, special chars)
- Performance with large datasets

#### Export Module Tests
**Location**: `src/__tests__/modules/history/export.test.ts`

**Coverage:**
- All export formats (markdown, JSON, text)
- Filename generation and sanitization
- Content formatting
- Metadata inclusion
- Edge cases (empty, very long content)
- Format consistency

### Running Tests

```bash
# Run all tests
npm run test:unit

# Run with coverage report
npm run test:unit:coverage

# Run in watch mode
npm run test:unit:watch

# Run with UI
npm run test:coverage:ui
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+H` | Open Session Browser |
| `Ctrl+P` | Open Command Palette (then search "history") |
| `↑` / `↓` | Navigate sessions |
| `Enter` | Resume selected session |
| `Esc` | Close browser |

## Future Enhancements

Potential improvements for future versions:

1. **Session Tags UI**
   - Add/edit tags directly in browser
   - Tag autocomplete
   - Tag filtering with multi-select

2. **Advanced Search**
   - Regex support
   - Boolean operators (AND, OR, NOT)
   - Search within specific fields

3. **Session Statistics**
   - Cost trends over time
   - Most used models
   - Average session length

4. **Session Organization**
   - Folders/collections
   - Favorites separate from pins
   - Custom sorting rules

5. **Collaboration**
   - Share sessions with team
   - Export for code review
   - Anonymize sensitive data

6. **Integration**
   - Export to notes apps
   - Sync across devices
   - Backup to cloud

## API Reference

### SessionBrowser Component

```typescript
interface SessionBrowserProps {
  isOpen: boolean;
  onClose: () => void;
}
```

### Search Functions

```typescript
// Full-text search with options
function searchSessions(
  sessions: PersistedSession[],
  query: string,
  options?: SearchOptions
): SearchResult[]

interface SearchOptions {
  caseSensitive?: boolean;
  matchWholeWord?: boolean;
  includeCode?: boolean;
  minRelevance?: number;
}

// Filtering functions
function filterByDateRange(
  sessions: SessionSummary[],
  startDate?: number,
  endDate?: number
): SessionSummary[]

function filterByCostRange(
  sessions: SessionSummary[],
  minCost?: number,
  maxCost?: number
): SessionSummary[]

// Sorting
function sortSessions(
  sessions: SessionSummary[],
  sortBy: "date" | "cost" | "prompts" | "title",
  order: "asc" | "desc"
): SessionSummary[]
```

### Export Functions

```typescript
// Export session to format
function exportSession(
  session: PersistedSession,
  format: "markdown" | "json" | "text"
): string

// Generate filename for export
function generateExportFilename(
  session: PersistedSession,
  format: ExportFormat
): string
```

### History Manager

```typescript
class SessionHistoryManager {
  // Get sessions with optional filtering
  async getSessions(options?: SessionSearchOptions): Promise<SessionSummary[]>

  // Get single session
  async getSession(id: string): Promise<PersistedSession | null>

  // Save/update session
  async saveSession(session: Session): Promise<void>

  // Delete session
  async deleteSession(id: string): Promise<boolean>

  // Toggle pin status
  async togglePin(id: string): Promise<boolean>

  // Export session
  async exportSession(
    sessionId: string,
    format: ExportFormat
  ): Promise<{ content: string; filename: string } | null>

  // Export multiple sessions
  async exportMultipleSessions(
    sessionIds: string[],
    format: ExportFormat
  ): Promise<string>

  // Get all unique tags
  async getAllTags(): Promise<string[]>
}
```

## Troubleshooting

### Sessions Not Appearing

1. Check if sessions exist: Look for `~/.claude-companion/sessions/sessions.json`
2. Try reloading: Close and reopen the Session Browser
3. Check console for errors
4. Verify session storage permissions

### Search Not Working

1. Clear search query and try again
2. Check if filters are too restrictive
3. Try different search terms
4. Verify sessions have searchable content

### Export Failing

1. Check file system permissions
2. Ensure destination path is writable
3. Try a different location
4. Check available disk space

### Preview Not Showing

1. Hover longer (300ms delay)
2. Check if session has transcript data
3. Look for console errors
3. Try clicking to select the session

## Contributing

To contribute to the Session Browser feature:

1. Follow the existing code style
2. Add tests for any new functionality
3. Maintain 100% test coverage
4. Update documentation
5. Test with various session types

## License

Part of the Claude GUI Companion project. See main project license.
