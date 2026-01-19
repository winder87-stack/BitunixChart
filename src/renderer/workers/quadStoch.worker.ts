import { calculateQuadStochastic, calculateQuadStochSignals } from '../services/indicators/quadStochCalculator';
import type { ParsedKline } from '../types/bitunix';
import type { SignalConfig, QuadSignal } from '../types/quadStochastic';

// Define message types
export type WorkerMessageType = 
  | 'CALCULATE_SIGNALS' 
  | 'CALCULATE_STOCH_ONLY' 
  | 'VALIDATE_SIGNAL'
  | 'SIGNALS_RESULT'
  | 'STOCH_RESULT'
  | 'VALIDATION_RESULT'
  | 'ERROR'
  | 'READY';

export interface WorkerMessage {
  type: WorkerMessageType;
  payload?: unknown;
  requestId?: string;
}

// Simple validation to avoid importing the full validator
function validateSignalStatus(signal: QuadSignal, currentPrice: number): { status: string; exitPrice?: number; exitTime?: number } | null {
  if (signal.status !== 'ACTIVE' && signal.status !== 'PARTIAL') return null;

  const isLong = signal.type === 'LONG';
  const now = Date.now();

  // Check Stop Loss
  if ((isLong && currentPrice <= signal.stopLoss) || (!isLong && currentPrice >= signal.stopLoss)) {
    return { status: 'STOPPED', exitPrice: currentPrice, exitTime: now };
  }

  // Check Targets
  if ((isLong && currentPrice >= signal.target3) || (!isLong && currentPrice <= signal.target3)) {
    return { status: 'TARGET3_HIT', exitPrice: currentPrice, exitTime: now };
  }
  
  if ((isLong && currentPrice >= signal.target2) || (!isLong && currentPrice <= signal.target2)) {
    if (signal.status !== 'PARTIAL') {
      return { status: 'TARGET2_HIT', exitPrice: currentPrice, exitTime: now }; // Usually just updates status
    }
  }

  if ((isLong && currentPrice >= signal.target1) || (!isLong && currentPrice <= signal.target1)) {
    if (signal.status === 'ACTIVE') {
      return { status: 'TARGET1_HIT', exitPrice: currentPrice, exitTime: now };
    }
  }

  return null;
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload, requestId } = event.data;
  const startTime = performance.now();

  try {
    switch (type) {
      case 'CALCULATE_SIGNALS': {
        const { symbol, klines, config } = payload as { 
          symbol: string; 
          klines: ParsedKline[]; 
          config: SignalConfig 
        };
        
        const result = calculateQuadStochSignals(symbol, klines, config);
        
        const duration = performance.now() - startTime;
        if (duration > 100) {
          console.warn(`[QuadStochWorker] Slow calculation: ${duration.toFixed(2)}ms for ${symbol}`);
        }

        self.postMessage({ 
          type: 'SIGNALS_RESULT', 
          payload: result, 
          requestId 
        });
        break;
      }
        
      case 'CALCULATE_STOCH_ONLY': {
        const { klines } = payload as { klines: ParsedKline[] };
        const stochData = calculateQuadStochastic(klines);
        
        self.postMessage({ 
          type: 'STOCH_RESULT', 
          payload: stochData, 
          requestId 
        });
        break;
      }
        
      case 'VALIDATE_SIGNAL': {
        const { signal, currentPrice } = payload as { signal: QuadSignal; currentPrice: number };
        const validation = validateSignalStatus(signal, currentPrice);
        
        self.postMessage({ 
          type: 'VALIDATION_RESULT', 
          payload: validation, 
          requestId 
        });
        break;
      }
    }
  } catch (error) {
    console.error('[QuadStochWorker] Error:', error);
    self.postMessage({ 
      type: 'ERROR', 
      payload: { 
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      requestId 
    });
  }
};

// Signal ready
self.postMessage({ type: 'READY' });
