import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// =============================================================================
// Type Definitions
// =============================================================================

/** Time intervals for candlestick data */
export type TimeInterval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '12h' | '1d' | '1w' | '1M';

/** WebSocket connection status */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'error';

/** Candlestick/Kline data structure */
export interface Kline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteVolume: string;
  trades: number;
  takerBuyBaseVolume: string;
  takerBuyQuoteVolume: string;
}

/** Trading symbol information */
export interface MarketSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  pricePrecision: number;
  quantityPrecision: number;
  minOrderQty: string;
  maxOrderQty: string;
  tickSize: string;
}

/** 24hr ticker statistics */
export interface Ticker24h {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
}

/** Real-time kline update from WebSocket */
export interface KlineUpdate {
  symbol: string;
  interval: TimeInterval;
  kline: Kline;
  isFinal: boolean;
}

/** Subscription parameters */
export interface SubscriptionParams {
  symbol: string;
  interval: TimeInterval;
}

/** API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: number;
}

/** System information for status bar */
export interface SystemInfo {
  platform: NodeJS.Platform;
  arch: string;
  cpus: number;
  memory: {
    total: number;
    free: number;
  };
  hostname: string;
  appVersion: string;
  electronVersion: string;
}

/** Event callback cleanup function */
export type CleanupFunction = () => void;

// =============================================================================
// API Interface
// =============================================================================

export interface BitunixAPI {
  // Market Data - REST API
  getSymbols: () => Promise<ApiResponse<MarketSymbol[]>>;
  getKlines: (symbol: string, interval: TimeInterval, limit?: number) => Promise<ApiResponse<Kline[]>>;
  getTicker: (symbol: string) => Promise<ApiResponse<Ticker24h>>;
  getAllTickers: () => Promise<ApiResponse<Ticker24h[]>>;
  
  // WebSocket Connection Management
  subscribe: (params: SubscriptionParams) => Promise<{ success: boolean; error?: string }>;
  unsubscribe: (params: SubscriptionParams) => Promise<{ success: boolean; error?: string }>;
  unsubscribeAll: () => Promise<{ success: boolean }>;
  getConnectionStatus: () => Promise<ConnectionStatus>;
  reconnect: () => Promise<{ success: boolean }>;
  
  // Real-time Event Listeners
  onKlineUpdate: (callback: (data: KlineUpdate) => void) => CleanupFunction;
  onConnectionStatus: (callback: (status: ConnectionStatus) => void) => CleanupFunction;
  onError: (callback: (error: { message: string; code?: string }) => void) => CleanupFunction;
  
  // System Information
  getSystemInfo: () => Promise<SystemInfo>;
  getAppVersion: () => Promise<string>;
  
  // Window Controls
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isMaximized: () => Promise<boolean>;
}

// =============================================================================
// Context Bridge Implementation
// =============================================================================

const api: BitunixAPI = {
  // ===========================================================================
  // Market Data - REST API
  // ===========================================================================
  
  /**
   * Fetch all available trading symbols
   */
  getSymbols: (): Promise<ApiResponse<MarketSymbol[]>> => {
    return ipcRenderer.invoke('bitunix:get-symbols');
  },

  /**
   * Fetch historical kline/candlestick data
   * @param symbol - Trading pair (e.g., 'BTCUSDT')
   * @param interval - Time interval (e.g., '1h', '4h', '1d')
   * @param limit - Number of candles to fetch (default: 500, max: 1000)
   */
  getKlines: (symbol: string, interval: TimeInterval, limit?: number): Promise<ApiResponse<Kline[]>> => {
    return ipcRenderer.invoke('bitunix:get-klines', { symbol, interval, limit });
  },

  /**
   * Fetch 24hr ticker statistics for a symbol
   * @param symbol - Trading pair (e.g., 'BTCUSDT')
   */
  getTicker: (symbol: string): Promise<ApiResponse<Ticker24h>> => {
    return ipcRenderer.invoke('bitunix:get-ticker', { symbol });
  },

  /**
   * Fetch 24hr ticker statistics for all symbols
   */
  getAllTickers: (): Promise<ApiResponse<Ticker24h[]>> => {
    return ipcRenderer.invoke('bitunix:get-all-tickers');
  },

  // ===========================================================================
  // WebSocket Connection Management
  // ===========================================================================

  /**
   * Subscribe to real-time kline updates
   * @param params - Subscription parameters (symbol, interval)
   */
  subscribe: (params: SubscriptionParams): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('bitunix:subscribe', params);
  },

  /**
   * Unsubscribe from real-time kline updates
   * @param params - Subscription parameters (symbol, interval)
   */
  unsubscribe: (params: SubscriptionParams): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('bitunix:unsubscribe', params);
  },

  /**
   * Unsubscribe from all active subscriptions
   */
  unsubscribeAll: (): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('bitunix:unsubscribe-all');
  },

  /**
   * Get current WebSocket connection status
   */
  getConnectionStatus: (): Promise<ConnectionStatus> => {
    return ipcRenderer.invoke('bitunix:connection-status');
  },

  /**
   * Force reconnect to WebSocket server
   */
  reconnect: (): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('bitunix:reconnect');
  },

  // ===========================================================================
  // Real-time Event Listeners
  // ===========================================================================

  /**
   * Listen for real-time kline updates
   * @param callback - Function to call when new kline data arrives
   * @returns Cleanup function to remove the listener
   */
  onKlineUpdate: (callback: (data: KlineUpdate) => void): CleanupFunction => {
    const handler = (_event: IpcRendererEvent, data: KlineUpdate): void => {
      callback(data);
    };
    ipcRenderer.on('bitunix:kline-update', handler);
    return () => {
      ipcRenderer.removeListener('bitunix:kline-update', handler);
    };
  },

  /**
   * Listen for WebSocket connection status changes
   * @param callback - Function to call when status changes
   * @returns Cleanup function to remove the listener
   */
  onConnectionStatus: (callback: (status: ConnectionStatus) => void): CleanupFunction => {
    const handler = (_event: IpcRendererEvent, status: ConnectionStatus): void => {
      callback(status);
    };
    ipcRenderer.on('bitunix:connection-status', handler);
    return () => {
      ipcRenderer.removeListener('bitunix:connection-status', handler);
    };
  },

  /**
   * Listen for error events
   * @param callback - Function to call when an error occurs
   * @returns Cleanup function to remove the listener
   */
  onError: (callback: (error: { message: string; code?: string }) => void): CleanupFunction => {
    const handler = (_event: IpcRendererEvent, error: { message: string; code?: string }): void => {
      callback(error);
    };
    ipcRenderer.on('bitunix:error', handler);
    return () => {
      ipcRenderer.removeListener('bitunix:error', handler);
    };
  },

  // ===========================================================================
  // System Information
  // ===========================================================================

  /**
   * Get system information for status bar display
   */
  getSystemInfo: (): Promise<SystemInfo> => {
    return ipcRenderer.invoke('system:get-info');
  },

  /**
   * Get the application version
   */
  getAppVersion: (): Promise<string> => {
    return ipcRenderer.invoke('system:get-version');
  },

  // ===========================================================================
  // Window Controls
  // ===========================================================================

  /**
   * Minimize the application window
   */
  minimizeWindow: (): void => {
    ipcRenderer.send('window:minimize');
  },

  /**
   * Maximize or restore the application window
   */
  maximizeWindow: (): void => {
    ipcRenderer.send('window:maximize');
  },

  /**
   * Close the application window
   */
  closeWindow: (): void => {
    ipcRenderer.send('window:close');
  },

  /**
   * Check if the window is currently maximized
   */
  isMaximized: (): Promise<boolean> => {
    return ipcRenderer.invoke('window:is-maximized');
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('bitunix', api);

// =============================================================================
// Global Type Declaration
// =============================================================================

declare global {
  interface Window {
    bitunix: BitunixAPI;
  }
}
