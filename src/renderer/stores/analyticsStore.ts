import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { TradeSignal } from '../types/signals';

export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  netProfit: number;
  averageWin: number;
  averageLoss: number;
  maxDrawdown: number;
  expectancy: number;
  sharpeRatio: number;
  bestTrade: number;
  worstTrade: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  dailyReturns: Record<string, number>;
  equityCurve: { time: number; value: number }[];
}

interface AnalyticsState {
  metrics: PerformanceMetrics;
  timeframe: 'all' | 'week' | 'month' | 'year';
  filterSymbol: string | null;
}

interface AnalyticsActions {
  updateMetrics: (signals: TradeSignal[]) => void;
  setTimeframe: (timeframe: 'all' | 'week' | 'month' | 'year') => void;
  setFilterSymbol: (symbol: string | null) => void;
  resetAnalytics: () => void;
}

const INITIAL_METRICS: PerformanceMetrics = {
  totalTrades: 0,
  winRate: 0,
  profitFactor: 0,
  netProfit: 0,
  averageWin: 0,
  averageLoss: 0,
  maxDrawdown: 0,
  expectancy: 0,
  sharpeRatio: 0,
  bestTrade: 0,
  worstTrade: 0,
  consecutiveWins: 0,
  consecutiveLosses: 0,
  dailyReturns: {},
  equityCurve: [],
};

function calculateMetrics(signals: TradeSignal[]): PerformanceMetrics {
  const closedSignals = signals.filter(s => 
    s.status === 'TARGET1_HIT' || 
    s.status === 'TARGET2_HIT' || 
    s.status === 'TARGET3_HIT' || 
    s.status === 'STOPPED'
  ).sort((a, b) => (a.exitTime || 0) - (b.exitTime || 0));

  if (closedSignals.length === 0) return { ...INITIAL_METRICS };

  let wins = 0;
  let losses = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let maxDrawdown = 0;
  let peakEquity = 0;
  let currentEquity = 0;
  let equityCurve = [{ time: closedSignals[0].timestamp, value: 0 }];
  let bestTrade = -Infinity;
  let worstTrade = Infinity;
  let currentWinStreak = 0;
  let maxWinStreak = 0;
  let currentLossStreak = 0;
  let maxLossStreak = 0;
  
  const returns: number[] = [];
  const dailyReturns: Record<string, number> = {};

  closedSignals.forEach(signal => {
    const pnl = signal.pnlAmount || 0; // Using PnL amount (in quote currency)
    currentEquity += pnl;
    
    if (currentEquity > peakEquity) peakEquity = currentEquity;
    const drawdown = peakEquity - currentEquity;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    equityCurve.push({ time: signal.exitTime || Date.now(), value: currentEquity });

    if (pnl > 0) {
      wins++;
      grossProfit += pnl;
      if (pnl > bestTrade) bestTrade = pnl;
      
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    } else {
      losses++;
      grossLoss += Math.abs(pnl);
      if (pnl < worstTrade) worstTrade = pnl;
      
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
    }

    returns.push(pnl);
    
    // Daily returns
    const date = new Date(signal.exitTime || Date.now()).toISOString().split('T')[0];
    dailyReturns[date] = (dailyReturns[date] || 0) + pnl;
  });

  const totalTrades = wins + losses;
  const winRate = totalTrades > 0 ? wins / totalTrades : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const averageWin = wins > 0 ? grossProfit / wins : 0;
  const averageLoss = losses > 0 ? grossLoss / losses : 0;
  const expectancy = (winRate * averageWin) - ((1 - winRate) * averageLoss);

  // Sharpe Ratio (simplified)
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? meanReturn / stdDev : 0;

  return {
    totalTrades,
    winRate,
    profitFactor,
    netProfit: currentEquity,
    averageWin,
    averageLoss,
    maxDrawdown,
    expectancy,
    sharpeRatio,
    bestTrade: bestTrade === -Infinity ? 0 : bestTrade,
    worstTrade: worstTrade === Infinity ? 0 : worstTrade,
    consecutiveWins: maxWinStreak,
    consecutiveLosses: maxLossStreak,
    dailyReturns,
    equityCurve,
  };
}

export const useAnalyticsStore = create<AnalyticsState & AnalyticsActions>()(
  persist(
    immer((set) => ({
      metrics: INITIAL_METRICS,
      timeframe: 'all',
      filterSymbol: null,

      updateMetrics: (signals) => {
        set((draft) => {
          const { timeframe, filterSymbol } = draft;
          
          let filtered = signals;

          // Apply symbol filter
          if (filterSymbol) {
            filtered = filtered.filter(s => s.symbol === filterSymbol);
          }

          // Apply timeframe filter
          if (timeframe !== 'all') {
            const now = Date.now();
            const cutoff = timeframe === 'week' ? 7 * 24 * 60 * 60 * 1000 :
                           timeframe === 'month' ? 30 * 24 * 60 * 60 * 1000 :
                           365 * 24 * 60 * 60 * 1000;
            filtered = filtered.filter(s => s.timestamp > now - cutoff);
          }

          draft.metrics = calculateMetrics(filtered);
        });
      },

      setTimeframe: (timeframe) => {
        set((draft) => {
          draft.timeframe = timeframe;
        });
      },

      setFilterSymbol: (symbol) => {
        set((draft) => {
          draft.filterSymbol = symbol;
        });
      },

      resetAnalytics: () => {
        set((draft) => {
          draft.metrics = INITIAL_METRICS;
        });
      },
    })),
    {
      name: 'bitunix-analytics-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        timeframe: state.timeframe,
        filterSymbol: state.filterSymbol,
      }),
    }
  )
);
