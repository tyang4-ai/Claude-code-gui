/**
 * Onboarding Types
 *
 * Types for the progressive onboarding system.
 */

/**
 * User's onboarding state
 */
export interface OnboardingState {
  version: number;
  isComplete: boolean;
  currentStep: number;
  completedSteps: string[];
  seenTooltips: string[];
  preferences: UserPreferences;
  firstLaunchDate: number;
  lastLaunchDate: number;
  launchCount: number;
}

/**
 * User preferences collected during onboarding
 */
export interface UserPreferences {
  experienceLevel: ExperienceLevel;
  primaryUseCase?: string;
  showAdvancedFeatures: boolean;
  enableUsageTracking: boolean;
  defaultModel?: string;
}

/**
 * User experience level
 */
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

/**
 * Onboarding step
 */
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: string; // Component to render
  isOptional: boolean;
  forLevels: ExperienceLevel[];
}

/**
 * Tooltip definition
 */
export interface Tooltip {
  id: string;
  title: string;
  content: string;
  target: string; // CSS selector or element ID
  position: TooltipPosition;
  forLevels: ExperienceLevel[];
  showAfterStep?: string; // Show after this step is complete
  showOnce: boolean;
}

/**
 * Tooltip position
 */
export type TooltipPosition = "top" | "right" | "bottom" | "left";

/**
 * Feature discovery item
 */
export interface FeatureDiscovery {
  id: string;
  name: string;
  description: string;
  icon: string;
  isAdvanced: boolean;
  usageThreshold: number; // Show discovery after N uses
}

/**
 * Glossary term
 */
export interface GlossaryTerm {
  term: string;
  definition: string;
  relatedTerms?: string[];
  docLink?: string;
}
