import React, { useMemo } from 'react';
import { useSignalStore } from '../../stores/signalStore';
import type { QuadSignal, SignalStrength } from '../../types/quadStochastic';
import { cn } from '../../lib/utils';

interface SignalPanelProps {
  onSignalClick?: (signal: QuadSignal) => void;
  className?: string;
}

const formatPrice = (price: number) => price.toFixed(4);
const formatPercent = (val: number) => `${val.toFixed(2)}%`;

const getStrengthColor = (strength: SignalStrength) => {
  switch (strength) {
    case 'SUPER': return 'text-yellow-400 border-yellow-400/50 bg-yellow-400/10';
    case 'STRONG': return 'text-purple-400 border-purple-400/50 bg-purple-400/10';
    case 'MODERATE': return 'text-blue-400 border-blue-400/50 bg-blue-400/10';
    case 'WEAK': return 'text-gray-400 border-gray-400/50 bg-gray-400/10';
  }
};

const SignalCard: React.FC<{ signal: QuadSignal; onClick?: () => void }> = ({ signal, onClick }) => {
  const isLong = signal.type === 'LONG';
  const pnlColor = signal.pnlPercent > 0 ? 'text-[#26a69a]' : signal.pnlPercent < 0 ? 'text-[#ef5350]' : 'text-[#787b86]';
  const statusColor = signal.status === 'ACTIVE' ? 'bg-[#2962ff]' : 
                      signal.status === 'STOPPED' ? 'bg-[#ef5350]' :
                      signal.status.includes('TARGET') ? 'bg-[#26a69a]' : 'bg-[#787b86]';

  return (
    <div 
      className={cn(
        "bg-[#1e222d] border border-[#2a2e39] rounded-lg p-3 mb-2 cursor-pointer hover:border-[#2962ff] transition-all relative overflow-hidden group",
        signal.strength === 'SUPER' && "shadow-[0_0_10px_rgba(250,204,21,0.1)] border-yellow-400/30"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#d1d4dc]">{signal.symbol}</span>
          <span className={cn(
            "text-xs font-bold px-1.5 py-0.5 rounded",
            isLong ? "bg-[#26a69a]/20 text-[#26a69a]" : "bg-[#ef5350]/20 text-[#ef5350]"
          )}>
            {signal.type}
          </span>
        </div>
        <div className={cn("text-[10px] px-1.5 py-0.5 rounded border uppercase font-medium", getStrengthColor(signal.strength))}>
          {signal.strength}
        </div>
      </div>

      {/* Levels Grid */}
      <div className="grid grid-cols-3 gap-2 text-xs mb-3 bg-[#131722]/50 p-2 rounded">
        <div>
          <div className="text-[#787b86] mb-0.5">Entry</div>
          <div className="font-mono text-[#d1d4dc]">{formatPrice(signal.entryPrice)}</div>
        </div>
        <div>
          <div className="text-[#787b86] mb-0.5">Stop</div>
          <div className="font-mono text-[#ef5350]">{formatPrice(signal.stopLoss)}</div>
        </div>
        <div>
          <div className="text-[#787b86] mb-0.5">Target</div>
          <div className="font-mono text-[#26a69a]">{formatPrice(signal.target1)}</div>
        </div>
      </div>

      {/* Confluence Badges */}
      <div className="flex flex-wrap gap-1 mb-3">
        {signal.confluence.quadRotation && (
          <span className="text-[10px] px-1 bg-[#2962ff]/20 text-[#2962ff] rounded border border-[#2962ff]/30" title="Quad Rotation">QUAD</span>
        )}
        {signal.confluence.channelExtreme && (
          <span className="text-[10px] px-1 bg-[#ff9800]/20 text-[#ff9800] rounded border border-[#ff9800]/30" title="Channel Extreme">CHNL</span>
        )}
        {signal.confluence.twentyTwentyFlag && (
          <span className="text-[10px] px-1 bg-[#e91e63]/20 text-[#e91e63] rounded border border-[#e91e63]/30" title="20/20 Flag">FLAG</span>
        )}
        {signal.confluence.vwapConfluence && (
          <span className="text-[10px] px-1 bg-[#00bcd4]/20 text-[#00bcd4] rounded border border-[#00bcd4]/30" title="VWAP">VWAP</span>
        )}
        {signal.confluence.volumeSpike && (
          <span className="text-[10px] px-1 bg-[#9c27b0]/20 text-[#9c27b0] rounded border border-[#9c27b0]/30" title="Volume Spike">VOL</span>
        )}
      </div>

      {/* Footer Stats */}
      <div className="flex justify-between items-center text-xs border-t border-[#2a2e39] pt-2 mt-1">
        <div className="flex gap-3">
          <span className="text-[#787b86]">R:R <span className="text-[#d1d4dc]">{signal.riskRewardRatio.toFixed(2)}</span></span>
          {signal.pnlPercent !== 0 && (
            <span className={cn("font-medium", pnlColor)}>
              {signal.pnlPercent > 0 ? '+' : ''}{formatPercent(signal.pnlPercent)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#787b86]">
            {new Date(signal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className={cn("w-2 h-2 rounded-full", statusColor)} title={signal.status} />
        </div>
      </div>
    </div>
  );
};

export const SignalPanel: React.FC<SignalPanelProps> = ({ onSignalClick, className }) => {
  const { 
    activeSignals, 
    toggleSound, 
    soundEnabled,
    clearHistory,
    signalHistory
  } = useSignalStore();

  const signals = activeSignals();
  
  // Stats
  const stats = useMemo(() => {
    const total = signals.length + signalHistory.length;
    const wins = signalHistory.filter(s => s.pnlPercent > 0).length;
    const winRate = total > 0 ? (wins / signalHistory.length) * 100 : 0;
    const activePnL = signals.reduce((acc, s) => acc + s.pnlPercent, 0);
    return { winRate, activePnL };
  }, [signals, signalHistory]);

  return (
    <div className={cn("flex flex-col h-full bg-[#131722]", className)}>
      {/* Header */}
      <div className="p-3 border-b border-[#2a2e39] flex justify-between items-center bg-[#1e222d]">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-[#d1d4dc]">Signals</h2>
          <span className="text-xs bg-[#2962ff] text-white px-1.5 rounded-full">{signals.length}</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={toggleSound}
            className={cn("p-1.5 rounded hover:bg-[#2a2e39] transition-colors", !soundEnabled && "opacity-50")}
            title={soundEnabled ? "Mute" : "Unmute"}
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-px bg-[#2a2e39] text-xs">
        <div className="bg-[#1e222d] p-2 text-center">
          <div className="text-[#787b86]">Win Rate</div>
          <div className="text-[#d1d4dc] font-mono">{signalHistory.length > 0 ? formatPercent(stats.winRate) : '-'}</div>
        </div>
        <div className="bg-[#1e222d] p-2 text-center">
          <div className="text-[#787b86]">Open P&L</div>
          <div className={cn("font-mono", stats.activePnL > 0 ? "text-[#26a69a]" : stats.activePnL < 0 ? "text-[#ef5350]" : "text-[#d1d4dc]")}>
            {stats.activePnL > 0 ? '+' : ''}{formatPercent(stats.activePnL)}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {signals.length === 0 ? (
          <div className="text-center text-[#787b86] py-10 text-sm">
            No active signals
            <div className="text-xs mt-2 opacity-50">Scanning in background...</div>
          </div>
        ) : (
          signals.map(signal => (
            <SignalCard 
              key={signal.id} 
              signal={signal} 
              onClick={() => onSignalClick?.(signal)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {signalHistory.length > 0 && (
        <div className="p-2 border-t border-[#2a2e39]">
          <button 
            onClick={clearHistory}
            className="w-full py-1 text-xs text-[#787b86] hover:text-[#d1d4dc] transition-colors"
          >
            Clear History ({signalHistory.length})
          </button>
        </div>
      )}
    </div>
  );
};
