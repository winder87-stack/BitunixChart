import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { ParsedKline as Kline } from '../types/bitunix';
import type { TradeSignal } from '../types/signals';
import type { 
  Strategy, 
  StrategyConfig, 
  StrategyPreset,
} from '../types/strategy';
import { 
  getStrategy, 
  getAllStrategies, 
  DEFAULT_STRATEGY_ID, 
  DEFAULT_STRATEGY 
} from '../strategies';

// =============================================================================
// Types
// =============================================================================

interface DailyStats {
  date: string; // YYYY-MM-DD
  signalsGenerated: number;
  superSignals: number;
  strongSignals: number;
  moderateSignals: number;
  weakSignals: number;
}

interface StrategyState {
  // Active strategy
  activeStrategyId: string;
  activeConfig: StrategyConfig;
  enabled: boolean;
  
  // Stats
  stats: {
    signalsGenerated: number;
    signalsToday: number;
    lastCalculation: number;
  };
  dailyStats: DailyStats[];
  
  // Presets
  presets: StrategyPreset[];
  activePresetId: string | null;
  
  // Last signal per symbol (for deduplication)
  lastSignals: Record<string, TradeSignal>;
  
  // UI state
  showStrategyPanel: boolean;
  showConfigPanel: boolean;
}

interface StrategyActions {
  // Strategy selection
  setStrategy: (strategyId: string) => void;
  setEnabled: (enabled: boolean) => void;
  
  // Config management
  updateConfig: (updates: Partial<StrategyConfig>) => void;
  resetConfig: () => void;
  applyTimeframeConfig: (timeframe: string) => void;
  
  // Preset management
  savePreset: (name: string) => string;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  renamePreset: (presetId: string, name: string) => void;
  
  // Signal calculation
  calculateSignals: (klines: Kline[]) => TradeSignal[];
  recordSignal: (signal: TradeSignal) => void;
  
  // Stats
  incrementSignalCount: (strength: TradeSignal['strength']) => void;
  resetDailyStats: () => void;
  
  // UI
  toggleStrategyPanel: () => void;
  toggleConfigPanel: () => void;
}

interface StrategyComputed {
  getActiveStrategy: () => Strategy;
  getPresetsByStrategy: (strategyId: string) => StrategyPreset[];
  getTodayStats: () => DailyStats | null;
  getAvailableStrategies: () => Strategy[];
}

export type StrategyStore = StrategyState & StrategyActions & StrategyComputed;

// =============================================================================
// Helpers
// =============================================================================

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function generatePresetId(): string {
  return `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyDailyStats(date: string): DailyStats {
  return {
    date,
    signalsGenerated: 0,
    superSignals: 0,
    strongSignals: 0,
    moderateSignals: 0,
    weakSignals: 0,
  };
}

function mergeConfigs(base: StrategyConfig, override: Partial<StrategyConfig>): StrategyConfig {
  return {
    indicators: { ...base.indicators, ...override.indicators },
    signalRules: { ...base.signalRules, ...override.signalRules },
    risk: { ...base.risk, ...override.risk },
    targets: { ...base.targets, ...override.targets },
    filters: { ...base.filters, ...override.filters },
  };
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useStrategyStore = create<StrategyStore>()(
  persist(
    immer((set, get) => ({
      // State
      activeStrategyId: DEFAULT_STRATEGY_ID,
      activeConfig: DEFAULT_STRATEGY.defaultConfig,
      enabled: true,
      stats: {
        signalsGenerated: 0,
        signalsToday: 0,
        lastCalculation: 0,
      },
      dailyStats: [],
      presets: [],
      activePresetId: null,
      lastSignals: {},
      showStrategyPanel: false,
      showConfigPanel: false,

      // Actions
      setStrategy: (strategyId: string) => {
        const strategy = getStrategy(strategyId);
        if (!strategy) {
          console.warn(`Strategy not found: ${strategyId}`);
          return;
        }

        set((draft) => {
          draft.activeStrategyId = strategyId;
          draft.activeConfig = strategy.defaultConfig;
          draft.activePresetId = null;
          draft.lastSignals = {};
        });
      },

      setEnabled: (enabled: boolean) => {
        set((draft) => {
          draft.enabled = enabled;
        });
      },

      updateConfig: (updates: Partial<StrategyConfig>) => {
        set((draft) => {
          draft.activeConfig = mergeConfigs(draft.activeConfig, updates);
          draft.activePresetId = null; // Config was modified, no longer matches preset
        });
      },

      resetConfig: () => {
        const strategy = get().getActiveStrategy();
        set((draft) => {
          draft.activeConfig = strategy.defaultConfig;
          draft.activePresetId = null;
        });
      },

      applyTimeframeConfig: (timeframe: string) => {
        const strategy = get().getActiveStrategy();
        const tfConfig = strategy.timeframeConfigs[timeframe];
        
        if (tfConfig) {
          set((draft) => {
            draft.activeConfig = mergeConfigs(strategy.defaultConfig, tfConfig);
          });
        }
      },

      savePreset: (name: string) => {
        const id = generatePresetId();
        const now = Date.now();

        set((draft) => {
          draft.presets.push({
            id,
            strategyId: draft.activeStrategyId,
            name,
            config: draft.activeConfig,
            createdAt: now,
            updatedAt: now,
          });
          draft.activePresetId = id;
        });

        return id;
      },

      loadPreset: (presetId: string) => {
        const preset = get().presets.find(p => p.id === presetId);
        if (!preset) {
          console.warn(`Preset not found: ${presetId}`);
          return;
        }

        const strategy = getStrategy(preset.strategyId);
        if (!strategy) {
          console.warn(`Strategy not found for preset: ${preset.strategyId}`);
          return;
        }

        set((draft) => {
          draft.activeStrategyId = preset.strategyId;
          draft.activeConfig = mergeConfigs(strategy.defaultConfig, preset.config);
          draft.activePresetId = presetId;
        });
      },

      deletePreset: (presetId: string) => {
        set((draft) => {
          draft.presets = draft.presets.filter(p => p.id !== presetId);
          if (draft.activePresetId === presetId) {
            draft.activePresetId = null;
          }
        });
      },

      renamePreset: (presetId: string, name: string) => {
        set((draft) => {
          const preset = draft.presets.find(p => p.id === presetId);
          if (preset) {
            preset.name = name;
            preset.updatedAt = Date.now();
          }
        });
      },

      calculateSignals: (klines: Kline[]) => {
        const state = get();
        if (!state.enabled || klines.length === 0) return [];

        const strategy = state.getActiveStrategy();
        
        // Validate config
        const validation = strategy.validateConfig(state.activeConfig);
        if (!validation.valid) {
          console.warn('Invalid strategy config:', validation.errors);
          return [];
        }

        try {
          const signals = strategy.calculateSignals(klines, state.activeConfig);
          
          set((draft) => {
            draft.stats.lastCalculation = Date.now();
          });

          return signals;
        } catch (error) {
          console.error('Signal calculation error:', error);
          return [];
        }
      },

      recordSignal: (signal: TradeSignal) => {
        set((draft) => {
          // Update last signal for symbol
          draft.lastSignals[signal.symbol] = signal;
          
          // Increment counts
          draft.stats.signalsGenerated++;
          draft.stats.signalsToday++;
          
          // Update daily stats
          const today = getTodayDateString();
          let todayStats = draft.dailyStats.find(d => d.date === today);
          
          if (!todayStats) {
            todayStats = createEmptyDailyStats(today);
            draft.dailyStats.push(todayStats);
          }
          
          todayStats.signalsGenerated++;
          
          switch (signal.strength) {
            case 'SUPER':
              todayStats.superSignals++;
              break;
            case 'STRONG':
              todayStats.strongSignals++;
              break;
            case 'MODERATE':
              todayStats.moderateSignals++;
              break;
            case 'WEAK':
              todayStats.weakSignals++;
              break;
          }
          
          // Keep only last 30 days of stats
          if (draft.dailyStats.length > 30) {
            draft.dailyStats = draft.dailyStats.slice(-30);
          }
        });
      },

      incrementSignalCount: (strength: TradeSignal['strength']) => {
        set((draft) => {
          draft.stats.signalsGenerated++;
          draft.stats.signalsToday++;
          
          const today = getTodayDateString();
          let todayStats = draft.dailyStats.find(d => d.date === today);
          
          if (!todayStats) {
            todayStats = createEmptyDailyStats(today);
            draft.dailyStats.push(todayStats);
          }
          
          todayStats.signalsGenerated++;
          
          switch (strength) {
            case 'SUPER':
              todayStats.superSignals++;
              break;
            case 'STRONG':
              todayStats.strongSignals++;
              break;
            case 'MODERATE':
              todayStats.moderateSignals++;
              break;
            case 'WEAK':
              todayStats.weakSignals++;
              break;
          }
        });
      },

      resetDailyStats: () => {
        set((draft) => {
          draft.stats.signalsToday = 0;
        });
      },

      toggleStrategyPanel: () => {
        set((draft) => {
          draft.showStrategyPanel = !draft.showStrategyPanel;
        });
      },

      toggleConfigPanel: () => {
        set((draft) => {
          draft.showConfigPanel = !draft.showConfigPanel;
        });
      },

      // Computed
      getActiveStrategy: () => {
        const strategy = getStrategy(get().activeStrategyId);
        return strategy || DEFAULT_STRATEGY;
      },

      getPresetsByStrategy: (strategyId: string) => {
        return get().presets.filter(p => p.strategyId === strategyId);
      },

      getTodayStats: () => {
        const today = getTodayDateString();
        return get().dailyStats.find(d => d.date === today) || null;
      },

      getAvailableStrategies: () => {
        return getAllStrategies();
      },
    })),
    {
      name: 'bitunix-strategy-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeStrategyId: state.activeStrategyId,
        activeConfig: state.activeConfig,
        enabled: state.enabled,
        presets: state.presets,
        activePresetId: state.activePresetId,
        dailyStats: state.dailyStats.slice(-30), // Keep last 30 days
        stats: {
          signalsGenerated: state.stats.signalsGenerated,
          signalsToday: state.stats.signalsToday,
          lastCalculation: state.stats.lastCalculation,
        },
        showStrategyPanel: state.showStrategyPanel,
        showConfigPanel: state.showConfigPanel,
      }),
    }
  )
);

// =============================================================================
// Selectors (for optimized re-renders)
// =============================================================================

export const selectActiveStrategy = (state: StrategyStore) => state.getActiveStrategy();
export const selectActiveConfig = (state: StrategyStore) => state.activeConfig;
export const selectEnabled = (state: StrategyStore) => state.enabled;
export const selectPresets = (state: StrategyStore) => state.presets;
export const selectStats = (state: StrategyStore) => state.stats;
export const selectTodayStats = (state: StrategyStore) => state.getTodayStats();
