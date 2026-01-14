/**
 * Skills Browser Types
 *
 * Extended type definitions for the Skills Browser UI
 */

import type { Skill, SkillRule } from "./types";

/**
 * Skill categories for organization
 */
export type SkillCategory =
  | "development"
  | "writing"
  | "analysis"
  | "testing"
  | "documentation"
  | "devops"
  | "uncategorized";

/**
 * View mode for skills display
 */
export type ViewMode = "grid" | "list";

/**
 * Skill parameter definition for configurable skills
 */
export interface SkillParameter {
  name: string;
  type: "string" | "number" | "boolean" | "select";
  description: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  options?: string[]; // For select type
}

/**
 * Extended skill with browser-specific metadata
 */
export interface ExtendedSkill extends Skill {
  id: string; // Unique identifier (same as name)
  category: SkillCategory;
  icon?: string;
  tags?: string[];
  configurable?: boolean;
  parameters?: SkillParameter[];
  autoActivationRules?: SkillRule[];
  usageCount?: number;
  lastUsed?: number;
  documentation?: string; // Full markdown documentation
}

/**
 * Skill configuration for parameterized skills
 */
export interface SkillConfiguration {
  skillId: string;
  parameters: Record<string, string | number | boolean>;
  enabled: boolean;
  autoActivate: boolean;
}

/**
 * Filter criteria for skills
 */
export interface SkillFilter {
  categories?: SkillCategory[];
  enabled?: boolean;
  configurable?: boolean;
  tags?: string[];
  searchQuery?: string;
}

/**
 * Sort options for skills
 */
export type SkillSortBy = "name" | "category" | "usage" | "recent";
export type SkillSortOrder = "asc" | "desc";

export interface SkillSort {
  by: SkillSortBy;
  order: SkillSortOrder;
}

/**
 * Skills browser state
 */
export interface SkillsBrowserState {
  skills: ExtendedSkill[];
  selectedSkills: Set<string>; // For bulk operations
  activeSkillId: string | null; // Currently viewing details
  viewMode: ViewMode;
  filter: SkillFilter;
  sort: SkillSort;
  searchQuery: string;
  configurations: Record<string, SkillConfiguration>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Skill import/export format
 */
export interface SkillsExport {
  version: string;
  exportedAt: number;
  configurations: SkillConfiguration[];
  rules: SkillRule[];
}

/**
 * Skill discovery result
 */
export interface SkillDiscoveryResult {
  skills: ExtendedSkill[];
  errors: Array<{ path: string; error: string }>;
}

/**
 * Skill activation event
 */
export interface SkillActivationEvent {
  skillId: string;
  enabled: boolean;
  timestamp: number;
}

/**
 * Bulk operation types
 */
export type BulkOperation = "activate" | "deactivate" | "delete" | "export";

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  operation: BulkOperation;
  successful: string[];
  failed: Array<{ skillId: string; error: string }>;
}
