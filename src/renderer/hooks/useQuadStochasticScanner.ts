import { useEffect, useRef, useCallback } from 'react';
import { useSignalStore } from '../stores/signalStore';
import { useQuadStochWorker } from './useQuadStochastic';
import { bitunixApi } from '../services/bitunix/api';
import type { SignalGenerationResult } from '../services/indicators/quadStochCalculator';
import type { Timeframe } from '../types/bitunix';

const SCAN_INTERVAL = 60 * 1000; // 1 minute
const SYMBOL_DELAY = 500; // Delay between symbols to avoid rate limits

export function useQuadStochasticScanner() {
  const {
    scannerSymbols,
    isScanning,
    setScannerLoading,
    setScannerResult,
    config,
    addSignal
  } = useSignalStore();

  const { request, isReady } = useQuadStochWorker();
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isScanningRef = useRef(false);

  const scanSymbol = useCallback(async (symbol: string) => {
    try {
      // Fetch data
      // Use config lookback to determine how much data we need, plus buffer
      const klines = await bitunixApi.getParsedKlines(symbol, '1m' as Timeframe, 200);
      
      if (klines.length < 50) return;

      const result = await request<SignalGenerationResult>('CALCULATE_SIGNALS', {
        symbol,
        klines,
        config,
      });

      setScannerResult({
        symbol,
        timestamp: Date.now(),
        signals: result.signals,
        hasSignal: result.signals.length > 0,
        bestSignalStrength: result.signals.length > 0 ? result.signals[0].strength : null,
      });

      if (result.signals.length > 0) {
        result.signals.forEach(signal => addSignal(signal));
      }

    } catch (error) {
      console.warn(`[Scanner] Failed to scan ${symbol}:`, error);
    }
  }, [config, request, addSignal, setScannerResult]);

  const runScanCycle = useCallback(async () => {
    if (!isReady || isScanningRef.current || scannerSymbols.length === 0) return;

    isScanningRef.current = true;
    setScannerLoading(true);

    try {
      // Process symbols sequentially with delay
      for (const symbol of scannerSymbols) {
        await scanSymbol(symbol);
        await new Promise(resolve => setTimeout(resolve, SYMBOL_DELAY));
      }
    } finally {
      isScanningRef.current = false;
      setScannerLoading(false);
    }
  }, [isReady, scannerSymbols, scanSymbol, setScannerLoading]);

  // Start/Stop scanning loop
  useEffect(() => {
    if (isScanning) {
      // Run immediately
      runScanCycle();
      
      // Schedule interval
      scanTimerRef.current = setInterval(runScanCycle, SCAN_INTERVAL);
    } else {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
    }

    return () => {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
      }
    };
  }, [isScanning, runScanCycle]);

  return { isScanning };
}
