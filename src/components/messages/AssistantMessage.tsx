/**
 * AssistantMessage - Display for Claude's responses
 *
 * Handles different content types:
 * - Text (with markdown)
 * - Tool use (Read, Edit, Bash, etc.)
 * - Thinking blocks (collapsible)
 */

import type { ContentBlock, PendingEdit } from "../../core/types";
import { ToolCard } from "./ToolCard";
import { ThinkingBlock } from "./ThinkingBlock";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface AssistantMessageProps {
  sessionId: string;
  content: ContentBlock[];
  pendingEdits: PendingEdit[];
}

export function AssistantMessage({ sessionId, content, pendingEdits }: AssistantMessageProps) {
  return (
    <div
      className="px-4 py-3 bg-secondary/30 border-b border-default"
      data-testid="assistant-message"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start gap-3">
          {/* Claude avatar */}
          <div className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-accent-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>

          {/* Message content */}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted mb-1">Claude</div>
            <div className="space-y-3">
              {content.map((block, index) => (
                <ContentBlockRenderer
                  key={index}
                  sessionId={sessionId}
                  block={block}
                  pendingEdits={pendingEdits}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ContentBlockRendererProps {
  sessionId: string;
  block: ContentBlock;
  pendingEdits: PendingEdit[];
}

function ContentBlockRenderer({ sessionId, block, pendingEdits }: ContentBlockRendererProps) {
  switch (block.type) {
    case "text":
      return <MarkdownRenderer content={block.text} />;

    case "thinking":
      return <ThinkingBlock content={block.thinking} />;

    case "tool_use":
      return (
        <ToolCard
          toolName={block.name}
          toolId={block.id}
          sessionId={sessionId}
          input={block.input}
          pendingEdit={pendingEdits.find((e) => e.id === block.id)}
        />
      );

    case "tool_result":
      // Tool results are usually shown inline with their tool use
      return null;

    default:
      return (
        <div className="p-3 bg-tertiary rounded text-sm font-mono" data-testid="fallback-card">
          <pre className="overflow-x-auto">
            {JSON.stringify(block, null, 2)}
          </pre>
        </div>
      );
  }
}
