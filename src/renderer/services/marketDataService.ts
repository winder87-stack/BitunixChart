/**
 * Market Data Service
 * Wrapper around the Electron IPC API for fetching market data
 */

import type {
  Kline,
  MarketSymbol,
  Ticker24h,
  TimeInterval,
  KlineUpdate,
  ConnectionStatus,
  ApiResponse,
  SubscriptionParams,
  SystemInfo,
} from '../types';

// =============================================================================
// Service Class
// =============================================================================

class MarketDataService {
  // ===========================================================================
  // REST API Methods
  // ===========================================================================

  /**
   * Get all available trading symbols
   */
  async getSymbols(): Promise<ApiResponse<MarketSymbol[]>> {
    try {
      return await window.bitunix.getSymbols();
    } catch (error) {
      console.error('[MarketDataService] Failed to fetch symbols:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get candlestick/kline data
   * @param symbol - Trading pair (e.g., 'BTCUSDT')
   * @param interval - Time interval (e.g., '1h', '4h', '1d')
   * @param limit - Number of candles to fetch (default: 500, max: 1000)
   */
  async getKlines(
    symbol: string,
    interval: TimeInterval,
    limit = 500
  ): Promise<ApiResponse<Kline[]>> {
    try {
      return await window.bitunix.getKlines(symbol, interval, limit);
    } catch (error) {
      console.error('[MarketDataService] Failed to fetch klines:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get 24hr ticker statistics for a symbol
   * @param symbol - Trading pair (e.g., 'BTCUSDT')
   */
  async getTicker(symbol: string): Promise<ApiResponse<Ticker24h>> {
    try {
      return await window.bitunix.getTicker(symbol);
    } catch (error) {
      console.error('[MarketDataService] Failed to fetch ticker:', error);
      return {
        success: false,
        data: {} as Ticker24h,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get 24hr ticker statistics for all symbols
   */
  async getAllTickers(): Promise<ApiResponse<Ticker24h[]>> {
    try {
      return await window.bitunix.getAllTickers();
    } catch (error) {
      console.error('[MarketDataService] Failed to fetch all tickers:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  // ===========================================================================
  // WebSocket Methods
  // ===========================================================================

  /**
   * Subscribe to real-time kline updates
   * @param params - Subscription parameters (symbol, interval)
   */
  async subscribe(params: SubscriptionParams): Promise<{ success: boolean; error?: string }> {
    try {
      return await window.bitunix.subscribe(params);
    } catch (error) {
      console.error('[MarketDataService] Failed to subscribe:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Unsubscribe from real-time kline updates
   * @param params - Subscription parameters (symbol, interval)
   */
  async unsubscribe(params: SubscriptionParams): Promise<{ success: boolean; error?: string }> {
    try {
      return await window.bitunix.unsubscribe(params);
    } catch (error) {
      console.error('[MarketDataService] Failed to unsubscribe:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  async unsubscribeAll(): Promise<{ success: boolean }> {
    try {
      return await window.bitunix.unsubscribeAll();
    } catch (error) {
      console.error('[MarketDataService] Failed to unsubscribe all:', error);
      return { success: false };
    }
  }

  /**
   * Get current WebSocket connection status
   */
  async getConnectionStatus(): Promise<ConnectionStatus> {
    try {
      return await window.bitunix.getConnectionStatus();
    } catch (error) {
      console.error('[MarketDataService] Failed to get connection status:', error);
      return 'error';
    }
  }

  /**
   * Force reconnect to WebSocket server
   */
  async reconnect(): Promise<{ success: boolean }> {
    try {
      return await window.bitunix.reconnect();
    } catch (error) {
      console.error('[MarketDataService] Failed to reconnect:', error);
      return { success: false };
    }
  }

  // ===========================================================================
  // Event Listeners
  // ===========================================================================

  /**
   * Listen for real-time kline updates
   * @param callback - Function to call when new kline data arrives
   * @returns Cleanup function to remove the listener
   */
  onKlineUpdate(callback: (data: KlineUpdate) => void): () => void {
    return window.bitunix.onKlineUpdate(callback);
  }

  /**
   * Listen for WebSocket connection status changes
   * @param callback - Function to call when status changes
   * @returns Cleanup function to remove the listener
   */
  onConnectionStatus(callback: (status: ConnectionStatus) => void): () => void {
    return window.bitunix.onConnectionStatus(callback);
  }

  /**
   * Listen for error events
   * @param callback - Function to call when an error occurs
   * @returns Cleanup function to remove the listener
   */
  onError(callback: (error: { message: string; code?: string }) => void): () => void {
    return window.bitunix.onError(callback);
  }

  // ===========================================================================
  // System Information
  // ===========================================================================

  /**
   * Get system information for status bar display
   */
  async getSystemInfo(): Promise<SystemInfo> {
    try {
      return await window.bitunix.getSystemInfo();
    } catch (error) {
      console.error('[MarketDataService] Failed to get system info:', error);
      return {
        platform: 'linux',
        arch: 'x64',
        cpus: 0,
        memory: { total: 0, free: 0 },
        hostname: 'unknown',
        appVersion: '0.0.0',
        electronVersion: '0.0.0',
      };
    }
  }

  /**
   * Get the application version
   */
  async getAppVersion(): Promise<string> {
    try {
      return await window.bitunix.getAppVersion();
    } catch (error) {
      console.error('[MarketDataService] Failed to get app version:', error);
      return '0.0.0';
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const marketDataService = new MarketDataService();

// =============================================================================
// Convenience Exports
// =============================================================================

export default marketDataService;
