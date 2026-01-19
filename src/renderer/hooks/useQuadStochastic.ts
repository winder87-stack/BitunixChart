import { useEffect, useRef, useState, useCallback } from 'react';
import type { ParsedKline } from '../types/bitunix';
import { useSignalStore } from '../stores/signalStore';
import type { SignalGenerationResult } from '../services/indicators/quadStochCalculator';

// =============================================================================
// HOOK 1: useQuadStochWorker
// Manages Web Worker lifecycle and message passing
// =============================================================================

interface WorkerRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: Error) => void;
  timeout: NodeJS.Timeout;
}

export function useQuadStochWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRequests = useRef<Map<string, WorkerRequest>>(new Map());
  const [isReady, setIsReady] = useState(false);
  
  // Initialize worker
  useEffect(() => {
    let worker: Worker;
    
    try {
      worker = new Worker(
        new URL('../workers/quadStoch.worker.ts', import.meta.url),
        { type: 'module' }
      );
      
      worker.onmessage = (e) => {
        const { type, payload, requestId } = e.data;
        
        if (type === 'READY') {
          setIsReady(true);
          return;
        }
        
        if (requestId) {
          const pending = pendingRequests.current.get(requestId);
          if (pending) {
            clearTimeout(pending.timeout);
            pendingRequests.current.delete(requestId);
            
            if (type === 'ERROR') {
              pending.reject(new Error(payload.message || 'Worker error'));
            } else {
              pending.resolve(payload);
            }
          }
        }
      };
      
      worker.onerror = (e) => {
        console.error('[useQuadStochWorker] Worker error:', e);
      };
      
      workerRef.current = worker;
    } catch (error) {
      console.error('[useQuadStochWorker] Failed to create worker:', error);
    }
    
    return () => {
      if (worker) {
        worker.terminate();
      }
      // Reject all pending requests
      pendingRequests.current.forEach(p => {
        clearTimeout(p.timeout);
        p.reject(new Error('Worker terminated'));
      });
      pendingRequests.current.clear();
    };
  }, []);
  
  // Request function with timeout
  const request = useCallback(<T = unknown>(type: string, payload: unknown, timeoutMs = 10000): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current || !isReady) {
        reject(new Error('Worker not ready'));
        return;
      }
      
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timeout = setTimeout(() => {
        pendingRequests.current.delete(requestId);
        reject(new Error(`Worker request timeout (${type})`));
      }, timeoutMs);
      
      pendingRequests.current.set(requestId, { 
        resolve: resolve as (value: unknown) => void, 
        reject, 
        timeout 
      });
      
      workerRef.current.postMessage({ type, payload, requestId });
    });
  }, [isReady]);
  
  return { request, isReady };
}

// =============================================================================
// HOOK 2: useQuadStochastic (Main Hook)
// Handles calculation coordination and store updates
// =============================================================================

export function useQuadStochastic(options: {
  symbol: string;
  enabled?: boolean;
  throttleMs?: number;
}) {
  const { symbol, enabled = true, throttleMs = 500 } = options;
  const { request, isReady } = useQuadStochWorker();
  const { 
    config, 
    setCalculationData, 
    addSignal,
  } = useSignalStore();
  
  const [isCalculating, setIsCalculating] = useState(false);
  const lastCalcRef = useRef(0);
  const pendingKlinesRef = useRef<ParsedKline[] | null>(null);
  
  const calculate = useCallback(async (klines: ParsedKline[]) => {
    if (!isReady || !enabled || klines.length < 50) return;
    
    const now = Date.now();
    if (now - lastCalcRef.current < throttleMs) {
      pendingKlinesRef.current = klines;
      return;
    }
    
    lastCalcRef.current = now;
    setIsCalculating(true);
    
    try {
      const result = await request<SignalGenerationResult>('CALCULATE_SIGNALS', {
        symbol,
        klines,
        config,
      });
      
      setCalculationData(symbol, {
        quadData: result.quadData,
        maData: result.maData,
        channel: result.channel,
        vwap: [result.vwap],
      });
      
      if (result.signals && result.signals.length > 0) {
        result.signals.forEach(signal => addSignal(signal));
      }
      
    } catch (error) {
      console.error('[useQuadStochastic] Calculation failed:', error);
    } finally {
      setIsCalculating(false);
      
      // Process pending if exists
      if (pendingKlinesRef.current) {
        const pending = pendingKlinesRef.current;
        pendingKlinesRef.current = null;
        // Small delay to prevent tight loop
        setTimeout(() => calculate(pending), 10);
      }
    }
  }, [isReady, enabled, throttleMs, symbol, config, request, setCalculationData, addSignal]);
  
  return { calculate, isCalculating, isReady };
}

// =============================================================================
// HOOK 3: useSignalTracker
// Tracks active signals and updates PnL/Status based on price
// =============================================================================

export function useSignalTracker(symbol: string, currentPrice: number) {
  const updateSignalStatuses = useSignalStore(state => state.updateSignalStatuses);
  const lastUpdateRef = useRef(0);
  
  useEffect(() => {
    if (!currentPrice || !symbol) return;
    
    // Throttle updates to max 1 per second
    const now = Date.now();
    if (now - lastUpdateRef.current < 1000) return;
    lastUpdateRef.current = now;
    
    // Create map of current prices (can be expanded for multi-symbol)
    const priceMap: Record<string, number> = {
      [symbol]: currentPrice
    };
    
    updateSignalStatuses(priceMap);
    
  }, [symbol, currentPrice, updateSignalStatuses]);
}
