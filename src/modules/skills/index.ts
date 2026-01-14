/**
 * Skills Auto-Activation Module
 *
 * Discovers and manages Claude Code skills (slash commands),
 * enabling automatic activation based on configurable rules.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  Skill,
  SkillRule,
  SkillRulesConfig,
  SkillMatchResult,
  SkillActivationContext,
} from "./types";
import {
  matchRules,
  generateActivationPrefix,
  getActivatedSkillNames,
} from "./rule-matcher";

// Singleton instance
let skillsManagerInstance: SkillsManager | null = null;

const DEFAULT_RULES_CONFIG: SkillRulesConfig = {
  rules: [
    {
      skillName: "backend-dev-guidelines",
      triggers: {
        keywords: ["backend", "API", "database", "route", "controller", "model"],
        intentPatterns: ["(create|add|fix|update).*?(endpoint|route|controller|API)"],
        filePatterns: ["backend/**/*.ts", "**/prisma/**", "**/api/**"],
      },
      priority: "high",
    },
    {
      skillName: "frontend-dev-guidelines",
      triggers: {
        keywords: ["frontend", "component", "UI", "CSS", "style", "React", "Vue"],
        intentPatterns: ["(create|add|fix|update).*?(component|page|layout)"],
        filePatterns: ["frontend/**/*.tsx", "src/components/**", "**/pages/**"],
      },
      priority: "high",
    },
    {
      skillName: "test-guidelines",
      triggers: {
        keywords: ["test", "testing", "spec", "unit test", "e2e", "integration"],
        intentPatterns: ["(write|add|create|fix).*?test"],
        filePatterns: ["**/*.test.ts", "**/*.spec.ts", "**/tests/**"],
      },
      priority: "medium",
    },
  ],
};

export class SkillsManager {
  private skills: Map<string, Skill> = new Map();
  private rules: SkillRule[] = [];
  private rulesConfigPath: string | null = null;
  private initialized = false;

  static getInstance(): SkillsManager {
    if (!skillsManagerInstance) {
      skillsManagerInstance = new SkillsManager();
    }
    return skillsManagerInstance;
  }

  /**
   * Initialize the skills manager
   */
  async initialize(workingDir: string): Promise<void> {
    if (this.initialized) return;

    await this.discoverSkills(workingDir);
    await this.loadRules(workingDir);
    this.initialized = true;
  }

  /**
   * Discover skills from global and project directories
   */
  async discoverSkills(workingDir: string): Promise<void> {
    this.skills.clear();

    // Discover global skills (~/.claude/commands/)
    const globalSkills = await this.discoverSkillsInDir(
      await this.getGlobalCommandsDir(),
      true
    );
    for (const skill of globalSkills) {
      this.skills.set(skill.name, skill);
    }

    // Discover project skills (.claude/commands/)
    const projectSkills = await this.discoverSkillsInDir(
      `${workingDir}/.claude/commands`,
      false
    );
    for (const skill of projectSkills) {
      this.skills.set(skill.name, skill);
    }
  }

  private async getGlobalCommandsDir(): Promise<string> {
    // Get home directory from Tauri backend
    try {
      const homeDir = await invoke<string>("get_home_dir");
      return `${homeDir}/.claude/commands`;
    } catch {
      // Fallback - use empty path (skills discovery will fail gracefully)
      return "";
    }
  }

  private async discoverSkillsInDir(
    dir: string,
    isGlobal: boolean
  ): Promise<Skill[]> {
    const skills: Skill[] = [];

    try {
      const files = await invoke<string[]>("list_files", {
        path: dir,
        pattern: "*.md",
      });

      for (const file of files) {
        const skill = await this.parseSkillFile(file, isGlobal);
        if (skill) {
          skills.push(skill);
        }
      }
    } catch (error) {
      // Directory might not exist, which is fine
      console.debug(`Skills directory not found: ${dir}`);
    }

    return skills;
  }

  private async parseSkillFile(
    path: string,
    isGlobal: boolean
  ): Promise<Skill | null> {
    try {
      const content = await invoke<string>("read_file", { path });
      const lines = content.split("\n");

      // Extract skill name from filename
      const filename = path.split(/[/\\]/).pop() || "";
      const name = filename.replace(/\.md$/, "");

      // Extract description from first line (or first non-empty line)
      let description = "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          description = trimmed;
          break;
        } else if (trimmed.startsWith("# ")) {
          description = trimmed.substring(2);
          break;
        }
      }

      return {
        name,
        path,
        description: description || `Skill: ${name}`,
        isGlobal,
        enabled: true,
      };
    } catch (error) {
      console.warn(`Failed to parse skill file: ${path}`, error);
      return null;
    }
  }

  /**
   * Load skill rules from config file
   */
  async loadRules(workingDir: string): Promise<void> {
    const rulesConfigPath = `${workingDir}/.claude/skill-rules.json`;

    try {
      const content = await invoke<string>("read_file", { path: rulesConfigPath });
      const config: SkillRulesConfig = JSON.parse(content);
      this.rules = config.rules;
      this.rulesConfigPath = rulesConfigPath;
    } catch {
      // Use default rules if no config file exists
      this.rules = DEFAULT_RULES_CONFIG.rules;
      this.rulesConfigPath = null;
    }
  }

  /**
   * Save skill rules to config file
   */
  async saveRules(workingDir: string): Promise<void> {
    const rulesConfigPath = `${workingDir}/.claude/skill-rules.json`;
    const config: SkillRulesConfig = { rules: this.rules };

    await invoke("write_file_atomic", {
      path: rulesConfigPath,
      content: JSON.stringify(config, null, 2),
    });

    this.rulesConfigPath = rulesConfigPath;
  }

  /**
   * Match prompt against rules and return activated skills
   */
  matchPrompt(context: SkillActivationContext): SkillMatchResult[] {
    return matchRules(context, this.rules, this.skills);
  }

  /**
   * Process a prompt and return modified prompt with skill activations
   */
  processPrompt(context: SkillActivationContext): {
    modifiedPrompt: string;
    activatedSkills: string[];
  } {
    const matches = this.matchPrompt(context);
    const prefix = generateActivationPrefix(matches);
    const activatedSkills = getActivatedSkillNames(matches);

    return {
      modifiedPrompt: prefix + context.prompt,
      activatedSkills,
    };
  }

  /**
   * Get all discovered skills
   */
  getSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get all rules
   */
  getRules(): SkillRule[] {
    return [...this.rules];
  }

  /**
   * Add a new rule
   */
  addRule(rule: SkillRule): void {
    this.rules.push(rule);
  }

  /**
   * Update an existing rule
   */
  updateRule(index: number, rule: SkillRule): void {
    if (index >= 0 && index < this.rules.length) {
      this.rules[index] = rule;
    }
  }

  /**
   * Remove a rule
   */
  removeRule(index: number): void {
    if (index >= 0 && index < this.rules.length) {
      this.rules.splice(index, 1);
    }
  }

  /**
   * Toggle skill enabled state
   */
  toggleSkill(skillName: string, enabled: boolean): void {
    const skill = this.skills.get(skillName);
    if (skill) {
      skill.enabled = enabled;
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the path to the rules config file (null if using defaults)
   */
  getRulesConfigPath(): string | null {
    return this.rulesConfigPath;
  }

  /**
   * Reset for testing
   */
  reset(): void {
    this.skills.clear();
    this.rules = [];
    this.rulesConfigPath = null;
    this.initialized = false;
  }
}

/**
 * Get the SkillsManager singleton instance
 */
export function getSkillsManager(): SkillsManager {
  return SkillsManager.getInstance();
}

// Re-export types and modules
export * from "./types";
export * from "./browser-types";
export { matchRules, generateActivationPrefix, getActivatedSkillNames } from "./rule-matcher";

// Re-export browser functionality
export {
  useSkillsBrowser,
  selectFilteredSkills,
  selectActiveSkill,
  selectSkillsByCategory,
  selectEnabledSkillsCount,
  selectSelectedSkillsArray,
} from "./browser";

// Re-export discovery functions
export {
  discoverSkills,
  refreshSkills,
  getSkillById,
  getGlobalSkillsDir,
} from "./discovery";

// Re-export activation functions
export {
  loadConfigurations,
  saveConfigurations,
  toggleSkillActivation,
  updateSkillConfiguration,
  deleteSkillConfiguration,
  getSkillConfiguration,
  bulkToggleSkills,
  bulkDeleteSkills,
  exportSkillConfigurations,
  importSkillConfigurations,
  downloadExport,
  uploadImport,
  recordSkillUsage,
  isSkillEnabled,
  getEnabledSkills,
  getAutoActivatedSkills,
  validateSkillParameters,
  createActivationEvent,
} from "./activation";
