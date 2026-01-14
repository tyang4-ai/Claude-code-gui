/**
 * Core types for Claude GUI Companion
 */

// JSON value type for flexible data
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// ============================================================================
// Stream Message Types (from Claude CLI)
// ============================================================================

export interface SystemMessage {
  type: "system";
  session_id?: string;
  [key: string]: JsonValue | undefined;
}

export interface AssistantMessage {
  type: "message";
  role: string;
  content: ContentBlock[];
  [key: string]: JsonValue | ContentBlock[] | undefined;
}

export interface ToolUseMessage {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, JsonValue>;
  [key: string]: JsonValue | Record<string, JsonValue> | undefined;
}

export interface ToolResultMessage {
  type: "tool_result";
  tool_use_id: string;
  content: JsonValue;
  is_error?: boolean;
  [key: string]: JsonValue | undefined;
}

export interface ResultMessage {
  type: "result";
  cost_usd?: number;
  duration_ms?: number;
  [key: string]: JsonValue | undefined;
}

export interface ErrorMessage {
  type: "error";
  error: {
    message: string;
    error_type?: string;
  };
  [key: string]: JsonValue | { message: string; error_type?: string } | undefined;
}

export interface ContentBlockDelta {
  type: "content_block_delta";
  index: number;
  delta: JsonValue;
  [key: string]: JsonValue | undefined;
}

export interface ContentBlockStart {
  type: "content_block_start";
  index: number;
  content_block: JsonValue;
  [key: string]: JsonValue | undefined;
}

export interface ContentBlockStop {
  type: "content_block_stop";
  index: number;
  [key: string]: JsonValue | undefined;
}

export interface UnknownMessage {
  type: "unknown";
  [key: string]: JsonValue | undefined;
}

export type StreamMessage =
  | SystemMessage
  | AssistantMessage
  | ToolUseMessage
  | ToolResultMessage
  | ResultMessage
  | ErrorMessage
  | ContentBlockDelta
  | ContentBlockStart
  | ContentBlockStop
  | UnknownMessage;

// ============================================================================
// Content Block Types
// ============================================================================

export interface TextContent {
  type: "text";
  text: string;
}

export interface ToolUseContent {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContent {
  type: "tool_result";
  tool_use_id: string;
  content: unknown;
  is_error?: boolean;
}

export interface ThinkingContent {
  type: "thinking";
  thinking: string;
}

export type ContentBlock =
  | TextContent
  | ToolUseContent
  | ToolResultContent
  | ThinkingContent;

// ============================================================================
// Session Types
// ============================================================================

export interface SessionConfig {
  working_dir: string;
  model?: string;
  allowed_tools?: string[];
}

export type SessionStatus =
  | "idle"
  | "thinking"
  | "error"
  | "terminated";

export interface SessionInfo {
  id: string;
  claude_session_id?: string; // The actual Claude CLI session ID for --resume
  working_dir: string;
  model: string;
  status: SessionStatus;
  created_at: number;
  prompt_count: number;
  total_cost_usd: number;
  displayName?: string; // Custom user-defined name for the session
  contextTokensUsed?: number; // Current context window usage
  contextTokensTotal?: number; // Total context window size (200K for Opus)
}

export interface Session extends SessionInfo {
  transcript: TranscriptEntry[];
  pendingEdits: PendingEdit[];
}

// ============================================================================
// Transcript Types
// ============================================================================

export interface UserTranscriptEntry {
  role: "user";
  content: string;
  timestamp: number;
}

export interface AssistantTranscriptEntry {
  role: "assistant";
  content: ContentBlock[];
  timestamp: number;
}

export type TranscriptEntry = UserTranscriptEntry | AssistantTranscriptEntry;

// ============================================================================
// Edit Arbiter Types
// ============================================================================

export type EditToolName = "Write" | "Edit" | "MultiEdit";

export interface PendingEdit {
  id: string;
  sessionId: string;
  toolName: EditToolName;
  filePath: string;
  originalContent: string;
  proposedContent: string;
  diff: string;
  timestamp: number;
}

export interface ApplySuccessResult {
  type: "success";
}

export interface ApplyConflictResult {
  type: "conflict";
  current_content: string;
  base_content: string;
  proposed_content: string;
}

export interface ApplyErrorResult {
  type: "error";
  message: string;
}

export type ApplyResult =
  | ApplySuccessResult
  | ApplyConflictResult
  | ApplyErrorResult;

// ============================================================================
// File Types
// ============================================================================

export interface FileReadResult {
  content: string;
  hash: string;
}

export interface FileMetadata {
  size: number;
  modified: number;
  is_dir: boolean;
}
