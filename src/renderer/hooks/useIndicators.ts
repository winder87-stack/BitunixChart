/**
 * Indicators Hook
 * 
 * Manages off-main-thread calculation of technical indicators.
 * Uses a Web Worker to keep the UI responsive.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useIndicatorStore } from '../stores/indicatorStore';
import type { ParsedKline } from '../types/bitunix';
import type { IndicatorResult } from '../types/indicators';
import type { WorkerResponse } from '../types/worker';

// Import worker using Vite's worker syntax
import IndicatorWorker from '../workers/indicatorWorker?worker';

// =============================================================================
// Types
// =============================================================================

interface UseIndicatorsReturn {
  isCalculating: boolean;
  calculateAll: () => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useIndicators(klines: ParsedKline[]): UseIndicatorsReturn {
  const workerRef = useRef<Worker | null>(null);
  const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store access
  const activeIndicators = useIndicatorStore(state => state.activeIndicators);
  const setIndicatorResults = useIndicatorStore(state => state.setIndicatorResults);
  const setCalculating = useIndicatorStore(state => state.setCalculating);
  const setError = useIndicatorStore(state => state.setError);
  
  const [isCalculating, setIsCalculatingState] = useState(false);

  // Initialize worker
  useEffect(() => {
    const worker = new IndicatorWorker();
    workerRef.current = worker;
    
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, payload } = event.data;
      
      if (type === 'result') {
        const { results } = payload;
        
        if (results) {
          results.forEach((res: { id: string; data?: IndicatorResult[]; error?: string }) => {
            if (res.error) {
              setError(res.id, res.error);
            } else if (res.data) {
              setIndicatorResults(res.id, res.data);
              setError(res.id, null);
            }
          });
        }
        
        setIsCalculatingState(false);
        setCalculating(false);
      } else if (type === 'error') {
        console.error('Worker error:', payload.error);
        setIsCalculatingState(false);
        setCalculating(false);
      }
    };
    
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [setIndicatorResults, setCalculating, setError]);

  // Calculation function
  const calculateAll = useCallback(() => {
    if (!workerRef.current || klines.length === 0 || activeIndicators.length === 0) {
      return;
    }
    
    setIsCalculatingState(true);
    setCalculating(true);
    
    // Filter enabled indicators
    const enabledIndicators = activeIndicators.filter(ind => ind.enabled);
    
    if (enabledIndicators.length === 0) {
      setIsCalculatingState(false);
      setCalculating(false);
      return;
    }
    
    // Send to worker
    workerRef.current.postMessage({
      id: Date.now().toString(),
      type: 'calculate',
      payload: {
        indicators: enabledIndicators,
        klines,
      },
    });
  }, [klines, activeIndicators, setCalculating]);

  // Auto-calculate on changes (debounced)
  useEffect(() => {
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current);
    }
    
    calculationTimeoutRef.current = setTimeout(() => {
      calculateAll();
    }, 100); // 100ms debounce
    
    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, [calculateAll]); // activeIndicators and klines are deps of calculateAll

  return {
    isCalculating,
    calculateAll,
  };
}

export default useIndicators;
