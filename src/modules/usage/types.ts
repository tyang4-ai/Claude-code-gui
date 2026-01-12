/**
 * Usage Dashboard Types
 *
 * Types for tracking and displaying API usage and costs.
 */

/**
 * Individual usage record
 */
export interface UsageRecord {
  id: string;
  sessionId: string;
  timestamp: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  workingDir: string;
}

/**
 * Aggregated usage for a time period
 */
export interface UsageSummary {
  period: "day" | "week" | "month" | "all";
  startDate: number;
  endDate: number;
  totalCostUsd: number;
  totalSessions: number;
  totalPrompts: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  averageDurationMs: number;
  byModel: ModelUsage[];
  byProject: ProjectUsage[];
  dailyBreakdown: DailyUsage[];
}

/**
 * Usage per model
 */
export interface ModelUsage {
  model: string;
  costUsd: number;
  sessions: number;
  prompts: number;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Usage per project
 */
export interface ProjectUsage {
  workingDir: string;
  projectName: string;
  costUsd: number;
  sessions: number;
  prompts: number;
}

/**
 * Daily usage for charts
 */
export interface DailyUsage {
  date: string; // YYYY-MM-DD
  costUsd: number;
  sessions: number;
  prompts: number;
}

/**
 * Budget settings
 */
export interface BudgetSettings {
  dailyLimitUsd?: number;
  weeklyLimitUsd?: number;
  monthlyLimitUsd?: number;
  warningThreshold: number; // 0-1, e.g., 0.8 = warn at 80%
  enabled: boolean;
}

/**
 * Budget alert
 */
export interface BudgetAlert {
  type: "warning" | "exceeded";
  period: "daily" | "weekly" | "monthly";
  currentSpend: number;
  limitUsd: number;
  percentUsed: number;
}

/**
 * Usage storage format
 */
export interface UsageStorageData {
  version: number;
  records: UsageRecord[];
  budget: BudgetSettings;
}

/**
 * Token pricing by model (per 1M tokens)
 */
export interface ModelPricing {
  model: string;
  inputPrice: number; // per 1M tokens
  outputPrice: number; // per 1M tokens
}

/**
 * Current pricing as of 2024
 */
export const MODEL_PRICING: ModelPricing[] = [
  { model: "claude-3-opus-20240229", inputPrice: 15.0, outputPrice: 75.0 },
  { model: "claude-3-sonnet-20240229", inputPrice: 3.0, outputPrice: 15.0 },
  { model: "claude-3-haiku-20240307", inputPrice: 0.25, outputPrice: 1.25 },
  { model: "claude-3-5-sonnet-20240620", inputPrice: 3.0, outputPrice: 15.0 },
  { model: "claude-3-5-sonnet-20241022", inputPrice: 3.0, outputPrice: 15.0 },
  // Default fallback
  { model: "default", inputPrice: 3.0, outputPrice: 15.0 },
];
