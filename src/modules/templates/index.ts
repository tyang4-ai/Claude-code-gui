/**
 * Template System Module
 *
 * Provides prompt templates with variable substitution.
 * Templates can be global or project-scoped, and support
 * variables like {{file}}, {{branch}}, {{clipboard}}, etc.
 */

import { templateStorage } from "./storage";
import {
  substituteVariables,
  extractVariables,
  hasVariables,
  validateTemplate,
  getAvailableVariables,
  previewVariables,
} from "./variables";
import type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  VariableContext,
  ResolvedTemplate,
  TemplateVariable,
} from "./types";

/**
 * Template Manager - main API for working with templates
 */
export class TemplateManager {
  private static instance: TemplateManager | null = null;

  static getInstance(): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }

  // === Template CRUD ===

  /**
   * Create a new template
   */
  async createTemplate(input: CreateTemplateInput): Promise<Template> {
    return templateStorage.create(input);
  }

  /**
   * Get a template by ID
   */
  async getTemplate(id: string): Promise<Template | null> {
    return templateStorage.get(id);
  }

  /**
   * Get all templates
   */
  async getAllTemplates(options?: {
    scope?: "global" | "project";
    projectPath?: string;
    favoritesFirst?: boolean;
  }): Promise<Template[]> {
    return templateStorage.getAll(options);
  }

  /**
   * Update a template
   */
  async updateTemplate(id: string, updates: UpdateTemplateInput): Promise<Template | null> {
    return templateStorage.update(id, updates);
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<boolean> {
    return templateStorage.delete(id);
  }

  /**
   * Toggle template favorite status
   */
  async toggleFavorite(id: string): Promise<Template | null> {
    return templateStorage.toggleFavorite(id);
  }

  /**
   * Search templates by query
   */
  async searchTemplates(query: string): Promise<Template[]> {
    return templateStorage.search(query);
  }

  /**
   * Duplicate a template
   */
  async duplicateTemplate(id: string, newName?: string): Promise<Template | null> {
    return templateStorage.duplicate(id, newName);
  }

  // === Variable Substitution ===

  /**
   * Apply a template with variable substitution
   */
  async applyTemplate(
    templateOrId: Template | string,
    context: VariableContext
  ): Promise<ResolvedTemplate> {
    let template: Template | null;

    if (typeof templateOrId === "string") {
      template = await templateStorage.get(templateOrId);
      if (!template) {
        throw new Error(`Template not found: ${templateOrId}`);
      }
    } else {
      template = templateOrId;
    }

    // Record usage
    await templateStorage.recordUsage(template.id);

    // Substitute variables
    return substituteVariables(template.content, context);
  }

  /**
   * Substitute variables in arbitrary text
   */
  async substituteText(text: string, context: VariableContext): Promise<ResolvedTemplate> {
    return substituteVariables(text, context);
  }

  /**
   * Preview how variables will be substituted
   */
  previewTemplate(content: string): string {
    return previewVariables(content);
  }

  /**
   * Get list of variables used in a template
   */
  getTemplateVariables(content: string): string[] {
    return extractVariables(content);
  }

  /**
   * Check if text contains variables
   */
  containsVariables(text: string): boolean {
    return hasVariables(text);
  }

  /**
   * Validate template syntax
   */
  validateTemplate(content: string): { valid: boolean; errors: string[]; warnings: string[] } {
    return validateTemplate(content);
  }

  // === Variable Info ===

  /**
   * Get all available template variables
   */
  getAvailableVariables(): TemplateVariable[] {
    return getAvailableVariables();
  }

  // === Import/Export ===

  /**
   * Import templates from JSON
   */
  async importTemplates(data: Template[]): Promise<number> {
    return templateStorage.import(data);
  }

  /**
   * Export all templates
   */
  async exportTemplates(): Promise<Template[]> {
    return templateStorage.export();
  }

  // === Utility ===

  /**
   * Get template count
   */
  async getTemplateCount(): Promise<number> {
    return templateStorage.count();
  }

  /**
   * Force reload templates from disk
   */
  async reload(): Promise<void> {
    return templateStorage.reload();
  }
}

/**
 * Get the TemplateManager singleton
 */
export function getTemplateManager(): TemplateManager {
  return TemplateManager.getInstance();
}

// Re-export types
export type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  VariableContext,
  ResolvedTemplate,
  TemplateVariable,
  PromptHistoryEntry,
} from "./types";

// Re-export variable utilities for direct use
export {
  substituteVariables,
  extractVariables,
  hasVariables,
  validateTemplate,
  getAvailableVariables,
  previewVariables,
} from "./variables";
