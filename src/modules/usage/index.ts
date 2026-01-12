/**
 * Usage Dashboard Module
 *
 * Tracks API usage, costs, and provides budget alerts.
 */

import { usageStorage } from "./storage";
import { MODEL_PRICING } from "./types";
import type {
  UsageRecord,
  UsageSummary,
  BudgetSettings,
  BudgetAlert,
  ModelPricing,
} from "./types";

/**
 * Usage Manager - main API for usage tracking
 */
export class UsageManager {
  private static instance: UsageManager | null = null;

  static getInstance(): UsageManager {
    if (!UsageManager.instance) {
      UsageManager.instance = new UsageManager();
    }
    return UsageManager.instance;
  }

  // === Recording Usage ===

  /**
   * Record usage from a Claude CLI result
   */
  async recordUsage(data: {
    sessionId: string;
    model: string;
    costUsd: number;
    durationMs: number;
    inputTokens?: number;
    outputTokens?: number;
    workingDir: string;
  }): Promise<UsageRecord> {
    return usageStorage.addRecord({
      sessionId: data.sessionId,
      timestamp: Date.now(),
      model: data.model,
      inputTokens: data.inputTokens || 0,
      outputTokens: data.outputTokens || 0,
      costUsd: data.costUsd,
      durationMs: data.durationMs,
      workingDir: data.workingDir,
    });
  }

  /**
   * Estimate cost from token counts (when cost_usd not provided)
   */
  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.getPricing(model);
    const inputCost = (inputTokens / 1_000_000) * pricing.inputPrice;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPrice;
    return inputCost + outputCost;
  }

  /**
   * Get pricing for a model
   */
  getPricing(model: string): ModelPricing {
    const pricing = MODEL_PRICING.find((p) => model.includes(p.model));
    return pricing || MODEL_PRICING.find((p) => p.model === "default")!;
  }

  // === Summaries ===

  /**
   * Get usage summary for a time period
   */
  async getSummary(period: "day" | "week" | "month" | "all"): Promise<UsageSummary> {
    return usageStorage.getSummary(period);
  }

  /**
   * Get today's usage
   */
  async getTodayUsage(): Promise<UsageSummary> {
    return usageStorage.getSummary("day");
  }

  /**
   * Get this week's usage
   */
  async getWeekUsage(): Promise<UsageSummary> {
    return usageStorage.getSummary("week");
  }

  /**
   * Get this month's usage
   */
  async getMonthUsage(): Promise<UsageSummary> {
    return usageStorage.getSummary("month");
  }

  /**
   * Get cost for a specific session
   */
  async getSessionCost(sessionId: string): Promise<number> {
    return usageStorage.getSessionCost(sessionId);
  }

  // === Budget Management ===

  /**
   * Get budget settings
   */
  async getBudget(): Promise<BudgetSettings> {
    return usageStorage.getBudget();
  }

  /**
   * Update budget settings
   */
  async setBudget(budget: Partial<BudgetSettings>): Promise<void> {
    return usageStorage.setBudget(budget);
  }

  /**
   * Check for budget alerts
   */
  async checkBudgetAlerts(): Promise<BudgetAlert[]> {
    return usageStorage.checkBudgetAlerts();
  }

  /**
   * Enable budget tracking
   */
  async enableBudget(settings: {
    dailyLimitUsd?: number;
    weeklyLimitUsd?: number;
    monthlyLimitUsd?: number;
    warningThreshold?: number;
  }): Promise<void> {
    return usageStorage.setBudget({
      ...settings,
      enabled: true,
    });
  }

  /**
   * Disable budget tracking
   */
  async disableBudget(): Promise<void> {
    return usageStorage.setBudget({ enabled: false });
  }

  // === Formatting ===

  /**
   * Format cost as string
   */
  formatCost(costUsd: number): string {
    if (costUsd < 0.01) {
      return `$${costUsd.toFixed(4)}`;
    } else if (costUsd < 1) {
      return `$${costUsd.toFixed(3)}`;
    } else {
      return `$${costUsd.toFixed(2)}`;
    }
  }

  /**
   * Format token count
   */
  formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(1)}M`;
    } else if (tokens >= 1_000) {
      return `${(tokens / 1_000).toFixed(1)}K`;
    } else {
      return String(tokens);
    }
  }

  /**
   * Format duration
   */
  formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60_000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const mins = Math.floor(ms / 60_000);
      const secs = Math.floor((ms % 60_000) / 1000);
      return `${mins}m ${secs}s`;
    }
  }

  // === Utility ===

  /**
   * Clear all usage data
   */
  async clear(): Promise<void> {
    return usageStorage.clear();
  }

  /**
   * Force reload from disk
   */
  async reload(): Promise<void> {
    return usageStorage.reload();
  }
}

/**
 * Get the UsageManager singleton
 */
export function getUsageManager(): UsageManager {
  return UsageManager.getInstance();
}

// Re-export types
export type {
  UsageRecord,
  UsageSummary,
  ModelUsage,
  ProjectUsage,
  DailyUsage,
  BudgetSettings,
  BudgetAlert,
  ModelPricing,
} from "./types";

export { MODEL_PRICING } from "./types";
