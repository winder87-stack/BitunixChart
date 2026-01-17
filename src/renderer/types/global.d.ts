import {
  BitunixSymbol,
  BitunixTicker24h,
  RawKlineArray,
  Timeframe,
} from './bitunix';
import { Kline } from './index';

export interface IpcResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: number;
}

// Define the shape of the exposed API from preload script
export interface BitunixPreloadAPI {
  // REST API
  getSymbols(): Promise<IpcResponse<BitunixSymbol[]>>;
  getAllTickers(): Promise<IpcResponse<BitunixTicker24h[]>>;
  getKlines(symbol: string, interval: Timeframe, limit?: number): Promise<IpcResponse<RawKlineArray[]>>;

  // WebSocket / IPC
  subscribe(params: { symbol: string; interval: Timeframe }): Promise<{ success: boolean; error?: string }>;
  unsubscribe(params: { symbol: string; interval: Timeframe }): Promise<{ success: boolean; error?: string }>;
  unsubscribeAll(): Promise<{ success: boolean; error?: string }>;
  reconnect(): Promise<{ success: boolean; error?: string }>;
  getConnectionStatus(): Promise<string>;

  // Event Listeners
  onConnectionStatus(callback: (status: string) => void): () => void;
  onKlineUpdate(callback: (data: { symbol: string; interval: Timeframe; kline: Kline; isFinal: boolean }) => void): () => void;
  onError(callback: (error: { code?: string; message: string }) => void): () => void;
}

declare global {
  interface Window {
    bitunix: BitunixPreloadAPI;
  }
}
