/**
 * Template Storage Manager
 *
 * Handles persistence and CRUD operations for templates.
 * Stores templates in app data directory using Tauri file commands.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateStorage as TemplateStorageData,
  TemplateCategory,
} from "./types";
import { extractVariables } from "./variables";

const STORAGE_VERSION = 1;
const TEMPLATES_FILENAME = "templates.json";

/**
 * Get the templates storage file path
 */
async function getTemplatesPath(): Promise<string> {
  try {
    const appDataDir = await invoke<string>("get_app_data_dir");
    // Normalize path separators
    const normalized = appDataDir.replace(/\\/g, "/");
    return `${normalized}/${TEMPLATES_FILENAME}`;
  } catch (e) {
    console.error("Failed to get app data dir:", e);
    throw e;
  }
}

/**
 * Template Storage Manager singleton
 */
class TemplateStorageManager {
  private templates: Map<string, Template> = new Map();
  private loaded = false;
  private storagePath: string | null = null;

  /**
   * Load templates from storage
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      this.storagePath = await getTemplatesPath();

      // Check if file exists
      const exists = await invoke<boolean>("file_exists", { path: this.storagePath });
      if (!exists) {
        this.loaded = true;
        return;
      }

      // Read and parse
      const result = await invoke<{ content: string }>("read_file", {
        path: this.storagePath,
      });
      const data: TemplateStorageData = JSON.parse(result.content);

      // Migrate if needed (for future versions)
      if (data.version !== STORAGE_VERSION) {
        console.warn(`Template storage version mismatch: ${data.version} vs ${STORAGE_VERSION}`);
        // Future: add migration logic here
      }

      // Load templates into map
      for (const template of data.templates) {
        // Ensure variables field exists (migration from old format)
        if (!template.variables) {
          template.variables = extractVariables(template.content);
        }
        // Ensure category field exists (migration from old format)
        if (!template.category) {
          template.category = "general";
        }
        this.templates.set(template.id, template);
      }

      this.loaded = true;
    } catch (e) {
      console.error("Failed to load templates:", e);
      this.loaded = true; // Mark as loaded to prevent infinite retries
    }
  }

  /**
   * Save templates to storage
   */
  async save(): Promise<void> {
    if (!this.storagePath) {
      this.storagePath = await getTemplatesPath();
    }

    const data: TemplateStorageData = {
      version: STORAGE_VERSION,
      templates: Array.from(this.templates.values()),
    };

    await invoke("write_file_atomic", {
      path: this.storagePath,
      content: JSON.stringify(data, null, 2),
    });
  }

  /**
   * Create a new template
   */
  async create(input: CreateTemplateInput): Promise<Template> {
    await this.load();

    const now = Date.now();
    const variables = extractVariables(input.content);
    const template: Template = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
      variables,
    };

    this.templates.set(template.id, template);
    await this.save();

    return template;
  }

  /**
   * Get a template by ID
   */
  async get(id: string): Promise<Template | null> {
    await this.load();
    return this.templates.get(id) || null;
  }

  /**
   * Get all templates, optionally filtered by scope and/or category
   */
  async getAll(options?: {
    scope?: "global" | "project";
    projectPath?: string;
    category?: TemplateCategory;
    favoritesFirst?: boolean;
  }): Promise<Template[]> {
    await this.load();

    let templates = Array.from(this.templates.values());

    // Filter by scope
    if (options?.scope === "global") {
      templates = templates.filter((t) => t.scope === "global");
    } else if (options?.scope === "project" && options.projectPath) {
      templates = templates.filter(
        (t) => t.scope === "project" && t.projectPath === options.projectPath
      );
    }

    // Filter by category
    if (options?.category) {
      templates = templates.filter((t) => t.category === options.category);
    }

    // Sort: favorites first, then by usage count (descending)
    templates.sort((a, b) => {
      if (options?.favoritesFirst) {
        if (a.isFavorite !== b.isFavorite) {
          return a.isFavorite ? -1 : 1;
        }
      }
      return b.usageCount - a.usageCount;
    });

    return templates;
  }

  /**
   * Update a template
   */
  async update(id: string, updates: UpdateTemplateInput): Promise<Template | null> {
    await this.load();

    const existing = this.templates.get(id);
    if (!existing) return null;

    // Re-extract variables if content changed
    let variables = existing.variables;
    if (updates.content && updates.content !== existing.content) {
      variables = extractVariables(updates.content);
    }

    const updated: Template = {
      ...existing,
      ...updates,
      variables,
      updatedAt: Date.now(),
    };

    this.templates.set(id, updated);
    await this.save();

    return updated;
  }

  /**
   * Delete a template
   */
  async delete(id: string): Promise<boolean> {
    await this.load();

    const deleted = this.templates.delete(id);
    if (deleted) {
      await this.save();
    }
    return deleted;
  }

  /**
   * Record template usage (increment counter)
   */
  async recordUsage(id: string): Promise<void> {
    await this.load();

    const template = this.templates.get(id);
    if (template) {
      template.usageCount++;
      template.updatedAt = Date.now();
      await this.save();
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string): Promise<Template | null> {
    await this.load();

    const template = this.templates.get(id);
    if (!template) return null;

    template.isFavorite = !template.isFavorite;
    template.updatedAt = Date.now();
    await this.save();

    return template;
  }

  /**
   * Search templates by name or content
   */
  async search(query: string): Promise<Template[]> {
    await this.load();

    const lowerQuery = query.toLowerCase();
    return Array.from(this.templates.values()).filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.content.toLowerCase().includes(lowerQuery) ||
        t.description?.toLowerCase().includes(lowerQuery) ||
        t.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Duplicate a template
   */
  async duplicate(id: string, newName?: string): Promise<Template | null> {
    await this.load();

    const original = this.templates.get(id);
    if (!original) return null;

    const now = Date.now();
    const duplicate: Template = {
      ...original,
      id: crypto.randomUUID(),
      name: newName || `${original.name} (copy)`,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
      isFavorite: false,
    };

    this.templates.set(duplicate.id, duplicate);
    await this.save();

    return duplicate;
  }

  /**
   * Import templates from JSON
   */
  async import(data: Template[]): Promise<number> {
    await this.load();

    let imported = 0;
    const now = Date.now();

    for (const template of data) {
      // Generate new ID to avoid conflicts
      const importedTemplate: Template = {
        ...template,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        // Ensure variables are extracted
        variables: template.variables || extractVariables(template.content),
        // Ensure category exists
        category: template.category || "general",
      };
      this.templates.set(importedTemplate.id, importedTemplate);
      imported++;
    }

    await this.save();
    return imported;
  }

  /**
   * Export all templates to JSON
   */
  async export(): Promise<Template[]> {
    await this.load();
    return Array.from(this.templates.values());
  }

  /**
   * Clear all templates
   */
  async clear(): Promise<void> {
    this.templates.clear();
    await this.save();
  }

  /**
   * Get template count
   */
  async count(): Promise<number> {
    await this.load();
    return this.templates.size;
  }

  /**
   * Check if storage is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Force reload from disk
   */
  async reload(): Promise<void> {
    this.loaded = false;
    this.templates.clear();
    await this.load();
  }

  /**
   * Get all unique categories currently in use
   */
  async getUsedCategories(): Promise<TemplateCategory[]> {
    await this.load();
    const categories = new Set<TemplateCategory>();
    for (const template of this.templates.values()) {
      categories.add(template.category);
    }
    return Array.from(categories);
  }
}

// Singleton instance
export const templateStorage = new TemplateStorageManager();
