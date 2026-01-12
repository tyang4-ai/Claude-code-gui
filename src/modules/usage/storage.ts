/**
 * Usage Storage
 *
 * Persists usage records and budget settings.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  UsageRecord,
  UsageSummary,
  ModelUsage,
  ProjectUsage,
  DailyUsage,
  BudgetSettings,
  BudgetAlert,
  UsageStorageData,
} from "./types";

const STORAGE_VERSION = 1;
const USAGE_FILENAME = "usage.json";
const MAX_RECORDS = 10000; // Keep last 10000 records

const DEFAULT_BUDGET: BudgetSettings = {
  warningThreshold: 0.8,
  enabled: false,
};

/**
 * Get the usage storage file path
 */
async function getUsagePath(): Promise<string> {
  const appDataDir = await invoke<string>("get_app_data_dir");
  const normalized = appDataDir.replace(/\\/g, "/");
  return `${normalized}/${USAGE_FILENAME}`;
}

/**
 * Usage Storage Manager
 */
class UsageStorageManager {
  private records: UsageRecord[] = [];
  private budget: BudgetSettings = DEFAULT_BUDGET;
  private loaded = false;
  private storagePath: string | null = null;

  /**
   * Load usage data from storage
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      this.storagePath = await getUsagePath();

      const exists = await invoke<boolean>("file_exists", { path: this.storagePath });
      if (!exists) {
        this.loaded = true;
        return;
      }

      const result = await invoke<{ content: string }>("read_file", {
        path: this.storagePath,
      });
      const data: UsageStorageData = JSON.parse(result.content);

      this.records = data.records || [];
      this.budget = data.budget || DEFAULT_BUDGET;
      this.loaded = true;
    } catch (e) {
      console.error("Failed to load usage data:", e);
      this.loaded = true;
    }
  }

  /**
   * Save usage data to storage
   */
  async save(): Promise<void> {
    if (!this.storagePath) {
      this.storagePath = await getUsagePath();
    }

    // Keep only MAX_RECORDS most recent
    if (this.records.length > MAX_RECORDS) {
      this.records = this.records.slice(-MAX_RECORDS);
    }

    const data: UsageStorageData = {
      version: STORAGE_VERSION,
      records: this.records,
      budget: this.budget,
    };

    await invoke("write_file_atomic", {
      path: this.storagePath,
      content: JSON.stringify(data, null, 2),
    });
  }

  /**
   * Add a usage record
   */
  async addRecord(record: Omit<UsageRecord, "id">): Promise<UsageRecord> {
    await this.load();

    const fullRecord: UsageRecord = {
      ...record,
      id: crypto.randomUUID(),
    };

    this.records.push(fullRecord);
    await this.save();

    return fullRecord;
  }

  /**
   * Get usage summary for a time period
   */
  async getSummary(period: "day" | "week" | "month" | "all"): Promise<UsageSummary> {
    await this.load();

    const now = Date.now();
    let startDate: number;

    switch (period) {
      case "day":
        startDate = now - 24 * 60 * 60 * 1000;
        break;
      case "week":
        startDate = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startDate = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "all":
        startDate = 0;
        break;
    }

    const filtered = this.records.filter((r) => r.timestamp >= startDate);

    // Aggregate by model
    const modelMap = new Map<string, ModelUsage>();
    for (const r of filtered) {
      const existing = modelMap.get(r.model) || {
        model: r.model,
        costUsd: 0,
        sessions: 0,
        prompts: 0,
        inputTokens: 0,
        outputTokens: 0,
      };
      existing.costUsd += r.costUsd;
      existing.prompts++;
      existing.inputTokens += r.inputTokens;
      existing.outputTokens += r.outputTokens;
      modelMap.set(r.model, existing);
    }

    // Count unique sessions
    const sessionSet = new Set(filtered.map((r) => r.sessionId));
    for (const [, usage] of modelMap) {
      usage.sessions = filtered.filter((r) => r.model === usage.model)
        .map((r) => r.sessionId)
        .filter((v, i, a) => a.indexOf(v) === i).length;
    }

    // Aggregate by project
    const projectMap = new Map<string, ProjectUsage>();
    for (const r of filtered) {
      const projectName = r.workingDir.split(/[/\\]/).pop() || r.workingDir;
      const existing = projectMap.get(r.workingDir) || {
        workingDir: r.workingDir,
        projectName,
        costUsd: 0,
        sessions: 0,
        prompts: 0,
      };
      existing.costUsd += r.costUsd;
      existing.prompts++;
      projectMap.set(r.workingDir, existing);
    }

    // Count unique sessions per project
    for (const [dir, usage] of projectMap) {
      usage.sessions = filtered
        .filter((r) => r.workingDir === dir)
        .map((r) => r.sessionId)
        .filter((v, i, a) => a.indexOf(v) === i).length;
    }

    // Daily breakdown
    const dailyMap = new Map<string, DailyUsage>();
    for (const r of filtered) {
      const date = new Date(r.timestamp).toISOString().split("T")[0];
      const existing = dailyMap.get(date) || {
        date,
        costUsd: 0,
        sessions: 0,
        prompts: 0,
      };
      existing.costUsd += r.costUsd;
      existing.prompts++;
      dailyMap.set(date, existing);
    }

    // Count unique sessions per day
    for (const [date, usage] of dailyMap) {
      usage.sessions = filtered
        .filter((r) => new Date(r.timestamp).toISOString().split("T")[0] === date)
        .map((r) => r.sessionId)
        .filter((v, i, a) => a.indexOf(v) === i).length;
    }

    // Calculate totals
    const totalCostUsd = filtered.reduce((sum, r) => sum + r.costUsd, 0);
    const totalInputTokens = filtered.reduce((sum, r) => sum + r.inputTokens, 0);
    const totalOutputTokens = filtered.reduce((sum, r) => sum + r.outputTokens, 0);
    const totalDuration = filtered.reduce((sum, r) => sum + r.durationMs, 0);
    const averageDurationMs = filtered.length > 0 ? totalDuration / filtered.length : 0;

    return {
      period,
      startDate,
      endDate: now,
      totalCostUsd,
      totalSessions: sessionSet.size,
      totalPrompts: filtered.length,
      totalInputTokens,
      totalOutputTokens,
      averageDurationMs,
      byModel: Array.from(modelMap.values()).sort((a, b) => b.costUsd - a.costUsd),
      byProject: Array.from(projectMap.values()).sort((a, b) => b.costUsd - a.costUsd),
      dailyBreakdown: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  /**
   * Get budget settings
   */
  async getBudget(): Promise<BudgetSettings> {
    await this.load();
    return { ...this.budget };
  }

  /**
   * Update budget settings
   */
  async setBudget(budget: Partial<BudgetSettings>): Promise<void> {
    await this.load();
    this.budget = { ...this.budget, ...budget };
    await this.save();
  }

  /**
   * Check budget alerts
   */
  async checkBudgetAlerts(): Promise<BudgetAlert[]> {
    await this.load();

    if (!this.budget.enabled) {
      return [];
    }

    const alerts: BudgetAlert[] = [];

    // Check daily limit
    if (this.budget.dailyLimitUsd) {
      const dailySummary = await this.getSummary("day");
      const percentUsed = dailySummary.totalCostUsd / this.budget.dailyLimitUsd;

      if (percentUsed >= 1) {
        alerts.push({
          type: "exceeded",
          period: "daily",
          currentSpend: dailySummary.totalCostUsd,
          limitUsd: this.budget.dailyLimitUsd,
          percentUsed,
        });
      } else if (percentUsed >= this.budget.warningThreshold) {
        alerts.push({
          type: "warning",
          period: "daily",
          currentSpend: dailySummary.totalCostUsd,
          limitUsd: this.budget.dailyLimitUsd,
          percentUsed,
        });
      }
    }

    // Check weekly limit
    if (this.budget.weeklyLimitUsd) {
      const weeklySummary = await this.getSummary("week");
      const percentUsed = weeklySummary.totalCostUsd / this.budget.weeklyLimitUsd;

      if (percentUsed >= 1) {
        alerts.push({
          type: "exceeded",
          period: "weekly",
          currentSpend: weeklySummary.totalCostUsd,
          limitUsd: this.budget.weeklyLimitUsd,
          percentUsed,
        });
      } else if (percentUsed >= this.budget.warningThreshold) {
        alerts.push({
          type: "warning",
          period: "weekly",
          currentSpend: weeklySummary.totalCostUsd,
          limitUsd: this.budget.weeklyLimitUsd,
          percentUsed,
        });
      }
    }

    // Check monthly limit
    if (this.budget.monthlyLimitUsd) {
      const monthlySummary = await this.getSummary("month");
      const percentUsed = monthlySummary.totalCostUsd / this.budget.monthlyLimitUsd;

      if (percentUsed >= 1) {
        alerts.push({
          type: "exceeded",
          period: "monthly",
          currentSpend: monthlySummary.totalCostUsd,
          limitUsd: this.budget.monthlyLimitUsd,
          percentUsed,
        });
      } else if (percentUsed >= this.budget.warningThreshold) {
        alerts.push({
          type: "warning",
          period: "monthly",
          currentSpend: monthlySummary.totalCostUsd,
          limitUsd: this.budget.monthlyLimitUsd,
          percentUsed,
        });
      }
    }

    return alerts;
  }

  /**
   * Get cost for a specific session
   */
  async getSessionCost(sessionId: string): Promise<number> {
    await this.load();
    return this.records
      .filter((r) => r.sessionId === sessionId)
      .reduce((sum, r) => sum + r.costUsd, 0);
  }

  /**
   * Get records for a session
   */
  async getSessionRecords(sessionId: string): Promise<UsageRecord[]> {
    await this.load();
    return this.records.filter((r) => r.sessionId === sessionId);
  }

  /**
   * Clear all usage data
   */
  async clear(): Promise<void> {
    this.records = [];
    await this.save();
  }

  /**
   * Force reload from disk
   */
  async reload(): Promise<void> {
    this.loaded = false;
    this.records = [];
    this.budget = DEFAULT_BUDGET;
    await this.load();
  }
}

// Singleton instance
export const usageStorage = new UsageStorageManager();
