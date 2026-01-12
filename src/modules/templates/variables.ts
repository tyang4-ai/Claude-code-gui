/**
 * Variable Substitution Engine
 *
 * Resolves template variables like {{file}}, {{branch}}, {{clipboard}}
 * into their actual values based on the current context.
 */

import { invoke } from "@tauri-apps/api/core";
import type { VariableContext, TemplateVariable, ResolvedTemplate } from "./types";

/**
 * Variable resolver function type
 */
type VariableResolver = (ctx: VariableContext) => Promise<string>;

/**
 * Built-in variable resolvers
 */
const variableResolvers: Record<string, VariableResolver> = {
  // === Basic Variables ===

  /**
   * Currently selected file path
   */
  file: async (ctx) => ctx.selectedFile || "",

  /**
   * Currently selected text
   */
  selection: async (ctx) => ctx.selectedText || "",

  /**
   * Clipboard contents
   */
  clipboard: async () => {
    try {
      // Use browser API for clipboard (works in Tauri webview)
      return await navigator.clipboard.readText();
    } catch {
      return "";
    }
  },

  /**
   * Project folder name (last segment of working dir)
   */
  project: async (ctx) => {
    const parts = ctx.workingDir.split(/[/\\]/);
    return parts[parts.length - 1] || "";
  },

  /**
   * Full working directory path
   */
  cwd: async (ctx) => ctx.workingDir,

  // === Git Variables ===

  /**
   * Current git branch name
   */
  branch: async (ctx) => {
    try {
      return await invoke<string>("git_current_branch", { dir: ctx.workingDir });
    } catch {
      return "";
    }
  },

  /**
   * Uncommitted git changes (diff)
   */
  diff: async (ctx) => {
    try {
      return await invoke<string>("git_diff", { dir: ctx.workingDir });
    } catch {
      return "";
    }
  },

  /**
   * Git status (short format)
   */
  status: async (ctx) => {
    try {
      return await invoke<string>("git_status", { dir: ctx.workingDir });
    } catch {
      return "";
    }
  },

  /**
   * Staged changes
   */
  staged: async (ctx) => {
    try {
      return await invoke<string>("git_staged", { dir: ctx.workingDir });
    } catch {
      return "";
    }
  },

  // === Context Variables ===

  /**
   * Last error message (from terminal or tests)
   */
  error: async (ctx) => ctx.lastError || "",

  /**
   * Last test output
   */
  test: async (ctx) => ctx.lastTestOutput || "",

  // === Date/Time Variables ===

  /**
   * Current date (YYYY-MM-DD)
   */
  date: async () => new Date().toISOString().split("T")[0],

  /**
   * Current time (HH:MM:SS)
   */
  time: async () => new Date().toTimeString().split(" ")[0],

  /**
   * Current ISO datetime
   */
  datetime: async () => new Date().toISOString(),

  /**
   * Current timestamp (Unix ms)
   */
  timestamp: async () => String(Date.now()),
};

/**
 * Get list of all available variables with descriptions
 */
export function getAvailableVariables(): TemplateVariable[] {
  return [
    // Basic
    { name: "file", description: "Currently selected file path", category: "basic", example: "src/index.ts" },
    { name: "selection", description: "Currently selected text", category: "basic", example: "function hello() {}" },
    { name: "clipboard", description: "Contents of clipboard", category: "basic" },
    { name: "project", description: "Project folder name", category: "basic", example: "my-app" },
    { name: "cwd", description: "Full working directory path", category: "basic", example: "/home/user/projects/my-app" },

    // Git
    { name: "branch", description: "Current git branch", category: "git", example: "main" },
    { name: "diff", description: "Uncommitted git changes", category: "git" },
    { name: "status", description: "Git status output", category: "git" },
    { name: "staged", description: "Staged changes diff", category: "git" },

    // Context
    { name: "error", description: "Last error message", category: "context" },
    { name: "test", description: "Last test output", category: "context" },

    // Time
    { name: "date", description: "Current date (YYYY-MM-DD)", category: "time", example: "2025-01-11" },
    { name: "time", description: "Current time (HH:MM:SS)", category: "time", example: "14:30:00" },
    { name: "datetime", description: "Current ISO datetime", category: "time" },
    { name: "timestamp", description: "Unix timestamp (ms)", category: "time" },
  ];
}

/**
 * Variable pattern for matching {{varName}}
 */
const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * Extract all variable names from a template string
 */
export function extractVariables(template: string): string[] {
  const matches = [...template.matchAll(VARIABLE_PATTERN)];
  const variables = matches.map((m) => m[1]);
  // Deduplicate
  return [...new Set(variables)];
}

/**
 * Substitute all {{variable}} placeholders in a template
 */
export async function substituteVariables(
  template: string,
  context: VariableContext
): Promise<ResolvedTemplate> {
  const usedVariables: string[] = [];
  const unresolvedVariables: string[] = [];

  // Find all variable references
  const matches = [...template.matchAll(VARIABLE_PATTERN)];

  let result = template;

  // Process each variable
  for (const match of matches) {
    const [fullMatch, varName] = match;
    const resolver = variableResolvers[varName];

    if (resolver) {
      try {
        const value = await resolver(context);
        result = result.replace(fullMatch, value);
        if (!usedVariables.includes(varName)) {
          usedVariables.push(varName);
        }
      } catch (e) {
        console.warn(`Failed to resolve variable {{${varName}}}:`, e);
        // Leave the variable in place if resolution fails
        if (!unresolvedVariables.includes(varName)) {
          unresolvedVariables.push(varName);
        }
      }
    } else {
      // Unknown variable
      if (!unresolvedVariables.includes(varName)) {
        unresolvedVariables.push(varName);
      }
    }
  }

  return {
    content: result,
    usedVariables,
    unresolvedVariables,
  };
}

/**
 * Preview variable substitution (with placeholders for slow/missing values)
 */
export function previewVariables(template: string): string {
  return template.replace(VARIABLE_PATTERN, (match, varName) => {
    if (varName in variableResolvers) {
      return `[${varName}]`;
    }
    return match; // Keep unknown variables as-is
  });
}

/**
 * Check if a template contains any variables
 */
export function hasVariables(template: string): boolean {
  return VARIABLE_PATTERN.test(template);
}

/**
 * Validate a template string for syntax errors
 */
export function validateTemplate(template: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for unclosed braces
  const openBraces = (template.match(/\{\{/g) || []).length;
  const closeBraces = (template.match(/\}\}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push("Unmatched braces: number of {{ and }} do not match");
  }

  // Check for unknown variables
  const variables = extractVariables(template);
  const knownVariables = Object.keys(variableResolvers);
  for (const varName of variables) {
    if (!knownVariables.includes(varName)) {
      warnings.push(`Unknown variable: {{${varName}}}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
