/**
 * Skills Browser State Management
 *
 * Zustand store for skills browser state with persistence
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { produce, enableMapSet } from "immer";
import { useMemo } from "react";

// Enable Immer plugin for Map and Set support
enableMapSet();
import type {
  ExtendedSkill,
  SkillsBrowserState,
  SkillFilter,
  SkillSort,
  SkillConfiguration,
  ViewMode,
  SkillCategory,
  SkillsExport,
} from "./browser-types";
import { discoverSkills } from "./discovery";
import {
  loadConfigurations,
  toggleSkillActivation,
  updateSkillConfiguration,
  deleteSkillConfiguration,
  bulkToggleSkills,
  bulkDeleteSkills,
  exportSkillConfigurations,
  importSkillConfigurations,
  recordSkillUsage,
  isSkillEnabled,
} from "./activation";

interface SkillsBrowserActions {
  // Discovery
  loadSkills: (workingDir: string) => Promise<void>;
  refreshSkills: (workingDir: string) => Promise<void>;

  // Selection
  selectSkill: (skillId: string) => void;
  deselectSkill: (skillId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setActiveSkill: (skillId: string | null) => void;

  // View
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setFilter: (filter: Partial<SkillFilter>) => void;
  setSort: (sort: Partial<SkillSort>) => void;
  clearFilter: () => void;

  // Activation
  toggleSkill: (skillId: string, enabled: boolean) => void;
  configureSkill: (skillId: string, config: Partial<SkillConfiguration>) => void;
  deleteSkillConfig: (skillId: string) => void;

  // Bulk operations
  bulkActivate: (skillIds: string[]) => void;
  bulkDeactivate: (skillIds: string[]) => void;
  bulkDelete: (skillIds: string[]) => void;

  // Import/Export
  exportSelected: () => SkillsExport | null;
  importSkills: (data: SkillsExport) => void;

  // Usage tracking
  recordUsage: (skillId: string) => void;

  // Error handling
  clearError: () => void;
}

type SkillsBrowserStore = SkillsBrowserState & SkillsBrowserActions;

const DEFAULT_STATE: SkillsBrowserState = {
  skills: [],
  selectedSkills: new Set(),
  activeSkillId: null,
  viewMode: "grid",
  filter: {},
  sort: { by: "name", order: "asc" },
  searchQuery: "",
  configurations: {},
  isLoading: false,
  error: null,
};

export const useSkillsBrowserStore = create<SkillsBrowserStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      // Load configurations from localStorage on init
      configurations: loadConfigurations(),

      // Discovery
      loadSkills: async (workingDir: string) => {
        set({ isLoading: true, error: null });

        try {
          const result = await discoverSkills(workingDir);

          if (result.errors.length > 0) {
            console.warn("Skill discovery errors:", result.errors);
          }

          set(
            produce((state: SkillsBrowserStore) => {
              state.skills = result.skills;
              state.isLoading = false;
            })
          );
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },

      refreshSkills: async (workingDir: string) => {
        const { loadSkills } = get();
        await loadSkills(workingDir);
      },

      // Selection
      selectSkill: (skillId: string) =>
        set(
          produce((state: SkillsBrowserStore) => {
            state.selectedSkills.add(skillId);
          })
        ),

      deselectSkill: (skillId: string) =>
        set(
          produce((state: SkillsBrowserStore) => {
            state.selectedSkills.delete(skillId);
          })
        ),

      selectAll: () =>
        set(
          produce((state: SkillsBrowserStore) => {
            state.skills.forEach((skill) => state.selectedSkills.add(skill.id));
          })
        ),

      clearSelection: () =>
        set(
          produce((state: SkillsBrowserStore) => {
            state.selectedSkills.clear();
          })
        ),

      setActiveSkill: (skillId: string | null) =>
        set({ activeSkillId: skillId }),

      // View
      setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

      setSearchQuery: (query: string) => set({ searchQuery: query }),

      setFilter: (filter: Partial<SkillFilter>) =>
        set(
          produce((state: SkillsBrowserStore) => {
            state.filter = { ...state.filter, ...filter };
          })
        ),

      setSort: (sort: Partial<SkillSort>) =>
        set(
          produce((state: SkillsBrowserStore) => {
            state.sort = { ...state.sort, ...sort };
          })
        ),

      clearFilter: () =>
        set({
          filter: {},
          searchQuery: "",
        }),

      // Activation
      toggleSkill: (skillId: string, enabled: boolean) =>
        set(
          produce((state: SkillsBrowserStore) => {
            state.configurations = toggleSkillActivation(
              skillId,
              enabled,
              state.configurations
            );

            // Update skill's enabled state
            const skill = state.skills.find((s) => s.id === skillId);
            if (skill) {
              skill.enabled = enabled;
            }
          })
        ),

      configureSkill: (skillId: string, config: Partial<SkillConfiguration>) =>
        set(
          produce((state: SkillsBrowserStore) => {
            state.configurations = updateSkillConfiguration(
              skillId,
              config,
              state.configurations
            );
          })
        ),

      deleteSkillConfig: (skillId: string) =>
        set(
          produce((state: SkillsBrowserStore) => {
            state.configurations = deleteSkillConfiguration(
              skillId,
              state.configurations
            );

            // Reset skill to default enabled state
            const skill = state.skills.find((s) => s.id === skillId);
            if (skill) {
              skill.enabled = true;
            }
          })
        ),

      // Bulk operations
      bulkActivate: (skillIds: string[]) =>
        set(
          produce((state: SkillsBrowserStore) => {
            const result = bulkToggleSkills(skillIds, true, state.configurations);
            state.configurations = loadConfigurations(); // Reload after bulk save

            // Update skills' enabled state
            result.successful.forEach((skillId) => {
              const skill = state.skills.find((s) => s.id === skillId);
              if (skill) {
                skill.enabled = true;
              }
            });

            if (result.failed.length > 0) {
              state.error = `Failed to activate ${result.failed.length} skill(s)`;
            }
          })
        ),

      bulkDeactivate: (skillIds: string[]) =>
        set(
          produce((state: SkillsBrowserStore) => {
            const result = bulkToggleSkills(skillIds, false, state.configurations);
            state.configurations = loadConfigurations(); // Reload after bulk save

            // Update skills' enabled state
            result.successful.forEach((skillId) => {
              const skill = state.skills.find((s) => s.id === skillId);
              if (skill) {
                skill.enabled = false;
              }
            });

            if (result.failed.length > 0) {
              state.error = `Failed to deactivate ${result.failed.length} skill(s)`;
            }
          })
        ),

      bulkDelete: (skillIds: string[]) =>
        set(
          produce((state: SkillsBrowserStore) => {
            const result = bulkDeleteSkills(skillIds, state.configurations);
            state.configurations = loadConfigurations(); // Reload after bulk save

            // Reset skills to default enabled state
            result.successful.forEach((skillId) => {
              const skill = state.skills.find((s) => s.id === skillId);
              if (skill) {
                skill.enabled = true;
              }
            });

            if (result.failed.length > 0) {
              state.error = `Failed to delete ${result.failed.length} configuration(s)`;
            }
          })
        ),

      // Import/Export
      exportSelected: () => {
        const state = get();
        const skillIds = Array.from(state.selectedSkills);

        if (skillIds.length === 0) {
          return null;
        }

        return exportSkillConfigurations(skillIds, state.configurations, []);
      },

      importSkills: (data: SkillsExport) =>
        set(
          produce((state: SkillsBrowserStore) => {
            const result = importSkillConfigurations(
              data,
              state.configurations
            );
            state.configurations = result.configurations;
          })
        ),

      // Usage tracking
      recordUsage: (skillId: string) =>
        set(
          produce((state: SkillsBrowserStore) => {
            const skill = state.skills.find((s) => s.id === skillId);
            if (skill) {
              const updated = recordSkillUsage(skill);
              const index = state.skills.findIndex((s) => s.id === skillId);
              if (index !== -1) {
                state.skills[index] = updated;
              }
            }
          })
        ),

      // Error handling
      clearError: () => set({ error: null }),
    }),
    {
      name: "claude-gui-skills-browser",
      partialize: (state) => ({
        viewMode: state.viewMode,
        filter: state.filter,
        sort: state.sort,
        configurations: state.configurations,
      }),
    }
  )
);

/**
 * Hook for using skills browser with simple selectors
 * For primitive values or stable references only
 */
export function useSkillsBrowser<T>(selector: (state: SkillsBrowserStore) => T): T {
  return useSkillsBrowserStore(selector);
}

/**
 * Memoized hook for filtered skills
 * Returns stable reference when dependencies haven't changed
 */
export function useFilteredSkills(): ExtendedSkill[] {
  const skills = useSkillsBrowserStore((state) => state.skills);
  const searchQuery = useSkillsBrowserStore((state) => state.searchQuery);
  const filter = useSkillsBrowserStore(useShallow((state) => state.filter));
  const sort = useSkillsBrowserStore(useShallow((state) => state.sort));
  const configurations = useSkillsBrowserStore(useShallow((state) => state.configurations));

  return useMemo(() => {
    let filtered = [...skills];

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
        (skill) => isSkillEnabled(skill.id, configurations) === filter.enabled
      );
    }

    // Apply configurable filter
    if (filter.configurable !== undefined) {
      filtered = filtered.filter(
        (skill) => skill.configurable === filter.configurable
      );
    }

    // Apply tags filter
    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter((skill) =>
        filter.tags!.some((tag) => skill.tags?.includes(tag))
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
  }, [skills, searchQuery, filter, sort, configurations]);
}

/**
 * Memoized hook for active skill
 */
export function useActiveSkill(): ExtendedSkill | null {
  const activeSkillId = useSkillsBrowserStore((state) => state.activeSkillId);
  const skills = useSkillsBrowserStore((state) => state.skills);

  return useMemo(() => {
    if (!activeSkillId) return null;
    return skills.find((s) => s.id === activeSkillId) || null;
  }, [activeSkillId, skills]);
}

/**
 * Memoized hook for enabled skills count
 */
export function useEnabledSkillsCount(): number {
  const skills = useSkillsBrowserStore((state) => state.skills);
  const configurations = useSkillsBrowserStore(useShallow((state) => state.configurations));

  return useMemo(() => {
    return skills.filter((skill) =>
      isSkillEnabled(skill.id, configurations)
    ).length;
  }, [skills, configurations]);
}

/**
 * Memoized hook for selected skills array
 */
export function useSelectedSkillsArray(): ExtendedSkill[] {
  const skills = useSkillsBrowserStore((state) => state.skills);
  const selectedSkills = useSkillsBrowserStore((state) => state.selectedSkills);

  return useMemo(() => {
    return skills.filter((skill) => selectedSkills.has(skill.id));
  }, [skills, selectedSkills]);
}

/**
 * Legacy selector exports for backwards compatibility
 * WARNING: These should not be passed directly to useSkillsBrowser as they create new references
 * Use the memoized hooks above instead (useFilteredSkills, useActiveSkill, etc.)
 */
export const selectFilteredSkills = (state: SkillsBrowserStore): ExtendedSkill[] => {
  let filtered = [...state.skills];

  // Apply search query
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (skill) =>
        skill.name.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query) ||
        skill.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  // Apply category filter
  if (state.filter.categories && state.filter.categories.length > 0) {
    filtered = filtered.filter((skill) =>
      state.filter.categories!.includes(skill.category)
    );
  }

  // Apply enabled filter
  if (state.filter.enabled !== undefined) {
    filtered = filtered.filter(
      (skill) => isSkillEnabled(skill.id, state.configurations) === state.filter.enabled
    );
  }

  // Apply configurable filter
  if (state.filter.configurable !== undefined) {
    filtered = filtered.filter(
      (skill) => skill.configurable === state.filter.configurable
    );
  }

  // Apply tags filter
  if (state.filter.tags && state.filter.tags.length > 0) {
    filtered = filtered.filter((skill) =>
      state.filter.tags!.some((tag) => skill.tags?.includes(tag))
    );
  }

  // Apply sorting
  filtered.sort((a, b) => {
    let comparison = 0;

    switch (state.sort.by) {
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

    return state.sort.order === "asc" ? comparison : -comparison;
  });

  return filtered;
};

export const selectActiveSkill = (state: SkillsBrowserStore): ExtendedSkill | null => {
  if (!state.activeSkillId) return null;
  return state.skills.find((s) => s.id === state.activeSkillId) || null;
};

export const selectSkillsByCategory = (
  state: SkillsBrowserStore
): Record<SkillCategory, ExtendedSkill[]> => {
  const categorized: Record<SkillCategory, ExtendedSkill[]> = {
    development: [],
    writing: [],
    analysis: [],
    testing: [],
    documentation: [],
    devops: [],
    uncategorized: [],
  };

  const filtered = selectFilteredSkills(state);
  filtered.forEach((skill) => {
    categorized[skill.category].push(skill);
  });

  return categorized;
};

export const selectEnabledSkillsCount = (state: SkillsBrowserStore): number => {
  return state.skills.filter((skill) =>
    isSkillEnabled(skill.id, state.configurations)
  ).length;
};

export const selectSelectedSkillsArray = (state: SkillsBrowserStore): ExtendedSkill[] => {
  return state.skills.filter((skill) => state.selectedSkills.has(skill.id));
};
