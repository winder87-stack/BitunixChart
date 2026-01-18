/**
 * Bitunix WebSocket Service
 * 
 * Provides real-time market data streaming via WebSocket connection.
 * Uses the Electron IPC bridge for WebSocket management in the main process.
 * 
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Subscription management for klines and trades
 * - EventEmitter pattern for flexible event handling
 * - Message parsing and type transformation
 * - Heartbeat/ping-pong handling
 * - Connection status tracking
 */

import type {
  Timeframe,
  WSTradeMessage,
  ParsedKline,
} from '../../types/bitunix';

import {
  buildStreamName,
} from '../../types/bitunix';

import { validateKline } from './validators';

// Import Kline type from preload (the format IPC uses)
import type { Kline as IpcKline } from '../../types';

// =============================================================================
// Types
// =============================================================================

/** WebSocket connection status */
export type ConnectionStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/** Subscription types */
export type SubscriptionType = 'kline' | 'trade' | 'depth' | 'ticker';

/** Kline update callback */
export type KlineCallback = (kline: ParsedKline, raw: IpcKline, isFinal: boolean) => void;

/** Trade update callback */
export type TradeCallback = (trade: ParsedTrade) => void;

/** Generic message callback */
export type MessageCallback = (data: unknown) => void;

/** Error callback */
export type ErrorCallback = (error: WebSocketError) => void;

/** Connection status callback */
export type StatusCallback = (status: ConnectionStatus) => void;

/** Parsed trade data */
export interface ParsedTrade {
  id: number;
  symbol: string;
  price: number;
  quantity: number;
  quoteQuantity: number;
  time: number;
  isBuyerMaker: boolean;
  side: 'buy' | 'sell';
}

/** Subscription info */
export interface Subscription {
  id: string;
  type: SubscriptionType;
  symbol: string;
  interval?: Timeframe;
  stream: string;
  callback: KlineCallback | TradeCallback | MessageCallback;
  createdAt: number;
}

/** WebSocket error */
export interface WebSocketError {
  code: string;
  message: string;
  timestamp: number;
  recoverable: boolean;
}

/** WebSocket configuration */
export interface WebSocketConfig {
  /** Auto-reconnect on disconnect */
  autoReconnect: boolean;
  
  /** Maximum reconnect attempts */
  maxReconnectAttempts: number;
  
  /** Base reconnect delay in ms */
  reconnectDelay: number;
  
  /** Maximum reconnect delay in ms */
  maxReconnectDelay: number;
  
  /** Heartbeat interval in ms */
  heartbeatInterval: number;
  
  /** Connection timeout in ms */
  connectionTimeout: number;
  
  /** Enable debug logging */
  debug: boolean;
}

/** Event types */
export type WebSocketEvent = 
  | 'open'
  | 'close'
  | 'error'
  | 'message'
  | 'kline'
  | 'trade'
  | 'status'
  | 'reconnecting'
  | 'subscribed'
  | 'unsubscribed';

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: WebSocketConfig = {
  autoReconnect: true,
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  heartbeatInterval: 30000,
  connectionTimeout: 10000,
  debug: false,
};

// =============================================================================
// Logger
// =============================================================================

const createLogger = (debug: boolean) => ({
  debug: (...args: unknown[]) => {
    if (debug) console.log('[BitunixWS]', ...args);
  },
  info: (...args: unknown[]) => {
    console.log('[BitunixWS]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[BitunixWS]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[BitunixWS]', ...args);
  },
});

// =============================================================================
// Event Emitter
// =============================================================================

type EventHandler = (...args: unknown[]) => void;

class SimpleEventEmitter {
  private events: Map<string, Set<EventHandler>> = new Map();

  on(event: string, handler: EventHandler): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
    
    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler): void {
    this.events.get(event)?.delete(handler);
  }

  emit(event: string, ...args: unknown[]): void {
    this.events.get(event)?.forEach(handler => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.size ?? 0;
  }
}

// =============================================================================
// Bitunix WebSocket Class
// =============================================================================

export class BitunixWebSocket extends SimpleEventEmitter {
  private config: WebSocketConfig;
  private logger: ReturnType<typeof createLogger>;
  
  // Connection state
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Subscriptions
  private subscriptions: Map<string, Subscription> = new Map();
  private pendingSubscriptions: Set<string> = new Set();
  
  // IPC cleanup functions
  private cleanupFunctions: Array<() => void> = [];
  
  // Stats
  private stats = {
    messagesReceived: 0,
    messagesDropped: 0,
    reconnects: 0,
    lastMessageTime: 0,
    connectedAt: 0,
  };

  constructor(config: Partial<WebSocketConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = createLogger(this.config.debug);
    this.logger.debug('Initialized with config:', this.config);
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      this.logger.debug('Already connected or connecting');
      return;
    }

    this.setStatus('connecting');
    this.logger.info('Connecting to WebSocket...');

    try {
      // Set connection timeout
      this.setConnectionTimeout();

      // Check if we're in Electron environment with IPC
      if (typeof window !== 'undefined' && window.bitunix) {
        await this.connectViaIPC();
      } else {
        throw new Error('WebSocket requires Electron IPC bridge');
      }
    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Connect via Electron IPC
   */
  private async connectViaIPC(): Promise<void> {
    // Set up IPC event listeners
    const statusCleanup = window.bitunix.onConnectionStatus((status) => {
      this.handleStatusChange(status as ConnectionStatus);
    });
    this.cleanupFunctions.push(statusCleanup);

    const klineCleanup = window.bitunix.onKlineUpdate((data) => {
      this.handleKlineUpdate(data);
    });
    this.cleanupFunctions.push(klineCleanup);

    const errorCleanup = window.bitunix.onError((error) => {
      this.handleError({
        code: error.code || 'UNKNOWN',
        message: error.message,
        timestamp: Date.now(),
        recoverable: true,
      });
    });
    this.cleanupFunctions.push(errorCleanup);

    // Get initial connection status
    const currentStatus = await window.bitunix.getConnectionStatus();
    this.handleStatusChange(currentStatus as ConnectionStatus);
  }

  /**
   * Handle status change from IPC
   */
  private handleStatusChange(status: ConnectionStatus): void {
    this.clearConnectionTimeout();
    
    const previousStatus = this.status;
    this.setStatus(status);

    if (status === 'connected' && previousStatus !== 'connected') {
      this.onConnected();
    } else if (status === 'disconnected' && previousStatus === 'connected') {
      this.onDisconnected();
    } else if (status === 'error') {
      this.handleConnectionError(new Error('Connection error'));
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  async disconnect(): Promise<void> {
    this.logger.info('Disconnecting...');
    
    // Stop reconnection attempts
    this.stopReconnect();
    
    // Clear heartbeat
    this.stopHeartbeat();
    
    // Clear connection timeout
    this.clearConnectionTimeout();
    
    // Unsubscribe all
    await this.unsubscribeAll();
    
    // Cleanup IPC listeners
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];
    
    // Disconnect via IPC
    if (typeof window !== 'undefined' && window.bitunix) {
      await window.bitunix.unsubscribeAll();
    }
    
    this.setStatus('disconnected');
    this.logger.info('Disconnected');
  }

  /**
   * Force reconnection
   */
  async reconnect(): Promise<void> {
    this.logger.info('Forcing reconnection...');
    this.reconnectAttempts = 0;
    
    await this.disconnect();
    await this.connect();
    
    // Re-subscribe to all previous subscriptions
    await this.resubscribeAll();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === 'connected';
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Get connection stats
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  // ===========================================================================
  // Subscription Methods
  // ===========================================================================

  /**
   * Subscribe to kline/candlestick updates
   * 
   * @param symbol - Trading pair symbol (e.g., "BTCUSDT")
   * @param interval - Timeframe interval (e.g., "1h", "4h")
   * @param callback - Function called on each kline update
   * @returns Subscription ID for unsubscribing
   */
  async subscribeKline(
    symbol: string,
    interval: Timeframe,
    callback: KlineCallback
  ): Promise<string> {
    const stream = buildStreamName(symbol, 'kline', interval);
    const id = this.generateSubscriptionId();

    const subscription: Subscription = {
      id,
      type: 'kline',
      symbol: symbol.toUpperCase(),
      interval,
      stream,
      callback,
      createdAt: Date.now(),
    };

    this.subscriptions.set(id, subscription);
    this.logger.debug(`Subscribing to kline: ${stream} (id: ${id})`);

    // Subscribe via IPC
    if (this.isConnected() && window.bitunix) {
      try {
        this.pendingSubscriptions.add(id);
        const result = await window.bitunix.subscribe({ symbol, interval });
        this.pendingSubscriptions.delete(id);

        if (result.success) {
          this.emit('subscribed', { id, stream, type: 'kline' });
          this.logger.info(`Subscribed to ${stream}`);
        } else {
          throw new Error(result.error || 'Subscription failed');
        }
      } catch (error) {
        this.pendingSubscriptions.delete(id);
        this.subscriptions.delete(id);
        throw error;
      }
    } else {
      // Queue for later when connected
      this.logger.debug(`Queued subscription: ${stream}`);
    }

    return id;
  }

  /**
   * Subscribe to trade updates
   * 
   * @param symbol - Trading pair symbol
   * @param callback - Function called on each trade
   * @returns Subscription ID
   */
  async subscribeTrades(
    symbol: string,
    callback: TradeCallback
  ): Promise<string> {
    const stream = buildStreamName(symbol, 'trade');
    const id = this.generateSubscriptionId();

    const subscription: Subscription = {
      id,
      type: 'trade',
      symbol: symbol.toUpperCase(),
      stream,
      callback,
      createdAt: Date.now(),
    };

    this.subscriptions.set(id, subscription);
    this.logger.debug(`Subscribing to trades: ${stream} (id: ${id})`);

    // Note: Trade subscriptions need to be implemented in the main process
    // For now, we just store the subscription
    this.emit('subscribed', { id, stream, type: 'trade' });

    return id;
  }

  /**
   * Subscribe to multiple klines at once
   */
  async subscribeMultipleKlines(
    subscriptions: Array<{ symbol: string; interval: Timeframe }>,
    callback: KlineCallback
  ): Promise<string[]> {
    const ids: string[] = [];

    for (const sub of subscriptions) {
      const id = await this.subscribeKline(sub.symbol, sub.interval, callback);
      ids.push(id);
    }

    return ids;
  }

  /**
   * Unsubscribe by subscription ID
   */
  async unsubscribe(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (!subscription) {
      this.logger.warn(`Subscription not found: ${subscriptionId}`);
      return false;
    }

    this.logger.debug(`Unsubscribing: ${subscription.stream} (id: ${subscriptionId})`);

    // Unsubscribe via IPC
    if (window.bitunix && subscription.type === 'kline' && subscription.interval) {
      try {
        await window.bitunix.unsubscribe({
          symbol: subscription.symbol,
          interval: subscription.interval,
        });
      } catch (error) {
        this.logger.error('Unsubscribe error:', error);
      }
    }

    this.subscriptions.delete(subscriptionId);
    this.emit('unsubscribed', { id: subscriptionId, stream: subscription.stream });
    this.logger.info(`Unsubscribed from ${subscription.stream}`);

    return true;
  }

  /**
   * Unsubscribe from all streams
   */
  async unsubscribeAll(): Promise<void> {
    this.logger.info(`Unsubscribing from ${this.subscriptions.size} streams...`);

    // Unsubscribe via IPC
    if (window.bitunix) {
      try {
        await window.bitunix.unsubscribeAll();
      } catch (error) {
        this.logger.error('Unsubscribe all error:', error);
      }
    }

    this.subscriptions.clear();
    this.emit('unsubscribed', { all: true });
  }

  /**
   * Re-subscribe to all active subscriptions (after reconnect)
   */
  private async resubscribeAll(): Promise<void> {
    const subscriptions = Array.from(this.subscriptions.values());
    
    if (subscriptions.length === 0) {
      return;
    }

    this.logger.info(`Re-subscribing to ${subscriptions.length} streams...`);

    for (const sub of subscriptions) {
      if (sub.type === 'kline' && sub.interval && window.bitunix) {
        try {
          await window.bitunix.subscribe({
            symbol: sub.symbol,
            interval: sub.interval,
          });
          this.logger.debug(`Re-subscribed to ${sub.stream}`);
        } catch (error) {
          this.logger.error(`Failed to re-subscribe to ${sub.stream}:`, error);
        }
      }
    }
  }

  /**
   * Get active subscriptions
   */
  getSubscriptions(): Subscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Check if subscribed to a stream
   */
  isSubscribed(symbol: string, interval?: Timeframe): boolean {
    for (const sub of this.subscriptions.values()) {
      if (sub.symbol === symbol.toUpperCase()) {
        if (!interval || sub.interval === interval) {
          return true;
        }
      }
    }
    return false;
  }

  // ===========================================================================
  // Event Handling
  // ===========================================================================

  /**
   * Handle kline update from IPC
   */
  private handleKlineUpdate(data: {
    symbol: string;
    interval: Timeframe;
    kline: IpcKline;
    isFinal: boolean;
  }): void {
    this.stats.messagesReceived++;
    this.stats.lastMessageTime = Date.now();

    // Parse kline data to numeric values for charting
    const parsedKlineCandidate: ParsedKline = {
      time: Math.floor(data.kline.openTime / 1000), // Convert to seconds
      open: parseFloat(data.kline.open),
      high: parseFloat(data.kline.high),
      low: parseFloat(data.kline.low),
      close: parseFloat(data.kline.close),
      volume: parseFloat(data.kline.volume),
    };

    const parsedKline = validateKline(parsedKlineCandidate);
    if (!parsedKline) {
      this.logger.warn('Invalid WebSocket kline update dropped', data.kline);
      return;
    }

    // Emit global kline event
    this.emit('kline', {
      symbol: data.symbol,
      interval: data.interval,
      kline: parsedKline,
      raw: data.kline,
      isFinal: data.isFinal,
    });

    // Find matching subscriptions and call callbacks
    for (const sub of this.subscriptions.values()) {
      if (
        sub.type === 'kline' &&
        sub.symbol === data.symbol &&
        sub.interval === data.interval
      ) {
        try {
          (sub.callback as KlineCallback)(parsedKline, data.kline, data.isFinal);
        } catch (error) {
          this.logger.error(`Error in kline callback for ${sub.stream}:`, error);
        }
      }
    }
  }

  /**
   * Handle trade update (for future implementation)
   * @internal Reserved for when trade WebSocket is implemented in main process
   */
  // @ts-expect-error - Reserved for future use
  private handleTradeUpdate(data: WSTradeMessage): void {
    this.stats.messagesReceived++;
    this.stats.lastMessageTime = Date.now();

    const parsedTrade = this.parseTrade(data);

    // Emit global trade event
    this.emit('trade', parsedTrade);

    // Find matching subscriptions
    for (const sub of this.subscriptions.values()) {
      if (sub.type === 'trade' && sub.symbol === data.s) {
        try {
          (sub.callback as TradeCallback)(parsedTrade);
        } catch (error) {
          this.logger.error(`Error in trade callback for ${sub.stream}:`, error);
        }
      }
    }
  }

  /**
   * Parse WebSocket trade message to typed object
   */
  private parseTrade(msg: WSTradeMessage): ParsedTrade {
    const price = parseFloat(msg.p);
    const quantity = parseFloat(msg.q);
    
    return {
      id: msg.t,
      symbol: msg.s,
      price,
      quantity,
      quoteQuantity: price * quantity,
      time: msg.T,
      isBuyerMaker: msg.m,
      side: msg.m ? 'sell' : 'buy',
    };
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: WebSocketError): void {
    this.logger.error('WebSocket error:', error);
    this.emit('error', error);

    if (error.recoverable && this.config.autoReconnect) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: Error): void {
    this.clearConnectionTimeout();
    
    const wsError: WebSocketError = {
      code: 'CONNECTION_ERROR',
      message: error.message,
      timestamp: Date.now(),
      recoverable: true,
    };

    this.setStatus('error');
    this.emit('error', wsError);

    if (this.config.autoReconnect) {
      this.scheduleReconnect();
    }
  }

  // ===========================================================================
  // Connection Lifecycle
  // ===========================================================================

  /**
   * Called when connection is established
   */
  private onConnected(): void {
    this.clearConnectionTimeout();
    this.reconnectAttempts = 0;
    this.stats.connectedAt = Date.now();
    
    this.logger.info('Connected to WebSocket');
    this.emit('open', { timestamp: Date.now() });

    // Start heartbeat
    this.startHeartbeat();

    // Re-subscribe to pending subscriptions
    this.resubscribeAll();
  }

  /**
   * Called when connection is closed
   */
  private onDisconnected(): void {
    this.stopHeartbeat();
    
    this.logger.info('Disconnected from WebSocket');
    this.emit('close', { 
      timestamp: Date.now(),
      wasClean: true,
    });

    if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  // ===========================================================================
  // Reconnection Logic
  // ===========================================================================

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return; // Already scheduled
    }

    this.reconnectAttempts++;
    this.stats.reconnects++;

    if (this.reconnectAttempts > this.config.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached');
      this.setStatus('error');
      this.emit('error', {
        code: 'MAX_RECONNECT_ATTEMPTS',
        message: 'Maximum reconnection attempts reached',
        timestamp: Date.now(),
        recoverable: false,
      });
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

    this.logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    this.setStatus('reconnecting');
    this.emit('reconnecting', { 
      attempt: this.reconnectAttempts, 
      delay,
      maxAttempts: this.config.maxReconnectAttempts,
    });

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      
      try {
        // Force reconnect via IPC
        if (window.bitunix) {
          await window.bitunix.reconnect();
        }
      } catch (error) {
        this.handleConnectionError(error as Error);
      }
    }, delay);
  }

  /**
   * Stop reconnection attempts
   */
  private stopReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempts = 0;
  }

  // ===========================================================================
  // Heartbeat
  // ===========================================================================

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      // Check if we've received messages recently
      const now = Date.now();
      const lastMessage = this.stats.lastMessageTime;
      
      if (lastMessage > 0 && now - lastMessage > this.config.heartbeatInterval * 2) {
        this.logger.warn('No messages received recently, connection may be stale');
        // Could trigger reconnect here if needed
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat interval
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ===========================================================================
  // Utilities
  // ===========================================================================

  /**
   * Set connection status and emit event
   */
  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      const previousStatus = this.status;
      this.status = status;
      this.logger.debug(`Status changed: ${previousStatus} -> ${status}`);
      this.emit('status', { status, previousStatus });
    }
  }

  /**
   * Set connection timeout
   */
  private setConnectionTimeout(): void {
    this.clearConnectionTimeout();
    
    this.connectionTimeout = setTimeout(() => {
      if (this.status === 'connecting') {
        this.handleConnectionError(new Error('Connection timeout'));
      }
    }, this.config.connectionTimeout);
  }

  /**
   * Clear connection timeout
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    this.logger.info('Destroying WebSocket service...');
    
    this.stopReconnect();
    this.stopHeartbeat();
    this.clearConnectionTimeout();
    
    // Cleanup IPC listeners
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];
    
    this.subscriptions.clear();
    this.removeAllListeners();
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

/** Default WebSocket instance */
export const bitunixWS = new BitunixWebSocket({
  debug: typeof process !== 'undefined' ? process.env.NODE_ENV === 'development' : false,
});

// =============================================================================
// React Hook Helper
// =============================================================================

/**
 * Create a subscription that auto-cleans up
 * Useful for React useEffect hooks
 */
export function createKlineSubscription(
  symbol: string,
  interval: Timeframe,
  callback: KlineCallback
): () => Promise<void> {
  let subscriptionId: string | null = null;
  let mounted = true;

  // Connect and subscribe
  (async () => {
    try {
      if (!bitunixWS.isConnected()) {
        await bitunixWS.connect();
      }
      
      if (mounted) {
        subscriptionId = await bitunixWS.subscribeKline(symbol, interval, callback);
      }
    } catch (error) {
      console.error('Subscription error:', error);
    }
  })();

  // Return cleanup function
  return async () => {
    mounted = false;
    if (subscriptionId) {
      await bitunixWS.unsubscribe(subscriptionId);
    }
  };
}

/**
 * Create a status listener that auto-cleans up
 */
export function createStatusListener(callback: StatusCallback): () => void {
  return bitunixWS.on('status', (data) => {
    callback((data as { status: ConnectionStatus }).status);
  });
}

// =============================================================================
// Exports
// =============================================================================

export default BitunixWebSocket;
