/**
 * Indicator Store
 * 
 * Zustand store for managing technical indicators including:
 * - Active indicator configurations (max 10)
 * - Calculated indicator results
 * - Selection state for settings panel
 * - Persistence to localStorage for session recovery
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type {
  IndicatorType,
  IndicatorConfig,
  IndicatorResult,
  IndicatorStyle,
  IndicatorCategory,
} from '../types/indicators';

import {
  getIndicatorDefinition,
} from '../services/indicators/definitions';

// =============================================================================
// Constants
// =============================================================================

/** Maximum number of active indicators allowed */
const MAX_INDICATORS = 10;

/** Color palette for indicator assignment */
const COLOR_PALETTE = [
  '#2962ff', // Blue
  '#ff6d00', // Orange
  '#00bfa5', // Teal
  '#aa00ff', // Purple
  '#00c853', // Green
  '#ff1744', // Red
  '#ffd600', // Yellow
  '#00b8d4', // Cyan
  '#ff4081', // Pink
  '#76ff03', // Light Green
];

// =============================================================================
// Types
// =============================================================================

interface IndicatorState {
  /** Array of active indicator configurations */
  activeIndicators: IndicatorConfig[];
  
  /** Map of indicator ID to calculated results */
  indicatorResults: Record<string, IndicatorResult[]>;
  
  /** Currently selected indicator ID for settings panel */
  selectedIndicatorId: string | null;
  
  /** Whether calculations are in progress */
  isCalculating: boolean;
  
  /** Error messages by indicator ID */
  errors: Record<string, string>;
}

interface IndicatorActions {
  /** Add a new indicator with default params */
  addIndicator: (type: IndicatorType) => string | null;
  
  /** Remove an indicator and its results */
  removeIndicator: (id: string) => void;
  
  /** Update indicator parameters */
  updateIndicatorParams: (
    id: string,
    params: Partial<IndicatorConfig['params']>
  ) => void;
  
  /** Update indicator visual style */
  updateIndicatorStyle: (
    id: string,
    style: Partial<IndicatorStyle>
  ) => void;
  
  /** Toggle indicator visibility */
  toggleIndicatorVisibility: (id: string) => void;
  
  /** Enable/disable indicator calculation */
  toggleIndicatorEnabled: (id: string) => void;
  
  /** Store calculated results for an indicator */
  setIndicatorResults: (id: string, results: IndicatorResult[]) => void;
  
  /** Reorder indicators (for drag and drop) */
  reorderIndicators: (fromIndex: number, toIndex: number) => void;
  
  /** Select an indicator for settings panel */
  selectIndicator: (id: string | null) => void;
  
  /** Set calculation in progress state */
  setCalculating: (isCalculating: boolean) => void;
  
  /** Set error for an indicator */
  setError: (id: string, error: string | null) => void;
  
  /** Clear all errors */
  clearErrors: () => void;
  
  /** Clear all indicators */
  clearAllIndicators: () => void;
  
  /** Get indicator by ID */
  getIndicator: (id: string) => IndicatorConfig | undefined;
  
  /** Duplicate an existing indicator */
  duplicateIndicator: (id: string) => string | null;
  
  /** Reset indicator to default params */
  resetIndicatorParams: (id: string) => void;
}

interface IndicatorComputed {
  /** Overlay indicators (drawn on price chart) */
  overlayIndicators: () => IndicatorConfig[];
  
  /** Separate pane indicators */
  separateIndicators: () => IndicatorConfig[];
  
  /** Check if more indicators can be added */
  canAddMore: () => boolean;
  
  /** Get indicator count */
  indicatorCount: () => number;
  
  /** Get visible indicators only */
  visibleIndicators: () => IndicatorConfig[];
  
  /** Get enabled indicators only */
  enabledIndicators: () => IndicatorConfig[];
  
  /** Get indicators by category */
  getIndicatorsByCategory: (category: IndicatorCategory) => IndicatorConfig[];
  
  /** Check if an indicator type is already active */
  hasIndicatorType: (type: IndicatorType) => boolean;
}

export type IndicatorStore = IndicatorState & IndicatorActions & IndicatorComputed;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a unique indicator ID
 */
function generateId(): string {
  return `ind_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Get the next available color from the palette
 */
function getNextColor(usedColors: string[]): string {
  const available = COLOR_PALETTE.filter(c => !usedColors.includes(c));
  if (available.length > 0) {
    return available[0];
  }
  // Cycle through palette if all colors are used
  return COLOR_PALETTE[usedColors.length % COLOR_PALETTE.length];
}

/**
 * Create a new indicator configuration
 */
function createIndicatorConfig(
  type: IndicatorType,
  usedColors: string[]
): IndicatorConfig {
  const definition = getIndicatorDefinition(type);
  const color = definition 
    ? (definition.outputDefinitions?.[0]?.color || getNextColor(usedColors))
    : getNextColor(usedColors);
  
  return {
    id: generateId(),
    type,
    enabled: true,
    visible: true,
    params: { ...(definition?.defaultParams || {}) },
    style: {
      color,
      lineWidth: 2,
      opacity: 1,
      lineStyle: 'solid',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// =============================================================================
// Store Definition
// =============================================================================

export const useIndicatorStore = create<IndicatorStore>()(
  persist(
    immer((set, get) => ({
      // =======================================================================
      // State
      // =======================================================================
      
      activeIndicators: [],
      indicatorResults: {},
      selectedIndicatorId: null,
      isCalculating: false,
      errors: {},
      
      // =======================================================================
      // Actions
      // =======================================================================
      
      addIndicator: (type: IndicatorType): string | null => {
        const state = get();
        
        // Check max limit
        if (state.activeIndicators.length >= MAX_INDICATORS) {
          console.warn(`Cannot add indicator: Maximum of ${MAX_INDICATORS} indicators reached`);
          // Could dispatch a toast notification here
          return null;
        }
        
        // Get used colors
        const usedColors = state.activeIndicators.map(ind => ind.style.color);
        
        // Create new indicator
        const newIndicator = createIndicatorConfig(type, usedColors);
        
        set((draft) => {
          draft.activeIndicators.push(newIndicator);
          draft.selectedIndicatorId = newIndicator.id;
        });
        
        console.log(`Added indicator: ${type} (${newIndicator.id})`);
        return newIndicator.id;
      },
      
      removeIndicator: (id: string): void => {
        set((draft) => {
          const index = draft.activeIndicators.findIndex(ind => ind.id === id);
          if (index !== -1) {
            draft.activeIndicators.splice(index, 1);
          }
          
          // Clean up results
          delete draft.indicatorResults[id];
          
          // Clean up errors
          delete draft.errors[id];
          
          // Deselect if this was selected
          if (draft.selectedIndicatorId === id) {
            draft.selectedIndicatorId = null;
          }
        });
        
        console.log(`Removed indicator: ${id}`);
      },
      
      updateIndicatorParams: (
        id: string,
        params: Partial<IndicatorConfig['params']>
      ): void => {
        set((draft) => {
          const indicator = draft.activeIndicators.find(ind => ind.id === id);
          if (indicator) {
            // Filter out undefined values before merging
            const filteredParams: Record<string, string | number | boolean> = {};
            Object.entries(params).forEach(([key, val]) => {
              if (val !== undefined) {
                filteredParams[key] = val;
              }
            });
            indicator.params = { ...indicator.params, ...filteredParams };
            indicator.updatedAt = Date.now();
            
            // Clear previous results to trigger recalculation
            delete draft.indicatorResults[id];
            
            // Clear any previous error
            delete draft.errors[id];
          }
        });
      },
      
      updateIndicatorStyle: (
        id: string,
        style: Partial<IndicatorStyle>
      ): void => {
        set((draft) => {
          const indicator = draft.activeIndicators.find(ind => ind.id === id);
          if (indicator) {
            indicator.style = { ...indicator.style, ...style };
            indicator.updatedAt = Date.now();
          }
        });
      },
      
      toggleIndicatorVisibility: (id: string): void => {
        set((draft) => {
          const indicator = draft.activeIndicators.find(ind => ind.id === id);
          if (indicator) {
            indicator.visible = !indicator.visible;
            indicator.updatedAt = Date.now();
          }
        });
      },
      
      toggleIndicatorEnabled: (id: string): void => {
        set((draft) => {
          const indicator = draft.activeIndicators.find(ind => ind.id === id);
          if (indicator) {
            indicator.enabled = !indicator.enabled;
            indicator.updatedAt = Date.now();
            
            // If disabling, clear results
            if (!indicator.enabled) {
              delete draft.indicatorResults[id];
            }
          }
        });
      },
      
      setIndicatorResults: (id: string, results: IndicatorResult[]): void => {
        set((draft) => {
          draft.indicatorResults[id] = results;
        });
      },
      
      reorderIndicators: (fromIndex: number, toIndex: number): void => {
        set((draft) => {
          if (
            fromIndex < 0 ||
            fromIndex >= draft.activeIndicators.length ||
            toIndex < 0 ||
            toIndex >= draft.activeIndicators.length
          ) {
            return;
          }
          
          const [removed] = draft.activeIndicators.splice(fromIndex, 1);
          draft.activeIndicators.splice(toIndex, 0, removed);
        });
      },
      
      selectIndicator: (id: string | null): void => {
        set((draft) => {
          draft.selectedIndicatorId = id;
        });
      },
      
      setCalculating: (isCalculating: boolean): void => {
        set((draft) => {
          draft.isCalculating = isCalculating;
        });
      },
      
      setError: (id: string, error: string | null): void => {
        set((draft) => {
          if (error) {
            draft.errors[id] = error;
          } else {
            delete draft.errors[id];
          }
        });
      },
      
      clearErrors: (): void => {
        set((draft) => {
          draft.errors = {};
        });
      },
      
      clearAllIndicators: (): void => {
        set((draft) => {
          draft.activeIndicators = [];
          draft.indicatorResults = {};
          draft.selectedIndicatorId = null;
          draft.errors = {};
        });
      },
      
      getIndicator: (id: string): IndicatorConfig | undefined => {
        return get().activeIndicators.find(ind => ind.id === id);
      },
      
      duplicateIndicator: (id: string): string | null => {
        const state = get();
        const original = state.activeIndicators.find(ind => ind.id === id);
        
        if (!original) {
          console.warn(`Cannot duplicate: Indicator ${id} not found`);
          return null;
        }
        
        if (state.activeIndicators.length >= MAX_INDICATORS) {
          console.warn(`Cannot duplicate: Maximum of ${MAX_INDICATORS} indicators reached`);
          return null;
        }
        
        const usedColors = state.activeIndicators.map(ind => ind.style.color);
        const newColor = getNextColor(usedColors);
        
        const duplicate: IndicatorConfig = {
          ...original,
          id: generateId(),
          params: { ...original.params },
          style: { ...original.style, color: newColor },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        set((draft) => {
          // Insert after the original
          const originalIndex = draft.activeIndicators.findIndex(ind => ind.id === id);
          draft.activeIndicators.splice(originalIndex + 1, 0, duplicate);
          draft.selectedIndicatorId = duplicate.id;
        });
        
        return duplicate.id;
      },
      
      resetIndicatorParams: (id: string): void => {
        const indicator = get().activeIndicators.find(ind => ind.id === id);
        if (!indicator) return;
        
        const definition = getIndicatorDefinition(indicator.type);
        if (!definition) return;
        
        set((draft) => {
          const ind = draft.activeIndicators.find(i => i.id === id);
          if (ind && definition) {
            ind.params = { ...definition.defaultParams } as Record<string, string | number | boolean>;
            ind.updatedAt = Date.now();
            
            // Clear results to trigger recalculation
            delete draft.indicatorResults[id];
          }
        });
      },
      
      // =======================================================================
      // Computed Values (as functions for reactivity)
      // =======================================================================
      
      overlayIndicators: (): IndicatorConfig[] => {
        return get().activeIndicators.filter(ind => {
          const def = getIndicatorDefinition(ind.type);
          return def?.placement === 'overlay';
        });
      },
      
      separateIndicators: (): IndicatorConfig[] => {
        return get().activeIndicators.filter(ind => {
          const def = getIndicatorDefinition(ind.type);
          return def?.placement === 'separate';
        });
      },
      
      canAddMore: (): boolean => {
        return get().activeIndicators.length < MAX_INDICATORS;
      },
      
      indicatorCount: (): number => {
        return get().activeIndicators.length;
      },
      
      visibleIndicators: (): IndicatorConfig[] => {
        return get().activeIndicators.filter(ind => ind.visible);
      },
      
      enabledIndicators: (): IndicatorConfig[] => {
        return get().activeIndicators.filter(ind => ind.enabled);
      },
      
      getIndicatorsByCategory: (category: IndicatorCategory): IndicatorConfig[] => {
        return get().activeIndicators.filter(ind => {
          const def = getIndicatorDefinition(ind.type);
          return def?.category === category;
        });
      },
      
      hasIndicatorType: (type: IndicatorType): boolean => {
        return get().activeIndicators.some(ind => ind.type === type);
      },
    })),
    {
      name: 'bitunix-indicators',
      storage: createJSONStorage(() => localStorage),
      
      // Only persist certain fields
      partialize: (state) => ({
        activeIndicators: state.activeIndicators,
        selectedIndicatorId: state.selectedIndicatorId,
      }),
      
      // Migrate/validate on rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Clear results on rehydration (will be recalculated)
          state.indicatorResults = {};
          state.isCalculating = false;
          state.errors = {};
          
          // Validate indicators
          state.activeIndicators = state.activeIndicators.filter(ind => {
            const def = getIndicatorDefinition(ind.type);
            if (!def) {
              console.warn(`Removing unknown indicator type: ${ind.type}`);
              return false;
            }
            return true;
          });
        }
      },
    }
  )
);

// =============================================================================
// Selectors (for optimized re-renders)
// =============================================================================

/**
 * Select active indicators array
 */
export const selectActiveIndicators = (state: IndicatorStore) => state.activeIndicators;

/**
 * Select indicator results
 */
export const selectIndicatorResults = (state: IndicatorStore) => state.indicatorResults;

/**
 * Select results for a specific indicator
 */
export const selectIndicatorResultsById = (id: string) => (state: IndicatorStore) => 
  state.indicatorResults[id];

/**
 * Select selected indicator ID
 */
export const selectSelectedIndicatorId = (state: IndicatorStore) => state.selectedIndicatorId;

/**
 * Select the currently selected indicator config
 */
export const selectSelectedIndicator = (state: IndicatorStore) => 
  state.activeIndicators.find(ind => ind.id === state.selectedIndicatorId);

/**
 * Select calculation state
 */
export const selectIsCalculating = (state: IndicatorStore) => state.isCalculating;

/**
 * Select errors
 */
export const selectErrors = (state: IndicatorStore) => state.errors;

/**
 * Select error for a specific indicator
 */
export const selectIndicatorError = (id: string) => (state: IndicatorStore) => 
  state.errors[id];

/**
 * Select whether more indicators can be added
 */
export const selectCanAddMore = (state: IndicatorStore) => 
  state.activeIndicators.length < MAX_INDICATORS;

/**
 * Select indicator count
 */
export const selectIndicatorCount = (state: IndicatorStore) => 
  state.activeIndicators.length;

/**
 * Select overlay indicators
 */
export const selectOverlayIndicators = (state: IndicatorStore) => 
  state.activeIndicators.filter(ind => {
    const def = getIndicatorDefinition(ind.type);
    return def?.placement === 'overlay';
  });

/**
 * Select separate pane indicators
 */
export const selectSeparateIndicators = (state: IndicatorStore) => 
  state.activeIndicators.filter(ind => {
    const def = getIndicatorDefinition(ind.type);
    return def?.placement === 'separate';
  });

/**
 * Select visible overlay indicators
 */
export const selectVisibleOverlayIndicators = (state: IndicatorStore) => 
  state.activeIndicators.filter(ind => {
    if (!ind.visible || !ind.enabled) return false;
    const def = getIndicatorDefinition(ind.type);
    return def?.placement === 'overlay';
  });

/**
 * Select visible separate pane indicators
 */
export const selectVisibleSeparateIndicators = (state: IndicatorStore) => 
  state.activeIndicators.filter(ind => {
    if (!ind.visible || !ind.enabled) return false;
    const def = getIndicatorDefinition(ind.type);
    return def?.placement === 'separate';
  });

// =============================================================================
// Hooks for common use cases
// =============================================================================

/**
 * Hook to get a specific indicator by ID
 */
export function useIndicator(id: string): IndicatorConfig | undefined {
  return useIndicatorStore(state => 
    state.activeIndicators.find(ind => ind.id === id)
  );
}

/**
 * Hook to get results for a specific indicator
 */
export function useIndicatorResults(id: string): IndicatorResult[] | undefined {
  return useIndicatorStore(state => state.indicatorResults[id]);
}

/**
 * Hook to check if indicator has results
 */
export function useHasIndicatorResults(id: string): boolean {
  return useIndicatorStore(state => 
    id in state.indicatorResults && state.indicatorResults[id].length > 0
  );
}

// =============================================================================
// Export Constants
// =============================================================================

export { MAX_INDICATORS, COLOR_PALETTE };

export default useIndicatorStore;
