/**
 * ThinkingBlock - Collapsible display for Claude's thinking process
 *
 * Features:
 * - Collapsed by default
 * - Dimmed styling to de-emphasize
 * - Preview of first few lines when collapsed
 * - Smooth expand/collapse animation
 */

import { useState, useMemo, memo } from "react";

interface ThinkingBlockProps {
  content: string;
  defaultExpanded?: boolean;
}

function ThinkingBlockComponent({
  content,
  defaultExpanded = false,
}: ThinkingBlockProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Create preview of first ~100 characters
  const preview = useMemo(() => {
    const firstLine = content.split("\n")[0];
    if (firstLine.length <= 100) return firstLine;
    return firstLine.slice(0, 100) + "...";
  }, [content]);

  const lineCount = content.split("\n").length;

  return (
    <div
      className="thinking-block rounded-lg border border-default/50 bg-tertiary/30 overflow-hidden"
      data-testid="thinking-block"
    >
      {/* Header - clickable to toggle */}
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-tertiary/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls="thinking-content"
      >
        {/* Brain icon */}
        <svg
          className="w-4 h-4 text-purple-400 flex-shrink-0"
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

        {/* Label */}
        <span className="text-sm font-medium text-purple-400">Thinking</span>

        {/* Line count */}
        <span className="text-xs text-muted">
          ({lineCount} {lineCount === 1 ? "line" : "lines"})
        </span>

        {/* Preview when collapsed */}
        {!isExpanded && (
          <span className="flex-1 text-xs text-muted truncate ml-2 italic">
            {preview}
          </span>
        )}

        {/* Expand/collapse chevron */}
        <svg
          className={`w-4 h-4 text-muted transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Content - collapsible */}
      <div
        id="thinking-content"
        className={`overflow-hidden transition-all duration-200 ${
          isExpanded ? "max-h-[500px]" : "max-h-0"
        }`}
      >
        <div className="px-3 py-2 border-t border-default/50 overflow-auto max-h-[480px]">
          <pre className="text-sm text-secondary/70 whitespace-pre-wrap font-mono leading-relaxed">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
}

export const ThinkingBlock = memo(ThinkingBlockComponent);
