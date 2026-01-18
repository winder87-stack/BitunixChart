import { UTCTimestamp } from 'lightweight-charts';

export interface NormalizedKline {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * Normalizes kline data from various sources (REST API, WebSocket, IPC) into a strict format for lightweight-charts.
 * Ensures all price/volume values are numbers, not strings.
 * 
 * @param raw Raw kline data (array or object)
 * @param isMilliseconds Whether the timestamp is in milliseconds (default: true)
 */
export function normalizeKline(raw: any, isMilliseconds = true): NormalizedKline {
  let rawTime = raw.time;
  if (rawTime === undefined) rawTime = raw.t;
  if (rawTime === undefined) rawTime = raw.openTime;
  if (rawTime === undefined && Array.isArray(raw)) rawTime = raw[0];
  
  const time = isMilliseconds 
    ? Math.floor(Number(rawTime) / 1000)
    : Number(rawTime);
    
  let open = raw.open;
  if (open === undefined) open = raw.o;
  if (open === undefined && Array.isArray(raw)) open = raw[1];
  
  let high = raw.high;
  if (high === undefined) high = raw.h;
  if (high === undefined && Array.isArray(raw)) high = raw[2];
  
  let low = raw.low;
  if (low === undefined) low = raw.l;
  if (low === undefined && Array.isArray(raw)) low = raw[3];
  
  let close = raw.close;
  if (close === undefined) close = raw.c;
  if (close === undefined && Array.isArray(raw)) close = raw[4];
  
  let volume = raw.volume;
  if (volume === undefined) volume = raw.v;
  if (volume === undefined && Array.isArray(raw)) volume = raw[5];

  return {
    time: time as UTCTimestamp,
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(volume) || undefined,
  };
}

/**
 * Validates that a kline has valid finite numbers and logical price action.
 * 
 * A valid kline must satisfy:
 * - All OHLC values are finite positive numbers
 * - High >= max(open, close) - high must be at or above both open and close
 * - Low <= min(open, close) - low must be at or below both open and close
 * - High >= Low - basic sanity check
 */
export function isValidKline(k: NormalizedKline): boolean {
  // Check all values are finite positive numbers
  if (!Number.isFinite(k.time) || k.time <= 0) return false;
  if (!Number.isFinite(k.open) || k.open <= 0) return false;
  if (!Number.isFinite(k.high) || k.high <= 0) return false;
  if (!Number.isFinite(k.low) || k.low <= 0) return false;
  if (!Number.isFinite(k.close) || k.close <= 0) return false;
  
  // Validate logical price relationships
  // High must be >= both open and close (the highest price in the period)
  if (k.high < Math.max(k.open, k.close)) return false;
  
  // Low must be <= both open and close (the lowest price in the period)
  if (k.low > Math.min(k.open, k.close)) return false;
  
  // High must be >= Low (basic sanity)
  if (k.high < k.low) return false;
  
  return true;
}
