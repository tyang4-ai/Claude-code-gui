/**
 * Export Utilities
 *
 * Export usage data to various formats for external use
 */

import { format } from "date-fns";
import type { UsageRecord, UsageSummary } from "./types";

/**
 * Export usage data to CSV format
 */
export function exportToCSV(
  records: UsageRecord[],
  options: {
    includeHeaders?: boolean;
    dateFormat?: string;
  } = {}
): string {
  const {
    includeHeaders = true,
    dateFormat = "yyyy-MM-dd HH:mm:ss",
  } = options;

  const lines: string[] = [];

  // Add headers
  if (includeHeaders) {
    lines.push(
      "Date,Session ID,Working Directory,Model,Input Tokens,Output Tokens,Cost (USD),Duration (ms)"
    );
  }

  // Add records
  for (const record of records) {
    const date = format(new Date(record.timestamp), dateFormat);
    const workingDir = escapeCSV(record.workingDir);
    const model = escapeCSV(record.model);

    lines.push(
      `${date},${record.sessionId},${workingDir},${model},${record.inputTokens},${record.outputTokens},${record.costUsd.toFixed(4)},${record.durationMs}`
    );
  }

  return lines.join("\n");
}

/**
 * Export summary data to CSV format
 */
export function exportSummaryToCSV(summary: UsageSummary): string {
  const lines: string[] = [];

  // Overview section
  lines.push("Usage Summary");
  lines.push("");
  lines.push(
    `Period,${summary.period.charAt(0).toUpperCase() + summary.period.slice(1)}`
  );
  lines.push(
    `Start Date,${format(new Date(summary.startDate), "yyyy-MM-dd HH:mm:ss")}`
  );
  lines.push(
    `End Date,${format(new Date(summary.endDate), "yyyy-MM-dd HH:mm:ss")}`
  );
  lines.push(`Total Cost (USD),${summary.totalCostUsd.toFixed(4)}`);
  lines.push(`Total Sessions,${summary.totalSessions}`);
  lines.push(`Total Prompts,${summary.totalPrompts}`);
  lines.push(`Total Input Tokens,${summary.totalInputTokens}`);
  lines.push(`Total Output Tokens,${summary.totalOutputTokens}`);
  lines.push(
    `Average Duration (ms),${summary.averageDurationMs.toFixed(2)}`
  );
  lines.push("");

  // Model breakdown
  lines.push("Model Breakdown");
  lines.push(
    "Model,Cost (USD),Sessions,Prompts,Input Tokens,Output Tokens"
  );
  for (const model of summary.byModel) {
    lines.push(
      `${escapeCSV(model.model)},${model.costUsd.toFixed(4)},${model.sessions},${model.prompts},${model.inputTokens},${model.outputTokens}`
    );
  }
  lines.push("");

  // Project breakdown
  lines.push("Project Breakdown");
  lines.push("Project Name,Working Directory,Cost (USD),Sessions,Prompts");
  for (const project of summary.byProject) {
    lines.push(
      `${escapeCSV(project.projectName)},${escapeCSV(project.workingDir)},${project.costUsd.toFixed(4)},${project.sessions},${project.prompts}`
    );
  }
  lines.push("");

  // Daily breakdown
  lines.push("Daily Breakdown");
  lines.push("Date,Cost (USD),Sessions,Prompts");
  for (const day of summary.dailyBreakdown) {
    lines.push(
      `${day.date},${day.costUsd.toFixed(4)},${day.sessions},${day.prompts}`
    );
  }

  return lines.join("\n");
}

/**
 * Export usage data to JSON format
 */
export function exportToJSON(
  records: UsageRecord[],
  summary?: UsageSummary,
  pretty = true
): string {
  const data = {
    exportDate: new Date().toISOString(),
    recordCount: records.length,
    records,
    ...(summary && { summary }),
  };

  return JSON.stringify(data, null, pretty ? 2 : undefined);
}

/**
 * Escape CSV special characters
 */
function escapeCSV(value: string): string {
  // If the value contains comma, quotes, or newlines, wrap it in quotes and escape internal quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download data as a file (browser-side)
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType = "text/plain"
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(
  prefix: string,
  extension: string
): string {
  const timestamp = format(new Date(), "yyyy-MM-dd-HHmmss");
  return `${prefix}-${timestamp}.${extension}`;
}

/**
 * Export and download usage data as CSV
 */
export function exportAndDownloadCSV(
  records: UsageRecord[],
  filename?: string
): void {
  const csv = exportToCSV(records);
  const finalFilename = filename || generateFilename("usage", "csv");
  downloadFile(csv, finalFilename, "text/csv");
}

/**
 * Export and download summary as CSV
 */
export function exportAndDownloadSummaryCSV(
  summary: UsageSummary,
  filename?: string
): void {
  const csv = exportSummaryToCSV(summary);
  const finalFilename =
    filename || generateFilename(`usage-summary-${summary.period}`, "csv");
  downloadFile(csv, finalFilename, "text/csv");
}

/**
 * Export and download as JSON
 */
export function exportAndDownloadJSON(
  records: UsageRecord[],
  summary?: UsageSummary,
  filename?: string
): void {
  const json = exportToJSON(records, summary);
  const finalFilename = filename || generateFilename("usage", "json");
  downloadFile(json, finalFilename, "application/json");
}
