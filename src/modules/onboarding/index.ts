/**
 * Onboarding Module
 *
 * Progressive onboarding system with tooltips, feature discovery,
 * and a first-run wizard.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  OnboardingState,
  UserPreferences,
  ExperienceLevel,
  OnboardingStep,
  Tooltip,
  FeatureDiscovery,
} from "./types";
import { GLOSSARY, getGlossaryTerm, searchGlossary } from "./glossary";

const STORAGE_VERSION = 1;
const ONBOARDING_FILENAME = "onboarding.json";

const DEFAULT_STATE: OnboardingState = {
  version: STORAGE_VERSION,
  isComplete: false,
  currentStep: 0,
  completedSteps: [],
  seenTooltips: [],
  preferences: {
    experienceLevel: "intermediate",
    showAdvancedFeatures: false,
    enableUsageTracking: true,
  },
  firstLaunchDate: 0,
  lastLaunchDate: 0,
  launchCount: 0,
};

/**
 * Onboarding steps for the first-run wizard
 */
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Claude Companion",
    description: "A friendly interface for Claude Code",
    component: "WelcomeStep",
    isOptional: false,
    forLevels: ["beginner", "intermediate", "advanced"],
  },
  {
    id: "cli-check",
    title: "Check Claude CLI",
    description: "Make sure Claude CLI is installed and authenticated",
    component: "CLICheckStep",
    isOptional: false,
    forLevels: ["beginner", "intermediate", "advanced"],
  },
  {
    id: "experience",
    title: "Your Experience Level",
    description: "Help us customize the interface for you",
    component: "ExperienceStep",
    isOptional: false,
    forLevels: ["beginner", "intermediate", "advanced"],
  },
  {
    id: "quick-tour",
    title: "Quick Tour",
    description: "Learn the basics of the interface",
    component: "QuickTourStep",
    isOptional: true,
    forLevels: ["beginner"],
  },
  {
    id: "shortcuts",
    title: "Keyboard Shortcuts",
    description: "Work faster with keyboard shortcuts",
    component: "ShortcutsStep",
    isOptional: true,
    forLevels: ["intermediate", "advanced"],
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Start your first conversation with Claude",
    component: "CompleteStep",
    isOptional: false,
    forLevels: ["beginner", "intermediate", "advanced"],
  },
];

/**
 * Contextual tooltips
 */
const TOOLTIPS: Tooltip[] = [
  {
    id: "yolo-mode",
    title: "YOLO Mode",
    content:
      "Auto-accept all file edits without confirmation. Great for trusted workflows, but use carefully!",
    target: "[data-tooltip='yolo-mode']",
    position: "bottom",
    forLevels: ["beginner"],
    showOnce: true,
  },
  {
    id: "skills",
    title: "Skills",
    content:
      "Reusable prompt templates. Type / to see available skills. Create your own in .claude/commands/",
    target: "[data-tooltip='skills']",
    position: "right",
    forLevels: ["beginner"],
    showOnce: true,
  },
  {
    id: "usage-dashboard",
    title: "Usage Dashboard",
    content:
      "Track your API costs and set budgets. See how much you're spending per project.",
    target: "[data-tooltip='usage']",
    position: "left",
    forLevels: ["beginner", "intermediate"],
    showOnce: true,
  },
  {
    id: "command-palette",
    title: "Command Palette",
    content: "Press Ctrl+P to quickly access any command or action.",
    target: "[data-tooltip='command-palette']",
    position: "bottom",
    forLevels: ["beginner"],
    showAfterStep: "welcome",
    showOnce: true,
  },
];

/**
 * Feature discovery items
 */
const FEATURE_DISCOVERIES: FeatureDiscovery[] = [
  {
    id: "templates",
    name: "Templates",
    description: "Save time with reusable prompt templates",
    icon: "template",
    isAdvanced: false,
    usageThreshold: 10,
  },
  {
    id: "session-history",
    name: "Session History",
    description: "Browse and resume past conversations",
    icon: "history",
    isAdvanced: false,
    usageThreshold: 5,
  },
  {
    id: "keyboard-shortcuts",
    name: "Keyboard Shortcuts",
    description: "Work faster with Ctrl+N, Ctrl+P, and more",
    icon: "keyboard",
    isAdvanced: true,
    usageThreshold: 15,
  },
  {
    id: "mcp-servers",
    name: "MCP Servers",
    description: "Extend Claude with custom tools",
    icon: "plugin",
    isAdvanced: true,
    usageThreshold: 30,
  },
];

/**
 * Get the onboarding storage path
 */
async function getOnboardingPath(): Promise<string> {
  const appDataDir = await invoke<string>("get_app_data_dir");
  const normalized = appDataDir.replace(/\\/g, "/");
  return `${normalized}/${ONBOARDING_FILENAME}`;
}

/**
 * Onboarding Manager
 */
export class OnboardingManager {
  private static instance: OnboardingManager | null = null;
  private state: OnboardingState = { ...DEFAULT_STATE };
  private loaded = false;
  private storagePath: string | null = null;
  private stateListeners: Set<(state: OnboardingState) => void> = new Set();

  static getInstance(): OnboardingManager {
    if (!OnboardingManager.instance) {
      OnboardingManager.instance = new OnboardingManager();
    }
    return OnboardingManager.instance;
  }

  /**
   * Load onboarding state
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      this.storagePath = await getOnboardingPath();

      const exists = await invoke<boolean>("file_exists", { path: this.storagePath });
      if (!exists) {
        // First launch
        this.state = {
          ...DEFAULT_STATE,
          firstLaunchDate: Date.now(),
          lastLaunchDate: Date.now(),
          launchCount: 1,
        };
        await this.save();
        this.loaded = true;
        return;
      }

      const result = await invoke<{ content: string }>("read_file", {
        path: this.storagePath,
      });
      this.state = JSON.parse(result.content);
      this.state.lastLaunchDate = Date.now();
      this.state.launchCount++;
      await this.save();
      this.loaded = true;
    } catch (e) {
      console.error("Failed to load onboarding state:", e);
      this.loaded = true;
    }
  }

  /**
   * Save onboarding state
   */
  async save(): Promise<void> {
    if (!this.storagePath) {
      this.storagePath = await getOnboardingPath();
    }

    await invoke("write_file_atomic", {
      path: this.storagePath,
      content: JSON.stringify(this.state, null, 2),
    });

    this.notifyListeners();
  }

  // === State Access ===

  /**
   * Get current state
   */
  async getState(): Promise<OnboardingState> {
    await this.load();
    return { ...this.state };
  }

  /**
   * Check if this is the first launch
   */
  async isFirstLaunch(): Promise<boolean> {
    await this.load();
    return this.state.launchCount === 1 && !this.state.isComplete;
  }

  /**
   * Check if onboarding is complete
   */
  async isComplete(): Promise<boolean> {
    await this.load();
    return this.state.isComplete;
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    await this.load();
    return { ...this.state.preferences };
  }

  // === Onboarding Steps ===

  /**
   * Get all onboarding steps for user's level
   */
  getSteps(level?: ExperienceLevel): OnboardingStep[] {
    const userLevel = level || this.state.preferences.experienceLevel;
    return ONBOARDING_STEPS.filter((s) => s.forLevels.includes(userLevel));
  }

  /**
   * Get current step
   */
  async getCurrentStep(): Promise<OnboardingStep | null> {
    await this.load();
    const steps = this.getSteps();
    return steps[this.state.currentStep] || null;
  }

  /**
   * Advance to next step
   */
  async nextStep(): Promise<void> {
    await this.load();
    const steps = this.getSteps();
    const currentStep = steps[this.state.currentStep];

    if (currentStep) {
      this.state.completedSteps.push(currentStep.id);
    }

    if (this.state.currentStep < steps.length - 1) {
      this.state.currentStep++;
    } else {
      this.state.isComplete = true;
    }

    await this.save();
  }

  /**
   * Skip onboarding
   */
  async skip(): Promise<void> {
    await this.load();
    this.state.isComplete = true;
    await this.save();
  }

  /**
   * Reset onboarding
   */
  async reset(): Promise<void> {
    this.state = {
      ...DEFAULT_STATE,
      firstLaunchDate: this.state.firstLaunchDate,
      lastLaunchDate: Date.now(),
      launchCount: this.state.launchCount,
    };
    await this.save();
  }

  // === Preferences ===

  /**
   * Set experience level
   */
  async setExperienceLevel(level: ExperienceLevel): Promise<void> {
    await this.load();
    this.state.preferences.experienceLevel = level;
    this.state.preferences.showAdvancedFeatures = level === "advanced";
    await this.save();
  }

  /**
   * Update preferences
   */
  async updatePreferences(prefs: Partial<UserPreferences>): Promise<void> {
    await this.load();
    this.state.preferences = { ...this.state.preferences, ...prefs };
    await this.save();
  }

  // === Tooltips ===

  /**
   * Get tooltips to show for user's level
   */
  getTooltips(): Tooltip[] {
    return TOOLTIPS.filter(
      (t) =>
        t.forLevels.includes(this.state.preferences.experienceLevel) &&
        (!t.showOnce || !this.state.seenTooltips.includes(t.id))
    );
  }

  /**
   * Mark tooltip as seen
   */
  async markTooltipSeen(id: string): Promise<void> {
    await this.load();
    if (!this.state.seenTooltips.includes(id)) {
      this.state.seenTooltips.push(id);
      await this.save();
    }
  }

  // === Feature Discovery ===

  /**
   * Get feature discoveries to show
   */
  getDiscoveries(usageCount: number): FeatureDiscovery[] {
    return FEATURE_DISCOVERIES.filter(
      (f) =>
        usageCount >= f.usageThreshold &&
        (this.state.preferences.showAdvancedFeatures || !f.isAdvanced)
    );
  }

  // === Glossary ===

  /**
   * Get glossary term
   */
  getTerm(term: string) {
    return getGlossaryTerm(term);
  }

  /**
   * Search glossary
   */
  searchTerms(query: string) {
    return searchGlossary(query);
  }

  /**
   * Get all glossary terms
   */
  getAllTerms() {
    return GLOSSARY;
  }

  // === Listeners ===

  /**
   * Subscribe to state changes
   */
  onStateChange(listener: (state: OnboardingState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.stateListeners) {
      listener(this.state);
    }
  }
}

/**
 * Get the OnboardingManager singleton
 */
export function getOnboardingManager(): OnboardingManager {
  return OnboardingManager.getInstance();
}

// Re-export types and glossary
export type {
  OnboardingState,
  UserPreferences,
  ExperienceLevel,
  OnboardingStep,
  Tooltip,
  FeatureDiscovery,
  GlossaryTerm,
} from "./types";

export { GLOSSARY, getGlossaryTerm, searchGlossary } from "./glossary";
