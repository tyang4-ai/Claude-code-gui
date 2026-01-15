/**
 * SessionView - Main view for an active session
 *
 * Contains:
 * - Message list with virtual scrolling
 * - Input area for sending prompts
 * - Skills auto-activation
 */

import { useCallback, useEffect, useState } from "react";
import type { Session, ContentBlock, ToolUseContent } from "../../core/types";
import { MessageList } from "./MessageList";
import { InputArea, type InputAreaHandle } from "../input/InputArea";
import { getCLIBridge } from "../../core/cli-bridge";
import { useStore } from "../../core/store";
import { getSkillsManager } from "../../modules/skills";

interface SessionViewProps {
  session: Session;
  inputRef?: React.RefObject<InputAreaHandle | null>;
}

export function SessionView({ session, inputRef }: SessionViewProps) {
  const [activatedSkills, setActivatedSkills] = useState<string[]>([]);

  const appendToTranscript = useStore((state) => state.appendToTranscript);
  const updateLastAssistantMessage = useStore((state) => state.updateLastAssistantMessage);
  const updateSessionStatus = useStore((state) => state.updateSessionStatus);
  const addPendingEdit = useStore((state) => state.addPendingEdit);

  // Set up message subscription for this session
  useEffect(() => {
    const cliBridge = getCLIBridge();

    const subscription = cliBridge.onMessage(session.id).subscribe((message) => {
      switch (message.type) {
        case "message": {
          // Assistant message with content blocks
          if (message.role === "assistant" && Array.isArray(message.content)) {
            const content = message.content as ContentBlock[];

            // Check if we need to start a new assistant entry or update existing
            const lastEntry = session.transcript[session.transcript.length - 1];
            if (lastEntry && lastEntry.role === "assistant") {
              // Update existing assistant message
              updateLastAssistantMessage(session.id, content);
            } else {
              // Start new assistant message
              appendToTranscript(session.id, {
                role: "assistant",
                content: content,
                timestamp: Date.now(),
              });
            }

            // Check for tool_use content blocks and queue edits
            for (const block of content) {
              if (block.type === "tool_use") {
                const toolBlock = block as ToolUseContent;
                if (["Write", "Edit", "MultiEdit"].includes(toolBlock.name)) {
                  const input = toolBlock.input as {
                    file_path?: string;
                    old_string?: string;
                    new_string?: string;
                    content?: string;
                  };

                  addPendingEdit(session.id, {
                    id: toolBlock.id,
                    sessionId: session.id,
                    toolName: toolBlock.name as "Write" | "Edit" | "MultiEdit",
                    filePath: input.file_path || "",
                    originalContent: input.old_string || "",
                    proposedContent: input.new_string || input.content || "",
                    diff: "", // TODO: Compute diff
                    timestamp: Date.now(),
                  });
                }
              }
            }
          }
          break;
        }

        case "content_block_start":
        case "content_block_delta":
        case "content_block_stop":
          // Handle streaming content updates
          // These are handled by updating the last assistant message
          break;

        case "result":
          // Session completed
          updateSessionStatus(session.id, "idle");
          break;

        case "error":
          updateSessionStatus(session.id, "error");
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [session.id, session.transcript, appendToTranscript, updateLastAssistantMessage, updateSessionStatus, addPendingEdit]);

  // Initialize skills manager for this session
  useEffect(() => {
    const skillsManager = getSkillsManager();
    if (!skillsManager.isInitialized()) {
      skillsManager.initialize(session.working_dir).catch(console.error);
    }
  }, [session.working_dir]);

  // Handle interrupt/stop
  const handleInterrupt = useCallback(async () => {
    try {
      const cliBridge = getCLIBridge();
      await cliBridge.sendInterrupt(session.id);
      updateSessionStatus(session.id, "idle");
    } catch (error) {
      console.error("Failed to interrupt session:", error);
    }
  }, [session.id, updateSessionStatus]);

  const handleSubmit = useCallback(async (prompt: string) => {
    const cliBridge = getCLIBridge();
    const skillsManager = getSkillsManager();

    // Process prompt through skills auto-activation
    let finalPrompt = prompt;
    let skills: string[] = [];

    if (skillsManager.isInitialized()) {
      const result = skillsManager.processPrompt({
        prompt,
        workingDir: session.working_dir,
      });
      finalPrompt = result.modifiedPrompt;
      skills = result.activatedSkills;
      setActivatedSkills(skills);

      // Clear skills indicator after 5 seconds
      if (skills.length > 0) {
        setTimeout(() => setActivatedSkills([]), 5000);
      }
    }

    // Add user message to transcript (show original prompt, not with skill prefix)
    appendToTranscript(session.id, {
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    });

    // Update status to thinking
    updateSessionStatus(session.id, "thinking");

    try {
      // Send prompt to CLI (with skill activations prepended if any)
      await cliBridge.sendPrompt(session.id, finalPrompt);
    } catch (error) {
      console.error("Failed to send prompt:", error);
      updateSessionStatus(session.id, "error");
    }
  }, [session.id, session.working_dir, appendToTranscript, updateSessionStatus]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Skills activation indicator */}
      {activatedSkills.length > 0 && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: 'rgba(42, 157, 143, 0.1)',
          borderBottom: '1px solid #2a4a5a',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px'
        }}>
          <span style={{ color: '#2a9d8f' }}>&#9889;</span>
          <span style={{ color: '#e8e8e8' }}>
            Auto-activated: {activatedSkills.join(", ")}
          </span>
        </div>
      )}

      {/* Message List */}
      <MessageList
        sessionId={session.id}
        transcript={session.transcript}
        pendingEdits={session.pendingEdits}
      />

      {/* Input Area with Stop button */}
      <div style={{ position: 'relative' }}>
        {/* Stop button - only show when thinking */}
        {session.status === "thinking" && (
          <div style={{
            position: 'absolute',
            top: '-44px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10
          }}>
            <button
              onClick={handleInterrupt}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: '#e76f51',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#d45d41';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#e76f51';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {/* Stop icon */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
              Stop
            </button>
          </div>
        )}

        <InputArea
          ref={inputRef}
          onSubmit={handleSubmit}
          disabled={session.status === "thinking"}
          workingDir={session.working_dir}
          placeholder={
            session.status === "thinking"
              ? "Claude is thinking..."
              : "Type a message... (Ctrl+Enter to send)"
          }
        />
      </div>
    </div>
  );
}
