/**
 * Usage Data Aggregator
 *
 * Aggregates usage records into time-series data and summaries
 */

import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from "date-fns";
import type { UsageRecord, DailyUsage } from "./types";

export type TimeGranularity = "day" | "week" | "month";

/**
 * Aggregate usage records by time period
 */
export function aggregateByTime(
  records: UsageRecord[],
  granularity: TimeGranularity,
  startDate: Date,
  endDate: Date
): DailyUsage[] {
  // Create a map of period -> usage data
  const periodMap = new Map<string, DailyUsage>();

  // Initialize all periods with zero values
  let intervals: Date[];
  let formatString: string;

  switch (granularity) {
    case "day":
      intervals = eachDayOfInterval({ start: startDate, end: endDate });
      formatString = "yyyy-MM-dd";
      break;
    case "week":
      intervals = eachWeekOfInterval({ start: startDate, end: endDate });
      formatString = "yyyy-MM-dd";
      break;
    case "month":
      intervals = eachMonthOfInterval({ start: startDate, end: endDate });
      formatString = "yyyy-MM";
      break;
  }

  // Initialize all periods
  for (const date of intervals) {
    const key = format(date, formatString);
    periodMap.set(key, {
      date: key,
      costUsd: 0,
      sessions: 0,
      prompts: 0,
    });
  }

  // Track unique sessions per period
  const sessionsByPeriod = new Map<string, Set<string>>();

  // Aggregate records into periods
  for (const record of records) {
    const recordDate = new Date(record.timestamp);

    // Get the period key for this record
    let periodStart: Date;
    switch (granularity) {
      case "day":
        periodStart = startOfDay(recordDate);
        break;
      case "week":
        periodStart = startOfWeek(recordDate);
        break;
      case "month":
        periodStart = startOfMonth(recordDate);
        break;
    }

    const key = format(periodStart, formatString);
    const existing = periodMap.get(key);

    if (existing) {
      existing.costUsd += record.costUsd;
      existing.prompts++;

      // Track unique sessions
      if (!sessionsByPeriod.has(key)) {
        sessionsByPeriod.set(key, new Set());
      }
      sessionsByPeriod.get(key)!.add(record.sessionId);
    }
  }

  // Update session counts
  for (const [key, sessions] of sessionsByPeriod.entries()) {
    const existing = periodMap.get(key);
    if (existing) {
      existing.sessions = sessions.size;
    }
  }

  // Convert to array and sort by date
  return Array.from(periodMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

/**
 * Aggregate usage by session
 */
export function aggregateBySession(records: UsageRecord[]): Array<{
  sessionId: string;
  workingDir: string;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  messageCount: number;
  startTime: number;
  endTime: number;
  durationMs: number;
}> {
  const sessionMap = new Map<
    string,
    {
      sessionId: string;
      workingDir: string;
      totalCost: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      messageCount: number;
      startTime: number;
      endTime: number;
      durationMs: number;
    }
  >();

  for (const record of records) {
    const existing = sessionMap.get(record.sessionId);

    if (existing) {
      existing.totalCost += record.costUsd;
      existing.totalInputTokens += record.inputTokens;
      existing.totalOutputTokens += record.outputTokens;
      existing.messageCount++;
      existing.durationMs += record.durationMs;
      existing.endTime = Math.max(existing.endTime, record.timestamp);
      existing.startTime = Math.min(existing.startTime, record.timestamp);
    } else {
      sessionMap.set(record.sessionId, {
        sessionId: record.sessionId,
        workingDir: record.workingDir,
        totalCost: record.costUsd,
        totalInputTokens: record.inputTokens,
        totalOutputTokens: record.outputTokens,
        messageCount: 1,
        startTime: record.timestamp,
        endTime: record.timestamp,
        durationMs: record.durationMs,
      });
    }
  }

  return Array.from(sessionMap.values()).sort(
    (a, b) => b.startTime - a.startTime
  );
}

/**
 * Aggregate usage by project (working directory)
 */
export function aggregateByProject(records: UsageRecord[]): Array<{
  workingDir: string;
  projectName: string;
  totalCost: number;
  sessionCount: number;
  messageCount: number;
}> {
  const projectMap = new Map<
    string,
    {
      workingDir: string;
      projectName: string;
      totalCost: number;
      sessionIds: Set<string>;
      messageCount: number;
    }
  >();

  for (const record of records) {
    const existing = projectMap.get(record.workingDir);

    if (existing) {
      existing.totalCost += record.costUsd;
      existing.sessionIds.add(record.sessionId);
      existing.messageCount++;
    } else {
      const projectName =
        record.workingDir.split(/[/\\]/).pop() || record.workingDir;
      projectMap.set(record.workingDir, {
        workingDir: record.workingDir,
        projectName,
        totalCost: record.costUsd,
        sessionIds: new Set([record.sessionId]),
        messageCount: 1,
      });
    }
  }

  return Array.from(projectMap.values())
    .map((p) => ({
      workingDir: p.workingDir,
      projectName: p.projectName,
      totalCost: p.totalCost,
      sessionCount: p.sessionIds.size,
      messageCount: p.messageCount,
    }))
    .sort((a, b) => b.totalCost - a.totalCost);
}

/**
 * Aggregate usage by model
 */
export function aggregateByModel(records: UsageRecord[]): Array<{
  model: string;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  messageCount: number;
  sessionCount: number;
}> {
  const modelMap = new Map<
    string,
    {
      model: string;
      totalCost: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      messageCount: number;
      sessionIds: Set<string>;
    }
  >();

  for (const record of records) {
    const existing = modelMap.get(record.model);

    if (existing) {
      existing.totalCost += record.costUsd;
      existing.totalInputTokens += record.inputTokens;
      existing.totalOutputTokens += record.outputTokens;
      existing.messageCount++;
      existing.sessionIds.add(record.sessionId);
    } else {
      modelMap.set(record.model, {
        model: record.model,
        totalCost: record.costUsd,
        totalInputTokens: record.inputTokens,
        totalOutputTokens: record.outputTokens,
        messageCount: 1,
        sessionIds: new Set([record.sessionId]),
      });
    }
  }

  return Array.from(modelMap.values())
    .map((m) => ({
      model: m.model,
      totalCost: m.totalCost,
      totalInputTokens: m.totalInputTokens,
      totalOutputTokens: m.totalOutputTokens,
      messageCount: m.messageCount,
      sessionCount: m.sessionIds.size,
    }))
    .sort((a, b) => b.totalCost - a.totalCost);
}

/**
 * Get top N items from a list
 */
export function getTopN<T>(items: T[], n: number): T[] {
  return items.slice(0, Math.min(n, items.length));
}

/**
 * Calculate percentage distribution
 */
export function calculateDistribution<T extends { totalCost: number }>(
  items: T[]
): Array<T & { percentage: number }> {
  const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);

  return items.map((item) => ({
    ...item,
    percentage: totalCost > 0 ? (item.totalCost / totalCost) * 100 : 0,
  }));
}

/**
 * Filter records by date range
 */
export function filterByDateRange(
  records: UsageRecord[],
  startDate: Date,
  endDate: Date
): UsageRecord[] {
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  return records.filter(
    (r) => r.timestamp >= startMs && r.timestamp <= endMs
  );
}

/**
 * Filter records by session IDs
 */
export function filterBySessionIds(
  records: UsageRecord[],
  sessionIds: string[]
): UsageRecord[] {
  const sessionIdSet = new Set(sessionIds);
  return records.filter((r) => sessionIdSet.has(r.sessionId));
}

/**
 * Filter records by models
 */
export function filterByModels(
  records: UsageRecord[],
  models: string[]
): UsageRecord[] {
  const modelSet = new Set(models);
  return records.filter((r) => modelSet.has(r.model));
}

/**
 * Get unique session IDs from records
 */
export function getUniqueSessionIds(records: UsageRecord[]): string[] {
  return Array.from(new Set(records.map((r) => r.sessionId)));
}

/**
 * Get unique models from records
 */
export function getUniqueModels(records: UsageRecord[]): string[] {
  return Array.from(new Set(records.map((r) => r.model)));
}

/**
 * Get unique projects from records
 */
export function getUniqueProjects(records: UsageRecord[]): string[] {
  return Array.from(new Set(records.map((r) => r.workingDir)));
}
