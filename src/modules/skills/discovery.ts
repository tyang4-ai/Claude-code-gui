/**
 * Skill Discovery Module
 *
 * Discovers and parses skill files from .claude/commands directories
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  ExtendedSkill,
  SkillDiscoveryResult,
  SkillCategory,
  SkillParameter,
} from "./browser-types";

/**
 * Category keywords for automatic categorization
 */
const CATEGORY_KEYWORDS: Record<SkillCategory, string[]> = {
  development: [
    "code",
    "develop",
    "implement",
    "refactor",
    "debug",
    "programming",
    "backend",
    "frontend",
    "api",
  ],
  writing: ["write", "document", "blog", "article", "content", "copy", "draft"],
  analysis: [
    "analyze",
    "review",
    "audit",
    "inspect",
    "examine",
    "investigate",
    "report",
  ],
  testing: ["test", "spec", "qa", "quality", "coverage", "e2e", "integration"],
  documentation: [
    "docs",
    "readme",
    "guide",
    "tutorial",
    "manual",
    "reference",
  ],
  devops: [
    "deploy",
    "ci/cd",
    "docker",
    "kubernetes",
    "infrastructure",
    "pipeline",
    "build",
  ],
  uncategorized: [],
};

/**
 * Icon mapping for categories
 */
const CATEGORY_ICONS: Record<SkillCategory, string> = {
  development: "code",
  writing: "pencil",
  analysis: "chart",
  testing: "beaker",
  documentation: "book",
  devops: "server",
  uncategorized: "puzzle",
};

/**
 * Discover all skills from global and project directories
 */
export async function discoverSkills(
  workingDir: string
): Promise<SkillDiscoveryResult> {
  const skills: ExtendedSkill[] = [];
  const errors: Array<{ path: string; error: string }> = [];

  try {
    // Discover global skills
    const globalDir = await getGlobalSkillsDir();
    const globalSkills = await discoverSkillsInDir(globalDir, true);
    skills.push(...globalSkills.skills);
    errors.push(...globalSkills.errors);

    // Discover project skills
    const projectDir = `${workingDir}/.claude/commands`;
    const projectSkills = await discoverSkillsInDir(projectDir, false);
    skills.push(...projectSkills.skills);
    errors.push(...projectSkills.errors);
  } catch (error) {
    console.error("Skill discovery failed:", error);
    errors.push({
      path: "discovery",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return { skills, errors };
}

/**
 * Get the global skills directory path
 */
export async function getGlobalSkillsDir(): Promise<string> {
  try {
    const homeDir = await invoke<string>("get_home_dir");
    return `${homeDir}/.claude/commands`;
  } catch {
    return "";
  }
}

/**
 * Discover skills in a specific directory
 */
async function discoverSkillsInDir(
  dir: string,
  isGlobal: boolean
): Promise<SkillDiscoveryResult> {
  const skills: ExtendedSkill[] = [];
  const errors: Array<{ path: string; error: string }> = [];

  if (!dir) {
    return { skills, errors };
  }

  try {
    const files = await invoke<string[]>("list_files", {
      path: dir,
      pattern: "*.md",
    });

    for (const file of files) {
      try {
        const skill = await parseSkillFile(file, isGlobal);
        if (skill) {
          skills.push(skill);
        }
      } catch (error) {
        errors.push({
          path: file,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } catch (error) {
    // Directory might not exist, which is fine
    console.debug(`Skills directory not found: ${dir}`);
  }

  return { skills, errors };
}

/**
 * Parse a skill file and extract metadata
 */
async function parseSkillFile(
  path: string,
  isGlobal: boolean
): Promise<ExtendedSkill | null> {
  try {
    const content = await invoke<string>("read_file", { path });

    // Extract skill name from filename
    const filename = path.split(/[/\\]/).pop() || "";
    const name = filename.replace(/\.md$/, "");

    // Parse skill metadata
    const metadata = parseSkillMetadata(content, name);

    // Determine category
    const category = inferCategory(name, content);

    return {
      id: name,
      name,
      path,
      description: metadata.description || `Skill: ${name}`,
      isGlobal,
      enabled: true,
      category,
      icon: CATEGORY_ICONS[category],
      tags: metadata.tags,
      configurable: metadata.parameters && metadata.parameters.length > 0,
      parameters: metadata.parameters,
      documentation: content,
      usageCount: 0,
      lastUsed: undefined,
    };
  } catch (error) {
    console.warn(`Failed to parse skill file: ${path}`, error);
    return null;
  }
}

/**
 * Parse skill metadata from content
 */
function parseSkillMetadata(
  content: string,
  skillName: string
): {
  description: string;
  tags: string[];
  parameters: SkillParameter[];
} {
  const lines = content.split("\n");
  let description = "";
  const tags: string[] = [];
  const parameters: SkillParameter[] = [];

  let inFrontMatter = false;
  let frontMatterData: Record<string, unknown> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for YAML front matter
    if (line === "---") {
      if (i === 0) {
        inFrontMatter = true;
        continue;
      } else if (inFrontMatter) {
        inFrontMatter = false;
        continue;
      }
    }

    if (inFrontMatter) {
      // Parse YAML front matter (simple key: value format)
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        frontMatterData[key] = value;
      }
      continue;
    }

    // Extract description from first heading or paragraph
    if (!description) {
      if (line.startsWith("# ")) {
        description = line.substring(2).trim();
      } else if (line.length > 0 && !line.startsWith("#") && !line.startsWith("---")) {
        description = line;
      }
    }

    // Extract tags from front matter or comments
    if (line.toLowerCase().includes("tags:")) {
      const tagMatch = line.match(/tags:\s*\[([^\]]+)\]/i);
      if (tagMatch) {
        tags.push(
          ...tagMatch[1].split(",").map((t) => t.trim().toLowerCase())
        );
      }
    }

    // Extract parameters from markdown (## Parameters section)
    if (line.toLowerCase() === "## parameters") {
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith("##")) {
        const paramLine = lines[j].trim();
        const paramMatch = paramLine.match(
          /^-\s+`(\w+)`\s*\((\w+)\):\s*(.+)$/
        );
        if (paramMatch) {
          const [, name, type, desc] = paramMatch;
          parameters.push({
            name,
            type: type as SkillParameter["type"],
            description: desc,
            required: desc.toLowerCase().includes("required"),
          });
        }
        j++;
      }
    }
  }

  // Use front matter description if available
  if (frontMatterData.description && typeof frontMatterData.description === "string") {
    description = frontMatterData.description;
  }

  // Use front matter tags if available
  if (frontMatterData.tags) {
    if (typeof frontMatterData.tags === "string") {
      tags.push(...frontMatterData.tags.split(",").map((t) => t.trim().toLowerCase()));
    } else if (Array.isArray(frontMatterData.tags)) {
      tags.push(...frontMatterData.tags.map((t) => String(t).trim().toLowerCase()));
    }
  }

  return {
    description: description || `Skill: ${skillName}`,
    tags: [...new Set(tags)], // Remove duplicates
    parameters,
  };
}

/**
 * Infer category from skill name and content
 */
function inferCategory(name: string, content: string): SkillCategory {
  const text = `${name} ${content}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "uncategorized") continue;

    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category as SkillCategory;
      }
    }
  }

  return "uncategorized";
}

/**
 * Refresh skills from disk
 */
export async function refreshSkills(
  workingDir: string
): Promise<SkillDiscoveryResult> {
  return discoverSkills(workingDir);
}

/**
 * Get skill by ID
 */
export async function getSkillById(
  skillId: string,
  workingDir: string
): Promise<ExtendedSkill | null> {
  const result = await discoverSkills(workingDir);
  return result.skills.find((s) => s.id === skillId) || null;
}
