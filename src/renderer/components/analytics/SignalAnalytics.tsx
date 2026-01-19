import React from 'react';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { useSignalStore } from '../../stores/signalStore';
import { cn } from '../../lib/utils';

function StatCard({ label, value, subValue, type = 'neutral' }: { 
  label: string; 
  value: string; 
  subValue?: string;
  type?: 'neutral' | 'positive' | 'negative';
}) {
  const colorClass = type === 'positive' ? 'text-[#26a69a]' : type === 'negative' ? 'text-[#ef5350]' : 'text-[#d1d4dc]';
  
  return (
    <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-3">
      <div className="text-[#787b86] text-xs mb-1">{label}</div>
      <div className={cn("text-lg font-bold", colorClass)}>{value}</div>
      {subValue && <div className="text-[#787b86] text-[10px]">{subValue}</div>}
    </div>
  );
}

export function SignalAnalytics() {
  const metrics = useAnalyticsStore(state => state.metrics);
  const timeframe = useAnalyticsStore(state => state.timeframe);
  const setTimeframe = useAnalyticsStore(state => state.setTimeframe);
  const updateMetrics = useAnalyticsStore(state => state.updateMetrics);
  const signalHistory = useSignalStore(state => state.signalHistory);

  // Update metrics when history changes
  React.useEffect(() => {
    updateMetrics(signalHistory);
  }, [signalHistory, updateMetrics]);

  const winRateColor = metrics.winRate >= 0.5 ? 'positive' : 'negative';
  const pfColor = metrics.profitFactor >= 1.5 ? 'positive' : metrics.profitFactor >= 1 ? 'neutral' : 'negative';
  const netColor = metrics.netProfit >= 0 ? 'positive' : 'negative';

  return (
    <div className="flex flex-col h-full bg-[#131722] text-[#d1d4dc] border border-[#2a2e39] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-[#2a2e39] bg-[#1e222d]">
        <h2 className="text-sm font-semibold">Analytics</h2>
        <div className="flex gap-1">
          {(['all', 'week', 'month'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-2 py-1 text-[10px] uppercase rounded transition-colors",
                timeframe === tf ? "bg-[#2962ff] text-white" : "bg-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc]"
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        <div className="grid grid-cols-2 gap-3">
          <StatCard 
            label="Win Rate" 
            value={`${(metrics.winRate * 100).toFixed(1)}%`}
            subValue={`${metrics.totalTrades} Trades`}
            type={winRateColor}
          />
          <StatCard 
            label="Profit Factor" 
            value={metrics.profitFactor.toFixed(2)}
            type={pfColor}
          />
          <StatCard 
            label="Net Profit" 
            value={`$${metrics.netProfit.toFixed(2)}`}
            type={netColor}
          />
          <StatCard 
            label="Expectancy" 
            value={`$${metrics.expectancy.toFixed(2)}`}
            type={metrics.expectancy > 0 ? 'positive' : 'negative'}
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[#787b86] uppercase">Streaks</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded p-2 flex justify-between items-center">
              <span className="text-xs text-[#787b86]">Max Wins</span>
              <span className="text-[#26a69a] font-bold">{metrics.consecutiveWins}</span>
            </div>
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded p-2 flex justify-between items-center">
              <span className="text-xs text-[#787b86]">Max Losses</span>
              <span className="text-[#ef5350] font-bold">{metrics.consecutiveLosses}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[#787b86] uppercase">Extremes</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded p-2">
              <div className="text-[10px] text-[#787b86]">Best Trade</div>
              <div className="text-[#26a69a] font-bold text-sm">+${metrics.bestTrade.toFixed(2)}</div>
            </div>
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded p-2">
              <div className="text-[10px] text-[#787b86]">Worst Trade</div>
              <div className="text-[#ef5350] font-bold text-sm">${metrics.worstTrade.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
