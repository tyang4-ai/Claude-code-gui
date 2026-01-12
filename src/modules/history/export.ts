/**
 * Session Export
 *
 * Export sessions to various formats (markdown, JSON, text).
 */

import type { PersistedSession, ExportFormat } from "./types";
import type { ContentBlock } from "../../core/types";

/**
 * Export a session to the specified format
 */
export function exportSession(
  session: PersistedSession,
  format: ExportFormat
): string {
  switch (format) {
    case "markdown":
      return exportToMarkdown(session);
    case "json":
      return exportToJson(session);
    case "text":
      return exportToText(session);
    default:
      return exportToMarkdown(session);
  }
}

/**
 * Export session to Markdown format
 */
function exportToMarkdown(session: PersistedSession): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${session.title}`);
  lines.push("");
  lines.push(`**Project:** ${session.workingDir}`);
  lines.push(`**Model:** ${session.model}`);
  lines.push(`**Date:** ${new Date(session.createdAt).toLocaleString()}`);
  lines.push(`**Prompts:** ${session.promptCount}`);
  if (session.totalCostUsd > 0) {
    lines.push(`**Cost:** $${session.totalCostUsd.toFixed(4)}`);
  }
  if (session.tags.length > 0) {
    lines.push(`**Tags:** ${session.tags.join(", ")}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  // Transcript
  for (const entry of session.transcript) {
    if (entry.role === "user") {
      lines.push("## User");
      lines.push("");
      lines.push(entry.content);
      lines.push("");
    } else if (entry.role === "assistant") {
      lines.push("## Claude");
      lines.push("");
      lines.push(formatAssistantContent(entry.content, "markdown"));
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Export session to JSON format
 */
function exportToJson(session: PersistedSession): string {
  return JSON.stringify(session, null, 2);
}

/**
 * Export session to plain text format
 */
function exportToText(session: PersistedSession): string {
  const lines: string[] = [];

  // Header
  lines.push(`${session.title}`);
  lines.push("=".repeat(session.title.length));
  lines.push("");
  lines.push(`Project: ${session.workingDir}`);
  lines.push(`Model: ${session.model}`);
  lines.push(`Date: ${new Date(session.createdAt).toLocaleString()}`);
  lines.push("");
  lines.push("-".repeat(40));
  lines.push("");

  // Transcript
  for (const entry of session.transcript) {
    if (entry.role === "user") {
      lines.push("[USER]");
      lines.push(entry.content);
      lines.push("");
    } else if (entry.role === "assistant") {
      lines.push("[CLAUDE]");
      lines.push(formatAssistantContent(entry.content, "text"));
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Format assistant content blocks
 */
function formatAssistantContent(
  content: ContentBlock[],
  format: "markdown" | "text"
): string {
  const parts: string[] = [];

  for (const block of content) {
    switch (block.type) {
      case "text":
        parts.push(block.text);
        break;

      case "thinking":
        if (format === "markdown") {
          parts.push(`<details>\n<summary>Thinking</summary>\n\n${block.thinking}\n</details>`);
        } else {
          parts.push(`[Thinking: ${block.thinking.slice(0, 100)}...]`);
        }
        break;

      case "tool_use":
        if (format === "markdown") {
          parts.push(`\n**Tool: ${block.name}**\n\`\`\`json\n${JSON.stringify(block.input, null, 2)}\n\`\`\`\n`);
        } else {
          parts.push(`[Tool: ${block.name}]`);
        }
        break;

      case "tool_result":
        // Tool results are usually shown with their tool use
        break;
    }
  }

  return parts.join("\n");
}

/**
 * Generate a filename for export
 */
export function generateExportFilename(
  session: PersistedSession,
  format: ExportFormat
): string {
  const date = new Date(session.createdAt).toISOString().split("T")[0];
  const safeTitle = session.title
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);

  const extension = format === "markdown" ? "md" : format;
  return `claude-session-${date}-${safeTitle}.${extension}`;
}
