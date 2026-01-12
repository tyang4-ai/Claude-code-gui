/**
 * Template Types
 *
 * Types for the prompt template system with variable substitution.
 */

/**
 * A reusable prompt template
 */
export interface Template {
  id: string;
  name: string;
  content: string;
  description?: string;
  scope: "global" | "project";
  projectPath?: string; // Only for project-scoped templates
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
}

/**
 * Template creation input (without auto-generated fields)
 */
export type CreateTemplateInput = Omit<
  Template,
  "id" | "createdAt" | "updatedAt" | "usageCount"
>;

/**
 * Template update input (partial)
 */
export type UpdateTemplateInput = Partial<
  Omit<Template, "id" | "createdAt" | "updatedAt">
>;

/**
 * Available template variables
 */
export interface TemplateVariable {
  name: string;
  description: string;
  category: "basic" | "git" | "context" | "time";
  example?: string;
}

/**
 * Context for variable resolution
 */
export interface VariableContext {
  workingDir: string;
  selectedFile?: string;
  selectedText?: string;
  lastError?: string;
  lastTestOutput?: string;
}

/**
 * Result of variable resolution
 */
export interface ResolvedTemplate {
  content: string;
  usedVariables: string[];
  unresolvedVariables: string[];
}

/**
 * Template storage format for persistence
 */
export interface TemplateStorage {
  version: number;
  templates: Template[];
}

/**
 * Prompt history entry
 */
export interface PromptHistoryEntry {
  id: string;
  prompt: string;
  templateId?: string; // If derived from a template
  timestamp: number;
  workingDir: string;
}

/**
 * Prompt history storage format
 */
export interface PromptHistoryStorage {
  version: number;
  entries: PromptHistoryEntry[];
  maxEntries: number;
}
