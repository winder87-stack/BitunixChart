import { useEffect, useRef, useCallback } from 'react';
import { useSignalStore } from '../stores/signalStore';
import { quadStochWorkerPool } from '../utils/workers/WorkerPool';
import type { SignalGenerationResult } from '../services/indicators/quadStochCalculator';

export function useSymbolScanner() {
  const scannerSymbols = useSignalStore(state => state.scannerSymbols);
  const isScanning = useSignalStore(state => state.isScanning);
  const scannerResults = useSignalStore(state => state.scannerResults);
  
  const setScannerResult = useSignalStore(state => state.setScannerResult);
  const setScannerLoading = useSignalStore(state => state.setScannerLoading);
  const addSignal = useSignalStore(state => state.addSignal);
  
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isScanningRef = useRef(false);

  const fetchAndScan = useCallback(async (symbol: string) => {
    try {
      // Fetch data via exposed electron API
      const response = await window.bitunix.getKlines(symbol, '1m');
      const klines = response.data;
      
      if (!klines || klines.length < 60) return;

      // Offload heavy calculation to worker pool
      const result = await quadStochWorkerPool.execute<SignalGenerationResult>(
        'CALCULATE_SIGNALS',
        { symbol, klines }
      );

      const hasSignal = result.signals.length > 0;
      const bestSignal = result.signals[0]; // Assuming sorted by strength

      setScannerResult({
        symbol,
        timestamp: Date.now(),
        signals: result.signals,
        hasSignal,
        bestSignalStrength: bestSignal ? bestSignal.strength : null
      });

      if (hasSignal) {
        // Add unique signals to main store
        result.signals.forEach(signal => {
          addSignal(signal);
        });
      }

    } catch (error) {
      console.error(`Error scanning ${symbol}:`, error);
    }
  }, [addSignal, setScannerResult]);

  const runScanCycle = useCallback(async () => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    setScannerLoading(true);

    try {
      // Process symbols in parallel batches of 4 (WorkerPool limit)
      const batchSize = 4;
      for (let i = 0; i < scannerSymbols.length; i += batchSize) {
        const batch = scannerSymbols.slice(i, i + batchSize);
        await Promise.all(batch.map(sym => fetchAndScan(sym)));
      }
    } finally {
      isScanningRef.current = false;
      setScannerLoading(false);
    }
  }, [scannerSymbols, fetchAndScan, setScannerLoading]);

  useEffect(() => {
    if (isScanning) {
      // Run immediately
      runScanCycle();
      // Then every 60 seconds
      scanIntervalRef.current = setInterval(runScanCycle, 60000);
    } else {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isScanning, runScanCycle]);

  return {
    scannerResults,
    isScanning
  };
}
