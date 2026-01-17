/**
 * Chart Store
 * 
 * Zustand store for managing chart state including:
 * - Symbol and timeframe selection
 * - Kline data loading and real-time updates
 * - Chart display settings
 * - Crosshair position
 * - Integration with indicator store for recalculation
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { Timeframe, ParsedKline } from '../types/bitunix';
import type { Kline } from '../types';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_SYMBOL = 'BTCUSDT';
const DEFAULT_TIMEFRAME: Timeframe = '1h';
const DEFAULT_KLINE_LIMIT = 500;

// =============================================================================
// Types
// =============================================================================

export type ChartType = 'candles' | 'line' | 'area';
export type PriceScale = 'normal' | 'log' | 'percentage';

export interface CrosshairData {
  price: number;
  time: number;
  x?: number;
  y?: number;
}

export interface ChartState {
  // Symbol and timeframe
  symbol: string;
  timeframe: Timeframe;
  
  // Kline data
  klines: ParsedKline[];
  rawKlines: Kline[];
  
  // Loading states
  isLoading: boolean;
  isSubscribed: boolean;
  error: string | null;
  
  // Chart display settings
  chartType: ChartType;
  priceScale: PriceScale;
  showVolume: boolean;
  showGrid: boolean;
  
  // Crosshair
  crosshair: CrosshairData | null;
  
  // WebSocket subscription ID
  subscriptionId: string | null;
  
  // Last update timestamp
  lastUpdate: number;
}

export interface ChartActions {
  // Symbol and timeframe
  setSymbol: (symbol: string) => Promise<void>;
  setTimeframe: (timeframe: Timeframe) => Promise<void>;
  setSymbolAndTimeframe: (symbol: string, timeframe: Timeframe) => Promise<void>;
  
  // Data management
  fetchKlines: () => Promise<void>;
  appendKline: (kline: Kline) => void;
  updateKline: (kline: Kline) => void;
  setKlines: (klines: ParsedKline[], rawKlines?: Kline[]) => void;
  clearKlines: () => void;
  
  // Chart settings
  setChartType: (type: ChartType) => void;
  setPriceScale: (scale: PriceScale) => void;
  toggleVolume: () => void;
  toggleGrid: () => void;
  
  // Crosshair
  setCrosshair: (data: CrosshairData | null) => void;
  
  // WebSocket
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  
  // Loading states
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Utility
  reset: () => void;
}

export interface ChartComputed {
  // Get latest kline
  latestKline: () => ParsedKline | null;
  
  // Get latest price
  latestPrice: () => number | null;
  
  // Get price change
  priceChange: () => { value: number; percent: number } | null;
  
  // Check if data is stale
  isDataStale: () => boolean;
  
  // Get OHLCV arrays for indicator calculation
  getOHLCV: () => {
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
    time: number[];
  };
}

export type ChartStore = ChartState & ChartActions & ChartComputed;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse raw kline to chart format
 */
function parseKline(kline: Kline): ParsedKline {
  return {
    time: Math.floor(kline.openTime / 1000), // Convert to seconds for lightweight-charts
    open: parseFloat(kline.open),
    high: parseFloat(kline.high),
    low: parseFloat(kline.low),
    close: parseFloat(kline.close),
    volume: parseFloat(kline.volume),
  };
}

// =============================================================================
// Store Definition
// =============================================================================

const initialState: ChartState = {
  symbol: DEFAULT_SYMBOL,
  timeframe: DEFAULT_TIMEFRAME,
  klines: [],
  rawKlines: [],
  isLoading: false,
  isSubscribed: false,
  error: null,
  chartType: 'candles',
  priceScale: 'normal',
  showVolume: true,
  showGrid: true,
  crosshair: null,
  subscriptionId: null,
  lastUpdate: 0,
};

export const useChartStore = create<ChartStore>()(
  persist(
    immer((set, get) => ({
      // =======================================================================
      // State
      // =======================================================================
      ...initialState,
      
      // =======================================================================
      // Actions
      // =======================================================================
      
      setSymbol: async (symbol: string): Promise<void> => {
        const state = get();
        if (state.symbol === symbol) return;
        
        // Unsubscribe from current
        await state.unsubscribe();
        
        set((draft) => {
          draft.symbol = symbol.toUpperCase();
          draft.klines = [];
          draft.rawKlines = [];
          draft.error = null;
        });
        
        // Fetch new data and subscribe
        await get().fetchKlines();
        await get().subscribe();
      },
      
      setTimeframe: async (timeframe: Timeframe): Promise<void> => {
        const state = get();
        if (state.timeframe === timeframe) return;
        
        // Unsubscribe from current
        await state.unsubscribe();
        
        set((draft) => {
          draft.timeframe = timeframe;
          draft.klines = [];
          draft.rawKlines = [];
          draft.error = null;
        });
        
        // Fetch new data and subscribe
        await get().fetchKlines();
        await get().subscribe();
      },
      
      setSymbolAndTimeframe: async (symbol: string, timeframe: Timeframe): Promise<void> => {
        const state = get();
        const symbolChanged = state.symbol !== symbol.toUpperCase();
        const timeframeChanged = state.timeframe !== timeframe;
        
        if (!symbolChanged && !timeframeChanged) return;
        
        // Unsubscribe from current
        await state.unsubscribe();
        
        set((draft) => {
          draft.symbol = symbol.toUpperCase();
          draft.timeframe = timeframe;
          draft.klines = [];
          draft.rawKlines = [];
          draft.error = null;
        });
        
        // Fetch new data and subscribe
        await get().fetchKlines();
        await get().subscribe();
      },
      
      fetchKlines: async (): Promise<void> => {
        const { symbol, timeframe } = get();
        
        set((draft) => {
          draft.isLoading = true;
          draft.error = null;
        });
        
        try {
          // Check if we're in Electron environment
          if (typeof window !== 'undefined' && window.bitunix) {
            const response = await window.bitunix.getKlines(
              symbol,
              timeframe,
              DEFAULT_KLINE_LIMIT
            );
            
            if (response.success && response.data) {
              const rawKlines = response.data as Kline[];
              const parsedKlines = rawKlines.map(parseKline);
              
              // Sort by time ascending
              parsedKlines.sort((a, b) => a.time - b.time);
              
              set((draft) => {
                draft.klines = parsedKlines;
                draft.rawKlines = rawKlines;
                draft.lastUpdate = Date.now();
                draft.isLoading = false;
              });
              
            } else {
              throw new Error(response.error || 'Failed to fetch klines');
            }
          } else {
            throw new Error('Electron IPC not available');
          }
        } catch (error) {
          console.error('Error fetching klines:', error);
          set((draft) => {
            draft.error = (error as Error).message;
            draft.isLoading = false;
          });
        }
      },
      
      appendKline: (kline: Kline): void => {
        const parsed = parseKline(kline);
        
        set((draft) => {
          const existingIndex = draft.klines.findIndex(k => k.time === parsed.time);
          
          if (existingIndex >= 0) {
            // Update existing kline
            draft.klines[existingIndex] = parsed;
            draft.rawKlines[existingIndex] = kline;
          } else {
            // Append new kline
            draft.klines.push(parsed);
            draft.rawKlines.push(kline);
            
            // Keep array size manageable (max 2x default limit)
            if (draft.klines.length > DEFAULT_KLINE_LIMIT * 2) {
              draft.klines = draft.klines.slice(-DEFAULT_KLINE_LIMIT);
              draft.rawKlines = draft.rawKlines.slice(-DEFAULT_KLINE_LIMIT);
            }
          }
          
          draft.lastUpdate = Date.now();
        });
      },
      
      updateKline: (kline: Kline): void => {
        const parsed = parseKline(kline);
        
        set((draft) => {
          const existingIndex = draft.klines.findIndex(k => k.time === parsed.time);
          
          if (existingIndex >= 0) {
            draft.klines[existingIndex] = parsed;
            draft.rawKlines[existingIndex] = kline;
            draft.lastUpdate = Date.now();
          }
        });
      },
      
      setKlines: (klines: ParsedKline[], rawKlines?: Kline[]): void => {
        set((draft) => {
          draft.klines = klines;
          if (rawKlines) {
            draft.rawKlines = rawKlines;
          }
          draft.lastUpdate = Date.now();
        });
      },
      
      clearKlines: (): void => {
        set((draft) => {
          draft.klines = [];
          draft.rawKlines = [];
        });
      },
      
      setChartType: (type: ChartType): void => {
        set((draft) => {
          draft.chartType = type;
        });
      },
      
      setPriceScale: (scale: PriceScale): void => {
        set((draft) => {
          draft.priceScale = scale;
        });
      },
      
      toggleVolume: (): void => {
        set((draft) => {
          draft.showVolume = !draft.showVolume;
        });
      },
      
      toggleGrid: (): void => {
        set((draft) => {
          draft.showGrid = !draft.showGrid;
        });
      },
      
      setCrosshair: (data: CrosshairData | null): void => {
        set((draft) => {
          draft.crosshair = data;
        });
      },
      
      subscribe: async (): Promise<void> => {
        const { symbol, timeframe, isSubscribed } = get();
        
        if (isSubscribed) return;
        
        try {
          if (typeof window !== 'undefined' && window.bitunix) {
            const result = await window.bitunix.subscribe({ symbol, interval: timeframe });
            
            if (result.success) {
              set((draft) => {
                draft.isSubscribed = true;
                draft.subscriptionId = null; // Subscription ID managed by IPC
              });
              console.log(`Subscribed to ${symbol}@${timeframe}`);
            } else {
              throw new Error(result.error || 'Failed to subscribe');
            }
          }
        } catch (error) {
          console.error('Subscription error:', error);
          set((draft) => {
            draft.error = (error as Error).message;
          });
        }
      },
      
      unsubscribe: async (): Promise<void> => {
        const { symbol, timeframe, isSubscribed } = get();
        
        if (!isSubscribed) return;
        
        try {
          if (typeof window !== 'undefined' && window.bitunix) {
            await window.bitunix.unsubscribe({ symbol, interval: timeframe });
          }
        } catch (error) {
          console.error('Unsubscribe error:', error);
        } finally {
          set((draft) => {
            draft.isSubscribed = false;
            draft.subscriptionId = null;
          });
        }
      },
      
      setLoading: (isLoading: boolean): void => {
        set((draft) => {
          draft.isLoading = isLoading;
        });
      },
      
      setError: (error: string | null): void => {
        set((draft) => {
          draft.error = error;
        });
      },
      
      reset: (): void => {
        set((draft) => {
          Object.assign(draft, initialState);
        });
      },
      
      // =======================================================================
      // Computed
      // =======================================================================
      
      latestKline: (): ParsedKline | null => {
        const { klines } = get();
        return klines.length > 0 ? klines[klines.length - 1] : null;
      },
      
      latestPrice: (): number | null => {
        const latest = get().latestKline();
        return latest ? latest.close : null;
      },
      
      priceChange: (): { value: number; percent: number } | null => {
        const { klines } = get();
        if (klines.length < 2) return null;
        
        const current = klines[klines.length - 1].close;
        const first = klines[0].open;
        const change = current - first;
        const percent = (change / first) * 100;
        
        return { value: change, percent };
      },
      
      isDataStale: (): boolean => {
        const { lastUpdate, timeframe } = get();
        if (!lastUpdate) return true;
        
        // Consider data stale if older than 2x the timeframe
        const timeframeMs = getTimeframeMs(timeframe);
        return Date.now() - lastUpdate > timeframeMs * 2;
      },
      
      getOHLCV: () => {
        const { klines } = get();
        return {
          open: klines.map(k => k.open),
          high: klines.map(k => k.high),
          low: klines.map(k => k.low),
          close: klines.map(k => k.close),
          volume: klines.map(k => k.volume),
          time: klines.map(k => k.time),
        };
      },
    })),
    {
      name: 'bitunix-chart',
      storage: createJSONStorage(() => localStorage),
      
      // Only persist preferences, not data
      partialize: (state) => ({
        symbol: state.symbol,
        timeframe: state.timeframe,
        chartType: state.chartType,
        priceScale: state.priceScale,
        showVolume: state.showVolume,
        showGrid: state.showGrid,
      }),
      
      // Reset transient state on rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.klines = [];
          state.rawKlines = [];
          state.isLoading = false;
          state.isSubscribed = false;
          state.error = null;
          state.crosshair = null;
          state.subscriptionId = null;
          state.lastUpdate = 0;
        }
      },
    }
  )
);

// =============================================================================
// Helper: Get timeframe in milliseconds
// =============================================================================

function getTimeframeMs(timeframe: Timeframe): number {
  const map: Record<Timeframe, number> = {
    '1m': 60 * 1000,
    '3m': 3 * 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '2h': 2 * 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
  };
  return map[timeframe] || 60 * 60 * 1000;
}

// =============================================================================
// Selectors
// =============================================================================

export const selectSymbol = (state: ChartStore) => state.symbol;
export const selectTimeframe = (state: ChartStore) => state.timeframe;
export const selectKlines = (state: ChartStore) => state.klines;
export const selectIsLoading = (state: ChartStore) => state.isLoading;
export const selectError = (state: ChartStore) => state.error;
export const selectChartType = (state: ChartStore) => state.chartType;
export const selectPriceScale = (state: ChartStore) => state.priceScale;
export const selectShowVolume = (state: ChartStore) => state.showVolume;
export const selectShowGrid = (state: ChartStore) => state.showGrid;
export const selectCrosshair = (state: ChartStore) => state.crosshair;
export const selectIsSubscribed = (state: ChartStore) => state.isSubscribed;
export const selectLastUpdate = (state: ChartStore) => state.lastUpdate;

// Combined selectors
export const selectSymbolTimeframe = (state: ChartStore) => ({
  symbol: state.symbol,
  timeframe: state.timeframe,
});

export const selectChartSettings = (state: ChartStore) => ({
  chartType: state.chartType,
  priceScale: state.priceScale,
  showVolume: state.showVolume,
  showGrid: state.showGrid,
});

export const selectLoadingState = (state: ChartStore) => ({
  isLoading: state.isLoading,
  error: state.error,
  isSubscribed: state.isSubscribed,
});

// =============================================================================
// Initialize: Set up kline update listener
// =============================================================================

if (typeof window !== 'undefined') {
  // Set up global kline update handler when window.bitunix is available
  const setupKlineListener = () => {
    if (window.bitunix) {
      window.bitunix.onKlineUpdate((data) => {
        const chartStore = useChartStore.getState();
        const { symbol, timeframe } = chartStore;
        
        // Check if update is for current symbol/timeframe
        if (data.symbol === symbol && data.interval === timeframe) {
          chartStore.appendKline(data.kline);
        }
      });
    }
  };
  
  // Try immediately and also after a delay (in case bitunix isn't ready)
  setupKlineListener();
  setTimeout(setupKlineListener, 1000);
}

export default useChartStore;
