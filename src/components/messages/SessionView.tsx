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
import { InputArea } from "../input/InputArea";
import { getCLIBridge } from "../../core/cli-bridge";
import { useStore } from "../../core/store";
import { getSkillsManager } from "../../modules/skills";

interface SessionViewProps {
  session: Session;
}

export function SessionView({ session }: SessionViewProps) {
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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Skills activation indicator */}
      {activatedSkills.length > 0 && (
        <div className="px-4 py-2 bg-accent-primary/10 border-b border-default flex items-center gap-2 text-sm">
          <span className="text-accent-primary">⚡</span>
          <span className="text-primary">
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

      {/* Input Area */}
      <InputArea
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
  );
}
