/**
 * UserMessage - Display for user prompts
 */

interface UserMessageProps {
  content: string;
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="px-4 py-3 border-b border-default" data-testid="user-message">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start gap-3">
          {/* User avatar */}
          <div className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-secondary"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          {/* Message content */}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted mb-1">You</div>
            <div className="text-primary whitespace-pre-wrap break-words">
              {content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
