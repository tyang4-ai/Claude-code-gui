/**
 * TemplatesBrowser Component
 *
 * A comprehensive template browsing and management interface with:
 * - Searchable list of templates
 * - Category filtering
 * - Create/Edit/Delete template functionality
 * - Variable substitution with {{variable}} syntax
 * - Insert template into current input
 * - Import/Export capabilities
 * - Keyboard navigation
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  getTemplateManager,
  TEMPLATE_CATEGORIES,
  CATEGORY_LABELS,
  extractVariables,
  getAvailableVariables,
  type Template,
  type TemplateCategory,
  type TemplateVariable,
} from "../../modules/templates";
import { useStore } from "../../core/store";

export interface TemplatesBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTemplate?: (content: string) => void;
}

type ViewMode = "list" | "create" | "edit" | "variables";

interface TemplateFormData {
  name: string;
  content: string;
  description: string;
  category: TemplateCategory;
  scope: "global" | "project";
  isFavorite: boolean;
}

const defaultFormData: TemplateFormData = {
  name: "",
  content: "",
  description: "",
  category: "general",
  scope: "global",
  isFavorite: false,
};

export function TemplatesBrowser({
  isOpen,
  onClose,
  onInsertTemplate,
}: TemplatesBrowserProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | "all">("all");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [formData, setFormData] = useState<TemplateFormData>(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeSession = useStore((state) => {
    const activeId = state.activeSessionId;
    return activeId ? state.sessions[activeId] : null;
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const templateManager = getTemplateManager();
  const availableVariables = useMemo(() => getAvailableVariables(), []);

  // Load templates on mount
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      // Focus search input
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const allTemplates = await templateManager.getAllTemplates({ favoritesFirst: true });
      setTemplates(allTemplates);
    } catch (e) {
      setError("Failed to load templates");
      console.error("Failed to load templates:", e);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let result = [...templates];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.content.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter((t) => t.category === selectedCategory);
    }

    setFilteredTemplates(result);
  }, [templates, searchQuery, selectedCategory]);

  // Show success message temporarily
  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  // Handle create template
  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      setError("Name and content are required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await templateManager.createTemplate({
        name: formData.name.trim(),
        content: formData.content,
        description: formData.description.trim() || undefined,
        category: formData.category,
        scope: formData.scope,
        isFavorite: formData.isFavorite,
        projectPath: formData.scope === "project" ? activeSession?.working_dir : undefined,
      });
      await loadTemplates();
      setViewMode("list");
      setFormData(defaultFormData);
      showSuccess("Template created successfully");
    } catch (e) {
      setError("Failed to create template");
      console.error("Failed to create template:", e);
    } finally {
      setLoading(false);
    }
  };

  // Handle update template
  const handleUpdate = async () => {
    if (!selectedTemplate || !formData.name.trim() || !formData.content.trim()) {
      setError("Name and content are required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await templateManager.updateTemplate(selectedTemplate.id, {
        name: formData.name.trim(),
        content: formData.content,
        description: formData.description.trim() || undefined,
        category: formData.category,
        scope: formData.scope,
        isFavorite: formData.isFavorite,
        projectPath: formData.scope === "project" ? activeSession?.working_dir : undefined,
      });
      await loadTemplates();
      setViewMode("list");
      setSelectedTemplate(null);
      setFormData(defaultFormData);
      showSuccess("Template updated successfully");
    } catch (e) {
      setError("Failed to update template");
      console.error("Failed to update template:", e);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete template
  const handleDelete = async (template: Template) => {
    if (!confirm(`Delete template "${template.name}"?`)) return;

    setLoading(true);
    setError(null);
    try {
      await templateManager.deleteTemplate(template.id);
      await loadTemplates();
      if (selectedTemplate?.id === template.id) {
        setSelectedTemplate(null);
      }
      showSuccess("Template deleted");
    } catch (e) {
      setError("Failed to delete template");
      console.error("Failed to delete template:", e);
    } finally {
      setLoading(false);
    }
  };

  // Handle duplicate template
  const handleDuplicate = async (template: Template) => {
    setLoading(true);
    setError(null);
    try {
      await templateManager.duplicateTemplate(template.id);
      await loadTemplates();
      showSuccess("Template duplicated");
    } catch (e) {
      setError("Failed to duplicate template");
      console.error("Failed to duplicate template:", e);
    } finally {
      setLoading(false);
    }
  };

  // Handle toggle favorite
  const handleToggleFavorite = async (template: Template) => {
    try {
      await templateManager.toggleFavorite(template.id);
      await loadTemplates();
    } catch (e) {
      console.error("Failed to toggle favorite:", e);
    }
  };

  // Handle insert template
  const handleInsertTemplate = async (template: Template) => {
    if (onInsertTemplate) {
      // Apply template with variable substitution
      try {
        const result = await templateManager.applyTemplate(template, {
          workingDir: activeSession?.working_dir || ".",
        });
        onInsertTemplate(result.content);
        onClose();
      } catch (e) {
        console.error("Failed to apply template:", e);
        // Fallback to raw content
        onInsertTemplate(template.content);
        onClose();
      }
    }
  };

  // Handle edit template
  const handleEditTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      description: template.description || "",
      category: template.category,
      scope: template.scope,
      isFavorite: template.isFavorite,
    });
    setViewMode("edit");
  };

  // Insert variable at cursor
  const insertVariable = (variable: TemplateVariable) => {
    if (!contentTextareaRef.current) return;

    const textarea = contentTextareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const variableText = `{{${variable.name}}}`;

    const newContent = text.substring(0, start) + variableText + text.substring(end);
    setFormData({ ...formData, content: newContent });

    // Restore cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + variableText.length;
    }, 0);
  };

  // Handle export
  const handleExport = async () => {
    try {
      const data = await templateManager.exportTemplates();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `templates-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess("Templates exported");
    } catch (e) {
      setError("Failed to export templates");
      console.error("Failed to export templates:", e);
    }
  };

  // Handle import
  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text) as Template[];
        const count = await templateManager.importTemplates(data);
        await loadTemplates();
        showSuccess(`Imported ${count} templates`);
      } catch (e) {
        setError("Failed to import templates");
        console.error("Failed to import templates:", e);
      }
    };
    input.click();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (viewMode !== "list") {
          setViewMode("list");
          setSelectedTemplate(null);
          setFormData(defaultFormData);
        } else {
          onClose();
        }
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, viewMode, onClose]);

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
      data-testid="templates-browser-backdrop"
    >
      <div
        style={{
          width: "90%",
          maxWidth: "1000px",
          height: "80%",
          maxHeight: "700px",
          backgroundColor: "#1d3d47",
          borderRadius: "12px",
          border: "1px solid #2a9d8f",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid="templates-browser-modal"
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
            {viewMode === "list" && "Templates"}
            {viewMode === "create" && "Create Template"}
            {viewMode === "edit" && "Edit Template"}
            {viewMode === "variables" && "Available Variables"}
          </h2>

          <div style={{ display: "flex", gap: "8px" }}>
            {viewMode === "list" && (
              <>
                <button
                  style={buttonStyle}
                  onClick={handleImport}
                  data-testid="import-button"
                >
                  Import
                </button>
                <button
                  style={buttonStyle}
                  onClick={handleExport}
                  data-testid="export-button"
                >
                  Export
                </button>
                <button
                  style={{ ...buttonStyle, backgroundColor: "#2a9d8f" }}
                  onClick={() => {
                    setFormData(defaultFormData);
                    setViewMode("create");
                  }}
                  data-testid="create-button"
                >
                  + New Template
                </button>
              </>
            )}
            {(viewMode === "create" || viewMode === "edit") && (
              <button
                style={buttonStyle}
                onClick={() => setViewMode("variables")}
                data-testid="show-variables-button"
              >
                Variables
              </button>
            )}
            <button
              style={buttonStyle}
              onClick={() => {
                if (viewMode !== "list") {
                  setViewMode("list");
                  setSelectedTemplate(null);
                  setFormData(defaultFormData);
                } else {
                  onClose();
                }
              }}
              data-testid="close-button"
            >
              {viewMode === "list" ? "Close" : "Cancel"}
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div
            style={{
              padding: "12px 24px",
              backgroundColor: "#ff6b6b33",
              borderBottom: "1px solid #ff6b6b",
              color: "#ff6b6b",
              fontSize: "14px",
            }}
            data-testid="error-message"
          >
            {error}
          </div>
        )}
        {successMessage && (
          <div
            style={{
              padding: "12px 24px",
              backgroundColor: "#2a9d8f33",
              borderBottom: "1px solid #2a9d8f",
              color: "#2a9d8f",
              fontSize: "14px",
            }}
            data-testid="success-message"
          >
            {successMessage}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {viewMode === "list" && (
            <TemplateListView
              templates={filteredTemplates}
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              loading={loading}
              searchInputRef={searchInputRef}
              onSearchChange={setSearchQuery}
              onCategoryChange={setSelectedCategory}
              onInsert={handleInsertTemplate}
              onEdit={handleEditTemplate}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {(viewMode === "create" || viewMode === "edit") && (
            <TemplateFormView
              formData={formData}
              viewMode={viewMode}
              loading={loading}
              contentTextareaRef={contentTextareaRef}
              onFormChange={setFormData}
              onSave={viewMode === "create" ? handleCreate : handleUpdate}
            />
          )}

          {viewMode === "variables" && (
            <VariablesView
              variables={availableVariables}
              onInsert={insertVariable}
              onBack={() => setViewMode(selectedTemplate ? "edit" : "create")}
            />
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
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""}
          </div>
          <div>
            <kbd style={kbdStyle}>Esc</kbd> {viewMode === "list" ? "Close" : "Back"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface TemplateListViewProps {
  templates: Template[];
  searchQuery: string;
  selectedCategory: TemplateCategory | "all";
  loading: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: TemplateCategory | "all") => void;
  onInsert: (template: Template) => void;
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
  onDuplicate: (template: Template) => void;
  onToggleFavorite: (template: Template) => void;
}

function TemplateListView({
  templates,
  searchQuery,
  selectedCategory,
  loading,
  searchInputRef,
  onSearchChange,
  onCategoryChange,
  onInsert,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleFavorite,
}: TemplateListViewProps) {
  return (
    <>
      {/* Search and Filter */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #333" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={inputStyle}
            data-testid="search-input"
          />
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value as TemplateCategory | "all")}
            style={{ ...inputStyle, width: "180px" }}
            data-testid="category-filter"
          >
            <option value="all">All Categories</option>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Template List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 24px",
        }}
        data-testid="template-list"
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#a0a0a0" }}>
            Loading templates...
          </div>
        ) : templates.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#a0a0a0" }}>
            {searchQuery || selectedCategory !== "all"
              ? "No templates match your search"
              : "No templates yet. Create one to get started!"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onInsert={() => onInsert(template)}
                onEdit={() => onEdit(template)}
                onDelete={() => onDelete(template)}
                onDuplicate={() => onDuplicate(template)}
                onToggleFavorite={() => onToggleFavorite(template)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

interface TemplateCardProps {
  template: Template;
  onInsert: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleFavorite: () => void;
}

function TemplateCard({
  template,
  onInsert,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleFavorite,
}: TemplateCardProps) {
  const previewContent = template.content.length > 150
    ? template.content.substring(0, 150) + "..."
    : template.content;

  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "8px",
        backgroundColor: "#264653",
        border: "1px solid #2a9d8f",
      }}
      data-testid={`template-card-${template.id}`}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <button
              onClick={onToggleFavorite}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "16px",
                padding: 0,
              }}
              title={template.isFavorite ? "Remove from favorites" : "Add to favorites"}
              data-testid={`favorite-button-${template.id}`}
            >
              {template.isFavorite ? "★" : "☆"}
            </button>
            <span style={{ fontSize: "16px", fontWeight: 600 }}>{template.name}</span>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                backgroundColor: "#1d3d47",
                borderRadius: "12px",
                color: "#2a9d8f",
              }}
            >
              {CATEGORY_LABELS[template.category]}
            </span>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                backgroundColor: template.scope === "global" ? "#4a9eff" : "#ff9800",
                borderRadius: "12px",
                color: "white",
              }}
            >
              {template.scope}
            </span>
          </div>

          {template.description && (
            <div style={{ fontSize: "13px", color: "#a0a0a0", marginBottom: "8px" }}>
              {template.description}
            </div>
          )}

          <div
            style={{
              fontSize: "12px",
              color: "#c0c0c0",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              backgroundColor: "#1d3d47",
              padding: "8px",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            {previewContent}
          </div>

          {template.variables.length > 0 && (
            <div style={{ marginTop: "8px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {template.variables.map((v) => (
                <span
                  key={v}
                  style={{
                    fontSize: "10px",
                    padding: "2px 6px",
                    backgroundColor: "#e9c46a33",
                    border: "1px solid #e9c46a",
                    borderRadius: "4px",
                    color: "#e9c46a",
                  }}
                >
                  {`{{${v}}}`}
                </span>
              ))}
            </div>
          )}

          <div style={{ marginTop: "8px", fontSize: "11px", color: "#6b6b6b" }}>
            Used {template.usageCount} time{template.usageCount !== 1 ? "s" : ""} |
            Updated {new Date(template.updatedAt).toLocaleDateString()}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", marginLeft: "16px" }}>
          <button
            style={{ ...smallButtonStyle, backgroundColor: "#2a9d8f" }}
            onClick={onInsert}
            data-testid={`insert-button-${template.id}`}
          >
            Use
          </button>
          <button
            style={smallButtonStyle}
            onClick={onEdit}
            data-testid={`edit-button-${template.id}`}
          >
            Edit
          </button>
          <button
            style={smallButtonStyle}
            onClick={onDuplicate}
            data-testid={`duplicate-button-${template.id}`}
          >
            Copy
          </button>
          <button
            style={{ ...smallButtonStyle, borderColor: "#e76f51", color: "#e76f51" }}
            onClick={onDelete}
            data-testid={`delete-button-${template.id}`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

interface TemplateFormViewProps {
  formData: TemplateFormData;
  viewMode: "create" | "edit";
  loading: boolean;
  contentTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onFormChange: (data: TemplateFormData) => void;
  onSave: () => void;
}

function TemplateFormView({
  formData,
  viewMode,
  loading,
  contentTextareaRef,
  onFormChange,
  onSave,
}: TemplateFormViewProps) {
  const detectedVariables = useMemo(
    () => extractVariables(formData.content),
    [formData.content]
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "600px" }}>
        {/* Name */}
        <div>
          <label style={labelStyle}>Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
            placeholder="My Template"
            style={inputStyle}
            data-testid="template-name-input"
          />
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Description</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => onFormChange({ ...formData, description: e.target.value })}
            placeholder="Optional description"
            style={inputStyle}
            data-testid="template-description-input"
          />
        </div>

        {/* Category */}
        <div>
          <label style={labelStyle}>Category</label>
          <select
            value={formData.category}
            onChange={(e) => onFormChange({ ...formData, category: e.target.value as TemplateCategory })}
            style={inputStyle}
            data-testid="template-category-select"
          >
            {TEMPLATE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Scope */}
        <div>
          <label style={labelStyle}>Scope</label>
          <select
            value={formData.scope}
            onChange={(e) => onFormChange({ ...formData, scope: e.target.value as "global" | "project" })}
            style={inputStyle}
            data-testid="template-scope-select"
          >
            <option value="global">Global (all projects)</option>
            <option value="project">Project (current project only)</option>
          </select>
        </div>

        {/* Content */}
        <div>
          <label style={labelStyle}>
            Content *
            <span style={{ fontWeight: 400, color: "#a0a0a0", marginLeft: "8px" }}>
              Use {"{{variable}}"} for dynamic values
            </span>
          </label>
          <textarea
            ref={contentTextareaRef}
            value={formData.content}
            onChange={(e) => onFormChange({ ...formData, content: e.target.value })}
            placeholder="Review this code for {{project}}:

{{selection}}

Focus on:
- Code quality
- Performance
- Best practices"
            style={{
              ...inputStyle,
              minHeight: "200px",
              fontFamily: "monospace",
              resize: "vertical",
            }}
            data-testid="template-content-input"
          />
        </div>

        {/* Detected Variables */}
        {detectedVariables.length > 0 && (
          <div>
            <label style={labelStyle}>Detected Variables</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {detectedVariables.map((v) => (
                <span
                  key={v}
                  style={{
                    fontSize: "12px",
                    padding: "4px 8px",
                    backgroundColor: "#e9c46a33",
                    border: "1px solid #e9c46a",
                    borderRadius: "4px",
                    color: "#e9c46a",
                  }}
                >
                  {`{{${v}}}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Favorite */}
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={formData.isFavorite}
              onChange={(e) => onFormChange({ ...formData, isFavorite: e.target.checked })}
              data-testid="template-favorite-checkbox"
            />
            <span style={{ fontSize: "14px" }}>Mark as favorite</span>
          </label>
        </div>

        {/* Save Button */}
        <button
          onClick={onSave}
          disabled={loading || !formData.name.trim() || !formData.content.trim()}
          style={{
            ...buttonStyle,
            backgroundColor: "#2a9d8f",
            padding: "12px 24px",
            fontSize: "16px",
            opacity: loading || !formData.name.trim() || !formData.content.trim() ? 0.5 : 1,
          }}
          data-testid="save-button"
        >
          {loading ? "Saving..." : viewMode === "create" ? "Create Template" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

interface VariablesViewProps {
  variables: TemplateVariable[];
  onInsert: (variable: TemplateVariable) => void;
  onBack: () => void;
}

function VariablesView({ variables, onInsert, onBack }: VariablesViewProps) {
  const groupedVariables = useMemo(() => {
    const groups: Record<string, TemplateVariable[]> = {};
    for (const v of variables) {
      if (!groups[v.category]) {
        groups[v.category] = [];
      }
      groups[v.category].push(v);
    }
    return groups;
  }, [variables]);

  const categoryLabels: Record<string, string> = {
    basic: "Basic",
    git: "Git",
    context: "Context",
    time: "Date & Time",
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
      <div style={{ marginBottom: "16px" }}>
        <button onClick={onBack} style={buttonStyle} data-testid="back-button">
          Back to Editor
        </button>
      </div>

      <p style={{ marginBottom: "24px", color: "#a0a0a0", fontSize: "14px" }}>
        Click a variable to insert it at your cursor position in the template content.
      </p>

      {Object.entries(groupedVariables).map(([category, vars]) => (
        <div key={category} style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#2a9d8f", marginBottom: "12px" }}>
            {categoryLabels[category] || category}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {vars.map((v) => (
              <div
                key={v.name}
                onClick={() => onInsert(v)}
                style={{
                  padding: "12px 16px",
                  backgroundColor: "#264653",
                  borderRadius: "6px",
                  cursor: "pointer",
                  border: "1px solid #2a9d8f",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2a5560")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#264653")}
                data-testid={`variable-${v.name}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <code
                    style={{
                      fontSize: "14px",
                      backgroundColor: "#1d3d47",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      color: "#e9c46a",
                    }}
                  >
                    {`{{${v.name}}}`}
                  </code>
                  <span style={{ fontSize: "14px", color: "#e8e8e8" }}>{v.description}</span>
                </div>
                {v.example && (
                  <div style={{ marginTop: "4px", fontSize: "12px", color: "#6b6b6b" }}>
                    Example: {v.example}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const buttonStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid #2a9d8f",
  backgroundColor: "#264653",
  color: "#e8e8e8",
  fontSize: "14px",
  cursor: "pointer",
};

const smallButtonStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: "4px",
  border: "1px solid #2a9d8f",
  backgroundColor: "#264653",
  color: "#e8e8e8",
  fontSize: "12px",
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "6px",
  border: "1px solid #2a9d8f",
  backgroundColor: "#264653",
  color: "#e8e8e8",
  fontSize: "14px",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  fontSize: "14px",
  fontWeight: 600,
  color: "#e8e8e8",
};

const kbdStyle: React.CSSProperties = {
  padding: "2px 6px",
  borderRadius: "4px",
  backgroundColor: "#264653",
  marginRight: "4px",
};
