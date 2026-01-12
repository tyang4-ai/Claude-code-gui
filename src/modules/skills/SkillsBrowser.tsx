/**
 * Skills Browser Component
 *
 * UI for browsing, enabling/disabling, and configuring skills
 * and their auto-activation rules.
 */

import { useState, useEffect, useCallback } from "react";
import { getSkillsManager } from "./index";
import type { Skill, SkillRule } from "./types";

interface SkillsBrowserProps {
  workingDir: string;
  onClose?: () => void;
}

export function SkillsBrowser({ workingDir, onClose }: SkillsBrowserProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [rules, setRules] = useState<SkillRule[]>([]);
  const [activeTab, setActiveTab] = useState<"skills" | "rules">("skills");
  const [isLoading, setIsLoading] = useState(true);

  // Load skills and rules
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const manager = getSkillsManager();
        if (!manager.isInitialized()) {
          await manager.initialize(workingDir);
        }
        setSkills(manager.getSkills());
        setRules(manager.getRules());
      } catch (error) {
        console.error("Failed to load skills:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [workingDir]);

  // Toggle skill enabled state
  const handleToggleSkill = useCallback((skillName: string, enabled: boolean) => {
    const manager = getSkillsManager();
    manager.toggleSkill(skillName, enabled);
    setSkills(manager.getSkills());
  }, []);

  // Refresh skills
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const manager = getSkillsManager();
      manager.reset();
      await manager.initialize(workingDir);
      setSkills(manager.getSkills());
      setRules(manager.getRules());
    } catch (error) {
      console.error("Failed to refresh skills:", error);
    } finally {
      setIsLoading(false);
    }
  }, [workingDir]);

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-default">
        <h2 className="text-lg font-semibold">Skills</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded hover:bg-tertiary transition-colors"
            title="Refresh skills"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-tertiary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-default">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "skills"
              ? "text-accent-primary border-b-2 border-accent-primary"
              : "text-secondary hover:text-primary"
          }`}
          onClick={() => setActiveTab("skills")}
        >
          Available Skills ({skills.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "rules"
              ? "text-accent-primary border-b-2 border-accent-primary"
              : "text-secondary hover:text-primary"
          }`}
          onClick={() => setActiveTab("rules")}
        >
          Auto-Activation Rules ({rules.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "skills" ? (
          <SkillsList skills={skills} onToggle={handleToggleSkill} />
        ) : (
          <RulesList rules={rules} skills={skills} />
        )}
      </div>
    </div>
  );
}

interface SkillsListProps {
  skills: Skill[];
  onToggle: (name: string, enabled: boolean) => void;
}

function SkillsList({ skills, onToggle }: SkillsListProps) {
  if (skills.length === 0) {
    return (
      <div className="text-center text-secondary py-8">
        <p>No skills found.</p>
        <p className="text-sm mt-2">
          Add skills to <code className="bg-tertiary px-1 rounded">~/.claude/commands/</code> or{" "}
          <code className="bg-tertiary px-1 rounded">.claude/commands/</code>
        </p>
      </div>
    );
  }

  // Group by global vs project
  const globalSkills = skills.filter((s) => s.isGlobal);
  const projectSkills = skills.filter((s) => !s.isGlobal);

  return (
    <div className="space-y-6">
      {projectSkills.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-secondary mb-2">Project Skills</h3>
          <div className="space-y-2">
            {projectSkills.map((skill) => (
              <SkillItem key={skill.path} skill={skill} onToggle={onToggle} />
            ))}
          </div>
        </div>
      )}

      {globalSkills.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-secondary mb-2">Global Skills</h3>
          <div className="space-y-2">
            {globalSkills.map((skill) => (
              <SkillItem key={skill.path} skill={skill} onToggle={onToggle} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SkillItemProps {
  skill: Skill;
  onToggle: (name: string, enabled: boolean) => void;
}

function SkillItem({ skill, onToggle }: SkillItemProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-tertiary rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-accent-primary">/{skill.name}</span>
          {skill.isGlobal && (
            <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
              Global
            </span>
          )}
        </div>
        <p className="text-sm text-secondary truncate mt-0.5">{skill.description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer ml-4">
        <input
          type="checkbox"
          checked={skill.enabled}
          onChange={(e) => onToggle(skill.name, e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-secondary rounded-full peer peer-checked:bg-accent-primary transition-colors">
          <div
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              skill.enabled ? "translate-x-4" : ""
            }`}
          />
        </div>
      </label>
    </div>
  );
}

interface RulesListProps {
  rules: SkillRule[];
  skills: Skill[];
}

function RulesList({ rules, skills }: RulesListProps) {
  if (rules.length === 0) {
    return (
      <div className="text-center text-secondary py-8">
        <p>No auto-activation rules configured.</p>
        <p className="text-sm mt-2">
          Rules determine which skills activate based on your prompt.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rules.map((rule, index) => (
        <RuleItem key={index} rule={rule} skills={skills} />
      ))}
    </div>
  );
}

interface RuleItemProps {
  rule: SkillRule;
  skills: Skill[];
}

function RuleItem({ rule, skills }: RuleItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const skill = skills.find((s) => s.name === rule.skillName);

  const priorityColors = {
    high: "bg-red-500/20 text-red-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    low: "bg-gray-500/20 text-gray-400",
  };

  return (
    <div className="bg-tertiary rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-accent-primary">/{rule.skillName}</span>
          <span className={`px-1.5 py-0.5 text-xs rounded ${priorityColors[rule.priority]}`}>
            {rule.priority}
          </span>
          {!skill && (
            <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
              Not found
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 text-sm">
          {rule.triggers.keywords && rule.triggers.keywords.length > 0 && (
            <div>
              <span className="text-secondary">Keywords: </span>
              <span className="text-primary">
                {rule.triggers.keywords.map((k, i) => (
                  <span key={i}>
                    <code className="bg-primary/50 px-1 rounded">{k}</code>
                    {i < rule.triggers.keywords!.length - 1 && ", "}
                  </span>
                ))}
              </span>
            </div>
          )}

          {rule.triggers.intentPatterns && rule.triggers.intentPatterns.length > 0 && (
            <div>
              <span className="text-secondary">Intent patterns: </span>
              <span className="text-primary font-mono text-xs">
                {rule.triggers.intentPatterns.join(", ")}
              </span>
            </div>
          )}

          {rule.triggers.filePatterns && rule.triggers.filePatterns.length > 0 && (
            <div>
              <span className="text-secondary">File patterns: </span>
              <span className="text-primary font-mono text-xs">
                {rule.triggers.filePatterns.join(", ")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
