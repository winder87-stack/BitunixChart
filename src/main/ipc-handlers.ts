import { ipcMain, BrowserWindow, app } from 'electron';
import axios, { AxiosError } from 'axios';
import WebSocket from 'ws';
import os from 'os';
import log from 'electron-log';

// =============================================================================
// Type Definitions
// =============================================================================

type TimeInterval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M';
type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'error';

interface SubscriptionParams {
  symbol: string;
  interval: TimeInterval;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: number;
}

interface KlineData {
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

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  API_BASE_URL: 'https://fapi.bitunix.com',
  WS_URL: 'wss://fapi.bitunix.com/public/',
  REQUEST_TIMEOUT: 10000,
  WS_PING_INTERVAL: 30000,
  WS_RECONNECT_DELAY: 5000,
  WS_MAX_RECONNECT_ATTEMPTS: 5,
  WS_THROTTLE_MS: 250, // 4 updates/sec for UI performance
} as const;

// =============================================================================
// WebSocket Manager
// =============================================================================

interface KlineUpdateData {
  symbol: string;
  interval: TimeInterval;
  kline: KlineData;
  isFinal: boolean;
}

class WebSocketManager {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, SubscriptionParams> = new Map();
  private status: ConnectionStatus = 'disconnected';
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private cachedMainWindow: BrowserWindow | null = null;
  private updateBuffer: Map<string, KlineUpdateData> = new Map();
  private throttleInterval: NodeJS.Timeout | null = null;

  /**
   * Map internal interval to Bitunix API interval
   */
  private mapInterval(interval: TimeInterval): string {
    const map: Record<string, string> = {
      '1m': '1min',
      '3m': '3min',
      '5m': '5min',
      '15m': '15min',
      '30m': '30min',
      '1h': '60min',
      '2h': '2h',
      '4h': '4h',
      '6h': '6h',
      '8h': '8h',
      '12h': '12h',
      '1d': '1day',
      '3d': '3day',
      '1w': '1week',
      '1M': '1month'
    };
    return map[interval] || '1min';
  }

  /**
   * Get subscription channel for a interval
   */
  private getChannel(interval: TimeInterval): string {
    return `market_kline_${this.mapInterval(interval)}`;
  }

  /**
   * Get subscription key for internal tracking (symbol@interval)
   */
  private getKey(symbol: string, interval: TimeInterval): string {
    return `${symbol.toUpperCase()}@${interval}`;
  }

  /**
   * Get duration in milliseconds for an interval
   */
  private getDuration(interval: TimeInterval): number {
    const min = 60 * 1000;
    const map: Record<string, number> = {
      '1m': min, '3m': 3 * min, '5m': 5 * min, '15m': 15 * min, '30m': 30 * min,
      '1h': 60 * min, '2h': 120 * min, '4h': 240 * min, '6h': 360 * min, '8h': 480 * min, '12h': 720 * min,
      '1d': 24 * 60 * min, '3d': 3 * 24 * 60 * min, '1w': 7 * 24 * 60 * min, '1M': 30 * 24 * 60 * min
    };
    return map[interval] || min;
  }

  private getMainWindow(): BrowserWindow | null {
    if (this.cachedMainWindow?.isDestroyed()) {
      this.cachedMainWindow = null;
    }
    if (!this.cachedMainWindow) {
      const windows = BrowserWindow.getAllWindows();
      this.cachedMainWindow = windows.length > 0 ? windows[0] : null;
    }
    return this.cachedMainWindow;
  }

  /**
   * Send connection status update to renderer
   */
  private sendStatus(status: ConnectionStatus): void {
    this.status = status;
    const mainWindow = this.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bitunix:connection-status', status);
    }
  }

  /**
   * Send error to renderer
   */
  private sendError(message: string, code?: string): void {
    const mainWindow = this.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bitunix:error', { message, code });
    }
  }

  private bufferKlineUpdate(data: KlineUpdateData): void {
    this.updateBuffer.set(data.symbol, data);
    this.startThrottledFlush();
  }

  private startThrottledFlush(): void {
    if (this.throttleInterval) return;
    this.throttleInterval = setInterval(() => {
      this.flushUpdateBuffer();
    }, CONFIG.WS_THROTTLE_MS);
  }

  private flushUpdateBuffer(): void {
    if (this.updateBuffer.size === 0) return;
    const mainWindow = this.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      this.updateBuffer.forEach((update) => {
        mainWindow.webContents.send('bitunix:kline-update', update);
      });
    }
    this.updateBuffer.clear();
  }

  private stopThrottledFlush(): void {
    if (this.throttleInterval) {
      clearInterval(this.throttleInterval);
      this.throttleInterval = null;
    }
    this.updateBuffer.clear();
  }

  private sendKlineUpdate(data: KlineUpdateData): void {
    this.bufferKlineUpdate(data);
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.sendStatus('connecting');
    log.info('[WS] Connecting to', CONFIG.WS_URL);

    try {
      this.ws = new WebSocket(CONFIG.WS_URL);

      this.ws.on('open', () => {
        log.info('[WS] Connected');
        this.sendStatus('connected');
        this.reconnectAttempts = 0;
        this.startPing();
        
        // Resubscribe to all active subscriptions
        this.resubscribeAll();
      });

      this.ws.on('message', (data: WebSocket.RawData) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          log.error('[WS] Error parsing message:', error);
        }
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        log.info(`[WS] Closed: ${code} - ${reason.toString()}`);
        this.stopPing();
        this.handleDisconnect();
      });

      this.ws.on('error', (error: Error) => {
        log.error('[WS] Error:', error.message);
        this.sendError(error.message, 'WS_ERROR');
      });
    } catch (error) {
      log.error('[WS] Connection error:', error);
      this.sendError('Failed to connect to WebSocket', 'WS_CONNECTION_ERROR');
      this.handleDisconnect();
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: Record<string, unknown>): void {
    if (message.op === 'ping') return;
    if (message.op === 'pong') return;

    // Handle kline data
    if (message.ch && (message.ch as string).includes('kline') && message.data) {
      const data = message.data as Record<string, unknown>;
      const symbol = message.symbol as string;
      const channel = message.ch as string;
      
      const intervalPart = channel.replace('market_kline_', '').replace('mark_kline_', '');
      
      const revMap: Record<string, TimeInterval> = {
        '1min': '1m', '3min': '3m', '5min': '5m', '15min': '15m', '30min': '30m',
        '60min': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '8h': '8h', '12h': '12h',
        '1day': '1d', '3day': '3d', '1week': '1w', '1month': '1M'
      };
      
      const interval = revMap[intervalPart] || '1m';
      const duration = this.getDuration(interval);
      const ts = message.ts as number;
      const openTime = Math.floor(ts / duration) * duration;

      if (data) {
        const rawVolume = data.b ?? data.v ?? data.V ?? data.volume ?? data.baseVolume ?? '0';
        const parsedVolume = String(rawVolume);
        
        if (!data.o && !data.h && !data.l && !data.c) {
          log.warn('[WS] Unknown kline message format:', JSON.stringify(message).slice(0, 200));
        }
        
        const kline: KlineData = {
          openTime: openTime,
          open: data.o as string,
          high: data.h as string,
          low: data.l as string,
          close: data.c as string,
          volume: parsedVolume,
          closeTime: openTime + duration - 1,
          quoteVolume: (data.q ?? data.Q ?? data.quoteVolume ?? '0') as string,
          trades: 0,
          takerBuyBaseVolume: '0',
          takerBuyQuoteVolume: '0',
        };

        this.sendKlineUpdate({
          symbol: symbol.toUpperCase(),
          interval,
          kline,
          isFinal: false,
        });
      }
    }
  }

  /**
   * Handle disconnection and attempt reconnection
   */
  private handleDisconnect(): void {
    this.sendStatus('disconnected');
    
    if (this.reconnectAttempts < CONFIG.WS_MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      this.sendStatus('reconnecting');
      log.info(`[WS] Reconnecting in ${CONFIG.WS_RECONNECT_DELAY}ms (attempt ${this.reconnectAttempts}/${CONFIG.WS_MAX_RECONNECT_ATTEMPTS})`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, CONFIG.WS_RECONNECT_DELAY);
    } else {
      this.sendError('Max reconnection attempts reached', 'WS_MAX_RECONNECT');
      this.sendStatus('error');
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ op: 'ping', ping: Date.now() }));
      }
    }, CONFIG.WS_PING_INTERVAL);
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Subscribe to kline updates for a symbol
   */
  subscribe(params: SubscriptionParams): { success: boolean; error?: string } {
    const key = this.getKey(params.symbol, params.interval);
    
    if (this.subscriptions.has(key)) {
      return { success: true }; // Already subscribed
    }

    // Connect if not already connected
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }

    // Add to subscriptions
    this.subscriptions.set(key, params);

    // Send subscription message
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        op: 'subscribe',
        args: [{
          symbol: params.symbol.toUpperCase(),
          ch: this.getChannel(params.interval)
        }]
      };
      this.ws.send(JSON.stringify(message));
      log.info(`[WS] Subscribed to ${params.symbol} ${params.interval}`);
    }

    return { success: true };
  }

  /**
   * Unsubscribe from kline updates for a symbol
   */
  unsubscribe(params: SubscriptionParams): { success: boolean; error?: string } {
    const key = this.getKey(params.symbol, params.interval);
    
    if (!this.subscriptions.has(key)) {
      return { success: true }; // Not subscribed
    }

    // Remove from subscriptions
    this.subscriptions.delete(key);

    // Send unsubscription message
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        op: 'unsubscribe',
        args: [{
          symbol: params.symbol.toUpperCase(),
          ch: this.getChannel(params.interval)
        }]
      };
      this.ws.send(JSON.stringify(message));
      log.info(`[WS] Unsubscribed from ${params.symbol} ${params.interval}`);
    }

    // Disconnect if no more subscriptions
    if (this.subscriptions.size === 0) {
      this.disconnect();
    }

    return { success: true };
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  unsubscribeAll(): { success: boolean } {
    // Collect all active args to unsubscribe
    const args: Array<{ symbol: string; ch: string }> = [];
    this.subscriptions.forEach((params) => {
      args.push({
        symbol: params.symbol.toUpperCase(),
        ch: this.getChannel(params.interval)
      });
    });
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN && args.length > 0) {
      const message = {
        op: 'unsubscribe',
        args
      };
      this.ws.send(JSON.stringify(message));
    }

    this.subscriptions.clear();
    this.disconnect();
    
    return { success: true };
  }

  /**
   * Resubscribe to all active subscriptions (after reconnection)
   */
  private resubscribeAll(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.subscriptions.size > 0) {
      const args: Array<{ symbol: string; ch: string }> = [];
      
      this.subscriptions.forEach((params) => {
        args.push({
          symbol: params.symbol.toUpperCase(),
          ch: this.getChannel(params.interval)
        });
      });

      if (args.length > 0) {
        const message = {
          op: 'subscribe',
          args
        };
        this.ws.send(JSON.stringify(message));
        log.info(`[WS] Resubscribed to ${args.length} streams`);
      }
    }
  }

  /**
   * Force reconnection
   */
  reconnect(): { success: boolean } {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
    return { success: true };
  }

  disconnect(): void {
    this.stopPing();
    this.stopThrottledFlush();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Client disconnect');
      }
      this.ws = null;
    }

    this.sendStatus('disconnected');
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  cleanup(): void {
    this.stopThrottledFlush();
    this.unsubscribeAll();
    this.disconnect();
  }
}

// =============================================================================
// Singleton WebSocket Manager Instance
// =============================================================================

const wsManager = new WebSocketManager();

// =============================================================================
// API Helpers
// =============================================================================

/**
 * Make API request with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  params?: Record<string, unknown>
): Promise<ApiResponse<T>> {
  try {
    const response = await axios.get(`${CONFIG.API_BASE_URL}${endpoint}`, {
      params,
      timeout: CONFIG.REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return {
      success: true,
      data: response.data.data || response.data,
      timestamp: Date.now(),
    };
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    const errorMessage = axiosError.response?.data?.message 
      || axiosError.message 
      || 'Unknown error';
    
    log.error(`[API] Error fetching ${endpoint}:`, errorMessage);
    
    return {
      success: false,
      data: [] as unknown as T,
      error: errorMessage,
      timestamp: Date.now(),
    };
  }
}

// =============================================================================
// IPC Handler Registration
// =============================================================================

export function registerIpcHandlers(): void {
  log.info('[IPC] Registering handlers...');

  // ===========================================================================
  // Market Data - REST API
  // ===========================================================================

  /**
   * Get all available trading symbols
   */
  ipcMain.handle('bitunix:get-symbols', async () => {
    const response = await apiRequest<Array<{
      symbol: string;
      base: string;
      quote: string;
      minTradeVolume: string;
      basePrecision: number;
      quotePrecision: number;
      maxLeverage: number;
      minLeverage: number;
      symbolStatus: string;
    }>>('/api/v1/futures/market/trading_pairs');
    
    if (response.success && Array.isArray(response.data)) {
      const transformedData = response.data
        .filter(s => s.symbolStatus === 'OPEN')
        .map(s => ({
          symbol: s.symbol,
          baseAsset: s.base,
          quoteAsset: s.quote,
          baseAssetPrecision: s.basePrecision,
          quoteAssetPrecision: s.quotePrecision,
          pricePrecision: s.quotePrecision,
          quantityPrecision: s.basePrecision,
          status: 'TRADING' as const,
          orderTypes: ['LIMIT', 'MARKET'],
          icebergAllowed: false,
          ocoAllowed: false,
          isSpotTradingAllowed: false,
          isMarginTradingAllowed: true,
          filters: [
            { filterType: 'PRICE_FILTER', tickSize: Math.pow(10, -s.quotePrecision).toFixed(s.quotePrecision) },
            { filterType: 'LOT_SIZE', minQty: s.minTradeVolume, maxQty: '10000' },
            { filterType: 'MIN_NOTIONAL', minNotional: '10' },
          ],
          permissions: ['FUTURES'],
        }));
      return { ...response, data: transformedData };
    }
    
    return response;
  });

  /**
   * Get historical kline/candlestick data
   */
  ipcMain.handle('bitunix:get-klines', async (_event, params: { 
    symbol: string; 
    interval: TimeInterval; 
    limit?: number;
  }) => {
    const { symbol, interval, limit = 500 } = params;
    const response = await apiRequest<Array<{
      time: string;
      open: string;
      high: string;
      low: string;
      close: string;
      quoteVol: string;
      baseVol: string;
    }>>('/api/v1/futures/market/kline', {
      symbol: symbol.toUpperCase(),
      interval,
      limit: Math.min(limit, 1000),
    });
    
    if (response.success && Array.isArray(response.data)) {
      const transformedData: KlineData[] = response.data.map(k => ({
        openTime: parseInt(k.time, 10),
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.quoteVol,
        closeTime: parseInt(k.time, 10) + 60000,
        quoteVolume: k.baseVol,
        trades: 0,
        takerBuyBaseVolume: '0',
        takerBuyQuoteVolume: '0',
      }));
      return { ...response, data: transformedData };
    }
    
    return response;
  });

  /**
   * Get 24hr ticker statistics for a symbol
   */
  ipcMain.handle('bitunix:get-ticker', async (_event, params: { symbol: string }) => {
    const response = await apiRequest<{
      symbol: string;
      markPrice: string;
      lastPrice: string;
      open: string;
      high: string;
      low: string;
      quoteVol: string;
      baseVol: string;
    }>('/api/v1/futures/market/tickers', {
      symbol: params.symbol.toUpperCase(),
    });
    
    if (response.success && response.data) {
      const t = response.data;
      const openPrice = parseFloat(t.open) || 0;
      const lastPrice = parseFloat(t.lastPrice) || 0;
      const priceChange = lastPrice - openPrice;
      const priceChangePercent = openPrice > 0 ? (priceChange / openPrice) * 100 : 0;
      
      const transformedData = {
        symbol: t.symbol,
        priceChange: priceChange.toString(),
        priceChangePercent: priceChangePercent.toFixed(2),
        weightedAvgPrice: t.markPrice,
        prevClosePrice: t.open,
        lastPrice: t.lastPrice,
        lastQty: '0',
        bidPrice: t.lastPrice,
        bidQty: '0',
        askPrice: t.lastPrice,
        askQty: '0',
        openPrice: t.open,
        highPrice: t.high,
        lowPrice: t.low,
        volume: t.baseVol,
        quoteVolume: t.quoteVol,
        openTime: Date.now() - 86400000,
        closeTime: Date.now(),
        firstId: 0,
        lastId: 0,
        count: 0,
      };
      return { ...response, data: transformedData };
    }
    
    return response;
  });

  /**
   * Get 24hr ticker statistics for all symbols
   */
  ipcMain.handle('bitunix:get-all-tickers', async () => {
    const response = await apiRequest<Array<{
      symbol: string;
      markPrice: string;
      lastPrice: string;
      open: string;
      high: string;
      low: string;
      quoteVol: string;
      baseVol: string;
    }>>('/api/v1/futures/market/tickers');
    
    if (response.success && Array.isArray(response.data)) {
      const transformedData = response.data.map(t => {
        const openPrice = parseFloat(t.open) || 0;
        const lastPrice = parseFloat(t.lastPrice) || 0;
        const priceChange = lastPrice - openPrice;
        const priceChangePercent = openPrice > 0 ? (priceChange / openPrice) * 100 : 0;
        
        return {
          symbol: t.symbol,
          priceChange: priceChange.toString(),
          priceChangePercent: priceChangePercent.toFixed(2),
          weightedAvgPrice: t.markPrice,
          prevClosePrice: t.open,
          lastPrice: t.lastPrice,
          lastQty: '0',
          bidPrice: t.lastPrice,
          bidQty: '0',
          askPrice: t.lastPrice,
          askQty: '0',
          openPrice: t.open,
          highPrice: t.high,
          lowPrice: t.low,
          volume: t.baseVol,
          quoteVolume: t.quoteVol,
          openTime: Date.now() - 86400000,
          closeTime: Date.now(),
          firstId: 0,
          lastId: 0,
          count: 0,
        };
      });
      return { ...response, data: transformedData };
    }
    
    return response;
  });

  // ===========================================================================
  // WebSocket Connection Management
  // ===========================================================================

  /**
   * Subscribe to real-time kline updates
   */
  ipcMain.handle('bitunix:subscribe', (_event, params: SubscriptionParams) => {
    return wsManager.subscribe(params);
  });

  /**
   * Unsubscribe from real-time kline updates
   */
  ipcMain.handle('bitunix:unsubscribe', (_event, params: SubscriptionParams) => {
    return wsManager.unsubscribe(params);
  });

  /**
   * Unsubscribe from all active subscriptions
   */
  ipcMain.handle('bitunix:unsubscribe-all', () => {
    return wsManager.unsubscribeAll();
  });

  /**
   * Get current WebSocket connection status
   */
  ipcMain.handle('bitunix:connection-status', () => {
    return wsManager.getStatus();
  });

  /**
   * Force reconnect to WebSocket server
   */
  ipcMain.handle('bitunix:reconnect', () => {
    return wsManager.reconnect();
  });

  // ===========================================================================
  // System Information
  // ===========================================================================

  /**
   * Get system information for status bar
   */
  ipcMain.handle('system:get-info', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      cpus: os.cpus().length,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
      },
      hostname: os.hostname(),
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
    };
  });

  /**
   * Get application version
   */
  ipcMain.handle('system:get-version', () => {
    return app.getVersion();
  });

  // ===========================================================================
  // Window Controls
  // ===========================================================================

  /**
   * Minimize window
   */
  ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  /**
   * Maximize/restore window
   */
  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.restore();
      } else {
        win.maximize();
      }
    }
  });

  /**
   * Close window
   */
  ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  /**
   * Check if window is maximized
   */
  ipcMain.handle('window:is-maximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win?.isMaximized() ?? false;
  });

  log.info('[IPC] Handlers registered successfully');
}

// =============================================================================
// Cleanup Function
// =============================================================================

export function cleanupWebSocket(): void {
  log.info('[WS] Cleaning up WebSocket connections...');
  wsManager.cleanup();
}
