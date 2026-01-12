/**
 * Glossary
 *
 * Plain-English definitions for Claude Code terminology.
 */

import type { GlossaryTerm } from "./types";

/**
 * Glossary of Claude Code terms
 */
export const GLOSSARY: GlossaryTerm[] = [
  {
    term: "CLAUDE.md",
    definition:
      "A markdown file that provides context and instructions to Claude about your project. " +
      "You can place it in your project root or ~/.claude/ for global instructions.",
    relatedTerms: ["Context", "Instructions"],
    docLink: "https://code.claude.com/docs/memory",
  },
  {
    term: "Hooks",
    definition:
      "Custom commands that run automatically before or after certain Claude actions. " +
      "For example, you can run linting before Claude edits a file.",
    relatedTerms: ["Pre-tool", "Post-tool"],
    docLink: "https://code.claude.com/docs/hooks",
  },
  {
    term: "MCP Server",
    definition:
      "Model Context Protocol servers extend Claude's capabilities with external tools. " +
      "They can provide access to databases, APIs, or custom functionality.",
    relatedTerms: ["Tools", "Extensions"],
    docLink: "https://code.claude.com/docs/mcp",
  },
  {
    term: "Skills",
    definition:
      "Reusable prompt templates that you can invoke with slash commands like /review. " +
      "Skills are markdown files in ~/.claude/commands/ or .claude/commands/.",
    relatedTerms: ["Commands", "Templates"],
    docLink: "https://code.claude.com/docs/skills",
  },
  {
    term: "YOLO Mode",
    definition:
      "A mode that automatically accepts all file edits without asking for confirmation. " +
      "Useful when you trust Claude's changes, but use with caution!",
    relatedTerms: ["Accept Edits", "Auto-approve"],
  },
  {
    term: "Tool",
    definition:
      "An action Claude can take, like reading a file, editing code, or running a command. " +
      "You control which tools Claude can use in your settings.",
    relatedTerms: ["Read", "Edit", "Bash"],
  },
  {
    term: "Session",
    definition:
      "A conversation with Claude. Each session maintains context, so Claude remembers " +
      "what you discussed. You can resume sessions later.",
    relatedTerms: ["Conversation", "Resume"],
  },
  {
    term: "Context",
    definition:
      "Information Claude uses to understand your project - code, files, and your CLAUDE.md. " +
      "More context helps Claude give better answers.",
    relatedTerms: ["CLAUDE.md", "Memory"],
  },
  {
    term: "Stream JSON",
    definition:
      "The format Claude uses to send responses in real-time. " +
      "This allows you to see Claude's response as it's being generated.",
    relatedTerms: ["Streaming", "Response"],
  },
  {
    term: "Cost",
    definition:
      "The API cost for your Claude usage, based on tokens (words) sent and received. " +
      "Different models have different prices.",
    relatedTerms: ["Tokens", "Usage", "Budget"],
  },
  {
    term: "Token",
    definition:
      "A unit of text - roughly 4 characters or about 0.75 words. " +
      "Pricing is based on input tokens (your prompts) and output tokens (Claude's responses).",
    relatedTerms: ["Cost", "Usage"],
  },
  {
    term: "Model",
    definition:
      "The AI model powering Claude. Options include Claude 3 Opus (most capable), " +
      "Sonnet (balanced), and Haiku (fastest, cheapest).",
    relatedTerms: ["Opus", "Sonnet", "Haiku"],
  },
  {
    term: "Opus",
    definition:
      "Claude 3 Opus - the most capable model, best for complex reasoning and coding. " +
      "More expensive but produces higher quality results.",
    relatedTerms: ["Model", "Sonnet", "Haiku"],
  },
  {
    term: "Sonnet",
    definition:
      "Claude 3 Sonnet - balanced model, good for most tasks. " +
      "Recommended for everyday use.",
    relatedTerms: ["Model", "Opus", "Haiku"],
  },
  {
    term: "Haiku",
    definition:
      "Claude 3 Haiku - fastest and cheapest model, good for simple tasks. " +
      "Best when speed matters more than capability.",
    relatedTerms: ["Model", "Opus", "Sonnet"],
  },
  {
    term: "Thinking",
    definition:
      "Claude's internal reasoning process, shown in collapsible blocks. " +
      "Reading this can help you understand how Claude approached a problem.",
    relatedTerms: ["Reasoning", "Chain of Thought"],
  },
  {
    term: "Template",
    definition:
      "A reusable prompt with variable placeholders like {{file}} or {{branch}}. " +
      "Templates save time on repetitive tasks.",
    relatedTerms: ["Variables", "Skills"],
  },
  {
    term: "Interrupt",
    definition:
      "Stop Claude's current response mid-stream. " +
      "Useful when Claude is going in the wrong direction or taking too long.",
    relatedTerms: ["Stop", "Cancel"],
  },
  {
    term: "Diff",
    definition:
      "A view showing what changed in a file - additions in green, deletions in red. " +
      "Review diffs before accepting Claude's edits.",
    relatedTerms: ["Edit", "Changes"],
  },
];

/**
 * Get a glossary term by name
 */
export function getGlossaryTerm(term: string): GlossaryTerm | undefined {
  const lowerTerm = term.toLowerCase();
  return GLOSSARY.find((g) => g.term.toLowerCase() === lowerTerm);
}

/**
 * Search glossary terms
 */
export function searchGlossary(query: string): GlossaryTerm[] {
  const lowerQuery = query.toLowerCase();
  return GLOSSARY.filter(
    (g) =>
      g.term.toLowerCase().includes(lowerQuery) ||
      g.definition.toLowerCase().includes(lowerQuery)
  );
}
