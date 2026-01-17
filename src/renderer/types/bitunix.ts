// =============================================================================
// Bitunix API Type Definitions
// Based on Binance-style API format
// =============================================================================

// =============================================================================
// Timeframe / Interval Types
// =============================================================================

/**
 * Available timeframes for candlestick data
 */
export type Timeframe =
  | '1m'   // 1 minute
  | '3m'   // 3 minutes
  | '5m'   // 5 minutes
  | '15m'  // 15 minutes
  | '30m'  // 30 minutes
  | '1h'   // 1 hour
  | '2h'   // 2 hours
  | '4h'   // 4 hours
  | '6h'   // 6 hours
  | '12h'  // 12 hours
  | '1d'   // 1 day
  | '1w'   // 1 week
  | '1M';  // 1 month

/**
 * Timeframe configuration with duration in milliseconds
 */
export interface TimeframeConfig {
  label: string;
  shortLabel: string;
  milliseconds: number;
}

/**
 * Timeframe configurations map
 */
export const TIMEFRAME_CONFIG: Record<Timeframe, TimeframeConfig> = {
  '1m':  { label: '1 Minute',   shortLabel: '1m',  milliseconds: 60 * 1000 },
  '3m':  { label: '3 Minutes',  shortLabel: '3m',  milliseconds: 3 * 60 * 1000 },
  '5m':  { label: '5 Minutes',  shortLabel: '5m',  milliseconds: 5 * 60 * 1000 },
  '15m': { label: '15 Minutes', shortLabel: '15m', milliseconds: 15 * 60 * 1000 },
  '30m': { label: '30 Minutes', shortLabel: '30m', milliseconds: 30 * 60 * 1000 },
  '1h':  { label: '1 Hour',     shortLabel: '1H',  milliseconds: 60 * 60 * 1000 },
  '2h':  { label: '2 Hours',    shortLabel: '2H',  milliseconds: 2 * 60 * 60 * 1000 },
  '4h':  { label: '4 Hours',    shortLabel: '4H',  milliseconds: 4 * 60 * 60 * 1000 },
  '6h':  { label: '6 Hours',    shortLabel: '6H',  milliseconds: 6 * 60 * 60 * 1000 },
  '12h': { label: '12 Hours',   shortLabel: '12H', milliseconds: 12 * 60 * 60 * 1000 },
  '1d':  { label: '1 Day',      shortLabel: '1D',  milliseconds: 24 * 60 * 60 * 1000 },
  '1w':  { label: '1 Week',     shortLabel: '1W',  milliseconds: 7 * 24 * 60 * 60 * 1000 },
  '1M':  { label: '1 Month',    shortLabel: '1M',  milliseconds: 30 * 24 * 60 * 60 * 1000 },
};

/**
 * All available timeframes as array
 */
export const TIMEFRAMES: Timeframe[] = [
  '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '1w', '1M'
];

// =============================================================================
// Symbol / Trading Pair Types
// =============================================================================

/**
 * Symbol status
 */
export type SymbolStatus = 'TRADING' | 'HALT' | 'BREAK' | 'PENDING';

/**
 * Order type
 */
export type OrderType = 
  | 'LIMIT'
  | 'MARKET'
  | 'STOP_LOSS'
  | 'STOP_LOSS_LIMIT'
  | 'TAKE_PROFIT'
  | 'TAKE_PROFIT_LIMIT'
  | 'LIMIT_MAKER';

/**
 * Symbol filter types
 */
export type FilterType = 
  | 'PRICE_FILTER'
  | 'LOT_SIZE'
  | 'MIN_NOTIONAL'
  | 'MAX_NUM_ORDERS'
  | 'PERCENT_PRICE';

/**
 * Price filter
 */
export interface PriceFilter {
  filterType: 'PRICE_FILTER';
  minPrice: string;
  maxPrice: string;
  tickSize: string;
}

/**
 * Lot size filter
 */
export interface LotSizeFilter {
  filterType: 'LOT_SIZE';
  minQty: string;
  maxQty: string;
  stepSize: string;
}

/**
 * Minimum notional filter
 */
export interface MinNotionalFilter {
  filterType: 'MIN_NOTIONAL';
  minNotional: string;
  applyToMarket: boolean;
  avgPriceMins: number;
}

/**
 * Max orders filter
 */
export interface MaxNumOrdersFilter {
  filterType: 'MAX_NUM_ORDERS';
  maxNumOrders: number;
}

/**
 * Percent price filter
 */
export interface PercentPriceFilter {
  filterType: 'PERCENT_PRICE';
  multiplierUp: string;
  multiplierDown: string;
  avgPriceMins: number;
}

/**
 * Union type for all filters
 */
export type SymbolFilter = 
  | PriceFilter 
  | LotSizeFilter 
  | MinNotionalFilter 
  | MaxNumOrdersFilter 
  | PercentPriceFilter;

/**
 * Trading pair / Symbol information
 */
export interface BitunixSymbol {
  /** Trading pair symbol (e.g., "BTCUSDT") */
  symbol: string;
  
  /** Base asset (e.g., "BTC") */
  baseAsset: string;
  
  /** Quote asset (e.g., "USDT") */
  quoteAsset: string;
  
  /** Base asset precision (decimal places) */
  baseAssetPrecision: number;
  
  /** Quote asset precision (decimal places) */
  quoteAssetPrecision: number;
  
  /** Price precision for display */
  pricePrecision: number;
  
  /** Quantity precision for orders */
  quantityPrecision: number;
  
  /** Trading status */
  status: SymbolStatus;
  
  /** Allowed order types */
  orderTypes: OrderType[];
  
  /** Whether iceberg orders are allowed */
  icebergAllowed: boolean;
  
  /** Whether OCO orders are allowed */
  ocoAllowed: boolean;
  
  /** Whether spot trading is allowed */
  isSpotTradingAllowed: boolean;
  
  /** Whether margin trading is allowed */
  isMarginTradingAllowed: boolean;
  
  /** Symbol filters (price, lot size, etc.) */
  filters: SymbolFilter[];
  
  /** Permissions (SPOT, MARGIN, etc.) */
  permissions: string[];
}

/**
 * Simplified symbol info for UI display
 */
export interface SymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  tickSize: string;
  minQty: string;
  maxQty: string;
  minNotional: string;
  status: SymbolStatus;
}

// =============================================================================
// Kline / Candlestick Types
// =============================================================================

/**
 * Raw kline data from REST API (array format)
 * [openTime, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBase, takerBuyQuote, ignore]
 */
export type RawKlineArray = [
  number,  // 0: Open time (timestamp)
  string,  // 1: Open price
  string,  // 2: High price
  string,  // 3: Low price
  string,  // 4: Close price
  string,  // 5: Volume (base asset)
  number,  // 6: Close time (timestamp)
  string,  // 7: Quote asset volume
  number,  // 8: Number of trades
  string,  // 9: Taker buy base asset volume
  string,  // 10: Taker buy quote asset volume
  string   // 11: Ignore
];

/**
 * Kline/Candlestick data (object format)
 */
export interface BitunixKline {
  /** Kline open time (Unix timestamp in milliseconds) */
  openTime: number;
  
  /** Open price */
  open: string;
  
  /** Highest price */
  high: string;
  
  /** Lowest price */
  low: string;
  
  /** Close price */
  close: string;
  
  /** Volume in base asset */
  volume: string;
  
  /** Kline close time (Unix timestamp in milliseconds) */
  closeTime: number;
  
  /** Volume in quote asset */
  quoteVolume: string;
  
  /** Number of trades */
  trades: number;
  
  /** Taker buy volume in base asset */
  takerBuyBaseVolume: string;
  
  /** Taker buy volume in quote asset */
  takerBuyQuoteVolume: string;
}

/**
 * Parsed kline with numeric values for charting
 */
export interface ParsedKline {
  /** Time in seconds (for lightweight-charts) */
  time: number;
  
  /** Open price */
  open: number;
  
  /** High price */
  high: number;
  
  /** Low price */
  low: number;
  
  /** Close price */
  close: number;
  
  /** Volume */
  volume: number;
}

/**
 * Volume bar data for charting
 */
export interface VolumeData {
  /** Time in seconds */
  time: number;
  
  /** Volume value */
  value: number;
  
  /** Bar color based on price direction */
  color: string;
}

// =============================================================================
// Ticker Types
// =============================================================================

/**
 * 24hr ticker price change statistics
 */
export interface BitunixTicker24h {
  /** Symbol */
  symbol: string;
  
  /** Price change */
  priceChange: string;
  
  /** Price change percent */
  priceChangePercent: string;
  
  /** Weighted average price */
  weightedAvgPrice: string;
  
  /** Previous close price */
  prevClosePrice: string;
  
  /** Last price */
  lastPrice: string;
  
  /** Last quantity */
  lastQty: string;
  
  /** Best bid price */
  bidPrice: string;
  
  /** Best bid quantity */
  bidQty: string;
  
  /** Best ask price */
  askPrice: string;
  
  /** Best ask quantity */
  askQty: string;
  
  /** Open price */
  openPrice: string;
  
  /** High price */
  highPrice: string;
  
  /** Low price */
  lowPrice: string;
  
  /** Total traded base asset volume */
  volume: string;
  
  /** Total traded quote asset volume */
  quoteVolume: string;
  
  /** Statistics open time */
  openTime: number;
  
  /** Statistics close time */
  closeTime: number;
  
  /** First trade ID */
  firstId: number;
  
  /** Last trade ID */
  lastId: number;
  
  /** Total number of trades */
  count: number;
}

/**
 * Mini ticker (lightweight version)
 */
export interface BitunixMiniTicker {
  /** Event type */
  e: '24hrMiniTicker';
  
  /** Event time */
  E: number;
  
  /** Symbol */
  s: string;
  
  /** Close price */
  c: string;
  
  /** Open price */
  o: string;
  
  /** High price */
  h: string;
  
  /** Low price */
  l: string;
  
  /** Total traded base asset volume */
  v: string;
  
  /** Total traded quote asset volume */
  q: string;
}

/**
 * Book ticker (best bid/ask)
 */
export interface BitunixBookTicker {
  /** Symbol */
  symbol: string;
  
  /** Best bid price */
  bidPrice: string;
  
  /** Best bid quantity */
  bidQty: string;
  
  /** Best ask price */
  askPrice: string;
  
  /** Best ask quantity */
  askQty: string;
}

// =============================================================================
// Trade Types
// =============================================================================

/**
 * Trade side
 */
export type TradeSide = 'BUY' | 'SELL';

/**
 * Individual trade
 */
export interface BitunixTrade {
  /** Trade ID */
  id: number;
  
  /** Price */
  price: string;
  
  /** Quantity */
  qty: string;
  
  /** Quote quantity */
  quoteQty: string;
  
  /** Trade time */
  time: number;
  
  /** Is buyer the maker */
  isBuyerMaker: boolean;
  
  /** Is best match */
  isBestMatch: boolean;
}

/**
 * Aggregated trade
 */
export interface BitunixAggTrade {
  /** Aggregate trade ID */
  a: number;
  
  /** Price */
  p: string;
  
  /** Quantity */
  q: string;
  
  /** First trade ID */
  f: number;
  
  /** Last trade ID */
  l: number;
  
  /** Timestamp */
  T: number;
  
  /** Is buyer the maker */
  m: boolean;
  
  /** Best price match */
  M: boolean;
}

// =============================================================================
// Order Book Types
// =============================================================================

/**
 * Price level [price, quantity]
 */
export type PriceLevel = [string, string];

/**
 * Order book depth
 */
export interface BitunixOrderBook {
  /** Last update ID */
  lastUpdateId: number;
  
  /** Bid levels [price, quantity] */
  bids: PriceLevel[];
  
  /** Ask levels [price, quantity] */
  asks: PriceLevel[];
}

/**
 * Parsed order book level
 */
export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
  percentage: number;
}

/**
 * Parsed order book
 */
export interface ParsedOrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPercent: number;
  midPrice: number;
}

// =============================================================================
// WebSocket Message Types
// =============================================================================

/**
 * WebSocket subscription methods
 */
export type WSMethod = 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'LIST_SUBSCRIPTIONS' | 'SET_PROPERTY';

/**
 * WebSocket stream types
 */
export type WSStreamType = 
  | 'kline'
  | 'trade'
  | 'aggTrade'
  | 'depth'
  | 'depth5'
  | 'depth10'
  | 'depth20'
  | 'ticker'
  | 'miniTicker'
  | 'bookTicker';

/**
 * Subscription request message
 */
export interface WSSubscribeRequest {
  /** Request method */
  method: 'SUBSCRIBE';
  
  /** Streams to subscribe (e.g., ["btcusdt@kline_1m"]) */
  params: string[];
  
  /** Request ID */
  id: number;
}

/**
 * Unsubscription request message
 */
export interface WSUnsubscribeRequest {
  /** Request method */
  method: 'UNSUBSCRIBE';
  
  /** Streams to unsubscribe */
  params: string[];
  
  /** Request ID */
  id: number;
}

/**
 * List subscriptions request
 */
export interface WSListSubscriptionsRequest {
  method: 'LIST_SUBSCRIPTIONS';
  id: number;
}

/**
 * Subscription response
 */
export interface WSSubscribeResponse {
  /** Result (null on success) */
  result: null | string[];
  
  /** Request ID */
  id: number;
}

/**
 * Error response
 */
export interface WSErrorResponse {
  /** Error code */
  code: number;
  
  /** Error message */
  msg: string;
  
  /** Request ID */
  id?: number;
}

// =============================================================================
// WebSocket Kline Update
// =============================================================================

/**
 * Kline data in WebSocket message
 */
export interface WSKlineData {
  /** Kline start time */
  t: number;
  
  /** Kline close time */
  T: number;
  
  /** Symbol */
  s: string;
  
  /** Interval */
  i: Timeframe;
  
  /** First trade ID */
  f: number;
  
  /** Last trade ID */
  L: number;
  
  /** Open price */
  o: string;
  
  /** Close price */
  c: string;
  
  /** High price */
  h: string;
  
  /** Low price */
  l: string;
  
  /** Base asset volume */
  v: string;
  
  /** Number of trades */
  n: number;
  
  /** Is this kline closed? */
  x: boolean;
  
  /** Quote asset volume */
  q: string;
  
  /** Taker buy base asset volume */
  V: string;
  
  /** Taker buy quote asset volume */
  Q: string;
  
  /** Ignore */
  B: string;
}

/**
 * WebSocket kline update message
 */
export interface WSKlineMessage {
  /** Event type */
  e: 'kline';
  
  /** Event time */
  E: number;
  
  /** Symbol */
  s: string;
  
  /** Kline data */
  k: WSKlineData;
}

// =============================================================================
// WebSocket Trade Update
// =============================================================================

/**
 * WebSocket trade message
 */
export interface WSTradeMessage {
  /** Event type */
  e: 'trade';
  
  /** Event time */
  E: number;
  
  /** Symbol */
  s: string;
  
  /** Trade ID */
  t: number;
  
  /** Price */
  p: string;
  
  /** Quantity */
  q: string;
  
  /** Buyer order ID */
  b: number;
  
  /** Seller order ID */
  a: number;
  
  /** Trade time */
  T: number;
  
  /** Is the buyer the market maker? */
  m: boolean;
  
  /** Ignore */
  M: boolean;
}

/**
 * WebSocket aggregated trade message
 */
export interface WSAggTradeMessage {
  /** Event type */
  e: 'aggTrade';
  
  /** Event time */
  E: number;
  
  /** Symbol */
  s: string;
  
  /** Aggregate trade ID */
  a: number;
  
  /** Price */
  p: string;
  
  /** Quantity */
  q: string;
  
  /** First trade ID */
  f: number;
  
  /** Last trade ID */
  l: number;
  
  /** Trade time */
  T: number;
  
  /** Is the buyer the market maker? */
  m: boolean;
  
  /** Ignore */
  M: boolean;
}

// =============================================================================
// WebSocket Order Book Updates
// =============================================================================

/**
 * WebSocket depth update message
 */
export interface WSDepthMessage {
  /** Event type */
  e: 'depthUpdate';
  
  /** Event time */
  E: number;
  
  /** Symbol */
  s: string;
  
  /** First update ID */
  U: number;
  
  /** Final update ID */
  u: number;
  
  /** Bids to update [price, quantity] */
  b: PriceLevel[];
  
  /** Asks to update [price, quantity] */
  a: PriceLevel[];
}

/**
 * Partial book depth stream
 */
export interface WSPartialDepthMessage {
  /** Last update ID */
  lastUpdateId: number;
  
  /** Bids [price, quantity] */
  bids: PriceLevel[];
  
  /** Asks [price, quantity] */
  asks: PriceLevel[];
}

// =============================================================================
// WebSocket Ticker Updates
// =============================================================================

/**
 * WebSocket 24hr ticker message
 */
export interface WSTicker24hMessage {
  /** Event type */
  e: '24hrTicker';
  
  /** Event time */
  E: number;
  
  /** Symbol */
  s: string;
  
  /** Price change */
  p: string;
  
  /** Price change percent */
  P: string;
  
  /** Weighted average price */
  w: string;
  
  /** Previous day's close price */
  x: string;
  
  /** Current day's close price */
  c: string;
  
  /** Close trade's quantity */
  Q: string;
  
  /** Best bid price */
  b: string;
  
  /** Best bid quantity */
  B: string;
  
  /** Best ask price */
  a: string;
  
  /** Best ask quantity */
  A: string;
  
  /** Open price */
  o: string;
  
  /** High price */
  h: string;
  
  /** Low price */
  l: string;
  
  /** Total traded base asset volume */
  v: string;
  
  /** Total traded quote asset volume */
  q: string;
  
  /** Statistics open time */
  O: number;
  
  /** Statistics close time */
  C: number;
  
  /** First trade ID */
  F: number;
  
  /** Last trade ID */
  L: number;
  
  /** Total number of trades */
  n: number;
}

/**
 * WebSocket book ticker message
 */
export interface WSBookTickerMessage {
  /** Update ID */
  u: number;
  
  /** Symbol */
  s: string;
  
  /** Best bid price */
  b: string;
  
  /** Best bid quantity */
  B: string;
  
  /** Best ask price */
  a: string;
  
  /** Best ask quantity */
  A: string;
}

// =============================================================================
// Union Types for WebSocket Messages
// =============================================================================

/**
 * All WebSocket request types
 */
export type WSRequest = 
  | WSSubscribeRequest 
  | WSUnsubscribeRequest 
  | WSListSubscriptionsRequest;

/**
 * All WebSocket message types
 */
export type WSMessage = 
  | WSKlineMessage 
  | WSTradeMessage 
  | WSAggTradeMessage 
  | WSDepthMessage 
  | WSPartialDepthMessage
  | WSTicker24hMessage 
  | WSBookTickerMessage
  | BitunixMiniTicker;

// =============================================================================
// REST API Response Types
// =============================================================================

/**
 * Base API response structure
 */
export interface ApiResponseBase {
  /** Response code (0 = success) */
  code: number;
  
  /** Response message */
  msg: string;
  
  /** Response timestamp */
  timestamp?: number;
}

/**
 * Generic API response with data
 */
export interface ApiResponse<T> extends ApiResponseBase {
  /** Response data */
  data: T;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> extends ApiResponseBase {
  /** Response data */
  data: T[];
  
  /** Total count */
  total: number;
  
  /** Current page */
  page: number;
  
  /** Page size */
  pageSize: number;
}

/**
 * Exchange info response
 */
export interface ExchangeInfoResponse {
  /** Server timezone */
  timezone: string;
  
  /** Server time */
  serverTime: number;
  
  /** Rate limits */
  rateLimits: RateLimit[];
  
  /** Exchange filters */
  exchangeFilters: unknown[];
  
  /** Available symbols */
  symbols: BitunixSymbol[];
}

/**
 * Rate limit info
 */
export interface RateLimit {
  /** Rate limit type */
  rateLimitType: 'REQUEST_WEIGHT' | 'ORDERS' | 'RAW_REQUESTS';
  
  /** Interval */
  interval: 'SECOND' | 'MINUTE' | 'DAY';
  
  /** Interval number */
  intervalNum: number;
  
  /** Limit */
  limit: number;
}

/**
 * Server time response
 */
export interface ServerTimeResponse {
  serverTime: number;
}

/**
 * Klines response (array of arrays)
 */
export type KlinesResponse = RawKlineArray[];

/**
 * Recent trades response
 */
export type RecentTradesResponse = BitunixTrade[];

/**
 * Order book response
 */
export type OrderBookResponse = BitunixOrderBook;

/**
 * 24hr ticker response (single)
 */
export type TickerResponse = BitunixTicker24h;

/**
 * 24hr ticker response (all symbols)
 */
export type AllTickersResponse = BitunixTicker24h[];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Parse raw kline array to object format
 */
export function parseRawKline(raw: RawKlineArray): BitunixKline {
  return {
    openTime: raw[0],
    open: raw[1],
    high: raw[2],
    low: raw[3],
    close: raw[4],
    volume: raw[5],
    closeTime: raw[6],
    quoteVolume: raw[7],
    trades: raw[8],
    takerBuyBaseVolume: raw[9],
    takerBuyQuoteVolume: raw[10],
  };
}

/**
 * Parse kline to chart-ready format
 */
export function parseKlineForChart(kline: BitunixKline): ParsedKline {
  return {
    time: Math.floor(kline.openTime / 1000), // Convert to seconds
    open: parseFloat(kline.open),
    high: parseFloat(kline.high),
    low: parseFloat(kline.low),
    close: parseFloat(kline.close),
    volume: parseFloat(kline.volume),
  };
}

/**
 * Parse WebSocket kline data to chart format
 */
export function parseWSKline(wsKline: WSKlineData): ParsedKline {
  return {
    time: Math.floor(wsKline.t / 1000),
    open: parseFloat(wsKline.o),
    high: parseFloat(wsKline.h),
    low: parseFloat(wsKline.l),
    close: parseFloat(wsKline.c),
    volume: parseFloat(wsKline.v),
  };
}

/**
 * Create volume data from parsed kline
 */
export function createVolumeData(
  kline: ParsedKline, 
  upColor = 'rgba(34, 197, 94, 0.5)', 
  downColor = 'rgba(239, 68, 68, 0.5)'
): VolumeData {
  return {
    time: kline.time,
    value: kline.volume,
    color: kline.close >= kline.open ? upColor : downColor,
  };
}

/**
 * Build WebSocket stream name
 */
export function buildStreamName(
  symbol: string, 
  streamType: WSStreamType, 
  interval?: Timeframe
): string {
  const lowerSymbol = symbol.toLowerCase();
  
  switch (streamType) {
    case 'kline':
      if (!interval) throw new Error('Interval required for kline stream');
      return `${lowerSymbol}@kline_${interval}`;
    case 'trade':
      return `${lowerSymbol}@trade`;
    case 'aggTrade':
      return `${lowerSymbol}@aggTrade`;
    case 'depth':
      return `${lowerSymbol}@depth`;
    case 'depth5':
      return `${lowerSymbol}@depth5`;
    case 'depth10':
      return `${lowerSymbol}@depth10`;
    case 'depth20':
      return `${lowerSymbol}@depth20`;
    case 'ticker':
      return `${lowerSymbol}@ticker`;
    case 'miniTicker':
      return `${lowerSymbol}@miniTicker`;
    case 'bookTicker':
      return `${lowerSymbol}@bookTicker`;
    default:
      throw new Error(`Unknown stream type: ${streamType}`);
  }
}

/**
 * Parse stream name to components
 */
export function parseStreamName(stream: string): {
  symbol: string;
  streamType: WSStreamType;
  interval?: Timeframe;
} {
  const [symbolPart, typePart] = stream.split('@');
  const symbol = symbolPart.toUpperCase();
  
  if (typePart.startsWith('kline_')) {
    const interval = typePart.replace('kline_', '') as Timeframe;
    return { symbol, streamType: 'kline', interval };
  }
  
  return { symbol, streamType: typePart as WSStreamType };
}

/**
 * Extract symbol info from full symbol data
 */
export function extractSymbolInfo(symbol: BitunixSymbol): SymbolInfo {
  const priceFilter = symbol.filters.find(f => f.filterType === 'PRICE_FILTER') as PriceFilter | undefined;
  const lotSizeFilter = symbol.filters.find(f => f.filterType === 'LOT_SIZE') as LotSizeFilter | undefined;
  const minNotionalFilter = symbol.filters.find(f => f.filterType === 'MIN_NOTIONAL') as MinNotionalFilter | undefined;
  
  return {
    symbol: symbol.symbol,
    baseAsset: symbol.baseAsset,
    quoteAsset: symbol.quoteAsset,
    pricePrecision: symbol.pricePrecision,
    quantityPrecision: symbol.quantityPrecision,
    tickSize: priceFilter?.tickSize ?? '0.01',
    minQty: lotSizeFilter?.minQty ?? '0.001',
    maxQty: lotSizeFilter?.maxQty ?? '10000',
    minNotional: minNotionalFilter?.minNotional ?? '10',
    status: symbol.status,
  };
}

/**
 * Calculate order book spread
 */
export function calculateSpread(orderBook: BitunixOrderBook): { spread: number; spreadPercent: number; midPrice: number } {
  if (orderBook.bids.length === 0 || orderBook.asks.length === 0) {
    return { spread: 0, spreadPercent: 0, midPrice: 0 };
  }
  
  const bestBid = parseFloat(orderBook.bids[0][0]);
  const bestAsk = parseFloat(orderBook.asks[0][0]);
  const spread = bestAsk - bestBid;
  const midPrice = (bestBid + bestAsk) / 2;
  const spreadPercent = (spread / midPrice) * 100;
  
  return { spread, spreadPercent, midPrice };
}

/**
 * Type guard for WebSocket kline message
 */
export function isKlineMessage(msg: unknown): msg is WSKlineMessage {
  return typeof msg === 'object' && msg !== null && (msg as WSKlineMessage).e === 'kline';
}

/**
 * Type guard for WebSocket trade message
 */
export function isTradeMessage(msg: unknown): msg is WSTradeMessage {
  return typeof msg === 'object' && msg !== null && (msg as WSTradeMessage).e === 'trade';
}

/**
 * Type guard for WebSocket depth message
 */
export function isDepthMessage(msg: unknown): msg is WSDepthMessage {
  return typeof msg === 'object' && msg !== null && (msg as WSDepthMessage).e === 'depthUpdate';
}

/**
 * Type guard for WebSocket ticker message
 */
export function isTickerMessage(msg: unknown): msg is WSTicker24hMessage {
  return typeof msg === 'object' && msg !== null && (msg as WSTicker24hMessage).e === '24hrTicker';
}
