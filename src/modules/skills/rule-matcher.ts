/**
 * Skills Rule Matcher
 *
 * Matches user prompts against skill rules to determine
 * which skills should be auto-activated.
 */

import type {
  SkillRule,
  Skill,
  SkillMatchResult,
  SkillActivationContext,
} from "./types";

/**
 * Match a prompt against a set of skill rules
 */
export function matchRules(
  context: SkillActivationContext,
  rules: SkillRule[],
  skills: Map<string, Skill>
): SkillMatchResult[] {
  const results: SkillMatchResult[] = [];
  const promptLower = context.prompt.toLowerCase();

  for (const rule of rules) {
    if (rule.enabled === false) continue;

    const skill = skills.get(rule.skillName);
    if (!skill || !skill.enabled) continue;

    const matchedTriggers: string[] = [];
    let score = 0;

    // Check keyword matches
    if (rule.triggers.keywords) {
      for (const keyword of rule.triggers.keywords) {
        if (promptLower.includes(keyword.toLowerCase())) {
          matchedTriggers.push(`keyword:${keyword}`);
          score += 1;
        }
      }
    }

    // Check intent pattern matches (regex)
    if (rule.triggers.intentPatterns) {
      for (const pattern of rule.triggers.intentPatterns) {
        try {
          const regex = new RegExp(pattern, "i");
          if (regex.test(context.prompt)) {
            matchedTriggers.push(`intent:${pattern}`);
            score += 2; // Intent patterns are more specific
          }
        } catch (e) {
          console.warn(`Invalid regex pattern: ${pattern}`, e);
        }
      }
    }

    // Check file pattern matches (if open files are provided)
    if (rule.triggers.filePatterns && context.openFiles) {
      for (const pattern of rule.triggers.filePatterns) {
        const globRegex = globToRegex(pattern);
        for (const file of context.openFiles) {
          if (globRegex.test(file)) {
            matchedTriggers.push(`file:${pattern}`);
            score += 1.5;
            break; // Only count each pattern once
          }
        }
      }
    }

    // If any triggers matched, add to results
    if (matchedTriggers.length > 0) {
      // Calculate confidence based on matches and priority
      const priorityMultiplier =
        rule.priority === "high" ? 1.5 : rule.priority === "medium" ? 1.0 : 0.5;
      const confidence = Math.min(score * priorityMultiplier * 0.2, 1.0);

      results.push({
        skill,
        rule,
        matchedTriggers,
        confidence,
      });
    }
  }

  // Sort by confidence (highest first)
  results.sort((a, b) => b.confidence - a.confidence);

  return results;
}

/**
 * Convert a glob pattern to a regex
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special regex chars
    .replace(/\*\*/g, ".*") // ** matches anything including /
    .replace(/\*/g, "[^/]*") // * matches anything except /
    .replace(/\?/g, "."); // ? matches single char

  return new RegExp(`(^|/)${escaped}$`, "i");
}

/**
 * Generate the skill activation prefix to prepend to prompt
 */
export function generateActivationPrefix(matches: SkillMatchResult[]): string {
  if (matches.length === 0) return "";

  // Only activate high-confidence matches
  const highConfidence = matches.filter((m) => m.confidence >= 0.3);
  if (highConfidence.length === 0) return "";

  // Format: /skill-name for each activated skill
  const activations = highConfidence.map((m) => `/${m.skill.name}`).join(" ");

  return `${activations}\n\n`;
}

/**
 * Get unique skill names from matches
 */
export function getActivatedSkillNames(matches: SkillMatchResult[]): string[] {
  const highConfidence = matches.filter((m) => m.confidence >= 0.3);
  return [...new Set(highConfidence.map((m) => m.skill.name))];
}
