import { useMemo } from 'react';
import { useQuadStochasticStore } from '../../stores/quadStochasticStore';
import type { SignalStrength, ConfluenceFlags } from '../../types/quadStochastic';
import type { TradeSignal } from '../../types/signals';
import { cn } from '../../lib/utils';

export interface SignalPanelProps {
  className?: string;
  position?: 'right' | 'left' | 'floating';
  onSignalClick?: (signal: TradeSignal) => void;
  onSignalHover?: (signal: TradeSignal | null) => void;
  showMTFBias?: boolean;
  showConfirmations?: boolean;
  compact?: boolean;
}

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
    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getStrengthClasses(strength))}>
      {strength}
    </span>
  );
}

function TypeBadge({ type }: { type: 'LONG' | 'SHORT' }) {
  const isLong = type === 'LONG';
  return (
    <span className={cn(
      "px-2 py-0.5 rounded text-xs font-bold",
      isLong ? 'bg-[#26a69a]/20 text-[#26a69a]' : 'bg-[#ef5350]/20 text-[#ef5350]'
    )}>
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

function ConfirmationMeter({ percentage }: { percentage: number }) {
  const safePercent = Math.min(Math.max(percentage || 0, 0), 100);
  
  let color = '#787b86'; // gray
  if (safePercent >= 85) color = '#26a69a'; // green (super)
  else if (safePercent >= 70) color = '#2962ff'; // blue (strong)
  else if (safePercent >= 50) color = '#ffa726'; // orange (moderate)

  return (
    <div className="w-full mt-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#787b86]">Confirmation</span>
        <span className="text-[#d1d4dc]">{safePercent.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-[#1e222d] rounded-full overflow-hidden border border-[#2a2e39]">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${safePercent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function ActiveSignalCard({ 
  signal, 
  onClick, 
  onHover,
  compact = false 
}: { 
  signal: TradeSignal; 
  onClick?: () => void;
  onHover?: (isHovering: boolean) => void;
  compact?: boolean;
}) {
  const isLong = signal.type === 'LONG';

  return (
    <div 
      className={cn(
        "bg-[#1e222d] rounded-lg border border-[#2a2e39] animate-fade-in hover:border-[#2962ff] transition-colors cursor-pointer",
        compact ? "p-2" : "p-4"
      )}
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[#d1d4dc]">{signal.symbol}</span>
          <TypeBadge type={signal.type} />
        </div>
        <StrengthBadge strength={signal.strength} />
      </div>

      <div className={cn("grid gap-3 mb-3 text-sm", compact ? "grid-cols-2" : "grid-cols-2")}>
        <div>
          <span className="text-[#787b86] block text-xs">Entry Zone</span>
          <div className="flex gap-1 items-baseline">
            <span className="text-[#d1d4dc] font-mono">{formatPrice(signal.entryZone.min)}</span>
            <span className="text-[#787b86] text-[10px]">-</span>
            <span className="text-[#d1d4dc] font-mono">{formatPrice(signal.entryZone.max)}</span>
          </div>
        </div>
        <div>
          <span className="text-[#787b86] block text-xs">Stop Loss</span>
          <span className="text-[#ef5350] font-mono">{formatPrice(signal.stopLoss.initial)}</span>
        </div>
        <div className="col-span-2">
          <span className="text-[#787b86] block text-xs mb-1">Targets</span>
          <div className="flex justify-between gap-2">
            {signal.targets.map((target, idx) => (
              <div key={idx} className="flex flex-col">
                <span className={cn("font-mono text-xs", isLong ? 'text-[#26a69a]' : 'text-[#ef5350]')}>
                  {formatPrice(target.price)}
                </span>
                <span className="text-[#787b86] text-[10px]">{target.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!compact && (
        <>
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#787b86]">Confirmations</span>
              <span className="text-[#d1d4dc]">
                {signal.confirmations.achieved.length}/{signal.confirmations.required.length + signal.confirmations.optional.length}
              </span>
            </div>
            <ConfirmationMeter percentage={signal.confirmationScore} />
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
        </>
      )}

      <div className="mt-2 text-xs text-[#787b86] flex justify-between">
        <span>{formatTimeAgo(signal.timestamp)}</span>
        {signal.status !== 'PENDING' && (
          <span className="uppercase font-medium">{signal.status}</span>
        )}
      </div>
    </div>
  );
}

function PendingSignalItem({ 
  signal, 
  onClick, 
  onHover 
}: { 
  signal: TradeSignal; 
  onClick?: () => void;
  onHover?: (isHovering: boolean) => void;
}) {
  return (
    <div 
      className="flex items-center justify-between p-2 hover:bg-[#1e222d]/50 rounded transition-colors cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      <div className="flex items-center gap-2">
        <span className={cn(
          "w-2 h-2 rounded-full",
          signal.type === 'LONG' ? 'bg-[#26a69a]' : 'bg-[#ef5350]'
        )} />
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

export function SignalPanel({ 
  className,
  onSignalClick,
  onSignalHover,
  position = 'right',
  compact = false
}: SignalPanelProps): JSX.Element {
  const activeSignal = useQuadStochasticStore(state => state.activeSignal);
  const isEnabled = useQuadStochasticStore(state => state.isEnabled);
  const toggleEnabled = useQuadStochasticStore(state => state.toggleEnabled);
  const config = useQuadStochasticStore(state => state.config);
  const updateConfig = useQuadStochasticStore(state => state.updateConfig);
  const getPendingSignals = useQuadStochasticStore(state => state.getPendingSignals);

  const pendingSignals = useMemo(() => getPendingSignals(), [getPendingSignals]);
  const pendingCount = pendingSignals.length;

  const toggleSound = () => {
    updateConfig({ enableSound: !config.enableSound });
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-[#131722] text-[#d1d4dc] min-w-[280px]",
      position === 'floating' && "absolute top-4 right-4 bottom-4 w-80 shadow-lg rounded-lg border border-[#2a2e39] z-50",
      className
    )}>
      <div className="flex items-center justify-between p-3 border-b border-[#2a2e39]">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Signals</h2>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 bg-[#2962ff] text-white text-xs rounded-full">
              {pendingCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className={cn(
              "p-1.5 rounded hover:bg-[#2a2e39] transition-colors text-[#787b86]",
              config.enableSound && "text-[#2962ff]"
            )}
            title={config.enableSound ? "Mute Sounds" : "Enable Sounds"}
          >
            {config.enableSound ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
            )}
          </button>
          <button
            onClick={toggleEnabled}
            className={cn(
              "w-10 h-5 rounded-full transition-colors relative",
              isEnabled ? 'bg-[#2962ff]' : 'bg-[#2a2e39]'
            )}
            title={isEnabled ? "Disable Signals" : "Enable Signals"}
          >
            <span
              className={cn(
                "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform",
                isEnabled ? 'left-5' : 'left-0.5'
              )}
            />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {!isEnabled && (
          <div className="text-center text-[#787b86] text-sm py-8">
            Signal detection disabled
          </div>
        )}

        {isEnabled && activeSignal && (
          <ActiveSignalCard 
            signal={activeSignal} 
            onClick={() => onSignalClick?.(activeSignal)}
            onHover={(hover) => onSignalHover?.(hover ? activeSignal : null)}
            compact={compact}
          />
        )}

        {isEnabled && pendingSignals.length > 0 && (
          <div>
            <h3 className="text-xs text-[#787b86] uppercase mb-2">Pending</h3>
            <div className="space-y-1">
              {pendingSignals.map(signal => (
                <PendingSignalItem 
                  key={signal.id} 
                  signal={signal} 
                  onClick={() => onSignalClick?.(signal)}
                  onHover={(hover) => onSignalHover?.(hover ? signal : null)}
                />
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