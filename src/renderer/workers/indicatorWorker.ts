/**
 * Indicator Calculation Worker
 * 
 * Runs indicator calculations off the main thread to prevent UI freezing.
 * Receives kline data and indicator configurations, returns calculated results.
 */

import { calculateIndicator, CalculationParams } from '../services/indicators/calculations';
import type { WorkerMessage } from '../types/worker';

// =============================================================================
// Message Handler
// =============================================================================

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;

  if (type === 'calculate') {
    try {
      const { indicators, klines } = payload;
      
      if (!klines || klines.length === 0) {
        self.postMessage({
          id,
          type: 'result',
          payload: { results: [] },
        });
        return;
      }

      const results = indicators.map(indicator => {
        try {
          const result = calculateIndicator(
            indicator.type,
            klines,
            indicator.params as CalculationParams
          );
          
          return {
            id: indicator.id,
            data: result.data,
          };
        } catch (err) {
          console.error(`Error calculating ${indicator.type}:`, err);
          // Return empty result on error, but include ID so we know which one failed
          return {
            id: indicator.id,
            data: [],
            error: (err as Error).message,
          };
        }
      });

      self.postMessage({
        id,
        type: 'result',
        payload: { results },
      });
    } catch (error) {
      console.error('Worker calculation error:', error);
      self.postMessage({
        id,
        type: 'error',
        payload: { error: (error as Error).message },
      });
    }
  }
};
