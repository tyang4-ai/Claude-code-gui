/**
 * Skill Activation Management
 *
 * Handles skill activation, deactivation, and configuration
 */

// import { invoke } from "@tauri-apps/api/core"; // TODO: Use for Tauri integration
import type {
  ExtendedSkill,
  SkillConfiguration,
  SkillActivationEvent,
  BulkOperation,
  BulkOperationResult,
  SkillsExport,
} from "./browser-types";
import type { SkillRule } from "./types";

/**
 * Storage key for skill configurations
 */
const STORAGE_KEY = "claude-gui-skill-configurations";

/**
 * Load skill configurations from storage
 */
export function loadConfigurations(): Record<string, SkillConfiguration> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load skill configurations:", error);
  }
  return {};
}

/**
 * Save skill configurations to storage
 */
export function saveConfigurations(
  configurations: Record<string, SkillConfiguration>
): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configurations));
  } catch (error) {
    console.error("Failed to save skill configurations:", error);
  }
}

/**
 * Toggle skill activation
 */
export function toggleSkillActivation(
  skillId: string,
  enabled: boolean,
  configurations: Record<string, SkillConfiguration>
): Record<string, SkillConfiguration> {
  const updated = { ...configurations };

  if (!updated[skillId]) {
    updated[skillId] = {
      skillId,
      parameters: {},
      enabled,
      autoActivate: false,
    };
  } else {
    updated[skillId] = {
      ...updated[skillId],
      enabled,
    };
  }

  saveConfigurations(updated);

  return updated;
}

/**
 * Update skill configuration
 */
export function updateSkillConfiguration(
  skillId: string,
  config: Partial<SkillConfiguration>,
  configurations: Record<string, SkillConfiguration>
): Record<string, SkillConfiguration> {
  const updated = { ...configurations };

  if (!updated[skillId]) {
    updated[skillId] = {
      skillId,
      parameters: {},
      enabled: true,
      autoActivate: false,
    };
  }

  updated[skillId] = {
    ...updated[skillId],
    ...config,
  };

  saveConfigurations(updated);

  return updated;
}

/**
 * Get skill configuration
 */
export function getSkillConfiguration(
  skillId: string,
  configurations: Record<string, SkillConfiguration>
): SkillConfiguration | null {
  return configurations[skillId] || null;
}

/**
 * Delete skill configuration
 */
export function deleteSkillConfiguration(
  skillId: string,
  configurations: Record<string, SkillConfiguration>
): Record<string, SkillConfiguration> {
  const updated = { ...configurations };
  delete updated[skillId];
  saveConfigurations(updated);
  return updated;
}

/**
 * Bulk activate/deactivate skills
 */
export function bulkToggleSkills(
  skillIds: string[],
  enabled: boolean,
  configurations: Record<string, SkillConfiguration>
): BulkOperationResult {
  const operation: BulkOperation = enabled ? "activate" : "deactivate";
  const successful: string[] = [];
  const failed: Array<{ skillId: string; error: string }> = [];

  let updated = { ...configurations };

  for (const skillId of skillIds) {
    try {
      updated = toggleSkillActivation(skillId, enabled, updated);
      successful.push(skillId);
    } catch (error) {
      failed.push({
        skillId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  saveConfigurations(updated);

  return {
    operation,
    successful,
    failed,
  };
}

/**
 * Bulk delete skills
 */
export function bulkDeleteSkills(
  skillIds: string[],
  configurations: Record<string, SkillConfiguration>
): BulkOperationResult {
  const operation: BulkOperation = "delete";
  const successful: string[] = [];
  const failed: Array<{ skillId: string; error: string }> = [];

  let updated = { ...configurations };

  for (const skillId of skillIds) {
    try {
      updated = deleteSkillConfiguration(skillId, updated);
      successful.push(skillId);
    } catch (error) {
      failed.push({
        skillId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  saveConfigurations(updated);

  return {
    operation,
    successful,
    failed,
  };
}

/**
 * Export skill configurations
 */
export function exportSkillConfigurations(
  skillIds: string[],
  configurations: Record<string, SkillConfiguration>,
  rules: SkillRule[]
): SkillsExport {
  const selectedConfigs = skillIds
    .map((id) => configurations[id])
    .filter(Boolean);

  const selectedRules = rules.filter((rule) =>
    skillIds.includes(rule.skillName)
  );

  return {
    version: "1.0.0",
    exportedAt: Date.now(),
    configurations: selectedConfigs,
    rules: selectedRules,
  };
}

/**
 * Import skill configurations
 */
export function importSkillConfigurations(
  exportData: SkillsExport,
  configurations: Record<string, SkillConfiguration>
): {
  configurations: Record<string, SkillConfiguration>;
  rules: SkillRule[];
  imported: number;
} {
  const updated = { ...configurations };
  let imported = 0;

  for (const config of exportData.configurations) {
    updated[config.skillId] = config;
    imported++;
  }

  saveConfigurations(updated);

  return {
    configurations: updated,
    rules: exportData.rules,
    imported,
  };
}

/**
 * Download export as JSON file
 */
export async function downloadExport(
  exportData: SkillsExport,
  filename: string = "skills-export.json"
): Promise<void> {
  try {
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to download export:", error);
    throw error;
  }
}

/**
 * Upload and parse import file
 */
export async function uploadImport(): Promise<SkillsExport> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }

      try {
        const text = await file.text();
        const data = JSON.parse(text) as SkillsExport;

        // Validate export data
        if (!data.version || !data.configurations || !data.rules) {
          throw new Error("Invalid export file format");
        }

        resolve(data);
      } catch (error) {
        reject(error);
      }
    };

    input.click();
  });
}

/**
 * Record skill usage
 */
export function recordSkillUsage(
  skill: ExtendedSkill
): ExtendedSkill {
  return {
    ...skill,
    usageCount: (skill.usageCount || 0) + 1,
    lastUsed: Date.now(),
  };
}

/**
 * Check if skill is enabled
 */
export function isSkillEnabled(
  skillId: string,
  configurations: Record<string, SkillConfiguration>
): boolean {
  const config = configurations[skillId];
  return config ? config.enabled : true; // Default to enabled if no config
}

/**
 * Get all enabled skills
 */
export function getEnabledSkills(
  skills: ExtendedSkill[],
  configurations: Record<string, SkillConfiguration>
): ExtendedSkill[] {
  return skills.filter((skill) => isSkillEnabled(skill.id, configurations));
}

/**
 * Get skills with auto-activation enabled
 */
export function getAutoActivatedSkills(
  skills: ExtendedSkill[],
  configurations: Record<string, SkillConfiguration>
): ExtendedSkill[] {
  return skills.filter((skill) => {
    const config = configurations[skill.id];
    return config && config.autoActivate && config.enabled;
  });
}

/**
 * Create activation event
 */
export function createActivationEvent(
  skillId: string,
  enabled: boolean
): SkillActivationEvent {
  return {
    skillId,
    enabled,
    timestamp: Date.now(),
  };
}

/**
 * Validate skill parameters
 */
export function validateSkillParameters(
  skill: ExtendedSkill,
  parameters: Record<string, string | number | boolean>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!skill.parameters) {
    return { valid: true, errors };
  }

  for (const param of skill.parameters) {
    const value = parameters[param.name];

    // Check required parameters
    if (param.required && (value === undefined || value === null || value === "")) {
      errors.push(`Parameter "${param.name}" is required`);
      continue;
    }

    // Skip validation if optional and not provided
    if (!param.required && (value === undefined || value === null)) {
      continue;
    }

    // Type validation
    if (param.type === "number" && typeof value !== "number") {
      errors.push(`Parameter "${param.name}" must be a number`);
    } else if (param.type === "boolean" && typeof value !== "boolean") {
      errors.push(`Parameter "${param.name}" must be a boolean`);
    } else if (param.type === "select" && param.options) {
      if (!param.options.includes(String(value))) {
        errors.push(
          `Parameter "${param.name}" must be one of: ${param.options.join(", ")}`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
