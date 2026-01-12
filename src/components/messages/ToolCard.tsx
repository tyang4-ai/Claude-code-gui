/**
 * ToolCard - Unified tool display component
 *
 * Routes to specialized tool cards based on tool name:
 * - Read: ReadCard with syntax highlighting
 * - Edit/Write: EditCard with diff view
 * - Bash: BashCard with terminal styling
 * - Glob/Grep: GlobGrepCard with file list
 * - Unknown: Generic fallback
 */

import { memo } from "react";
import type { PendingEdit } from "../../core/types";
import { ReadCard } from "../tools/ReadCard";
import { EditCard } from "../tools/EditCard";
import { BashCard } from "../tools/BashCard";
import { GlobGrepCard } from "../tools/GlobGrepCard";

interface ToolCardProps {
  toolName: string;
  toolId: string;
  sessionId: string;
  input: Record<string, unknown>;
  pendingEdit?: PendingEdit;
}

function ToolCardComponent({
  toolName,
  toolId,
  sessionId,
  input,
  pendingEdit,
}: ToolCardProps) {
  const normalizedName = toolName.toLowerCase();

  // Route to specialized cards
  switch (normalizedName) {
    case "read":
      return (
        <ReadCard
          filePath={String(input.file_path || "")}
          content={String(input.content || input.result || "")}
          startLine={input.start_line as number | undefined}
          endLine={input.end_line as number | undefined}
        />
      );

    case "write":
    case "edit":
    case "multiedit":
      return (
        <EditCard
          toolId={toolId}
          sessionId={sessionId}
          filePath={String(input.file_path || "")}
          pendingEdit={pendingEdit}
        />
      );

    case "bash":
      return (
        <BashCard
          command={String(input.command || "")}
          output={String(input.output || input.result || "")}
          exitCode={input.exit_code as number | undefined}
          workingDir={input.working_dir as string | undefined}
        />
      );

    case "glob":
      return (
        <GlobGrepCard
          toolName="Glob"
          pattern={String(input.pattern || "")}
          files={parseFileList(input.files || input.result)}
        />
      );

    case "grep":
      return (
        <GlobGrepCard
          toolName="Grep"
          pattern={String(input.pattern || "")}
          files={parseFileList(input.files || input.result)}
          matchCount={input.match_count as number | undefined}
        />
      );

    default:
      return <FallbackCard toolName={toolName} input={input} />;
  }
}

// Parse file list from various formats
function parseFileList(data: unknown): Array<{ path: string; line?: number; content?: string }> {
  if (!data) return [];

  // Already an array
  if (Array.isArray(data)) {
    return data.map((item) => {
      if (typeof item === "string") {
        return { path: item };
      }
      if (typeof item === "object" && item !== null) {
        return {
          path: String((item as Record<string, unknown>).path || (item as Record<string, unknown>).file || ""),
          line: (item as Record<string, unknown>).line as number | undefined,
          content: (item as Record<string, unknown>).content as string | undefined,
        };
      }
      return { path: String(item) };
    });
  }

  // String (newline-separated)
  if (typeof data === "string") {
    return data
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => ({ path: line.trim() }));
  }

  return [];
}

// Fallback for unknown tools
function FallbackCard({
  toolName,
  input,
}: {
  toolName: string;
  input: Record<string, unknown>;
}) {
  return (
    <div
      className="tool-card fallback-card border border-default rounded-lg overflow-hidden"
      data-testid="fallback-card"
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-tertiary border-b border-default">
        <svg
          className="w-4 h-4 text-secondary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
        <span className="text-sm font-medium text-primary">{toolName}</span>
      </div>
      <div className="p-3 bg-primary/50 max-h-64 overflow-auto">
        <pre className="text-xs text-secondary font-mono whitespace-pre-wrap">
          {JSON.stringify(input, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export const ToolCard = memo(ToolCardComponent);
