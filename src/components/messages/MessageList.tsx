/**
 * MessageList - Virtual scrolling message display
 *
 * Uses @tanstack/react-virtual for efficient rendering of long conversations.
 */

import { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { TranscriptEntry, PendingEdit } from "../../core/types";
import { UserMessage } from "./UserMessage";
import { AssistantMessage } from "./AssistantMessage";

interface MessageListProps {
  sessionId: string;
  transcript: TranscriptEntry[];
  pendingEdits: PendingEdit[];
}

export function MessageList({ sessionId, transcript, pendingEdits }: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: transcript.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated message height
    overscan: 5,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (transcript.length > 0) {
      virtualizer.scrollToIndex(transcript.length - 1, {
        align: "end",
        behavior: "smooth",
      });
    }
  }, [transcript.length, virtualizer]);

  if (transcript.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center text-muted"
        data-testid="message-list"
      >
        <p>No messages yet. Start a conversation!</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-auto"
      data-testid="message-list"
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const entry = transcript[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              data-testid="message-row"
              className="absolute top-0 left-0 w-full"
              style={{
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {entry.role === "user" ? (
                <UserMessage content={entry.content} />
              ) : (
                <AssistantMessage
                  sessionId={sessionId}
                  content={entry.content}
                  pendingEdits={pendingEdits}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
