import React from 'react';
import { useSymbolScanner } from '../../hooks/useSymbolScanner';
import { useSignalStore } from '../../stores/signalStore';
import { cn } from '../../lib/utils';

export function SymbolScanner() {
  const { scannerResults, isScanning } = useSymbolScanner();
  const setIsScanning = useSignalStore(state => state.setIsScanning);
  const scannerSymbols = useSignalStore(state => state.scannerSymbols);
  const addScannerSymbol = useSignalStore(state => state.addScannerSymbol);
  const removeScannerSymbol = useSignalStore(state => state.removeScannerSymbol);
  
  const [newSymbol, setNewSymbol] = React.useState('');

  const handleAddSymbol = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSymbol) {
      addScannerSymbol(newSymbol.toUpperCase());
      setNewSymbol('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#131722] text-[#d1d4dc] border border-[#2a2e39] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-[#2a2e39] bg-[#1e222d]">
        <h2 className="text-sm font-semibold">Symbol Scanner</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScanning(!isScanning)}
            className={cn(
              "px-3 py-1 text-xs rounded font-medium transition-colors",
              isScanning 
                ? "bg-[#2962ff] text-white hover:bg-[#2962ff]/90" 
                : "bg-[#2a2e39] text-[#d1d4dc] hover:bg-[#363a45]"
            )}
          >
            {isScanning ? 'Scanning...' : 'Start Scan'}
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-[#2a2e39]">
        <form onSubmit={handleAddSymbol} className="flex gap-2">
          <input
            type="text"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            placeholder="Add symbol (e.g. SOLUSDT)"
            className="flex-1 bg-[#131722] border border-[#2a2e39] rounded px-3 py-1.5 text-xs text-[#d1d4dc] focus:outline-none focus:border-[#2962ff]"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-[#2a2e39] hover:bg-[#363a45] rounded text-xs font-medium transition-colors"
          >
            Add
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {scannerSymbols.length === 0 ? (
          <div className="text-center text-[#787b86] text-xs py-4">
            No symbols added
          </div>
        ) : (
          scannerSymbols.map(symbol => {
            const result = scannerResults[symbol];
            const hasSignal = result?.hasSignal;
            const strength = result?.bestSignalStrength;

            return (
              <div 
                key={symbol}
                className="flex items-center justify-between p-2 rounded bg-[#1e222d] border border-[#2a2e39] hover:border-[#363a45] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{symbol}</span>
                  {hasSignal && strength && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                      strength === 'SUPER' ? "bg-yellow-500/20 text-yellow-400" :
                      strength === 'STRONG' ? "bg-emerald-500/20 text-emerald-400" :
                      strength === 'MODERATE' ? "bg-blue-500/20 text-blue-400" :
                      "bg-gray-500/20 text-gray-400"
                    )}>
                      {strength}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {result && (
                    <span className="text-[10px] text-[#787b86]">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                  <button
                    onClick={() => removeScannerSymbol(symbol)}
                    className="text-[#787b86] hover:text-[#ef5350] transition-colors"
                    title="Remove"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
