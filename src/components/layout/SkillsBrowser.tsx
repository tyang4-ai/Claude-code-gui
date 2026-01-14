/**
 * SkillsBrowser - Main skills browser component
 *
 * Features:
 * - Grid and list view modes
 * - Search and filtering
 * - Skill activation toggles
 * - Skill details view
 * - Configuration UI
 * - Bulk operations
 * - Import/export
 * - Keyboard navigation
 */

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useShallow } from "zustand/react/shallow";
import {
  useSkillsBrowser,
} from "../../modules/skills/browser";
import type {
  ExtendedSkill,
  SkillCategory,
  ViewMode,
  SkillConfiguration,
  SkillFilter,
} from "../../modules/skills/browser-types";
import { downloadExport, uploadImport, validateSkillParameters } from "../../modules/skills/activation";

interface SkillsBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  workingDir?: string;
}

export function SkillsBrowser({ isOpen, onClose, workingDir = "." }: SkillsBrowserProps) {
  const [showingDetails, setShowingDetails] = useState(false);
  const [showingConfig, setShowingConfig] = useState(false);
  const [configParams, setConfigParams] = useState<Record<string, string | number | boolean>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Store state - use useShallow for object/array returns to avoid infinite loops
  const {
    skills: allSkills,
    selectedSkills: selectedSkillsSet,
    activeSkillId,
    viewMode,
    searchQuery,
    filter,
    sort,
    isLoading,
    error,
    configurations
  } = useSkillsBrowser(useShallow((state) => ({
    skills: state.skills,
    selectedSkills: state.selectedSkills,
    activeSkillId: state.activeSkillId,
    viewMode: state.viewMode,
    searchQuery: state.searchQuery,
    filter: state.filter,
    sort: state.sort,
    isLoading: state.isLoading,
    error: state.error,
    configurations: state.configurations,
  })));

  // Compute filtered skills with useMemo to avoid creating new arrays on each render
  const skills = useMemo(() => {
    let filtered = [...allSkills];

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (skill) =>
          skill.name.toLowerCase().includes(query) ||
          skill.description.toLowerCase().includes(query) ||
          skill.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (filter.categories && filter.categories.length > 0) {
      filtered = filtered.filter((skill) =>
        filter.categories!.includes(skill.category)
      );
    }

    // Apply enabled filter
    if (filter.enabled !== undefined) {
      filtered = filtered.filter(
        (skill) => (configurations[skill.id]?.enabled ?? true) === filter.enabled
      );
    }

    // Apply configurable filter
    if (filter.configurable !== undefined) {
      filtered = filtered.filter(
        (skill) => skill.configurable === filter.configurable
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sort.by) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
        case "usage":
          comparison = (b.usageCount || 0) - (a.usageCount || 0);
          break;
        case "recent":
          comparison = (b.lastUsed || 0) - (a.lastUsed || 0);
          break;
      }
      return sort.order === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [allSkills, searchQuery, filter, sort, configurations]);

  // Compute active skill
  const activeSkill = useMemo(() => {
    if (!activeSkillId) return null;
    return allSkills.find((s) => s.id === activeSkillId) || null;
  }, [activeSkillId, allSkills]);

  // Compute enabled count
  const enabledCount = useMemo(() => {
    return allSkills.filter((skill) =>
      configurations[skill.id]?.enabled ?? true
    ).length;
  }, [allSkills, configurations]);

  // Compute selected skills array
  const selectedSkills = useMemo(() => {
    return allSkills.filter((skill) => selectedSkillsSet.has(skill.id));
  }, [allSkills, selectedSkillsSet]);

  // Store actions
  const loadSkills = useSkillsBrowser((state) => state.loadSkills);
  const refreshSkills = useSkillsBrowser((state) => state.refreshSkills);
  const setViewMode = useSkillsBrowser((state) => state.setViewMode);
  const setSearchQuery = useSkillsBrowser((state) => state.setSearchQuery);
  const setFilter = useSkillsBrowser((state) => state.setFilter);
  const clearFilter = useSkillsBrowser((state) => state.clearFilter);
  const selectSkill = useSkillsBrowser((state) => state.selectSkill);
  const deselectSkill = useSkillsBrowser((state) => state.deselectSkill);
  const selectAll = useSkillsBrowser((state) => state.selectAll);
  const clearSelection = useSkillsBrowser((state) => state.clearSelection);
  const setActiveSkill = useSkillsBrowser((state) => state.setActiveSkill);
  const toggleSkill = useSkillsBrowser((state) => state.toggleSkill);
  const configureSkill = useSkillsBrowser((state) => state.configureSkill);
  const bulkActivate = useSkillsBrowser((state) => state.bulkActivate);
  const bulkDeactivate = useSkillsBrowser((state) => state.bulkDeactivate);
  const exportSelected = useSkillsBrowser((state) => state.exportSelected);
  const importSkills = useSkillsBrowser((state) => state.importSkills);
  const clearError = useSkillsBrowser((state) => state.clearError);

  // Load skills on mount - only when workingDir changes and component opens
  useEffect(() => {
    if (isOpen) {
      loadSkills(workingDir);
    }
  }, [workingDir, isOpen, loadSkills]);

  // Focus search on mount
  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  // Track selection count for keyboard handler without causing re-renders
  const hasSelection = selectedSkills.length > 0;

  // Define handlers BEFORE the keyboard effect that uses them
  const handleSkillClick = useCallback((skill: ExtendedSkill) => {
    setActiveSkill(skill.id);
    setShowingDetails(true);
    setShowingConfig(false);
  }, [setActiveSkill]);

  const handleSkillToggle = useCallback((e: React.MouseEvent, skillId: string, enabled: boolean) => {
    e.stopPropagation();
    toggleSkill(skillId, enabled);
  }, [toggleSkill]);

  const handleSkillSelect = useCallback((e: React.MouseEvent, skillId: string) => {
    e.stopPropagation();
    const isSelected = selectedSkills.some(s => s.id === skillId);
    if (isSelected) {
      deselectSkill(skillId);
    } else {
      selectSkill(skillId);
    }
  }, [selectedSkills, selectSkill, deselectSkill]);

  const handleConfigure = useCallback(() => {
    if (!activeSkill) return;

    const config = configurations[activeSkill.id];
    if (config?.parameters) {
      setConfigParams(config.parameters);
    } else if (activeSkill.parameters) {
      // Initialize with default values
      const defaults: Record<string, string | number | boolean> = {};
      activeSkill.parameters.forEach(param => {
        if (param.defaultValue !== undefined) {
          defaults[param.name] = param.defaultValue;
        }
      });
      setConfigParams(defaults);
    }

    setShowingDetails(false);
    setShowingConfig(true);
  }, [activeSkill, configurations]);

  const handleSaveConfig = useCallback(() => {
    if (!activeSkill) return;

    // Validate parameters
    const validation = validateSkillParameters(activeSkill, configParams);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    configureSkill(activeSkill.id, {
      parameters: configParams,
      enabled: true,
    });

    setShowingConfig(false);
    setValidationErrors([]);
  }, [activeSkill, configParams, configureSkill]);

  const handleExport = useCallback(async () => {
    const exportData = exportSelected();
    if (exportData) {
      await downloadExport(exportData, `skills-export-${Date.now()}.json`);
    }
  }, [exportSelected]);

  const handleImport = useCallback(async () => {
    try {
      const importData = await uploadImport();
      importSkills(importData);
      refreshSkills(workingDir);
    } catch (error) {
      console.error("Import failed:", error);
    }
  }, [importSkills, refreshSkills, workingDir]);

  // Keyboard shortcuts - AFTER handlers are defined
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape - close modal or clear selection
      if (e.key === "Escape") {
        if (showingDetails || showingConfig) {
          setShowingDetails(false);
          setShowingConfig(false);
          setActiveSkill(null);
        } else if (hasSelection) {
          clearSelection();
        } else {
          onClose();
        }
        return;
      }

      // Ctrl+A - select all
      if (e.ctrlKey && e.key === "a" && !showingDetails && !showingConfig) {
        e.preventDefault();
        selectAll();
        return;
      }

      // Ctrl+Shift+A - clear selection
      if (e.ctrlKey && e.shiftKey && e.key === "A") {
        e.preventDefault();
        clearSelection();
        return;
      }

      // Ctrl+F - focus search
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Ctrl+R - refresh
      if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        refreshSkills(workingDir);
        return;
      }

      // Ctrl+E - export selected
      if (e.ctrlKey && e.key === "e" && hasSelection) {
        e.preventDefault();
        handleExport();
        return;
      }

      // Ctrl+I - import
      if (e.ctrlKey && e.key === "i") {
        e.preventDefault();
        handleImport();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showingDetails, showingConfig, hasSelection, onClose, setActiveSkill, clearSelection, selectAll, refreshSkills, workingDir, handleExport, handleImport]);

  if (!isOpen) return null;

  return (
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
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--glass-bg)",
          backdropFilter: "blur(var(--glass-blur))",
          WebkitBackdropFilter: "blur(var(--glass-blur))",
          borderRadius: "var(--radius-lg)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "var(--shadow-xl)",
          maxWidth: showingDetails || showingConfig ? "1200px" : "1000px",
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <SkillsBrowserHeader
          onClose={onClose}
          enabledCount={enabledCount}
          totalCount={skills.length}
          selectedCount={selectedSkills.length}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onRefresh={() => refreshSkills(workingDir)}
          onExport={handleExport}
          onImport={handleImport}
          onBulkActivate={() => bulkActivate(selectedSkills.map(s => s.id))}
          onBulkDeactivate={() => bulkDeactivate(selectedSkills.map(s => s.id))}
          hasSelection={selectedSkills.length > 0}
        />

        {/* Search and Filters */}
        <SkillsBrowserFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filter={filter}
          onFilterChange={setFilter}
          onClearFilter={clearFilter}
          searchInputRef={searchInputRef}
        />

        {/* Error Banner */}
        {error && (
          <div style={{
            backgroundColor: "var(--color-error)",
            color: "white",
            padding: "12px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>{error}</span>
            <button
              onClick={clearError}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                padding: "4px"
              }}
            >
              <CloseIcon />
            </button>
          </div>
        )}

        {/* Main Content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Skills Grid/List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            {isLoading ? (
              <LoadingSpinner />
            ) : skills.length === 0 ? (
              <EmptyState />
            ) : viewMode === "grid" ? (
              <SkillsGrid
                skills={skills}
                selectedSkills={selectedSkills}
                configurations={configurations}
                onSkillClick={handleSkillClick}
                onSkillToggle={handleSkillToggle}
                onSkillSelect={handleSkillSelect}
              />
            ) : (
              <SkillsList
                skills={skills}
                selectedSkills={selectedSkills}
                configurations={configurations}
                onSkillClick={handleSkillClick}
                onSkillToggle={handleSkillToggle}
                onSkillSelect={handleSkillSelect}
              />
            )}
          </div>

          {/* Details Panel */}
          {showingDetails && activeSkill && (
            <SkillDetailsPanel
              skill={activeSkill}
              configuration={configurations[activeSkill.id]}
              onClose={() => {
                setShowingDetails(false);
                setActiveSkill(null);
              }}
              onConfigure={handleConfigure}
              onToggle={(enabled) => toggleSkill(activeSkill.id, enabled)}
            />
          )}

          {/* Config Panel */}
          {showingConfig && activeSkill && (
            <SkillConfigPanel
              skill={activeSkill}
              parameters={configParams}
              validationErrors={validationErrors}
              onChange={setConfigParams}
              onSave={handleSaveConfig}
              onCancel={() => {
                setShowingConfig(false);
                setValidationErrors([]);
              }}
            />
          )}
        </div>

        {/* Footer */}
        <SkillsBrowserFooter
          skillsCount={skills.length}
          enabledCount={enabledCount}
          selectedCount={selectedSkills.length}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface SkillsBrowserHeaderProps {
  onClose: () => void;
  enabledCount: number;
  totalCount: number;
  selectedCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onRefresh: () => void;
  onExport: () => void;
  onImport: () => void;
  onBulkActivate: () => void;
  onBulkDeactivate: () => void;
  hasSelection: boolean;
}

function SkillsBrowserHeader({
  onClose,
  enabledCount,
  totalCount,
  selectedCount,
  viewMode,
  onViewModeChange,
  onRefresh,
  onExport,
  onImport,
  onBulkActivate,
  onBulkDeactivate,
  hasSelection,
}: SkillsBrowserHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: "1px solid var(--color-border-muted)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 600, margin: 0 }}>
          Skills Browser
        </h2>
        <span style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
          {enabledCount} / {totalCount} active
        </span>
        {selectedCount > 0 && (
          <span style={{ fontSize: "14px", color: "var(--color-accent)" }}>
            {selectedCount} selected
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* View Mode Toggle */}
        <div style={{ display: "flex", backgroundColor: "var(--color-bg-surface)", borderRadius: "6px", padding: "2px" }}>
          <button
            onClick={() => onViewModeChange("grid")}
            style={{
              padding: "6px 12px",
              border: "none",
              background: viewMode === "grid" ? "var(--color-accent)" : "transparent",
              color: "var(--color-text-primary)",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px"
            }}
            title="Grid View"
          >
            Grid
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            style={{
              padding: "6px 12px",
              border: "none",
              background: viewMode === "list" ? "var(--color-accent)" : "transparent",
              color: "var(--color-text-primary)",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px"
            }}
            title="List View"
          >
            List
          </button>
        </div>

        {/* Bulk Actions */}
        {hasSelection && (
          <>
            <button
              onClick={onBulkActivate}
              style={{
                padding: "6px 12px",
                backgroundColor: "var(--color-accent)",
                border: "none",
                borderRadius: "6px",
                color: "white",
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Activate Selected (Ctrl+Shift+E)"
            >
              Activate
            </button>
            <button
              onClick={onBulkDeactivate}
              style={{
                padding: "6px 12px",
                backgroundColor: "var(--color-error)",
                border: "none",
                borderRadius: "6px",
                color: "white",
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Deactivate Selected (Ctrl+Shift+D)"
            >
              Deactivate
            </button>
            <button
              onClick={onExport}
              style={{
                padding: "6px 12px",
                backgroundColor: "var(--color-bg-surface)",
                border: "1px solid var(--color-border-muted)",
                borderRadius: "6px",
                color: "var(--color-text-primary)",
                cursor: "pointer",
                fontSize: "12px"
              }}
              title="Export Selected (Ctrl+E)"
            >
              Export
            </button>
          </>
        )}

        {/* Import */}
        <button
          onClick={onImport}
          style={{
            padding: "6px 12px",
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-muted)",
            borderRadius: "6px",
            color: "var(--color-text-primary)",
            cursor: "pointer",
            fontSize: "12px"
          }}
          title="Import Skills (Ctrl+I)"
        >
          Import
        </button>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          style={{
            padding: "6px",
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-muted)",
            borderRadius: "6px",
            color: "var(--color-text-primary)",
            cursor: "pointer"
          }}
          title="Refresh (Ctrl+R)"
        >
          <RefreshIcon />
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            padding: "6px",
            backgroundColor: "transparent",
            border: "none",
            color: "var(--color-text-secondary)",
            cursor: "pointer"
          }}
          title="Close (Esc)"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

interface SkillsBrowserFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: SkillFilter;
  onFilterChange: (filter: Partial<SkillFilter>) => void;
  onClearFilter: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

function SkillsBrowserFilters({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  onClearFilter,
  searchInputRef,
}: SkillsBrowserFiltersProps) {
  const categories: SkillCategory[] = [
    "development",
    "writing",
    "analysis",
    "testing",
    "documentation",
    "devops",
  ];

  const hasActiveFilter =
    searchQuery ||
    (filter.categories && filter.categories.length > 0) ||
    filter.enabled !== undefined ||
    filter.configurable !== undefined;

  return (
    <div
      style={{
        padding: "12px 20px",
        borderBottom: "1px solid var(--color-border-muted)",
        display: "flex",
        gap: "12px",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {/* Search */}
      <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search skills... (Ctrl+F)"
          style={{
            width: "100%",
            padding: "8px 32px 8px 12px",
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-muted)",
            borderRadius: "6px",
            color: "var(--color-text-primary)",
            fontSize: "14px",
          }}
        />
        <div style={{
          position: "absolute",
          right: "8px",
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--color-text-secondary)"
        }}>
          <SearchIcon />
        </div>
      </div>

      {/* Category Filter */}
      <select
        value={filter.categories?.[0] || ""}
        onChange={(e) =>
          onFilterChange({
            categories: e.target.value ? [e.target.value as SkillCategory] : undefined,
          })
        }
        style={{
          padding: "8px 12px",
          backgroundColor: "var(--color-bg-surface)",
          border: "1px solid var(--color-border-muted)",
          borderRadius: "6px",
          color: "var(--color-text-primary)",
          fontSize: "14px",
          cursor: "pointer",
        }}
      >
        <option value="">All Categories</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </option>
        ))}
      </select>

      {/* Status Filter */}
      <select
        value={
          filter.enabled === true ? "enabled" : filter.enabled === false ? "disabled" : ""
        }
        onChange={(e) =>
          onFilterChange({
            enabled:
              e.target.value === "enabled"
                ? true
                : e.target.value === "disabled"
                ? false
                : undefined,
          })
        }
        style={{
          padding: "8px 12px",
          backgroundColor: "var(--color-bg-surface)",
          border: "1px solid var(--color-border-muted)",
          borderRadius: "6px",
          color: "var(--color-text-primary)",
          fontSize: "14px",
          cursor: "pointer",
        }}
      >
        <option value="">All Status</option>
        <option value="enabled">Enabled</option>
        <option value="disabled">Disabled</option>
      </select>

      {/* Clear Filters */}
      {hasActiveFilter && (
        <button
          onClick={onClearFilter}
          style={{
            padding: "8px 12px",
            backgroundColor: "var(--color-error)",
            border: "none",
            borderRadius: "6px",
            color: "white",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}

interface SkillsGridProps {
  skills: ExtendedSkill[];
  selectedSkills: ExtendedSkill[];
  configurations: Record<string, SkillConfiguration>;
  onSkillClick: (skill: ExtendedSkill) => void;
  onSkillToggle: (e: React.MouseEvent, skillId: string, enabled: boolean) => void;
  onSkillSelect: (e: React.MouseEvent, skillId: string) => void;
}

function SkillsGrid({
  skills,
  selectedSkills,
  configurations,
  onSkillClick,
  onSkillToggle,
  onSkillSelect,
}: SkillsGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "16px",
      }}
    >
      {skills.map((skill) => {
        const isEnabled = configurations[skill.id]?.enabled ?? true;
        const isSelected = selectedSkills.some(s => s.id === skill.id);

        return (
          <div
            key={skill.id}
            onClick={() => onSkillClick(skill)}
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: `2px solid ${isSelected ? "#e9c46a" : "var(--color-accent)"}`,
              borderRadius: "8px",
              padding: "16px",
              cursor: "pointer",
              transition: "all 0.2s",
              opacity: isEnabled ? 1 : 0.5,
              position: "relative",
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = "#48cae4";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = "var(--color-accent)";
              }
            }}
          >
            {/* Selection Checkbox */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSkillSelect(e as any, skill.id)}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                cursor: "pointer",
              }}
            />

            {/* Icon */}
            <div
              style={{
                fontSize: "32px",
                marginBottom: "12px",
              }}
            >
              {getCategoryIcon(skill.category)}
            </div>

            {/* Name */}
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 600,
                marginBottom: "8px",
                color: "var(--color-text-primary)",
              }}
            >
              {skill.name}
            </h3>

            {/* Description */}
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-text-secondary)",
                marginBottom: "12px",
                lineHeight: "1.4",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
              }}
            >
              {skill.description}
            </p>

            {/* Tags */}
            {skill.tags && skill.tags.length > 0 && (
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "12px" }}>
                {skill.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      backgroundColor: "var(--color-bg-elevated)",
                      borderRadius: "4px",
                      color: "var(--color-accent)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid var(--color-bg-elevated)",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#6b6b6b",
                }}
              >
                {skill.category}
              </span>

              {/* Toggle */}
              <button
                onClick={(e) => onSkillToggle(e, skill.id, !isEnabled)}
                style={{
                  position: "relative",
                  width: "36px",
                  height: "20px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: isEnabled ? "var(--color-accent)" : "#4b5563",
                  transition: "background-color 0.2s",
                }}
                role="switch"
                aria-checked={isEnabled}
                title={isEnabled ? "Disable skill" : "Enable skill"}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "3px",
                    left: isEnabled ? "19px" : "3px",
                    width: "14px",
                    height: "14px",
                    backgroundColor: "white",
                    borderRadius: "50%",
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface SkillsListProps {
  skills: ExtendedSkill[];
  selectedSkills: ExtendedSkill[];
  configurations: Record<string, SkillConfiguration>;
  onSkillClick: (skill: ExtendedSkill) => void;
  onSkillToggle: (e: React.MouseEvent, skillId: string, enabled: boolean) => void;
  onSkillSelect: (e: React.MouseEvent, skillId: string) => void;
}

function SkillsList({
  skills,
  selectedSkills,
  configurations,
  onSkillClick,
  onSkillToggle,
  onSkillSelect,
}: SkillsListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {skills.map((skill) => {
        const isEnabled = configurations[skill.id]?.enabled ?? true;
        const isSelected = selectedSkills.some(s => s.id === skill.id);

        return (
          <div
            key={skill.id}
            onClick={() => onSkillClick(skill)}
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: `2px solid ${isSelected ? "#e9c46a" : "var(--color-accent)"}`,
              borderRadius: "8px",
              padding: "12px 16px",
              cursor: "pointer",
              transition: "all 0.2s",
              opacity: isEnabled ? 1 : 0.5,
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = "#48cae4";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = "var(--color-accent)";
              }
            }}
          >
            {/* Selection Checkbox */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSkillSelect(e as any, skill.id)}
              onClick={(e) => e.stopPropagation()}
              style={{ cursor: "pointer" }}
            />

            {/* Icon */}
            <div style={{ fontSize: "24px" }}>
              {getCategoryIcon(skill.category)}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  marginBottom: "4px",
                }}
              >
                {skill.name}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {skill.description}
              </div>
            </div>

            {/* Category */}
            <span
              style={{
                fontSize: "12px",
                color: "#6b6b6b",
                minWidth: "100px",
                textAlign: "center",
              }}
            >
              {skill.category}
            </span>

            {/* Tags */}
            {skill.tags && skill.tags.length > 0 && (
              <div style={{ display: "flex", gap: "4px" }}>
                {skill.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      backgroundColor: "var(--color-bg-elevated)",
                      borderRadius: "4px",
                      color: "var(--color-accent)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Toggle */}
            <button
              onClick={(e) => onSkillToggle(e, skill.id, !isEnabled)}
              style={{
                position: "relative",
                width: "36px",
                height: "20px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                backgroundColor: isEnabled ? "var(--color-accent)" : "#4b5563",
                transition: "background-color 0.2s",
              }}
              role="switch"
              aria-checked={isEnabled}
              title={isEnabled ? "Disable skill" : "Enable skill"}
            >
              <span
                style={{
                  position: "absolute",
                  top: "3px",
                  left: isEnabled ? "19px" : "3px",
                  width: "14px",
                  height: "14px",
                  backgroundColor: "white",
                  borderRadius: "50%",
                  transition: "left 0.2s",
                }}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}

interface SkillDetailsPanelProps {
  skill: ExtendedSkill;
  configuration: SkillConfiguration | undefined;
  onClose: () => void;
  onConfigure: () => void;
  onToggle: (enabled: boolean) => void;
}

function SkillDetailsPanel({
  skill,
  configuration,
  onClose,
  onConfigure,
  onToggle,
}: SkillDetailsPanelProps) {
  const isEnabled = configuration?.enabled ?? true;

  return (
    <div
      style={{
        width: "400px",
        borderLeft: "1px solid var(--color-border-muted)",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--color-bg-elevated)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid var(--color-border-muted)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>
          Skill Details
        </h3>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            padding: "4px",
          }}
        >
          <CloseIcon />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {/* Icon & Name */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>
            {getCategoryIcon(skill.category)}
          </div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 600,
              marginBottom: "8px",
              color: "var(--color-text-primary)",
            }}
          >
            {skill.name}
          </h2>
          <span
            style={{
              fontSize: "13px",
              color: "#6b6b6b",
            }}
          >
            {skill.category}
          </span>
        </div>

        {/* Description */}
        <div style={{ marginBottom: "20px" }}>
          <h4
            style={{
              fontSize: "14px",
              fontWeight: 600,
              marginBottom: "8px",
              color: "var(--color-text-primary)",
            }}
          >
            Description
          </h4>
          <p
            style={{
              fontSize: "13px",
              color: "var(--color-text-secondary)",
              lineHeight: "1.6",
            }}
          >
            {skill.description}
          </p>
        </div>

        {/* Tags */}
        {skill.tags && skill.tags.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <h4
              style={{
                fontSize: "14px",
                fontWeight: 600,
                marginBottom: "8px",
                color: "var(--color-text-primary)",
              }}
            >
              Tags
            </h4>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {skill.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "12px",
                    padding: "4px 10px",
                    backgroundColor: "var(--color-bg-surface)",
                    borderRadius: "4px",
                    color: "var(--color-accent)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Documentation */}
        {skill.documentation && (
          <div style={{ marginBottom: "20px" }}>
            <h4
              style={{
                fontSize: "14px",
                fontWeight: 600,
                marginBottom: "8px",
                color: "var(--color-text-primary)",
              }}
            >
              Documentation
            </h4>
            <div
              style={{
                fontSize: "13px",
                color: "var(--color-text-secondary)",
                lineHeight: "1.6",
                maxHeight: "300px",
                overflowY: "auto",
                backgroundColor: "var(--color-bg-surface)",
                padding: "12px",
                borderRadius: "6px",
              }}
            >
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {skill.documentation}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Parameters */}
        {skill.parameters && skill.parameters.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <h4
              style={{
                fontSize: "14px",
                fontWeight: 600,
                marginBottom: "8px",
                color: "var(--color-text-primary)",
              }}
            >
              Parameters
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {skill.parameters.map((param) => (
                <div
                  key={param.name}
                  style={{
                    padding: "8px",
                    backgroundColor: "var(--color-bg-surface)",
                    borderRadius: "4px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--color-text-primary)",
                      marginBottom: "4px",
                    }}
                  >
                    {param.name}
                    {param.required && (
                      <span style={{ color: "var(--color-error)", marginLeft: "4px" }}>
                        *
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                    {param.description}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#6b6b6b",
                      marginTop: "4px",
                    }}
                  >
                    Type: {param.type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div style={{ marginBottom: "20px" }}>
          <h4
            style={{
              fontSize: "14px",
              fontWeight: 600,
              marginBottom: "8px",
              color: "var(--color-text-primary)",
            }}
          >
            Metadata
          </h4>
          <div
            style={{
              fontSize: "12px",
              color: "var(--color-text-secondary)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div>
              <strong>Location:</strong> {skill.isGlobal ? "Global" : "Project"}
            </div>
            <div>
              <strong>Path:</strong> {skill.path}
            </div>
            {skill.usageCount !== undefined && (
              <div>
                <strong>Usage Count:</strong> {skill.usageCount}
              </div>
            )}
            {skill.lastUsed && (
              <div>
                <strong>Last Used:</strong>{" "}
                {new Date(skill.lastUsed).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          padding: "16px",
          borderTop: "1px solid var(--color-border-muted)",
          display: "flex",
          gap: "8px",
        }}
      >
        {skill.configurable && (
          <button
            onClick={onConfigure}
            style={{
              flex: 1,
              padding: "10px",
              backgroundColor: "var(--color-accent)",
              border: "none",
              borderRadius: "6px",
              color: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Configure
          </button>
        )}
        <button
          onClick={() => onToggle(!isEnabled)}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: isEnabled ? "var(--color-error)" : "var(--color-accent)",
            border: "none",
            borderRadius: "6px",
            color: "white",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {isEnabled ? "Disable" : "Enable"}
        </button>
      </div>
    </div>
  );
}

interface SkillConfigPanelProps {
  skill: ExtendedSkill;
  parameters: Record<string, string | number | boolean>;
  validationErrors: string[];
  onChange: (params: Record<string, string | number | boolean>) => void;
  onSave: () => void;
  onCancel: () => void;
}

function SkillConfigPanel({
  skill,
  parameters,
  validationErrors,
  onChange,
  onSave,
  onCancel,
}: SkillConfigPanelProps) {
  const handleParamChange = (name: string, value: string | number | boolean) => {
    onChange({ ...parameters, [name]: value });
  };

  return (
    <div
      style={{
        width: "400px",
        borderLeft: "1px solid var(--color-border-muted)",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--color-bg-elevated)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid var(--color-border-muted)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>
          Configure: {skill.name}
        </h3>
        <button
          onClick={onCancel}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            padding: "4px",
          }}
        >
          <CloseIcon />
        </button>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "var(--color-error)",
            color: "white",
            fontSize: "13px",
          }}
        >
          <strong>Validation Errors:</strong>
          <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
            {validationErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {skill.parameters && skill.parameters.map((param) => (
          <div key={param.name} style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                marginBottom: "6px",
                color: "var(--color-text-primary)",
              }}
            >
              {param.name}
              {param.required && (
                <span style={{ color: "var(--color-error)", marginLeft: "4px" }}>*</span>
              )}
            </label>
            <div
              style={{
                fontSize: "12px",
                color: "var(--color-text-secondary)",
                marginBottom: "8px",
              }}
            >
              {param.description}
            </div>

            {/* Input based on type */}
            {param.type === "string" && (
              <input
                type="text"
                value={String(parameters[param.name] || "")}
                onChange={(e) => handleParamChange(param.name, e.target.value)}
                placeholder={param.defaultValue !== undefined ? String(param.defaultValue) : ""}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  backgroundColor: "var(--color-bg-surface)",
                  border: "1px solid var(--color-border-muted)",
                  borderRadius: "6px",
                  color: "var(--color-text-primary)",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            )}

            {param.type === "number" && (
              <input
                type="number"
                value={Number(parameters[param.name] || 0)}
                onChange={(e) =>
                  handleParamChange(param.name, parseFloat(e.target.value) || 0)
                }
                placeholder={param.defaultValue !== undefined ? String(param.defaultValue) : ""}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  backgroundColor: "var(--color-bg-surface)",
                  border: "1px solid var(--color-border-muted)",
                  borderRadius: "6px",
                  color: "var(--color-text-primary)",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            )}

            {param.type === "boolean" && (
              <button
                onClick={() =>
                  handleParamChange(param.name, !parameters[param.name])
                }
                style={{
                  position: "relative",
                  width: "44px",
                  height: "24px",
                  borderRadius: "12px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: parameters[param.name]
                    ? "var(--color-accent)"
                    : "#4b5563",
                  transition: "background-color 0.2s",
                }}
                role="switch"
                aria-checked={Boolean(parameters[param.name])}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "4px",
                    left: parameters[param.name] ? "24px" : "4px",
                    width: "16px",
                    height: "16px",
                    backgroundColor: "white",
                    borderRadius: "50%",
                    transition: "left 0.2s",
                  }}
                />
              </button>
            )}

            {param.type === "select" && param.options && (
              <select
                value={String(parameters[param.name] || "")}
                onChange={(e) => handleParamChange(param.name, e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  backgroundColor: "var(--color-bg-surface)",
                  border: "1px solid var(--color-border-muted)",
                  borderRadius: "6px",
                  color: "var(--color-text-primary)",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                <option value="">Select...</option>
                {param.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div
        style={{
          padding: "16px",
          borderTop: "1px solid var(--color-border-muted)",
          display: "flex",
          gap: "8px",
        }}
      >
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-muted)",
            borderRadius: "6px",
            color: "var(--color-text-primary)",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: "var(--color-accent)",
            border: "none",
            borderRadius: "6px",
            color: "white",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

interface SkillsBrowserFooterProps {
  skillsCount: number;
  enabledCount: number;
  selectedCount: number;
}

function SkillsBrowserFooter({
  skillsCount,
  enabledCount,
  selectedCount,
}: SkillsBrowserFooterProps) {
  return (
    <div
      style={{
        padding: "12px 20px",
        borderTop: "1px solid var(--color-border-muted)",
        fontSize: "12px",
        color: "var(--color-text-secondary)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        {skillsCount} skill{skillsCount !== 1 ? "s" : ""} · {enabledCount} enabled
        {selectedCount > 0 && ` · ${selectedCount} selected`}
      </div>
      <div>
        <kbd
          style={{
            padding: "2px 6px",
            backgroundColor: "var(--color-bg-surface)",
            borderRadius: "3px",
            color: "#e9c46a",
            marginLeft: "8px",
          }}
        >
          Ctrl+A
        </kbd>{" "}
        Select All ·
        <kbd
          style={{
            padding: "2px 6px",
            backgroundColor: "var(--color-bg-surface)",
            borderRadius: "3px",
            color: "#e9c46a",
            marginLeft: "8px",
          }}
        >
          Esc
        </kbd>{" "}
        Close
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function LoadingSpinner() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "200px",
        color: "var(--color-text-secondary)",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          border: "4px solid var(--color-bg-surface)",
          borderTop: "4px solid var(--color-accent)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "200px",
        color: "var(--color-text-secondary)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
      <div style={{ fontSize: "16px", fontWeight: 500, marginBottom: "8px" }}>
        No skills found
      </div>
      <div style={{ fontSize: "13px", maxWidth: "300px" }}>
        Skills are loaded from .claude/commands directories. Add skill files to get started.
      </div>
    </div>
  );
}

function getCategoryIcon(category: SkillCategory): string {
  const icons: Record<SkillCategory, string> = {
    development: "💻",
    writing: "✍️",
    analysis: "📊",
    testing: "🧪",
    documentation: "📚",
    devops: "⚙️",
    uncategorized: "🧩",
  };
  return icons[category];
}

function CloseIcon() {
  return (
    <svg
      style={{ width: "16px", height: "16px" }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      style={{ width: "16px", height: "16px" }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      style={{ width: "16px", height: "16px" }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}
