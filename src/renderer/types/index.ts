// =============================================================================
// Re-export types from preload for renderer use
// =============================================================================

// Re-export all Bitunix API types
export * from './bitunix';

// Re-export all Indicator types
export * from './indicators';

// Time intervals for candlestick data (simplified version)
export type TimeInterval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '12h' | '1d' | '1w' | '1M';

// WebSocket connection status
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'error';

// Candlestick/Kline data structure
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

// Parsed kline for chart rendering (numeric values)
export interface ParsedKline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Trading symbol information
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

// 24hr ticker statistics
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

// Real-time kline update from WebSocket
export interface KlineUpdate {
  symbol: string;
  interval: TimeInterval;
  kline: Kline;
  isFinal: boolean;
}

// Subscription parameters
export interface SubscriptionParams {
  symbol: string;
  interval: TimeInterval;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: number;
}

// System information for status bar
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

// =============================================================================
// Chart Types
// =============================================================================

// Chart type options
export type ChartType = 'candlestick' | 'line' | 'area' | 'bar';

// Chart state (uses IndicatorConfig from indicators.ts)
import type { IndicatorConfig } from './indicators';

export interface ChartState {
  symbol: string;
  interval: TimeInterval;
  chartType: ChartType;
  indicators: IndicatorConfig[];
  showVolume: boolean;
  autoScale: boolean;
}

// =============================================================================
// UI Types
// =============================================================================

// Theme colors
export interface ThemeColors {
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  surface: {
    primary: string;
    secondary: string;
    hover: string;
  };
  accent: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  chart: {
    up: string;
    down: string;
    volume: string;
  };
}

// Toast notification
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Parse raw kline data to numeric values for charting
 */
export function parseKline(kline: Kline): ParsedKline {
  return {
    time: kline.openTime / 1000, // Convert to seconds for lightweight-charts
    open: parseFloat(kline.open),
    high: parseFloat(kline.high),
    low: parseFloat(kline.low),
    close: parseFloat(kline.close),
    volume: parseFloat(kline.volume),
  };
}

/**
 * Parse array of klines
 */
export function parseKlines(klines: Kline[]): ParsedKline[] {
  return klines.map(parseKline);
}

/**
 * Format price with appropriate precision
 */
export function formatPrice(price: number | string, precision = 2): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (numPrice >= 1000) {
    return numPrice.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }
  return numPrice.toFixed(precision);
}

/**
 * Format volume with K/M/B suffixes
 */
export function formatVolume(volume: number | string): string {
  const numVolume = typeof volume === 'string' ? parseFloat(volume) : volume;
  if (numVolume >= 1_000_000_000) {
    return (numVolume / 1_000_000_000).toFixed(2) + 'B';
  }
  if (numVolume >= 1_000_000) {
    return (numVolume / 1_000_000).toFixed(2) + 'M';
  }
  if (numVolume >= 1_000) {
    return (numVolume / 1_000).toFixed(2) + 'K';
  }
  return numVolume.toFixed(2);
}

/**
 * Format percentage change
 */
export function formatPercentage(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const sign = numValue >= 0 ? '+' : '';
  return `${sign}${numValue.toFixed(2)}%`;
}

/**
 * Get interval display label
 */
export function getIntervalLabel(interval: TimeInterval): string {
  const labels: Record<TimeInterval, string> = {
    '1m': '1 Min',
    '3m': '3 Min',
    '5m': '5 Min',
    '15m': '15 Min',
    '30m': '30 Min',
    '1h': '1 Hour',
    '2h': '2 Hour',
    '4h': '4 Hour',
    '6h': '6 Hour',
    '12h': '12 Hour',
    '1d': '1 Day',
    '1w': '1 Week',
    '1M': '1 Month',
  };
  return labels[interval];
}

/**
 * Calculate price change direction
 */
export function getPriceDirection(current: number, previous: number): 'up' | 'down' | 'neutral' {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'neutral';
}
