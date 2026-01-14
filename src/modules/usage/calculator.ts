/**
 * Cost Calculator
 *
 * Utilities for calculating costs, projections, and analyzing usage patterns
 */

import type { UsageRecord, ModelPricing, UsageSummary } from "./types";
import { MODEL_PRICING } from "./types";

/**
 * Calculate cost from token counts
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = getPricingForModel(model);
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPrice;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPrice;
  return inputCost + outputCost;
}

/**
 * Get pricing information for a model
 */
export function getPricingForModel(model: string): ModelPricing {
  // Try to find exact match first
  let pricing = MODEL_PRICING.find((p) => p.model === model);

  // Try to find partial match (e.g., "opus" in "claude-3-opus-20240229")
  if (!pricing) {
    pricing = MODEL_PRICING.find((p) =>
      p.model !== "default" && model.toLowerCase().includes(p.model.toLowerCase())
    );
  }

  // Fall back to default
  if (!pricing) {
    pricing = MODEL_PRICING.find((p) => p.model === "default");
  }

  return pricing || MODEL_PRICING[MODEL_PRICING.length - 1];
}

/**
 * Calculate projected cost based on historical usage
 */
export function calculateProjection(
  records: UsageRecord[],
  periodDays: number,
  projectDays: number
): {
  projectedCost: number;
  dailyAverage: number;
  confidence: "high" | "medium" | "low";
} {
  if (records.length === 0) {
    return {
      projectedCost: 0,
      dailyAverage: 0,
      confidence: "low",
    };
  }

  // Calculate daily average from the period
  const totalCost = records.reduce((sum, r) => sum + r.costUsd, 0);
  const dailyAverage = totalCost / periodDays;
  const projectedCost = dailyAverage * projectDays;

  // Determine confidence based on sample size
  let confidence: "high" | "medium" | "low";
  if (records.length >= 100 && periodDays >= 7) {
    confidence = "high";
  } else if (records.length >= 20 && periodDays >= 3) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    projectedCost,
    dailyAverage,
    confidence,
  };
}

/**
 * Calculate cost breakdown by model
 */
export function calculateModelBreakdown(records: UsageRecord[]): Array<{
  model: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  percentage: number;
}> {
  if (records.length === 0) {
    return [];
  }

  // Group by model
  const modelMap = new Map<
    string,
    { costUsd: number; inputTokens: number; outputTokens: number }
  >();

  for (const record of records) {
    const existing = modelMap.get(record.model) || {
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
    };
    existing.costUsd += record.costUsd;
    existing.inputTokens += record.inputTokens;
    existing.outputTokens += record.outputTokens;
    modelMap.set(record.model, existing);
  }

  // Calculate total cost
  const totalCost = records.reduce((sum, r) => sum + r.costUsd, 0);

  // Convert to array with percentages
  const breakdown = Array.from(modelMap.entries()).map(
    ([model, data]) => ({
      model,
      costUsd: data.costUsd,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      percentage: totalCost > 0 ? (data.costUsd / totalCost) * 100 : 0,
    })
  );

  // Sort by cost (descending)
  breakdown.sort((a, b) => b.costUsd - a.costUsd);

  return breakdown;
}

/**
 * Calculate usage statistics
 */
export function calculateStatistics(records: UsageRecord[]): {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalMessages: number;
  averageCostPerMessage: number;
  averageTokensPerMessage: number;
  medianCostPerMessage: number;
  maxCostPerMessage: number;
  minCostPerMessage: number;
} {
  if (records.length === 0) {
    return {
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalMessages: 0,
      averageCostPerMessage: 0,
      averageTokensPerMessage: 0,
      medianCostPerMessage: 0,
      maxCostPerMessage: 0,
      minCostPerMessage: 0,
    };
  }

  const totalCost = records.reduce((sum, r) => sum + r.costUsd, 0);
  const totalInputTokens = records.reduce((sum, r) => sum + r.inputTokens, 0);
  const totalOutputTokens = records.reduce((sum, r) => sum + r.outputTokens, 0);
  const totalMessages = records.length;

  const averageCostPerMessage = totalCost / totalMessages;
  const averageTokensPerMessage =
    (totalInputTokens + totalOutputTokens) / totalMessages;

  // Calculate median cost
  const sortedCosts = [...records].map((r) => r.costUsd).sort((a, b) => a - b);
  const medianCostPerMessage =
    sortedCosts.length % 2 === 0
      ? (sortedCosts[sortedCosts.length / 2 - 1] +
          sortedCosts[sortedCosts.length / 2]) /
        2
      : sortedCosts[Math.floor(sortedCosts.length / 2)];

  const maxCostPerMessage = Math.max(...records.map((r) => r.costUsd));
  const minCostPerMessage = Math.min(...records.map((r) => r.costUsd));

  return {
    totalCost,
    totalInputTokens,
    totalOutputTokens,
    totalMessages,
    averageCostPerMessage,
    averageTokensPerMessage,
    medianCostPerMessage,
    maxCostPerMessage,
    minCostPerMessage,
  };
}

/**
 * Calculate trend (increasing, decreasing, or stable)
 */
export function calculateTrend(
  recentPeriod: UsageSummary,
  previousPeriod: UsageSummary
): {
  direction: "increasing" | "decreasing" | "stable";
  percentageChange: number;
  costChange: number;
} {
  if (previousPeriod.totalCostUsd === 0) {
    return {
      direction: "stable",
      percentageChange: 0,
      costChange: 0,
    };
  }

  const costChange = recentPeriod.totalCostUsd - previousPeriod.totalCostUsd;
  const percentageChange =
    (costChange / previousPeriod.totalCostUsd) * 100;

  let direction: "increasing" | "decreasing" | "stable";
  if (Math.abs(percentageChange) < 5) {
    direction = "stable";
  } else if (percentageChange > 0) {
    direction = "increasing";
  } else {
    direction = "decreasing";
  }

  return {
    direction,
    percentageChange,
    costChange,
  };
}

/**
 * Format cost as a string
 */
export function formatCost(costUsd: number): string {
  if (costUsd < 0.01) {
    return `$${costUsd.toFixed(4)}`;
  } else if (costUsd < 1) {
    return `$${costUsd.toFixed(3)}`;
  } else {
    return `$${costUsd.toFixed(2)}`;
  }
}

/**
 * Format token count as a string
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  } else if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  } else {
    return String(tokens);
  }
}

/**
 * Format duration as a string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else if (ms < 3_600_000) {
    const mins = Math.floor(ms / 60_000);
    const secs = Math.floor((ms % 60_000) / 1000);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  } else {
    const hours = Math.floor(ms / 3_600_000);
    const mins = Math.floor((ms % 3_600_000) / 60_000);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}

/**
 * Format percentage as a string
 */
export function formatPercentage(value: number): string {
  if (value < 0.01) {
    return "< 0.01%";
  } else if (value < 1) {
    return `${value.toFixed(2)}%`;
  } else {
    return `${value.toFixed(1)}%`;
  }
}
