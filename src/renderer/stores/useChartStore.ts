import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  TimeInterval, 
  ChartType, 
  IndicatorConfig, 
  ConnectionStatus,
  ParsedKline,
} from '../types';
import { parseKlines, DEFAULT_INDICATOR_STYLES, INDICATOR_COLOR_PALETTE } from '../types';

// =============================================================================
// Store Types
// =============================================================================

interface ChartStoreState {
  // Current chart configuration
  symbol: string;
  interval: TimeInterval;
  chartType: ChartType;
  
  // Chart data
  klines: ParsedKline[];
  isLoading: boolean;
  error: string | null;
  
  // Indicators
  activeIndicators: IndicatorConfig[];
  
  // Display options
  showVolume: boolean;
  autoScale: boolean;
  
  // Connection status
  connectionStatus: ConnectionStatus;
  
  // Available symbols cache
  availableSymbols: string[];
}

interface ChartStoreActions {
  // Symbol/Interval management
  setSymbol: (symbol: string) => void;
  setInterval: (interval: TimeInterval) => void;
  setChartType: (chartType: ChartType) => void;
  
  // Data management
  setKlines: (klines: ParsedKline[]) => void;
  appendKline: (kline: ParsedKline, isFinal: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Indicator management
  addIndicator: (indicator: IndicatorConfig) => void;
  removeIndicator: (id: string) => void;
  toggleIndicator: (id: string) => void;
  updateIndicatorParams: (id: string, params: Record<string, number>) => void;
  updateIndicatorColor: (id: string, color: string) => void;
  clearIndicators: () => void;
  
  // Display options
  toggleVolume: () => void;
  toggleAutoScale: () => void;
  
  // Connection
  setConnectionStatus: (status: ConnectionStatus) => void;
  
  // Symbols
  setAvailableSymbols: (symbols: string[]) => void;
  
  // Data fetching
  fetchKlines: () => Promise<void>;
  subscribeToUpdates: () => Promise<() => void>;
}

type ChartStore = ChartStoreState & ChartStoreActions;

// =============================================================================
// Constants
// =============================================================================

const MAX_INDICATORS = 10;
const MAX_KLINES = 1500;

// =============================================================================
// Store Implementation
// =============================================================================

export const useChartStore = create<ChartStore>()(
  persist(
    (set, get) => ({
      // =========================================================================
      // Initial State
      // =========================================================================
      
      symbol: 'BTCUSDT',
      interval: '1h',
      chartType: 'candlestick',
      klines: [],
      isLoading: false,
      error: null,
      activeIndicators: [],
      showVolume: true,
      autoScale: true,
      connectionStatus: 'disconnected',
      availableSymbols: [],

      // =========================================================================
      // Symbol/Interval Actions
      // =========================================================================

      setSymbol: (symbol) => {
        const currentSymbol = get().symbol;
        if (symbol !== currentSymbol) {
          set({ symbol, klines: [], error: null });
        }
      },

      setInterval: (interval) => {
        const currentInterval = get().interval;
        if (interval !== currentInterval) {
          set({ interval, klines: [], error: null });
        }
      },

      setChartType: (chartType) => {
        set({ chartType });
      },

      // =========================================================================
      // Data Actions
      // =========================================================================

      setKlines: (klines) => {
        // Sort by time and limit to MAX_KLINES
        const sorted = [...klines].sort((a, b) => a.time - b.time);
        const limited = sorted.slice(-MAX_KLINES);
        set({ klines: limited, isLoading: false, error: null });
      },

      appendKline: (kline, isFinal) => {
        const { klines } = get();
        
        if (klines.length === 0) {
          set({ klines: [kline] });
          return;
        }

        const lastKline = klines[klines.length - 1];
        
        if (kline.time === lastKline.time) {
          // Update existing kline
          const updated = [...klines];
          updated[updated.length - 1] = kline;
          set({ klines: updated });
        } else if (kline.time > lastKline.time && isFinal) {
          // Append new kline
          const updated = [...klines, kline].slice(-MAX_KLINES);
          set({ klines: updated });
        }
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setError: (error) => {
        set({ error, isLoading: false });
      },

      // =========================================================================
      // Indicator Actions
      // =========================================================================

      addIndicator: (indicator) => {
        const { activeIndicators } = get();
        
        if (activeIndicators.length >= MAX_INDICATORS) {
          console.warn(`Maximum ${MAX_INDICATORS} indicators allowed`);
          return;
        }

        // Assign color if not provided in style
        const colorIndex = activeIndicators.length % INDICATOR_COLOR_PALETTE.length;
        const indicatorWithStyle: IndicatorConfig = {
          ...indicator,
          style: {
            ...DEFAULT_INDICATOR_STYLES.trend,
            ...indicator.style,
            color: indicator.style?.color || INDICATOR_COLOR_PALETTE[colorIndex],
          },
        };

        set({ activeIndicators: [...activeIndicators, indicatorWithStyle] });
      },

      removeIndicator: (id) => {
        const { activeIndicators } = get();
        set({ activeIndicators: activeIndicators.filter((ind) => ind.id !== id) });
      },

      toggleIndicator: (id) => {
        const { activeIndicators } = get();
        set({
          activeIndicators: activeIndicators.map((ind) =>
            ind.id === id ? { ...ind, enabled: !ind.enabled } : ind
          ),
        });
      },

      updateIndicatorParams: (id, params) => {
        const { activeIndicators } = get();
        set({
          activeIndicators: activeIndicators.map((ind) =>
            ind.id === id ? { ...ind, params: { ...ind.params, ...params } } : ind
          ),
        });
      },

      updateIndicatorColor: (id, color) => {
        const { activeIndicators } = get();
        set({
          activeIndicators: activeIndicators.map((ind) =>
            ind.id === id ? { ...ind, style: { ...ind.style, color } } : ind
          ),
        });
      },

      clearIndicators: () => {
        set({ activeIndicators: [] });
      },

      // =========================================================================
      // Display Options
      // =========================================================================

      toggleVolume: () => {
        set((state) => ({ showVolume: !state.showVolume }));
      },

      toggleAutoScale: () => {
        set((state) => ({ autoScale: !state.autoScale }));
      },

      // =========================================================================
      // Connection
      // =========================================================================

      setConnectionStatus: (connectionStatus) => {
        set({ connectionStatus });
      },

      // =========================================================================
      // Symbols
      // =========================================================================

      setAvailableSymbols: (availableSymbols) => {
        set({ availableSymbols });
      },

      // =========================================================================
      // Data Fetching
      // =========================================================================

      fetchKlines: async () => {
        const { symbol, interval } = get();
        
        set({ isLoading: true, error: null });

        try {
          const response = await window.bitunix.getKlines(symbol, interval, 1000);
          
          if (response.success && response.data) {
            const parsed = parseKlines(response.data);
            get().setKlines(parsed);
          } else {
            set({ error: response.error || 'Failed to fetch klines', isLoading: false });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message, isLoading: false });
        }
      },

      subscribeToUpdates: async () => {
        const { symbol, interval } = get();
        
        // Subscribe to WebSocket updates
        const result = await window.bitunix.subscribe({ symbol, interval });
        
        if (!result.success) {
          console.error('Failed to subscribe:', result.error);
        }

        // Set up kline update listener
        const cleanup = window.bitunix.onKlineUpdate((data) => {
          if (data.symbol === symbol && data.interval === interval) {
            const parsed: ParsedKline = {
              time: data.kline.openTime / 1000,
              open: parseFloat(data.kline.open),
              high: parseFloat(data.kline.high),
              low: parseFloat(data.kline.low),
              close: parseFloat(data.kline.close),
              volume: parseFloat(data.kline.volume),
            };
            get().appendKline(parsed, data.isFinal);
          }
        });

        // Return cleanup function
        return async () => {
          cleanup();
          await window.bitunix.unsubscribe({ symbol, interval });
        };
      },
    }),
    {
      name: 'bitunix-chart-storage',
      partialize: (state) => ({
        // Only persist these fields
        symbol: state.symbol,
        interval: state.interval,
        chartType: state.chartType,
        activeIndicators: state.activeIndicators,
        showVolume: state.showVolume,
        autoScale: state.autoScale,
      }),
    }
  )
);

// =============================================================================
// Selectors (for optimized re-renders)
// =============================================================================

export const selectSymbol = (state: ChartStore) => state.symbol;
export const selectInterval = (state: ChartStore) => state.interval;
export const selectChartType = (state: ChartStore) => state.chartType;
export const selectKlines = (state: ChartStore) => state.klines;
export const selectIsLoading = (state: ChartStore) => state.isLoading;
export const selectError = (state: ChartStore) => state.error;
export const selectActiveIndicators = (state: ChartStore) => state.activeIndicators;
export const selectShowVolume = (state: ChartStore) => state.showVolume;
export const selectConnectionStatus = (state: ChartStore) => state.connectionStatus;
