import type { ParsedKline } from './bitunix';
import type { IndicatorConfig, IndicatorResult } from './indicators';

export interface WorkerMessage {
  id: string;
  type: 'calculate';
  payload: {
    indicators: IndicatorConfig[];
    klines: ParsedKline[];
  };
}

export interface WorkerResponse {
  id: string;
  type: 'result' | 'error';
  payload: {
    results?: Array<{
      id: string;
      data: IndicatorResult[];
    }>;
    error?: string;
  };
}
