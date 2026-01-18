import {
  BitunixTicker24h,
  RawKlineArray,
  ParsedKline,
  WSMessage,
  WSKlineMessage,
  WSTicker24hMessage,
  WSBookTickerMessage,
  SymbolInfo
} from '../../types/bitunix';

const LOG_PREFIX = '[Validator]';

function isValidNumber(val: number, requirePositive = false): boolean {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) return false;
  if (requirePositive && val < 0) return false;
  return true;
}

function isValidStringNumber(val: string, requirePositive = false): boolean {
  if (typeof val !== 'string' || val.trim() === '') return false;
  const num = parseFloat(val);
  return isValidNumber(num, requirePositive);
}

/**
 * Validates a ParsedKline object structure and values
 */
export function validateKline(kline: unknown): ParsedKline | null {
  if (!kline || typeof kline !== 'object') {
    console.warn(`${LOG_PREFIX} Invalid kline data: not an object`, kline);
    return null;
  }

  const k = kline as ParsedKline;

  if (!isValidNumber(k.time)) {
    console.warn(`${LOG_PREFIX} Invalid kline time`, k);
    return null;
  }
  if (!isValidNumber(k.open)) {
    console.warn(`${LOG_PREFIX} Invalid kline open`, k);
    return null;
  }
  if (!isValidNumber(k.high)) {
    console.warn(`${LOG_PREFIX} Invalid kline high`, k);
    return null;
  }
  if (!isValidNumber(k.low)) {
    console.warn(`${LOG_PREFIX} Invalid kline low`, k);
    return null;
  }
  if (!isValidNumber(k.close)) {
    console.warn(`${LOG_PREFIX} Invalid kline close`, k);
    return null;
  }
  if (!isValidNumber(k.volume, true)) {
    console.warn(`${LOG_PREFIX} Invalid kline volume`, k);
    return null;
  }

  if (k.high < k.low) {
    console.warn(`${LOG_PREFIX} Kline high < low`, k);
    return null;
  }
  
  return k;
}

/**
 * Validates a RawKlineArray from REST API
 */
export function validateRawKlineArray(data: unknown): RawKlineArray | null {
  if (!Array.isArray(data) || data.length < 6) {
    console.warn(`${LOG_PREFIX} Invalid raw kline array`, data);
    return null;
  }

  const [time, open, high, low, close, vol] = data;

  if (!isValidNumber(time as number)) {
     console.warn(`${LOG_PREFIX} Invalid raw kline time`, data);
     return null;
  }
  if (!isValidStringNumber(open as string)) {
    console.warn(`${LOG_PREFIX} Invalid raw kline open`, data);
    return null;
  }
  if (!isValidStringNumber(high as string)) {
    console.warn(`${LOG_PREFIX} Invalid raw kline high`, data);
    return null;
  }
  if (!isValidStringNumber(low as string)) {
    console.warn(`${LOG_PREFIX} Invalid raw kline low`, data);
    return null;
  }
  if (!isValidStringNumber(close as string)) {
    console.warn(`${LOG_PREFIX} Invalid raw kline close`, data);
    return null;
  }
  if (!isValidStringNumber(vol as string, true)) {
    console.warn(`${LOG_PREFIX} Invalid raw kline volume`, data);
    return null;
  }

  return data as RawKlineArray;
}

/**
 * Validates Symbol Information structure
 */
export function validateSymbol(symbol: unknown): SymbolInfo | null {
  if (!symbol || typeof symbol !== 'object') {
    console.warn(`${LOG_PREFIX} Invalid symbol data`, symbol);
    return null;
  }

  const s = symbol as SymbolInfo;

  if (typeof s.symbol !== 'string' || !s.symbol) {
    console.warn(`${LOG_PREFIX} Invalid symbol name`, s);
    return null;
  }
  if (typeof s.baseAsset !== 'string') {
    console.warn(`${LOG_PREFIX} Invalid base asset`, s);
    return null;
  }
  if (typeof s.quoteAsset !== 'string') {
    console.warn(`${LOG_PREFIX} Invalid quote asset`, s);
    return null;
  }
  
  if (!isValidNumber(s.pricePrecision, true) || !Number.isInteger(s.pricePrecision)) {
    console.warn(`${LOG_PREFIX} Invalid price precision`, s);
    return null;
  }
  if (!isValidNumber(s.quantityPrecision, true) || !Number.isInteger(s.quantityPrecision)) {
    console.warn(`${LOG_PREFIX} Invalid quantity precision`, s);
    return null;
  }

  if (!isValidStringNumber(s.tickSize, true)) {
     console.warn(`${LOG_PREFIX} Invalid tick size`, s);
     return null;
  }
  if (!isValidStringNumber(s.minQty, true)) {
     console.warn(`${LOG_PREFIX} Invalid min qty`, s);
     return null;
  }

  return s;
}

/**
 * Validates Ticker Data structure and values
 */
export function validateTicker(ticker: unknown): BitunixTicker24h | null {
  if (!ticker || typeof ticker !== 'object') {
    console.warn(`${LOG_PREFIX} Invalid ticker object`, ticker);
    return null;
  }

  const t = ticker as BitunixTicker24h;

  if (!t.symbol || typeof t.symbol !== 'string') {
    console.warn(`${LOG_PREFIX} Invalid ticker symbol`, t);
    return null;
  }

  if (!isValidStringNumber(t.lastPrice)) {
     console.warn(`${LOG_PREFIX} Invalid ticker lastPrice`, t);
     return null;
  }
  if (!isValidStringNumber(t.openPrice)) {
     console.warn(`${LOG_PREFIX} Invalid ticker openPrice`, t);
     return null;
  }
  if (!isValidStringNumber(t.highPrice)) {
     console.warn(`${LOG_PREFIX} Invalid ticker highPrice`, t);
     return null;
  }
  if (!isValidStringNumber(t.lowPrice)) {
     console.warn(`${LOG_PREFIX} Invalid ticker lowPrice`, t);
     return null;
  }
  if (!isValidStringNumber(t.volume, true)) {
     console.warn(`${LOG_PREFIX} Invalid ticker volume`, t);
     return null;
  }
  
  const high = parseFloat(t.highPrice);
  const low = parseFloat(t.lowPrice);
  if (high < low) {
    console.warn(`${LOG_PREFIX} Ticker high < low`, t);
    return null;
  }

  return t;
}

/**
 * Validates WebSocket Message structure
 */
export function validateWebSocketMessage(msg: unknown): WSMessage | null {
  if (!msg || typeof msg !== 'object') {
    return null;
  }

  const m = msg as any;
  if (!m.e) {
    if (m.id || m.code || m.result !== undefined) return m as WSMessage; 
    return null; 
  }

  switch (m.e) {
    case 'kline':
      return validateWSKlineMessage(m);
    case '24hrTicker':
      return validateWSTickerMessage(m);
    case 'bookTicker':
       return m as WSBookTickerMessage; 
    case 'trade':
    case 'aggTrade':
    case 'depthUpdate':
      return m as WSMessage;
    default:
      console.warn(`${LOG_PREFIX} Unknown WS event type: ${m.e}`);
      return m as WSMessage;
  }
}

function validateWSKlineMessage(msg: any): WSKlineMessage | null {
  if (!msg.k || typeof msg.k !== 'object') {
     console.warn(`${LOG_PREFIX} Invalid WS kline structure`, msg);
     return null;
  }
  const k = msg.k;
  
  if (!isValidStringNumber(k.o) || !isValidStringNumber(k.c) || 
      !isValidStringNumber(k.h) || !isValidStringNumber(k.l) || 
      !isValidStringNumber(k.v, true)) {
      console.warn(`${LOG_PREFIX} Invalid WS kline data values`, k);
      return null;
  }
  
  return msg as WSKlineMessage;
}

function validateWSTickerMessage(msg: any): WSTicker24hMessage | null {
  if (!isValidStringNumber(msg.c) || !isValidStringNumber(msg.o) ||
      !isValidStringNumber(msg.h) || !isValidStringNumber(msg.l) ||
      !isValidStringNumber(msg.v, true)) {
      console.warn(`${LOG_PREFIX} Invalid WS ticker data values`, msg);
      return null;
  }
  return msg as WSTicker24hMessage;
}
