/**
 * SessionBrowser Component
 *
 * A comprehensive session browsing and management interface with:
 * - Searchable list of all past sessions
 * - Advanced filtering (date, cost, prompts)
 * - Session preview on hover
 * - Resume functionality
 * - Export/import capabilities
 * - Virtual scrolling for performance
 * - Keyboard navigation
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getSessionHistoryManager } from "../../modules/history";
import {
  searchSessions,
  filterByDateRange,
  filterByCostRange,
  filterByPromptCount,
  sortSessions,
  type SortBy,
  type SortOrder,
} from "../../modules/history/search";
import type {
  SessionSummary,
  PersistedSession,
  ExportFormat,
} from "../../modules/history/types";
import { restoreSession } from "../../core/store";

interface SessionBrowserProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Filters {
  startDate?: number;
  endDate?: number;
  minCost?: number;
  maxCost?: number;
  minPrompts?: number;
  maxPrompts?: number;
  tags?: string[];
  workingDir?: string;
}

export function SessionBrowser({ isOpen, onClose }: SessionBrowserProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [allSessions, setAllSessions] = useState<PersistedSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null);
  const [previewSession, setPreviewSession] = useState<PersistedSession | null>(null);
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());

  const parentRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  const historyManager = getSessionHistoryManager();

  // Load sessions on mount
  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const loadedSessions = await historyManager.getSessions();
      setSessions(loadedSessions);

      // Load full sessions for search
      const fullSessions: PersistedSession[] = [];
      for (const summary of loadedSessions) {
        const fullSession = await historyManager.getSession(summary.id);
        if (fullSession) {
          fullSessions.push(fullSession);
        }
      }
      setAllSessions(fullSessions);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and search
  useEffect(() => {
    let result = [...sessions];

    // Apply search
    if (searchQuery.trim()) {
      const searchResults = searchSessions(allSessions, searchQuery);
      result = searchResults.map((r) => r.session);
    }

    // Apply date filter
    if (filters.startDate || filters.endDate) {
      result = filterByDateRange(result, filters.startDate, filters.endDate);
    }

    // Apply cost filter
    if (filters.minCost !== undefined || filters.maxCost !== undefined) {
      result = filterByCostRange(result, filters.minCost, filters.maxCost);
    }

    // Apply prompt count filter
    if (filters.minPrompts !== undefined || filters.maxPrompts !== undefined) {
      result = filterByPromptCount(
        result,
        filters.minPrompts,
        filters.maxPrompts
      );
    }

    // Apply tag filter
    if (filters.tags && filters.tags.length > 0) {
      result = result.filter((s) =>
        filters.tags!.some((tag) => s.tags.includes(tag))
      );
    }

    // Apply working directory filter
    if (filters.workingDir) {
      result = result.filter((s) => s.workingDir === filters.workingDir);
    }

    // Apply sorting
    result = sortSessions(result, sortBy, sortOrder);

    setFilteredSessions(result);
  }, [sessions, allSessions, searchQuery, filters, sortBy, sortOrder]);

  // Virtual scrolling
  const rowVirtualizer = useVirtualizer({
    count: filteredSessions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  // Load preview on hover (debounced)
  const handleMouseEnter = useCallback(
    (sessionId: string) => {
      setHoveredSessionId(sessionId);

      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      hoverTimeoutRef.current = window.setTimeout(async () => {
        const fullSession = await historyManager.getSession(sessionId);
        if (fullSession && hoveredSessionId === sessionId) {
          setPreviewSession(fullSession);
        }
      }, 300);
    },
    [hoveredSessionId, historyManager]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredSessionId(null);
    setPreviewSession(null);

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  // Resume session
  const handleResumeSession = useCallback(
    async (sessionId: string) => {
      try {
        await restoreSession(sessionId);
        onClose();
      } catch (error) {
        console.error("Failed to resume session:", error);
      }
    },
    [onClose]
  );

  // Export session
  const handleExport = useCallback(
    async (sessionId: string, format: ExportFormat) => {
      try {
        const result = await historyManager.exportSession(sessionId, format);
        if (!result) return;

        // Use Tauri dialog to save file
        const { save } = await import("@tauri-apps/plugin-dialog");
        const filePath = await save({
          defaultPath: result.filename,
          filters: [
            {
              name: format.toUpperCase(),
              extensions: [format === "markdown" ? "md" : format],
            },
          ],
        });

        if (filePath) {
          const { invoke } = await import("@tauri-apps/api/core");
          await invoke("write_file_atomic", {
            path: filePath,
            content: result.content,
          });
        }
      } catch (error) {
        console.error("Failed to export session:", error);
      }
    },
    [historyManager]
  );

  // Export multiple sessions
  const handleExportMultiple = useCallback(
    async (format: ExportFormat) => {
      if (selectedSessions.size === 0) return;

      try {
        const sessionIds = Array.from(selectedSessions);
        const content = await historyManager.exportMultipleSessions(
          sessionIds,
          format
        );

        const { save } = await import("@tauri-apps/plugin-dialog");
        const filePath = await save({
          defaultPath: `claude-sessions-${Date.now()}.${
            format === "markdown" ? "md" : format
          }`,
          filters: [
            {
              name: format.toUpperCase(),
              extensions: [format === "markdown" ? "md" : format],
            },
          ],
        });

        if (filePath) {
          const { invoke } = await import("@tauri-apps/api/core");
          await invoke("write_file_atomic", { path: filePath, content });
        }
      } catch (error) {
        console.error("Failed to export sessions:", error);
      }
    },
    [selectedSessions, historyManager]
  );

  // Import session
  const handleImport = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        filters: [
          {
            name: "JSON",
            extensions: ["json"],
          },
        ],
      });

      if (!selected) return;

      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<{ content: string }>("read_file", {
        path: selected,
      });

      const imported: PersistedSession = JSON.parse(result.content);

      // Save to history
      await historyManager.saveSession({
        id: imported.id,
        claude_session_id: imported.claudeSessionId,
        working_dir: imported.workingDir,
        model: imported.model,
        status: imported.status,
        created_at: imported.createdAt,
        prompt_count: imported.promptCount,
        total_cost_usd: imported.totalCostUsd,
        transcript: imported.transcript,
        pendingEdits: [],
      });

      // Reload sessions
      await loadSessions();
    } catch (error) {
      console.error("Failed to import session:", error);
    }
  }, [historyManager, loadSessions]);

  // Delete session
  const handleDelete = useCallback(
    async (sessionId: string) => {
      if (!confirm("Are you sure you want to delete this session?")) return;

      try {
        await historyManager.deleteSession(sessionId);
        await loadSessions();
      } catch (error) {
        console.error("Failed to delete session:", error);
      }
    },
    [historyManager, loadSessions]
  );

  // Toggle pin
  const handleTogglePin = useCallback(
    async (sessionId: string) => {
      try {
        await historyManager.togglePin(sessionId);
        await loadSessions();
      } catch (error) {
        console.error("Failed to toggle pin:", error);
      }
    },
    [historyManager, loadSessions]
  );

  // Toggle selection
  const handleToggleSelection = useCallback((sessionId: string) => {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const currentIndex = selectedSession
          ? filteredSessions.findIndex((s) => s.id === selectedSession.id)
          : -1;
        const nextIndex = Math.min(
          currentIndex + 1,
          filteredSessions.length - 1
        );
        if (nextIndex >= 0) {
          setSelectedSession(filteredSessions[nextIndex]);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const currentIndex = selectedSession
          ? filteredSessions.findIndex((s) => s.id === selectedSession.id)
          : 0;
        const prevIndex = Math.max(currentIndex - 1, 0);
        setSelectedSession(filteredSessions[prevIndex]);
      } else if (e.key === "Enter" && selectedSession) {
        e.preventDefault();
        handleResumeSession(selectedSession.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedSession, filteredSessions, onClose, handleResumeSession]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        color: "#e8e8e8",
      }}
      onClick={onClose}
      data-testid="session-browser-backdrop"
    >
      <div
        style={{
          width: "90%",
          maxWidth: "1200px",
          height: "80%",
          backgroundColor: "#1d3d47",
          borderRadius: "12px",
          border: "1px solid #2a9d8f",
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
            borderBottom: "1px solid #2a9d8f",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 600, margin: 0 }}>
            Session Browser
          </h2>

          <div style={{ display: "flex", gap: "8px" }}>
            {/* Import button */}
            <button
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #2a9d8f",
                backgroundColor: "#264653",
                color: "#e8e8e8",
                fontSize: "14px",
                cursor: "pointer",
              }}
              onClick={handleImport}
              data-testid="import-button"
            >
              Import
            </button>

            {/* Export multiple */}
            {selectedSessions.size > 0 && (
              <button
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #2a9d8f",
                  backgroundColor: "#264653",
                  color: "#e8e8e8",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
                onClick={() => handleExportMultiple("json")}
                data-testid="export-multiple-button"
              >
                Export ({selectedSessions.size})
              </button>
            )}

            {/* Filter toggle */}
            <button
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #2a9d8f",
                backgroundColor: showFilters ? "#2a9d8f" : "#264653",
                color: "#e8e8e8",
                fontSize: "14px",
                cursor: "pointer",
              }}
              onClick={() => setShowFilters(!showFilters)}
              data-testid="filter-toggle"
            >
              Filters
            </button>

            {/* Close button */}
            <button
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#264653",
                color: "#e8e8e8",
                fontSize: "14px",
                cursor: "pointer",
              }}
              onClick={onClose}
              data-testid="close-button"
            >
              Close
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #2a9d8f" }}>
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #2a9d8f",
              backgroundColor: "#264653",
              color: "#e8e8e8",
              fontSize: "14px",
              outline: "none",
            }}
            data-testid="search-input"
          />
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid #2a9d8f",
              backgroundColor: "#264653",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "12px",
              }}
            >
              {/* Sort */}
              <div>
                <label style={{ fontSize: "12px", color: "#a0a0a0" }}>
                  Sort by
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  style={{
                    width: "100%",
                    padding: "6px",
                    borderRadius: "4px",
                    border: "1px solid #2a9d8f",
                    backgroundColor: "#1d3d47",
                    color: "#e8e8e8",
                    fontSize: "14px",
                  }}
                  data-testid="sort-by-select"
                >
                  <option value="date">Date</option>
                  <option value="cost">Cost</option>
                  <option value="prompts">Prompts</option>
                  <option value="title">Title</option>
                </select>
              </div>

              {/* Order */}
              <div>
                <label style={{ fontSize: "12px", color: "#a0a0a0" }}>
                  Order
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  style={{
                    width: "100%",
                    padding: "6px",
                    borderRadius: "4px",
                    border: "1px solid #2a9d8f",
                    backgroundColor: "#1d3d47",
                    color: "#e8e8e8",
                    fontSize: "14px",
                  }}
                  data-testid="sort-order-select"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>

              {/* Min cost */}
              <div>
                <label style={{ fontSize: "12px", color: "#a0a0a0" }}>
                  Min cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={filters.minCost || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      minCost: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "6px",
                    borderRadius: "4px",
                    border: "1px solid #2a9d8f",
                    backgroundColor: "#1d3d47",
                    color: "#e8e8e8",
                    fontSize: "14px",
                  }}
                  data-testid="min-cost-input"
                />
              </div>

              {/* Max cost */}
              <div>
                <label style={{ fontSize: "12px", color: "#a0a0a0" }}>
                  Max cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={filters.maxCost || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      maxCost: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "6px",
                    borderRadius: "4px",
                    border: "1px solid #2a9d8f",
                    backgroundColor: "#1d3d47",
                    color: "#e8e8e8",
                    fontSize: "14px",
                  }}
                  data-testid="max-cost-input"
                />
              </div>
            </div>

            {/* Clear filters */}
            <button
              style={{
                marginTop: "12px",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #2a9d8f",
                backgroundColor: "#1d3d47",
                color: "#e8e8e8",
                fontSize: "14px",
                cursor: "pointer",
              }}
              onClick={() => setFilters({})}
              data-testid="clear-filters-button"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Session list */}
          <div
            ref={parentRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 24px",
            }}
            data-testid="session-list"
          >
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#a0a0a0" }}>
                Loading sessions...
              </div>
            ) : filteredSessions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#a0a0a0" }}>
                No sessions found
              </div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const session = filteredSessions[virtualRow.index];
                  const isSelected = selectedSession?.id === session.id;
                  const isChecked = selectedSessions.has(session.id);

                  return (
                    <div
                      key={virtualRow.key}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div
                        style={{
                          padding: "12px",
                          borderRadius: "8px",
                          backgroundColor: isSelected ? "#264653" : "#1d3d47",
                          border: `1px solid ${isSelected ? "#2a9d8f" : "#264653"}`,
                          cursor: "pointer",
                          marginBottom: "8px",
                          display: "flex",
                          gap: "12px",
                          alignItems: "center",
                        }}
                        onClick={() => setSelectedSession(session)}
                        onMouseEnter={() => handleMouseEnter(session.id)}
                        onMouseLeave={handleMouseLeave}
                        onDoubleClick={() => handleResumeSession(session.id)}
                        data-testid={`session-item-${session.id}`}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelection(session.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: "pointer" }}
                          data-testid={`session-checkbox-${session.id}`}
                        />

                        {/* Pin indicator */}
                        {session.isPinned && (
                          <span style={{ color: "#e9c46a", fontSize: "16px" }}>
                            📌
                          </span>
                        )}

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: 500,
                              marginBottom: "4px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {session.title}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#a0a0a0",
                              marginBottom: "4px",
                            }}
                          >
                            {session.workingDir}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#6b6b6b",
                              display: "flex",
                              gap: "12px",
                            }}
                          >
                            <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                            <span>{session.promptCount} prompts</span>
                            {session.totalCostUsd > 0 && (
                              <span>${session.totalCostUsd.toFixed(4)}</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div
                          style={{ display: "flex", gap: "4px" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              border: "1px solid #2a9d8f",
                              backgroundColor: "#264653",
                              color: "#e8e8e8",
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                            onClick={() => handleTogglePin(session.id)}
                            title={session.isPinned ? "Unpin" : "Pin"}
                            data-testid={`pin-button-${session.id}`}
                          >
                            {session.isPinned ? "Unpin" : "Pin"}
                          </button>
                          <button
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              border: "1px solid #2a9d8f",
                              backgroundColor: "#2a9d8f",
                              color: "#e8e8e8",
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                            onClick={() => handleResumeSession(session.id)}
                            data-testid={`resume-button-${session.id}`}
                          >
                            Resume
                          </button>
                          <button
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              border: "1px solid #2a9d8f",
                              backgroundColor: "#264653",
                              color: "#e8e8e8",
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                            onClick={() => handleExport(session.id, "json")}
                            data-testid={`export-button-${session.id}`}
                          >
                            Export
                          </button>
                          <button
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              border: "1px solid #e76f51",
                              backgroundColor: "#264653",
                              color: "#e76f51",
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                            onClick={() => handleDelete(session.id)}
                            data-testid={`delete-button-${session.id}`}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview panel */}
          {previewSession && (
            <div
              style={{
                width: "400px",
                borderLeft: "1px solid #2a9d8f",
                padding: "16px",
                overflowY: "auto",
                backgroundColor: "#264653",
              }}
              data-testid="preview-panel"
            >
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
                Preview
              </h3>

              <div style={{ fontSize: "14px", marginBottom: "8px" }}>
                <strong>{previewSession.title}</strong>
              </div>

              <div style={{ fontSize: "12px", color: "#a0a0a0", marginBottom: "16px" }}>
                <div>Project: {previewSession.workingDir}</div>
                <div>Model: {previewSession.model}</div>
                <div>
                  Date: {new Date(previewSession.createdAt).toLocaleString()}
                </div>
                <div>Prompts: {previewSession.promptCount}</div>
                {previewSession.totalCostUsd > 0 && (
                  <div>Cost: ${previewSession.totalCostUsd.toFixed(4)}</div>
                )}
              </div>

              {previewSession.tags.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", color: "#a0a0a0", marginBottom: "4px" }}>
                    Tags:
                  </div>
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {previewSession.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: "2px 8px",
                          borderRadius: "12px",
                          backgroundColor: "#1d3d47",
                          fontSize: "11px",
                          color: "#2a9d8f",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: "12px", color: "#a0a0a0", marginBottom: "8px" }}>
                  First 3 messages:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {previewSession.transcript.slice(0, 3).map((entry, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "8px",
                        borderRadius: "6px",
                        backgroundColor: "#1d3d47",
                        fontSize: "12px",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          marginBottom: "4px",
                          color: entry.role === "user" ? "#e9c46a" : "#2a9d8f",
                        }}
                      >
                        {entry.role === "user" ? "User" : "Claude"}
                      </div>
                      <div
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {entry.role === "user"
                          ? entry.content
                          : entry.content
                              .filter((b) => b.type === "text")
                              .map((b) => (b.type === "text" ? b.text : ""))
                              .join(" ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid #2a9d8f",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
            color: "#a0a0a0",
          }}
        >
          <div>
            {filteredSessions.length} sessions
            {selectedSessions.size > 0 && ` (${selectedSessions.size} selected)`}
          </div>
          <div>
            <kbd
              style={{
                padding: "2px 6px",
                borderRadius: "4px",
                backgroundColor: "#264653",
                marginRight: "4px",
              }}
            >
              ↑↓
            </kbd>
            Navigate
            <kbd
              style={{
                padding: "2px 6px",
                borderRadius: "4px",
                backgroundColor: "#264653",
                marginLeft: "12px",
                marginRight: "4px",
              }}
            >
              Enter
            </kbd>
            Resume
            <kbd
              style={{
                padding: "2px 6px",
                borderRadius: "4px",
                backgroundColor: "#264653",
                marginLeft: "12px",
                marginRight: "4px",
              }}
            >
              Esc
            </kbd>
            Close
          </div>
        </div>
      </div>
    </div>
  );
}
