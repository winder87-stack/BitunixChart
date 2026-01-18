import { useMemo } from 'react';
import { useQuadStochasticStore } from '../../stores/quadStochasticStore';
import type { QuadSignal, SignalStrength, ConfluenceFlags } from '../../types/quadStochastic';

function formatPrice(price: number): string {
  return price.toFixed(4);
}

function formatPercent(value: number): string {
  return value.toFixed(2);
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getStrengthClasses(strength: SignalStrength): string {
  switch (strength) {
    case 'SUPER':
      return 'bg-yellow-500/20 text-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.4)]';
    case 'STRONG':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'MODERATE':
      return 'bg-blue-500/20 text-blue-400';
    case 'WEAK':
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

function StrengthBadge({ strength }: { strength: SignalStrength }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStrengthClasses(strength)}`}>
      {strength}
    </span>
  );
}

function TypeBadge({ type }: { type: 'LONG' | 'SHORT' }) {
  const isLong = type === 'LONG';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
      isLong ? 'bg-[#26a69a]/20 text-[#26a69a]' : 'bg-[#ef5350]/20 text-[#ef5350]'
    }`}>
      {type}
    </span>
  );
}

function ConfluenceIcons({ flags }: { flags: ConfluenceFlags }) {
  const icons: Array<{ key: keyof ConfluenceFlags; icon: string; label: string }> = [
    { key: 'quadRotation', icon: '🔄', label: 'Quad Rotation' },
    { key: 'channelExtreme', icon: '📊', label: 'Channel Extreme' },
    { key: 'twentyTwentyFlag', icon: '🎯', label: '20/20 Flag' },
    { key: 'vwapConfluence', icon: '⚖️', label: 'VWAP' },
    { key: 'maConfluence', icon: '📈', label: 'MA Confluence' },
    { key: 'volumeSpike', icon: '📊', label: 'Volume Spike' },
    { key: 'htfAlignment', icon: '⏱️', label: 'HTF Aligned' },
  ];

  const activeFlags = icons.filter(i => flags[i.key]);

  return (
    <div className="flex flex-wrap gap-1">
      {activeFlags.map(({ key, icon, label }) => (
        <span
          key={key}
          className="text-sm cursor-default"
          title={label}
        >
          {icon}
        </span>
      ))}
    </div>
  );
}

function ConfluenceMeter({ score, max = 10 }: { score: number; max?: number }) {
  const percentage = Math.min((score / max) * 100, 100);
  const color = score >= 7 ? '#26a69a' : score >= 4 ? '#2962ff' : '#787b86';

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#787b86]">Confluence</span>
        <span className="text-[#d1d4dc]">{score}/{max}</span>
      </div>
      <div className="h-2 bg-[#1e222d] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function ActiveSignalCard({ signal }: { signal: QuadSignal }) {
  const isLong = signal.type === 'LONG';

  return (
    <div className="bg-[#1e222d] rounded-lg p-4 border border-[#2a2e39] animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[#d1d4dc]">{signal.symbol}</span>
          <TypeBadge type={signal.type} />
        </div>
        <StrengthBadge strength={signal.strength} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        <div>
          <span className="text-[#787b86] block text-xs">Entry</span>
          <span className="text-[#d1d4dc] font-mono">{formatPrice(signal.entryPrice)}</span>
        </div>
        <div>
          <span className="text-[#787b86] block text-xs">Stop</span>
          <span className="text-[#ef5350] font-mono">{formatPrice(signal.stopLoss)}</span>
        </div>
        <div>
          <span className="text-[#787b86] block text-xs">Target 1</span>
          <span className={`font-mono ${isLong ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
            {formatPrice(signal.target1)}
          </span>
        </div>
        <div>
          <span className="text-[#787b86] block text-xs">R:R</span>
          <span className="text-[#d1d4dc] font-mono">1:{formatPercent(signal.riskRewardRatio)}</span>
        </div>
      </div>

      <ConfluenceMeter score={signal.confluenceScore} />

      <div className="mt-3 pt-3 border-t border-[#2a2e39]">
        <ConfluenceIcons flags={signal.confluence} />
      </div>

      {signal.divergence && (
        <div className="mt-2 text-xs text-[#787b86]">
          {signal.divergence.type} divergence on {signal.divergence.band}
        </div>
      )}

      <div className="mt-2 text-xs text-[#787b86]">
        {formatTimeAgo(signal.timestamp)}
      </div>
    </div>
  );
}

function PendingSignalItem({ signal }: { signal: QuadSignal }) {
  return (
    <div className="flex items-center justify-between p-2 hover:bg-[#1e222d]/50 rounded transition-colors cursor-pointer">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${
          signal.type === 'LONG' ? 'bg-[#26a69a]' : 'bg-[#ef5350]'
        }`} />
        <span className="text-sm text-[#d1d4dc]">{signal.symbol}</span>
        <StrengthBadge strength={signal.strength} />
      </div>
      <span className="text-xs text-[#787b86]">{formatTimeAgo(signal.timestamp)}</span>
    </div>
  );
}

function StatisticsFooter() {
  const getStatistics = useQuadStochasticStore(state => state.getStatistics);
  const stats = useMemo(() => getStatistics(), [getStatistics]);

  return (
    <div className="grid grid-cols-3 gap-2 p-3 bg-[#1e222d] rounded-lg text-center">
      <div>
        <div className="text-xs text-[#787b86]">Win Rate</div>
        <div className="text-sm font-medium text-[#d1d4dc]">
          {formatPercent(stats.winRate * 100)}%
        </div>
      </div>
      <div>
        <div className="text-xs text-[#787b86]">Total</div>
        <div className="text-sm font-medium text-[#d1d4dc]">{stats.totalSignals}</div>
      </div>
      <div>
        <div className="text-xs text-[#787b86]">PF</div>
        <div className="text-sm font-medium text-[#d1d4dc]">
          {stats.profitFactor === Infinity ? '∞' : formatPercent(stats.profitFactor)}
        </div>
      </div>
    </div>
  );
}

export function SignalPanel(): JSX.Element {
  const activeSignal = useQuadStochasticStore(state => state.activeSignal);
  const isEnabled = useQuadStochasticStore(state => state.isEnabled);
  const toggleEnabled = useQuadStochasticStore(state => state.toggleEnabled);
  const getPendingSignals = useQuadStochasticStore(state => state.getPendingSignals);

  const pendingSignals = useMemo(() => getPendingSignals(), [getPendingSignals]);
  const pendingCount = pendingSignals.length;

  return (
    <div className="flex flex-col h-full bg-[#131722] text-[#d1d4dc] min-w-[280px]">
      <div className="flex items-center justify-between p-3 border-b border-[#2a2e39]">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Signals</h2>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 bg-[#2962ff] text-white text-xs rounded-full">
              {pendingCount}
            </span>
          )}
        </div>
        <button
          onClick={toggleEnabled}
          className={`w-10 h-5 rounded-full transition-colors relative ${
            isEnabled ? 'bg-[#2962ff]' : 'bg-[#2a2e39]'
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              isEnabled ? 'left-5' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!isEnabled && (
          <div className="text-center text-[#787b86] text-sm py-8">
            Signal detection disabled
          </div>
        )}

        {isEnabled && activeSignal && (
          <ActiveSignalCard signal={activeSignal} />
        )}

        {isEnabled && pendingSignals.length > 0 && (
          <div>
            <h3 className="text-xs text-[#787b86] uppercase mb-2">Pending</h3>
            <div className="space-y-1">
              {pendingSignals.map(signal => (
                <PendingSignalItem key={signal.id} signal={signal} />
              ))}
            </div>
          </div>
        )}

        {isEnabled && !activeSignal && pendingSignals.length === 0 && (
          <div className="text-center text-[#787b86] text-sm py-8">
            No active signals
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[#2a2e39]">
        <StatisticsFooter />
      </div>
    </div>
  );
}

export default SignalPanel;
