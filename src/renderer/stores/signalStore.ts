import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type {
  QuadSignal,
  SignalConfig,
  QuadStochasticData,
  SignalStrength,
  ChannelBoundary,
} from '../types/quadStochastic';
import { DEFAULT_SIGNAL_CONFIG } from '../types/quadStochastic';
import type { MAData } from '../services/indicators/quadStochCalculator';
import { soundManager } from '../utils/audio/soundManager';

// =============================================================================
// Types
// =============================================================================

interface ScannerResult {
  symbol: string;
  timestamp: number;
  signals: QuadSignal[];
  hasSignal: boolean;
  bestSignalStrength: SignalStrength | null;
}

interface SignalState {
  // Signals
  signals: QuadSignal[];
  signalHistory: QuadSignal[];
  
  // Current calculation data
  currentSymbol: string | null;
  quadData: QuadStochasticData | null;
  maData: MAData | null;
  channel: ChannelBoundary | null;
  vwap: number[];
  
  // Configuration
  config: SignalConfig;
  
  // Scanner
  scannerSymbols: string[];
  scannerResults: Record<string, ScannerResult>;
  scannerLoading: boolean;
  isScanning: boolean;
  
  // UI state
  showSignalPanel: boolean;
  showQuadPane: boolean;
  selectedSignal: QuadSignal | null;
  
  // Settings
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  autoTradeEnabled: boolean;
}

interface SignalActions {
  addSignal: (signal: QuadSignal) => void;
  updateSignal: (id: string, updates: Partial<QuadSignal>) => void;
  removeSignal: (id: string) => void;
  
  updateSignalStatuses: (currentPrices: Record<string, number>) => void;
  
  setQuadData: (symbol: string, data: QuadStochasticData) => void;
  setCalculationData: (
    symbol: string, 
    data: { 
      quadData: QuadStochasticData;
      maData: MAData;
      channel: ChannelBoundary;
      vwap: number[];
    }
  ) => void;
  
  updateConfig: (config: Partial<SignalConfig>) => void;
  resetConfig: () => void;
  
  toggleSignalPanel: () => void;
  toggleQuadPane: () => void;
  selectSignal: (signal: QuadSignal | null) => void;
  
  toggleSound: () => void;
  toggleNotifications: () => void;
  
  // Scanner actions
  addScannerSymbol: (symbol: string) => void;
  removeScannerSymbol: (symbol: string) => void;
  setScannerResult: (result: ScannerResult) => void;
  setScannerLoading: (loading: boolean) => void;
  setIsScanning: (scanning: boolean) => void;
  
  clearHistory: () => void;
}

interface SignalComputed {
  activeSignals: () => QuadSignal[];
  signalsBySymbol: (symbol: string) => QuadSignal[];
  superSignals: () => QuadSignal[];
  recentSignals: (minutes: number) => QuadSignal[];
}

export type SignalStore = SignalState & SignalActions & SignalComputed;

// =============================================================================
// Store Implementation
// =============================================================================

export const useSignalStore = create<SignalStore>()(
  persist(
    immer((set, get) => ({
      // State
      signals: [],
      signalHistory: [],
      currentSymbol: null,
      quadData: null,
      maData: null,
      channel: null,
      vwap: [],
      config: DEFAULT_SIGNAL_CONFIG,
      scannerSymbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT'],
      scannerResults: {},
      scannerLoading: false,
      isScanning: false,
      showSignalPanel: true,
      showQuadPane: true,
      selectedSignal: null,
      soundEnabled: true,
      notificationsEnabled: true,
      autoTradeEnabled: false,

      // Actions
      addSignal: (signal: QuadSignal) => {
        set((draft) => {
          // Check for duplicates within 5 minutes
          const existingIdx = draft.signals.findIndex(s => 
            s.symbol === signal.symbol && 
            s.type === signal.type &&
            Math.abs(s.timestamp - signal.timestamp) < 5 * 60 * 1000
          );

          if (existingIdx !== -1) {
            draft.signals[existingIdx] = { ...draft.signals[existingIdx], ...signal };
            return;
          }

          // Enforce max active signals
          if (draft.signals.length >= 20) {
            const oldestIdx = draft.signals.reduce((iMin, x, i, arr) => x.timestamp < arr[iMin].timestamp ? i : iMin, 0);
            const removed = draft.signals.splice(oldestIdx, 1)[0];
            removed.status = 'EXPIRED';
            draft.signalHistory.unshift(removed);
          }

          draft.signals.unshift(signal);
          
          // Notifications
          if (draft.soundEnabled) {
            soundManager.playSound(signal.strength);
          }
          
          if (draft.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`Quad Signal: ${signal.symbol} ${signal.type}`, {
              body: `${signal.strength} Signal | Entry: ${signal.entryPrice}`,
              icon: '/icon.png'
            });
          }
        });
      },

      updateSignal: (id: string, updates: Partial<QuadSignal>) => {
        set((draft) => {
          const idx = draft.signals.findIndex(s => s.id === id);
          if (idx !== -1) {
            const signal = draft.signals[idx];
            Object.assign(signal, updates);

            // Move closed signals to history
            if (['STOPPED', 'TARGET3_HIT', 'EXPIRED', 'CANCELLED'].includes(signal.status)) {
              draft.signalHistory.unshift(signal);
              draft.signals.splice(idx, 1);
            }
          }
        });
      },

      removeSignal: (id: string) => {
        set((draft) => {
          const idx = draft.signals.findIndex(s => s.id === id);
          if (idx !== -1) {
            const removed = draft.signals.splice(idx, 1)[0];
            removed.status = 'EXPIRED'; // Mark as expired/cancelled
            draft.signalHistory.unshift(removed);
          }
        });
      },

      updateSignalStatuses: (currentPrices: Record<string, number>) => {
        set((draft) => {
          const now = Date.now();

          for (let i = draft.signals.length - 1; i >= 0; i--) {
            const signal = draft.signals[i];
            const price = currentPrices[signal.symbol];
            
            if (!price) continue;

            // Simple status check logic
            const isLong = signal.type === 'LONG';
            let statusChanged = false;

            // Check Stop Loss
            if ((isLong && price <= signal.stopLoss) || (!isLong && price >= signal.stopLoss)) {
              signal.status = 'STOPPED';
              signal.actualExit = price;
              signal.exitTime = now;
              signal.pnlPercent = isLong 
                ? ((price - signal.entryPrice) / signal.entryPrice) * 100
                : ((signal.entryPrice - price) / signal.entryPrice) * 100;
              statusChanged = true;
            }
            // Check Targets
            else if ((isLong && price >= signal.target3) || (!isLong && price <= signal.target3)) {
              signal.status = 'TARGET3_HIT';
              signal.actualExit = price;
              signal.exitTime = now;
              signal.pnlPercent = isLong 
                ? ((price - signal.entryPrice) / signal.entryPrice) * 100
                : ((signal.entryPrice - price) / signal.entryPrice) * 100;
              statusChanged = true;
            }
            else if ((isLong && price >= signal.target2) || (!isLong && price <= signal.target2)) {
              if (signal.status !== 'PARTIAL') {
                signal.status = 'TARGET2_HIT';
                statusChanged = true;
              }
            }
            else if ((isLong && price >= signal.target1) || (!isLong && price <= signal.target1)) {
              if (signal.status === 'ACTIVE') {
                signal.status = 'TARGET1_HIT';
                statusChanged = true;
              }
            }

            if (statusChanged && ['STOPPED', 'TARGET3_HIT'].includes(signal.status)) {
              draft.signalHistory.unshift(signal);
              draft.signals.splice(i, 1);
            }
          }
        });
      },

      setQuadData: (symbol: string, data: QuadStochasticData) => {
        set((draft) => {
          if (draft.currentSymbol === symbol) {
            draft.quadData = data;
          }
        });
      },

      setCalculationData: (symbol, data) => {
        set((draft) => {
          if (draft.currentSymbol === symbol) {
            draft.quadData = data.quadData;
            draft.maData = data.maData;
            draft.channel = data.channel;
            draft.vwap = data.vwap;
          } else {
            draft.currentSymbol = symbol;
            draft.quadData = data.quadData;
            draft.maData = data.maData;
            draft.channel = data.channel;
            draft.vwap = data.vwap;
          }
        });
      },

      updateConfig: (configUpdate) => {
        set((draft) => {
          Object.assign(draft.config, configUpdate);
        });
      },

      resetConfig: () => {
        set((draft) => {
          draft.config = DEFAULT_SIGNAL_CONFIG;
        });
      },

      toggleSignalPanel: () => {
        set((draft) => {
          draft.showSignalPanel = !draft.showSignalPanel;
        });
      },

      toggleQuadPane: () => {
        set((draft) => {
          draft.showQuadPane = !draft.showQuadPane;
        });
      },

      selectSignal: (signal) => {
        set((draft) => {
          draft.selectedSignal = signal;
        });
      },

      toggleSound: () => {
        set((draft) => {
          draft.soundEnabled = !draft.soundEnabled;
          soundManager.setEnabled(draft.soundEnabled);
        });
      },

      toggleNotifications: () => {
        set((draft) => {
          draft.notificationsEnabled = !draft.notificationsEnabled;
        });
      },

      addScannerSymbol: (symbol) => {
        set((draft) => {
          if (!draft.scannerSymbols.includes(symbol)) {
            draft.scannerSymbols.push(symbol);
          }
        });
      },

      removeScannerSymbol: (symbol) => {
        set((draft) => {
          draft.scannerSymbols = draft.scannerSymbols.filter(s => s !== symbol);
          delete draft.scannerResults[symbol];
        });
      },

      setScannerResult: (result) => {
        set((draft) => {
          draft.scannerResults[result.symbol] = result;
        });
      },

      setScannerLoading: (loading) => {
        set((draft) => {
          draft.scannerLoading = loading;
        });
      },

      setIsScanning: (scanning) => {
        set((draft) => {
          draft.isScanning = scanning;
        });
      },

      clearHistory: () => {
        set((draft) => {
          draft.signalHistory = [];
        });
      },

      // Computed
      activeSignals: () => {
        return get().signals;
      },

      signalsBySymbol: (symbol: string) => {
        return get().signals.filter(s => s.symbol === symbol);
      },

      superSignals: () => {
        return get().signals.filter(s => s.strength === 'SUPER');
      },

      recentSignals: (minutes: number) => {
        const cutoff = Date.now() - minutes * 60 * 1000;
        return get().signals.filter(s => s.timestamp >= cutoff);
      },
    })),
    {
      name: 'bitunix-signal-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        config: state.config,
        scannerSymbols: state.scannerSymbols,
        showSignalPanel: state.showSignalPanel,
        showQuadPane: state.showQuadPane,
        soundEnabled: state.soundEnabled,
        notificationsEnabled: state.notificationsEnabled,
        signalHistory: state.signalHistory.slice(0, 100), // Keep last 100 in storage
      }),
    }
  )
);
