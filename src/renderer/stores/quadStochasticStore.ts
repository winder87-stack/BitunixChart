import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { TradeSignal } from '../types/signals';
import type {
  SignalConfig,
  SignalUpdate,
  SignalStatistics,
} from '../types/quadStochastic';
import { DEFAULT_SIGNAL_CONFIG, isValidSignalConfig } from '../types/quadStochastic';
import { soundManager } from '../utils/audio/soundManager';

const MAX_SIGNAL_HISTORY = 100;

interface QuadStochasticState {
  signals: TradeSignal[];
  activeSignal: TradeSignal | null;
  config: SignalConfig;
  isEnabled: boolean;
  isScanning: boolean;
  lastScanTime: number | null;
  watchlist: string[];
}

interface QuadStochasticActions {
  addSignal: (signal: TradeSignal) => void;
  updateSignal: (update: SignalUpdate) => void;
  removeSignal: (id: string) => void;
  setActiveSignal: (id: string | null) => void;
  updateConfig: (config: Partial<SignalConfig>) => void;
  resetConfig: () => void;
  toggleEnabled: () => void;
  setScanning: (isScanning: boolean) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  clearWatchlist: () => void;
  clearSignalHistory: () => void;
  expireOldSignals: () => void;
}

interface QuadStochasticComputed {
  getSignalById: (id: string) => TradeSignal | undefined;
  getPendingSignals: () => TradeSignal[];
  getActiveSignals: () => TradeSignal[];
  getClosedSignals: () => TradeSignal[];
  getSignalsBySymbol: (symbol: string) => TradeSignal[];
  getStatistics: () => SignalStatistics;
  getRecentSignals: (count: number) => TradeSignal[];
}

export type QuadStochasticStore = QuadStochasticState & QuadStochasticActions & QuadStochasticComputed;

function calculateStatistics(signals: TradeSignal[]): SignalStatistics {
  const closedSignals = signals.filter(s => 
    s.status === 'TARGET1_HIT' || 
    s.status === 'TARGET2_HIT' || 
    s.status === 'TARGET3_HIT' || 
    s.status === 'STOPPED'
  );

  if (closedSignals.length === 0) {
    return {
      totalSignals: signals.length,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
      avgWinPercent: 0,
      avgLossPercent: 0,
      profitFactor: 0,
      expectancy: 0,
      largestWin: 0,
      largestLoss: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
    };
  }

  const wins = closedSignals.filter(s => s.pnlPercent > 0);
  const losses = closedSignals.filter(s => s.pnlPercent < 0);

  const winCount = wins.length;
  const lossCount = losses.length;
  const winRate = closedSignals.length > 0 ? winCount / closedSignals.length : 0;

  const totalWinPercent = wins.reduce((sum, s) => sum + s.pnlPercent, 0);
  const totalLossPercent = Math.abs(losses.reduce((sum, s) => sum + s.pnlPercent, 0));

  const avgWinPercent = winCount > 0 ? totalWinPercent / winCount : 0;
  const avgLossPercent = lossCount > 0 ? totalLossPercent / lossCount : 0;

  const profitFactor = totalLossPercent > 0 ? totalWinPercent / totalLossPercent : totalWinPercent > 0 ? Infinity : 0;

  const expectancy = (winRate * avgWinPercent) - ((1 - winRate) * avgLossPercent);

  const largestWin = wins.length > 0 ? Math.max(...wins.map(s => s.pnlPercent)) : 0;
  const largestLoss = losses.length > 0 ? Math.min(...losses.map(s => s.pnlPercent)) : 0;

  let consecutiveWins = 0;
  let consecutiveLosses = 0;
  let currentStreak = 0;
  let lastWasWin: boolean | null = null;

  for (const signal of closedSignals) {
    const isWin = signal.pnlPercent > 0;
    if (lastWasWin === isWin) {
      currentStreak++;
    } else {
      currentStreak = 1;
      lastWasWin = isWin;
    }
    if (isWin && currentStreak > consecutiveWins) {
      consecutiveWins = currentStreak;
    }
    if (!isWin && currentStreak > consecutiveLosses) {
      consecutiveLosses = currentStreak;
    }
  }

  return {
    totalSignals: signals.length,
    winCount,
    lossCount,
    winRate,
    avgWinPercent,
    avgLossPercent,
    profitFactor,
    expectancy,
    largestWin,
    largestLoss,
    consecutiveWins,
    consecutiveLosses,
  };
}

export const useQuadStochasticStore = create<QuadStochasticStore>()(
  persist(
    immer((set, get) => ({
      signals: [],
      activeSignal: null,
      config: { ...DEFAULT_SIGNAL_CONFIG },
      isEnabled: true,
      isScanning: false,
      lastScanTime: null,
      watchlist: ['BTCUSDT', 'ETHUSDT'],

      addSignal: (signal: TradeSignal): void => {
        set((draft) => {
          const existingPending = draft.signals.find(
            s => s.symbol === signal.symbol && s.status === 'PENDING'
          );
          if (existingPending) {
            const index = draft.signals.indexOf(existingPending as any);
            if (index !== -1) draft.signals[index] = signal;
          } else {
            draft.signals.unshift(signal);
          }

          if (draft.signals.length > MAX_SIGNAL_HISTORY) {
            draft.signals = draft.signals.slice(0, MAX_SIGNAL_HISTORY);
          }

          if (signal.status === 'PENDING' || signal.status === 'ACTIVE') {
            draft.activeSignal = signal;
          }

          // Play sound if enabled
          if (draft.config.enableSound) {
            // We can't call soundManager directly inside the immer draft if it has side effects?
            // Actually it's fine, soundManager.playSound is async and external
            soundManager.playSound(signal.strength);
          }
        });
      },

      updateSignal: (update: SignalUpdate): void => {
        set((draft) => {
          const signal = draft.signals.find(s => s.id === update.id);
          if (signal) {
            if (update.status !== undefined) signal.status = update.status;
            if (update.actualEntry !== undefined) signal.actualEntry = update.actualEntry;
            if (update.actualExit !== undefined) signal.actualExit = update.actualExit;
            if (update.entryTime !== undefined) signal.entryTime = update.entryTime;
            if (update.exitTime !== undefined) signal.exitTime = update.exitTime;
            if (update.pnlPercent !== undefined) signal.pnlPercent = update.pnlPercent;
            if (update.pnlAmount !== undefined) signal.pnlAmount = update.pnlAmount;
            if (update.notes !== undefined) signal.notes = update.notes;

            if (draft.activeSignal?.id === update.id) {
              draft.activeSignal = signal;
            }
          }
        });
      },

      removeSignal: (id: string): void => {
        set((draft) => {
          draft.signals = draft.signals.filter(s => s.id !== id);
          if (draft.activeSignal?.id === id) {
            draft.activeSignal = null;
          }
        });
      },

      setActiveSignal: (id: string | null): void => {
        set((draft) => {
          if (id === null) {
            draft.activeSignal = null;
          } else {
            const signal = draft.signals.find(s => s.id === id);
            draft.activeSignal = signal ?? null;
          }
        });
      },

      updateConfig: (configUpdate: Partial<SignalConfig>): void => {
        set((draft) => {
          const newConfig = { ...draft.config, ...configUpdate };
          if (isValidSignalConfig(newConfig)) {
            draft.config = newConfig;
          }
        });
      },

      resetConfig: (): void => {
        set((draft) => {
          draft.config = { ...DEFAULT_SIGNAL_CONFIG };
        });
      },

      toggleEnabled: (): void => {
        set((draft) => {
          draft.isEnabled = !draft.isEnabled;
        });
      },

      setScanning: (isScanning: boolean): void => {
        set((draft) => {
          draft.isScanning = isScanning;
          if (isScanning) {
            draft.lastScanTime = Date.now();
          }
        });
      },

      addToWatchlist: (symbol: string): void => {
        set((draft) => {
          const normalized = symbol.toUpperCase();
          if (!draft.watchlist.includes(normalized)) {
            draft.watchlist.push(normalized);
          }
        });
      },

      removeFromWatchlist: (symbol: string): void => {
        set((draft) => {
          draft.watchlist = draft.watchlist.filter(s => s !== symbol.toUpperCase());
        });
      },

      clearWatchlist: (): void => {
        set((draft) => {
          draft.watchlist = [];
        });
      },

      clearSignalHistory: (): void => {
        set((draft) => {
          draft.signals = draft.signals.filter(s => 
            s.status === 'PENDING' || s.status === 'ACTIVE' || s.status === 'PARTIAL'
          );
        });
      },

      expireOldSignals: (): void => {
        const now = Date.now();
        const config = get().config;
        
        set((draft) => {
          for (const signal of draft.signals) {
            if (signal.status === 'PENDING') {
              if (now - signal.timestamp > config.signalExpiryMs) {
                signal.status = 'EXPIRED';
              }
            }
          }
          
          if (draft.activeSignal?.status === 'EXPIRED') {
            draft.activeSignal = null;
          }
        });
      },

      getSignalById: (id: string): TradeSignal | undefined => {
        return get().signals.find(s => s.id === id);
      },

      getPendingSignals: (): TradeSignal[] => {
        return get().signals.filter(s => s.status === 'PENDING');
      },

      getActiveSignals: (): TradeSignal[] => {
        return get().signals.filter(s => 
          s.status === 'ACTIVE' || s.status === 'PARTIAL'
        );
      },

      getClosedSignals: (): TradeSignal[] => {
        return get().signals.filter(s => 
          s.status === 'TARGET1_HIT' || 
          s.status === 'TARGET2_HIT' || 
          s.status === 'TARGET3_HIT' || 
          s.status === 'STOPPED' ||
          s.status === 'EXPIRED'
        );
      },

      getSignalsBySymbol: (symbol: string): TradeSignal[] => {
        const normalized = symbol.toUpperCase();
        return get().signals.filter(s => s.symbol === normalized);
      },

      getStatistics: (): SignalStatistics => {
        return calculateStatistics(get().signals);
      },

      getRecentSignals: (count: number): TradeSignal[] => {
        return get().signals.slice(0, count);
      },
    })),
    {
      name: 'bitunix-quad-stochastic',
      storage: createJSONStorage(() => localStorage),
      
      partialize: (state) => ({
        signals: state.signals.slice(0, 50),
        config: state.config,
        isEnabled: state.isEnabled,
        watchlist: state.watchlist,
      }),
      
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.activeSignal = null;
          state.isScanning = false;
          state.lastScanTime = null;
          
          if (!isValidSignalConfig(state.config)) {
            state.config = { ...DEFAULT_SIGNAL_CONFIG };
          }
        }
      },
    }
  )
);

export const selectSignals = (state: QuadStochasticStore) => state.signals;
export const selectActiveSignal = (state: QuadStochasticStore) => state.activeSignal;
export const selectConfig = (state: QuadStochasticStore) => state.config;
export const selectIsEnabled = (state: QuadStochasticStore) => state.isEnabled;
export const selectIsScanning = (state: QuadStochasticStore) => state.isScanning;
export const selectWatchlist = (state: QuadStochasticStore) => state.watchlist;

export const selectPendingCount = (state: QuadStochasticStore) => 
  state.signals.filter(s => s.status === 'PENDING').length;

export const selectActiveCount = (state: QuadStochasticStore) => 
  state.signals.filter(s => s.status === 'ACTIVE' || s.status === 'PARTIAL').length;

export default useQuadStochasticStore;
