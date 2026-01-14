/**
 * Usage Dashboard Component
 *
 * Displays comprehensive analytics and cost tracking for Claude API usage
 */

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getUsageManager } from "../../modules/usage";
import { formatCost, formatTokens } from "../../modules/usage/calculator";
import {
  exportAndDownloadCSV,
  exportAndDownloadSummaryCSV,
  exportAndDownloadJSON,
} from "../../modules/usage/export";
import { usageStorage } from "../../modules/usage/storage";
import type { UsageSummary, BudgetAlert, UsageRecord } from "../../modules/usage/types";

// Color scheme for charts (matching design system)
const COLORS = {
  primary: "#58a6ff",   // Accent blue
  secondary: "#3fb950", // Success green
  tertiary: "#d29922",  // Warning amber
  quaternary: "#f85149",// Error red
  accent: "#a371f7",    // Purple accent
  background: "var(--color-bg-elevated)",
  surface: "var(--color-bg-surface)",
  text: "var(--color-text-primary)",
  textMuted: "var(--color-text-secondary)",
  border: "var(--color-border-default)",
};

const CHART_COLORS = [
  "#58a6ff", // Blue
  "#3fb950", // Green
  "#d29922", // Amber
  "#f85149", // Red
  "#a371f7", // Purple
  "#39d4ff", // Cyan
  "#f78166", // Orange
  "#ff7b72", // Pink
  "#79c0ff", // Light blue
  "#7ee787", // Light green
];

interface UsageDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UsageDashboard({ isOpen, onClose }: UsageDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month" | "all">("week");
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [allRecords, setAllRecords] = useState<UsageRecord[]>([]);
  const [_budgetEnabled, setBudgetEnabled] = useState(false);

  // Load data
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const usageManager = getUsageManager();
        const summaryData = await usageManager.getSummary(selectedPeriod);
        const alertsData = await usageManager.checkBudgetAlerts();
        const budgetSettings = await usageManager.getBudget();

        setSummary(summaryData);
        setAlerts(alertsData);
        setBudgetEnabled(budgetSettings.enabled);

        // Load all records for charts
        await usageStorage.load();
        const records = await usageStorage.getSessionRecords("");
        setAllRecords(records);
      } catch (err) {
        console.error("Failed to load usage data:", err);
        setError("Failed to load usage data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, selectedPeriod]);

  // Export handlers
  const handleExportCSV = () => {
    if (allRecords.length === 0) return;
    exportAndDownloadCSV(allRecords);
  };

  const handleExportSummaryCSV = () => {
    if (!summary) return;
    exportAndDownloadSummaryCSV(summary);
  };

  const handleExportJSON = () => {
    if (allRecords.length === 0) return;
    exportAndDownloadJSON(allRecords, summary || undefined);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={onClose}
      >
        {/* Dashboard Modal */}
        <div
          style={{
            width: "90vw",
            maxWidth: "1400px",
            height: "90vh",
            backgroundColor: "var(--glass-bg)",
            backdropFilter: "blur(var(--glass-blur))",
            WebkitBackdropFilter: "blur(var(--glass-blur))",
            borderRadius: "var(--radius-lg)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "var(--shadow-xl)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid var(--color-border-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)" }}>
              Usage Dashboard
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Period Selector */}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border-default)",
                  backgroundColor: "var(--color-bg-base)",
                  color: "var(--color-text-primary)",
                  fontSize: "var(--text-base)",
                  cursor: "pointer",
                }}
                data-testid="period-selector"
              >
                <option value="day">Last 24 Hours</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>

              {/* Close Button */}
              <button
                onClick={onClose}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  backgroundColor: "transparent",
                  color: "var(--color-text-secondary)",
                  cursor: "pointer",
                  fontSize: "var(--text-lg)",
                  transition: "color var(--transition-fast)",
                }}
                aria-label="Close dashboard"
                data-testid="close-dashboard"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            {loading && (
              <div style={{ textAlign: "center", padding: "48px", color: "var(--color-text-secondary)" }}>
                Loading usage data...
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "var(--color-error)",
                  color: "white",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "16px",
                }}
                data-testid="error-message"
              >
                {error}
              </div>
            )}

            {!loading && !error && summary && (
              <>
                {/* Budget Alerts */}
                {alerts.length > 0 && (
                  <div style={{ marginBottom: "24px" }}>
                    {alerts.map((alert, index) => (
                      <div
                        key={index}
                        style={{
                          padding: "12px 16px",
                          backgroundColor: alert.type === "exceeded" ? "var(--color-error)" : "var(--color-warning)",
                          color: "white",
                          borderRadius: "var(--radius-md)",
                          marginBottom: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                        data-testid={`alert-${alert.type}`}
                      >
                        <span style={{ fontSize: "18px" }}>
                          {alert.type === "exceeded" ? "⚠️" : "⚡"}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "var(--font-semibold)" }}>
                            {alert.type === "exceeded"
                              ? `${alert.period.charAt(0).toUpperCase() + alert.period.slice(1)} Budget Exceeded`
                              : `Approaching ${alert.period.charAt(0).toUpperCase() + alert.period.slice(1)} Budget`}
                          </div>
                          <div style={{ fontSize: "var(--text-base)", opacity: 0.9 }}>
                            {formatCost(alert.currentSpend)} / {formatCost(alert.limitUsd)} (
                            {alert.percentUsed.toFixed(1)}%)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Overview Cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "16px",
                    marginBottom: "24px",
                  }}
                >
                  <StatCard
                    title="Total Cost"
                    value={formatCost(summary.totalCostUsd)}
                    icon="💵"
                  />
                  <StatCard
                    title="Sessions"
                    value={summary.totalSessions.toString()}
                    icon="📊"
                  />
                  <StatCard
                    title="Messages"
                    value={summary.totalPrompts.toString()}
                    icon="💬"
                  />
                  <StatCard
                    title="Input Tokens"
                    value={formatTokens(summary.totalInputTokens)}
                    icon="📥"
                  />
                  <StatCard
                    title="Output Tokens"
                    value={formatTokens(summary.totalOutputTokens)}
                    icon="📤"
                  />
                  <StatCard
                    title="Avg Duration"
                    value={formatDuration(summary.averageDurationMs)}
                    icon="⏱️"
                  />
                </div>

                {/* Charts Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                  {/* Cost Over Time Chart */}
                  <ChartCard title="Cost Over Time">
                    {summary.dailyBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={summary.dailyBreakdown}>
                          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                          <XAxis dataKey="date" stroke={COLORS.textMuted} fontSize={12} />
                          <YAxis stroke={COLORS.textMuted} fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: COLORS.surface,
                              border: `1px solid ${COLORS.border}`,
                              borderRadius: "6px",
                              color: COLORS.text,
                            }}
                            formatter={(value) => [formatCost(value as number), "Cost"]}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="costUsd"
                            stroke={COLORS.primary}
                            strokeWidth={2}
                            name="Cost (USD)"
                            dot={{ fill: COLORS.primary }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <NoDataMessage />
                    )}
                  </ChartCard>

                  {/* Messages Over Time Chart */}
                  <ChartCard title="Messages Over Time">
                    {summary.dailyBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={summary.dailyBreakdown}>
                          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                          <XAxis dataKey="date" stroke={COLORS.textMuted} fontSize={12} />
                          <YAxis stroke={COLORS.textMuted} fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: COLORS.surface,
                              border: `1px solid ${COLORS.border}`,
                              borderRadius: "6px",
                              color: COLORS.text,
                            }}
                          />
                          <Legend />
                          <Bar dataKey="prompts" fill={COLORS.secondary} name="Messages" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <NoDataMessage />
                    )}
                  </ChartCard>
                </div>

                {/* Model Breakdown */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                  <ChartCard title="Cost by Model">
                    {summary.byModel.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={summary.byModel as never[]}
                            dataKey="costUsd"
                            nameKey="model"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ name, value }) => `${(name as string).split("-").pop()}: ${formatCost(value as number)}`}
                          >
                            {summary.byModel.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: COLORS.surface,
                              border: `1px solid ${COLORS.border}`,
                              borderRadius: "6px",
                              color: COLORS.text,
                            }}
                            formatter={(value) => [formatCost(value as number), "Cost"]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <NoDataMessage />
                    )}
                  </ChartCard>

                  {/* Project Breakdown */}
                  <ChartCard title="Top Projects by Cost">
                    {summary.byProject.length > 0 ? (
                      <div style={{ padding: "16px" }}>
                        {summary.byProject.slice(0, 5).map((project, index) => (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px",
                              backgroundColor: "var(--color-bg-overlay)",
                              borderRadius: "var(--radius-md)",
                              marginBottom: "8px",
                            }}
                          >
                            <div style={{ flex: 1, overflow: "hidden" }}>
                              <div style={{ fontWeight: "var(--font-medium)", fontSize: "var(--text-base)", color: "var(--color-text-primary)" }}>
                                {project.projectName}
                              </div>
                              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                                {project.sessions} sessions • {project.prompts} messages
                              </div>
                            </div>
                            <div style={{ fontWeight: "var(--font-semibold)", color: "var(--color-accent)" }}>
                              {formatCost(project.costUsd)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <NoDataMessage />
                    )}
                  </ChartCard>
                </div>

                {/* Export Actions */}
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "16px",
                    backgroundColor: "var(--color-bg-elevated)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border-muted)",
                  }}
                >
                  <button
                    onClick={handleExportCSV}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border-default)",
                      backgroundColor: "var(--color-bg-surface)",
                      color: "var(--color-text-primary)",
                      cursor: "pointer",
                      fontSize: "var(--text-base)",
                      fontWeight: "var(--font-medium)",
                      transition: "background-color var(--transition-fast)",
                    }}
                    data-testid="export-csv"
                  >
                    Export Records (CSV)
                  </button>
                  <button
                    onClick={handleExportSummaryCSV}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border-default)",
                      backgroundColor: "var(--color-bg-surface)",
                      color: "var(--color-text-primary)",
                      cursor: "pointer",
                      fontSize: "var(--text-base)",
                      fontWeight: "var(--font-medium)",
                      transition: "background-color var(--transition-fast)",
                    }}
                    data-testid="export-summary-csv"
                  >
                    Export Summary (CSV)
                  </button>
                  <button
                    onClick={handleExportJSON}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border-default)",
                      backgroundColor: "var(--color-bg-surface)",
                      color: "var(--color-text-primary)",
                      cursor: "pointer",
                      fontSize: "var(--text-base)",
                      fontWeight: "var(--font-medium)",
                      transition: "background-color var(--transition-fast)",
                    }}
                    data-testid="export-json"
                  >
                    Export (JSON)
                  </button>
                </div>
              </>
            )}

            {!loading && !error && !summary && (
              <NoDataMessage message="No usage data available yet. Start using Claude to see analytics here." />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Helper Components

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div
      style={{
        padding: "16px",
        backgroundColor: "var(--color-bg-elevated)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-border-muted)",
        boxShadow: "var(--shadow-sm)",
      }}
      data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "var(--text-xl)" }}>{icon}</span>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {title}
        </div>
      </div>
      <div style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "16px",
        backgroundColor: "var(--color-bg-elevated)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-border-muted)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <h3 style={{ margin: "0 0 16px 0", fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function NoDataMessage({ message = "No data available for this period" }: { message?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "200px",
        color: "var(--color-text-secondary)",
        fontSize: "var(--text-base)",
      }}
      data-testid="no-data-message"
    >
      {message}
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else if (ms < 3_600_000) {
    const mins = Math.floor(ms / 60_000);
    return `${mins}m`;
  } else {
    const hours = Math.floor(ms / 3_600_000);
    const mins = Math.floor((ms % 3_600_000) / 60_000);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}
