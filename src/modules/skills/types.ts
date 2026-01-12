/**
 * Skills Auto-Activation Types
 *
 * Defines the schema for skill rules and matching results.
 */

export interface SkillRule {
  skillName: string;
  triggers: {
    keywords?: string[];
    intentPatterns?: string[];
    filePatterns?: string[];
  };
  priority: "high" | "medium" | "low";
  enabled?: boolean;
}

export interface SkillRulesConfig {
  rules: SkillRule[];
}

export interface Skill {
  name: string;
  path: string;
  description: string;
  isGlobal: boolean;
  enabled: boolean;
}

export interface SkillMatchResult {
  skill: Skill;
  rule: SkillRule;
  matchedTriggers: string[];
  confidence: number;
}

export interface SkillActivationContext {
  prompt: string;
  workingDir: string;
  openFiles?: string[];
}
