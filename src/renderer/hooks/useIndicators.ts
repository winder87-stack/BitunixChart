/**
 * Indicators Hook
 * 
 * Manages off-main-thread calculation of technical indicators.
 * Uses a Web Worker to keep the UI responsive.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useIndicatorStore } from '../stores/indicatorStore';
import type { ParsedKline } from '../types/bitunix';
// IndicatorConfig is used in the worker payload type implicitly via activeIndicators
// but we don't use the type explicitly in the hook body, so we can keep it for clarity or remove
// import type { IndicatorConfig } from '../types/indicators';

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
    
    worker.onmessage = (event) => {
      const { type, payload } = event.data;
      
      if (type === 'result') {
        const { results } = payload;
        
        if (results) {
          // Batch updates to store
          results.forEach((res: any) => {
            if (res.error) {
              setError(res.id, res.error);
            } else {
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
