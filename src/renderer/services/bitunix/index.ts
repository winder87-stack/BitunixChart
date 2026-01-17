/**
 * Bitunix API Service Module
 * 
 * Provides unified access to Bitunix exchange REST and WebSocket APIs.
 */

// API Service
export { 
  BitunixAPI, 
  bitunixApi,
  getSymbols,
  getKlines,
  get24hrTicker,
  getParsedKlines,
} from './api';

// WebSocket Service
export {
  BitunixWebSocket,
  bitunixWS,
  createKlineSubscription,
  createStatusListener,
  type ConnectionStatus,
  type SubscriptionType,
  type KlineCallback,
  type TradeCallback,
  type MessageCallback,
  type ErrorCallback,
  type StatusCallback,
  type ParsedTrade,
  type Subscription,
  type WebSocketError,
  type WebSocketConfig,
  type WebSocketEvent,
} from './websocket';

// Re-export types for convenience
export type {
  Timeframe,
  BitunixSymbol,
  BitunixKline,
  BitunixTicker24h,
  SymbolInfo,
  ParsedKline,
  VolumeData,
  BitunixOrderBook,
  BitunixTrade,
  WSKlineMessage,
  WSTradeMessage,
  WSDepthMessage,
  WSKlineData,
} from '../../types/bitunix';

// Re-export utility functions
export {
  parseRawKline,
  parseKlineForChart,
  parseWSKline,
  createVolumeData,
  buildStreamName,
  parseStreamName,
  extractSymbolInfo,
  calculateSpread,
  isKlineMessage,
  isTradeMessage,
  isDepthMessage,
  isTickerMessage,
  TIMEFRAME_CONFIG,
  TIMEFRAMES,
} from '../../types/bitunix';
