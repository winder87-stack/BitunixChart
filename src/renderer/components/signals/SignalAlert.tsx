import React, { useEffect, useState } from 'react';
import { useSignalStore } from '../../stores/signalStore';
import type { QuadSignal } from '../../types/quadStochastic';
import { cn } from '../../lib/utils';

interface SignalAlertProps {
  signal: QuadSignal;
  onDismiss: () => void;
  onAction?: () => void;
  index: number;
}

const SignalAlert: React.FC<SignalAlertProps> = ({ signal, onDismiss, onAction, index }) => {
  const isSuper = signal.strength === 'SUPER';
  const isLong = signal.type === 'LONG';
  
  useEffect(() => {
    const timer = setTimeout(onDismiss, 10000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div 
      className={cn(
        'fixed z-50 p-4 rounded-lg shadow-xl transition-all duration-300 transform',
        isSuper ? 'top-4 left-1/2 -translate-x-1/2 animate-bounce' : 'right-4',
        !isSuper && 'hover:-translate-x-1',
        isLong ? 'bg-[#26a69a] text-white' : 'bg-[#ef5350] text-white',
        'flex items-center gap-4 min-w-[300px] border border-white/10 backdrop-blur-sm shadow-lg'
      )}
      style={{ 
        top: isSuper ? '1rem' : `${1 + (index * 5.5)}rem`,
        opacity: 1, 
        transform: isSuper ? 'translateX(-50%)' : 'translateX(0)' 
      }}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {isSuper && <span className="text-xl">⚡</span>}
          <span className="font-bold uppercase tracking-wider text-sm">{signal.strength} SIGNAL</span>
        </div>
        <div className="flex justify-between items-end">
          <div>
            <div className="font-bold text-lg leading-none">{signal.symbol}</div>
            <div className="text-xs opacity-90 mt-1">{signal.type} @ {signal.entryPrice}</div>
          </div>
          <div className="text-xs font-mono bg-white/20 px-1.5 py-0.5 rounded">
            Score: {signal.confluenceScore}/10
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {onAction && (
          <button 
            onClick={onAction}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-bold transition-colors"
          >
            VIEW
          </button>
        )}
        <button 
          onClick={onDismiss}
          className="px-3 py-1 text-white/60 hover:text-white text-xs transition-colors"
        >
          DISMISS
        </button>
      </div>
    </div>
  );
};

export const SignalAlertContainer: React.FC = () => {
  const { activeSignals, selectSignal, showSignalPanel, toggleSignalPanel } = useSignalStore();
  const [alerts, setAlerts] = useState<QuadSignal[]>([]);
  const lastProcessedRef = React.useRef<string | null>(null);

  // Monitor for new signals
  useEffect(() => {
    const signals = activeSignals();
    if (signals.length === 0) return;

    // Check if the most recent signal is new
    const latest = signals[0];
    if (latest.id !== lastProcessedRef.current) {
      // Add to alerts queue
      setAlerts(prev => [latest, ...prev].slice(0, 3)); // Max 3 alerts
      lastProcessedRef.current = latest.id;
    }
  }, [activeSignals]);

  const handleDismiss = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleAction = (signal: QuadSignal) => {
    selectSignal(signal);
    if (!showSignalPanel) {
      toggleSignalPanel();
    }
    handleDismiss(signal.id);
  };

  if (alerts.length === 0) return null;

  return (
    <>
      {alerts.map((signal, index) => (
        <SignalAlert
          key={signal.id}
          signal={signal}
          index={index}
          onDismiss={() => handleDismiss(signal.id)}
          onAction={() => handleAction(signal)}
        />
      ))}
    </>
  );
};
