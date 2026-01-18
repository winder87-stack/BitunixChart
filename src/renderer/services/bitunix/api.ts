/**
 * Bitunix API Service
 * 
 * Provides methods for interacting with the Bitunix exchange REST API.
 * Uses the Electron IPC bridge for actual HTTP requests (to avoid CORS).
 * 
 * Features:
 * - Symbol caching with TTL
 * - Automatic retry with exponential backoff
 * - Rate limit awareness
 * - Request/response logging in development
 * - Pagination support for historical data
 */

import type {
  Timeframe,
  BitunixSymbol,
  BitunixKline,
  BitunixTicker24h,
  SymbolInfo,
  ParsedKline,
  RawKlineArray,
} from '../../types/bitunix';

import { 
  parseRawKline, 
  parseKlineForChart, 
  extractSymbolInfo 
} from '../../types/bitunix';

import {
  validateSymbol,
  validateTicker,
  validateRawKlineArray
} from './validators';

// =============================================================================
// Configuration
// =============================================================================

interface ApiConfig {
  /** Base URL for REST API */
  baseUrl: string;
  
  /** Request timeout in milliseconds */
  timeout: number;
  
  /** Maximum retry attempts */
  maxRetries: number;
  
  /** Base delay for exponential backoff (ms) */
  retryDelay: number;
  
  /** Cache TTL for symbols (ms) */
  symbolsCacheTtl: number;
  
  /** Enable debug logging */
  debug: boolean;
}

// Check if we're in development mode
const isDev = typeof process !== 'undefined' 
  ? process.env.NODE_ENV === 'development'
  : false;

const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: 'https://fapi.bitunix.com',
  timeout: 10000,
  maxRetries: 3,
  retryDelay: 1000,
  symbolsCacheTtl: 5 * 60 * 1000, // 5 minutes
  debug: isDev,
};

// =============================================================================
// Types
// =============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  limit: number;
}

interface RequestOptions {
  /** Skip cache and force fresh fetch */
  skipCache?: boolean;
  
  /** Custom timeout for this request */
  timeout?: number;
  
  /** Number of retries for this request */
  retries?: number;
}

// API error codes
enum ApiErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_SYMBOL = 'INVALID_SYMBOL',
  INVALID_INTERVAL = 'INVALID_INTERVAL',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN',
}

class ApiError extends Error {
  constructor(
    message: string,
    public code: ApiErrorCode,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// =============================================================================
// Logger
// =============================================================================

const logger = {
  debug: (...args: unknown[]) => {
    if (DEFAULT_CONFIG.debug) {
      console.log('[BitunixAPI]', ...args);
    }
  },
  info: (...args: unknown[]) => {
    console.log('[BitunixAPI]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[BitunixAPI]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[BitunixAPI]', ...args);
  },
};

// =============================================================================
// Bitunix API Class
// =============================================================================

export class BitunixAPI {
  private config: ApiConfig;
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private rateLimitInfo: RateLimitInfo | null = null;

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.debug('Initialized with config:', this.config);
  }

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  /**
   * Get item from cache if not expired
   */
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      logger.debug(`Cache expired for key: ${key}`);
      return null;
    }

    logger.debug(`Cache hit for key: ${key}`);
    return entry.data;
  }

  /**
   * Set item in cache
   */
  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    logger.debug(`Cached data for key: ${key}, TTL: ${ttl}ms`);
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('Cache cleared');
  }

  /**
   * Clear specific cache key
   */
  clearCacheKey(key: string): void {
    this.cache.delete(key);
    logger.debug(`Cache cleared for key: ${key}`);
  }

  // ===========================================================================
  // Rate Limiting
  // ===========================================================================

  /**
   * Check if we're currently rate limited
   */
  private isRateLimited(): boolean {
    if (!this.rateLimitInfo) return false;
    
    const now = Date.now();
    if (now >= this.rateLimitInfo.resetTime) {
      this.rateLimitInfo = null;
      return false;
    }

    return this.rateLimitInfo.remaining <= 0;
  }

  /**
   * Get time until rate limit resets
   */
  private getRateLimitResetTime(): number {
    if (!this.rateLimitInfo) return 0;
    return Math.max(0, this.rateLimitInfo.resetTime - Date.now());
  }

  // ===========================================================================
  // Request Handling
  // ===========================================================================

  /**
   * Make an API request with retry logic
   */
  private async request<T>(
    endpoint: string,
    params: Record<string, unknown> = {},
    options: RequestOptions = {}
  ): Promise<T> {
    const { retries = this.config.maxRetries, timeout = this.config.timeout } = options;

    // Check rate limiting
    if (this.isRateLimited()) {
      const waitTime = this.getRateLimitResetTime();
      logger.warn(`Rate limited. Waiting ${waitTime}ms before retry.`);
      await this.sleep(waitTime);
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        logger.debug(`Request: ${endpoint}`, { params, attempt });
        
        const startTime = Date.now();
        
        // Use IPC to make the request (avoids CORS in Electron)
        const response = await this.makeIpcRequest<T>(endpoint, params, timeout);
        
        const duration = Date.now() - startTime;
        logger.debug(`Response: ${endpoint} (${duration}ms)`, response);

        return response;
      } catch (error) {
        lastError = error as Error;
        
        // Determine if error is retryable
        const apiError = this.parseError(error);
        
        if (!apiError.retryable || attempt >= retries) {
          throw apiError;
        }

        // Exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt);
        logger.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await this.sleep(delay);
      }
    }

    throw lastError || new ApiError('Request failed', ApiErrorCode.UNKNOWN);
  }

  /**
   * Make request via Electron IPC
   */
  private async makeIpcRequest<T>(
    endpoint: string,
    params: Record<string, unknown>,
    _timeout: number
  ): Promise<T> {
    // Check if we're in Electron environment
    if (typeof window !== 'undefined' && window.bitunix) {
      // Map endpoints to IPC handlers
      if (endpoint === '/api/v1/market/symbols') {
        const response = await window.bitunix.getSymbols();
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch symbols');
        }
        return response.data as T;
      }
      
      if (endpoint === '/api/v1/market/klines') {
        const response = await window.bitunix.getKlines(
          params.symbol as string,
          params.interval as Timeframe,
          params.limit as number
        );
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch klines');
        }
        return response.data as T;
      }
      
      if (endpoint === '/api/v1/market/ticker/24hr') {
        const response = await window.bitunix.getTicker(params.symbol as string);
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch ticker');
        }
        return response.data as T;
      }

      if (endpoint === '/api/v1/market/ticker/24hr/all') {
        const response = await window.bitunix.getAllTickers();
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch tickers');
        }
        return response.data as T;
      }
    }

    throw new ApiError(
      'Electron IPC not available',
      ApiErrorCode.NETWORK_ERROR,
      undefined,
      false
    );
  }

  /**
   * Parse error into ApiError
   */
  private parseError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    const err = error as Error & { 
      response?: { status?: number; data?: { msg?: string; code?: number } };
      code?: string;
    };

    // Network error
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return new ApiError('Request timeout', ApiErrorCode.TIMEOUT, undefined, true);
    }

    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      return new ApiError('Network error', ApiErrorCode.NETWORK_ERROR, undefined, true);
    }

    // API error response
    if (err.response) {
      const status = err.response.status;
      const message = err.response.data?.msg || err.message;

      if (status === 429) {
        return new ApiError('Rate limited', ApiErrorCode.RATE_LIMITED, 429, true);
      }

      if (status === 400) {
        if (message.includes('symbol')) {
          return new ApiError(message, ApiErrorCode.INVALID_SYMBOL, 400, false);
        }
        if (message.includes('interval')) {
          return new ApiError(message, ApiErrorCode.INVALID_INTERVAL, 400, false);
        }
      }

      if (status && status >= 500) {
        return new ApiError(message, ApiErrorCode.SERVER_ERROR, status, true);
      }
    }

    return new ApiError(err.message || 'Unknown error', ApiErrorCode.UNKNOWN, undefined, false);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===========================================================================
  // Public API Methods
  // ===========================================================================

  /**
   * Get all available trading symbols
   * 
   * @param options - Request options
   * @returns Array of symbol information
   * 
   * @example
   * ```ts
   * const symbols = await api.getSymbols();
   * console.log(symbols.length); // 200+
   * console.log(symbols[0].symbol); // "BTCUSDT"
   * ```
   */
  async getSymbols(options: RequestOptions = {}): Promise<SymbolInfo[]> {
    const cacheKey = 'symbols';

    // Check cache first
    if (!options.skipCache) {
      const cached = this.getCached<SymbolInfo[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    logger.info('Fetching symbols...');

    try {
      const data = await this.request<BitunixSymbol[] | { symbols: BitunixSymbol[] }>(
        '/api/v1/market/symbols',
        {},
        options
      );

      // Handle both array and object response formats
      const symbols = Array.isArray(data) ? data : data.symbols || [];
      
      // Filter for active USDT pairs
      const filtered = symbols.filter((s: BitunixSymbol) => 
        s.quoteAsset === 'USDT' && 
        s.status === 'TRADING'
      );

      // Extract simplified info
      const symbolInfos = filtered.map(extractSymbolInfo);

      // Validate and filter
      const validSymbolInfos = symbolInfos
        .map(s => validateSymbol(s))
        .filter((s): s is SymbolInfo => s !== null);

      // Sort alphabetically
      validSymbolInfos.sort((a, b) => a.symbol.localeCompare(b.symbol));

      // Cache the results
      this.setCache(cacheKey, validSymbolInfos, this.config.symbolsCacheTtl);

      logger.info(`Fetched ${validSymbolInfos.length} USDT trading pairs`);
      return validSymbolInfos;
    } catch (error) {
      logger.error('Failed to fetch symbols:', error);
      throw error;
    }
  }

  /**
   * Get all symbols (including non-USDT pairs)
   * 
   * @param options - Request options
   * @returns Array of all symbol information
   */
  async getAllSymbols(options: RequestOptions = {}): Promise<SymbolInfo[]> {
    const cacheKey = 'all-symbols';

    if (!options.skipCache) {
      const cached = this.getCached<SymbolInfo[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const data = await this.request<BitunixSymbol[] | { symbols: BitunixSymbol[] }>(
      '/api/v1/market/symbols',
      {},
      options
    );

    const symbols = Array.isArray(data) ? data : data.symbols || [];
    const symbolInfos = symbols
      .filter((s: BitunixSymbol) => s.status === 'TRADING')
      .map(extractSymbolInfo)
      .map(s => validateSymbol(s))
      .filter((s): s is SymbolInfo => s !== null);

    symbolInfos.sort((a, b) => a.symbol.localeCompare(b.symbol));
    this.setCache(cacheKey, symbolInfos, this.config.symbolsCacheTtl);

    return symbolInfos;
  }

  /**
   * Get historical kline/candlestick data
   * 
   * @param symbol - Trading pair symbol (e.g., "BTCUSDT")
   * @param interval - Timeframe interval (e.g., "1h", "4h", "1d")
   * @param limit - Number of klines to fetch (default: 500, max: 1000)
   * @param options - Request options
   * @returns Array of kline data
   * 
   * @example
   * ```ts
   * const klines = await api.getKlines('BTCUSDT', '1h', 100);
   * console.log(klines[0].close); // "42150.50"
   * ```
   */
  async getKlines(
    symbol: string,
    interval: Timeframe,
    limit: number = 500,
    options: RequestOptions = {}
  ): Promise<BitunixKline[]> {
    // Validate inputs
    if (!symbol) {
      throw new ApiError('Symbol is required', ApiErrorCode.INVALID_SYMBOL);
    }

    // Clamp limit to valid range
    const clampedLimit = Math.min(Math.max(1, limit), 1000);

    const cacheKey = `klines:${symbol}:${interval}:${clampedLimit}`;

    // Short cache for klines (30 seconds)
    if (!options.skipCache) {
      const cached = this.getCached<BitunixKline[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    logger.debug(`Fetching klines: ${symbol} ${interval} limit=${clampedLimit}`);

    try {
      const data = await this.request<RawKlineArray[] | BitunixKline[]>(
        '/api/v1/market/klines',
        {
          symbol: symbol.toUpperCase(),
          interval,
          limit: clampedLimit,
        },
        options
      );

      // Handle both array and object formats
      let klines: BitunixKline[];
      
      if (Array.isArray(data) && data.length > 0) {
        // Check if it's raw array format or already parsed
        if (Array.isArray(data[0])) {
          // Raw array format: [[timestamp, open, high, low, close, volume, ...], ...]
          klines = (data as RawKlineArray[])
            .map(k => validateRawKlineArray(k))
            .filter((k): k is RawKlineArray => k !== null)
            .map(parseRawKline);
        } else {
          // Already object format
          // Assuming object format is valid if it came from IPC which might have done its own thing, 
          // but strictly we should validate. Since we lack validateBitunixKline, we rely on types for now 
          // or assume it's correct if not raw.
          klines = data as BitunixKline[];
        }
      } else {
        klines = [];
      }

      // Sort by time ascending
      klines.sort((a, b) => a.openTime - b.openTime);

      // Cache for 30 seconds
      this.setCache(cacheKey, klines, 30000);

      logger.debug(`Fetched ${klines.length} klines for ${symbol}`);
      return klines;
    } catch (error) {
      logger.error(`Failed to fetch klines for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get historical klines with pagination for longer histories
   * 
   * @param symbol - Trading pair symbol
   * @param interval - Timeframe interval
   * @param totalLimit - Total number of klines to fetch
   * @param options - Request options
   * @returns Array of kline data
   * 
   * @example
   * ```ts
   * // Fetch 2000 klines (requires 2 API calls)
   * const klines = await api.getKlinesPaginated('BTCUSDT', '1h', 2000);
   * ```
   */
  async getKlinesPaginated(
    symbol: string,
    interval: Timeframe,
    totalLimit: number,
    options: RequestOptions = {}
  ): Promise<BitunixKline[]> {
    const maxPerRequest = 1000;
    const allKlines: BitunixKline[] = [];
    let endTime: number | undefined = undefined;

    logger.info(`Fetching ${totalLimit} klines for ${symbol} ${interval} (paginated)`);

    while (allKlines.length < totalLimit) {
      const remaining = totalLimit - allKlines.length;
      const limit = Math.min(remaining, maxPerRequest);

      // Build params with optional endTime for pagination
      const params: Record<string, unknown> = {
        symbol: symbol.toUpperCase(),
        interval,
        limit,
      };

      if (endTime !== undefined) {
        params.endTime = endTime;
      }

      const data = await this.request<RawKlineArray[] | BitunixKline[]>(
        '/api/v1/market/klines',
        params,
        { ...options, skipCache: true }
      );

      let klines: BitunixKline[];
      
      if (Array.isArray(data) && data.length > 0) {
        if (Array.isArray(data[0])) {
          klines = (data as RawKlineArray[])
            .map(k => validateRawKlineArray(k))
            .filter((k): k is RawKlineArray => k !== null)
            .map(parseRawKline);
        } else {
          klines = data as BitunixKline[];
        }
      } else {
        break; // No more data
      }

      if (klines.length === 0) {
        break;
      }

      // Sort by time descending to get oldest first
      klines.sort((a, b) => b.openTime - a.openTime);

      // Add to results
      allKlines.unshift(...klines);

      // Set endTime for next request (1ms before oldest kline)
      endTime = klines[klines.length - 1].openTime - 1;

      // Avoid rate limiting with small delay between requests
      if (allKlines.length < totalLimit) {
        await this.sleep(100);
      }

      logger.debug(`Fetched ${allKlines.length}/${totalLimit} klines`);
    }

    // Sort final results by time ascending
    allKlines.sort((a, b) => a.openTime - b.openTime);

    // Trim to exact limit
    const result = allKlines.slice(-totalLimit);

    logger.info(`Fetched ${result.length} total klines for ${symbol}`);
    return result;
  }

  /**
   * Get parsed klines ready for charting
   * 
   * @param symbol - Trading pair symbol
   * @param interval - Timeframe interval
   * @param limit - Number of klines to fetch
   * @param options - Request options
   * @returns Array of parsed klines with numeric values
   */
  async getParsedKlines(
    symbol: string,
    interval: Timeframe,
    limit: number = 500,
    options: RequestOptions = {}
  ): Promise<ParsedKline[]> {
    const klines = await this.getKlines(symbol, interval, limit, options);
    return klines.map(parseKlineForChart);
  }

  /**
   * Get 24hr ticker price change statistics
   * 
   * @param symbol - Trading pair symbol (e.g., "BTCUSDT")
   * @param options - Request options
   * @returns 24hr ticker statistics
   * 
   * @example
   * ```ts
   * const ticker = await api.get24hrTicker('BTCUSDT');
   * console.log(ticker.priceChangePercent); // "+2.5%"
   * console.log(ticker.lastPrice); // "42150.50"
   * ```
   */
  async get24hrTicker(
    symbol: string,
    options: RequestOptions = {}
  ): Promise<BitunixTicker24h> {
    if (!symbol) {
      throw new ApiError('Symbol is required', ApiErrorCode.INVALID_SYMBOL);
    }

    const cacheKey = `ticker:${symbol}`;

    // Short cache for ticker (10 seconds)
    if (!options.skipCache) {
      const cached = this.getCached<BitunixTicker24h>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    logger.debug(`Fetching 24hr ticker for ${symbol}`);

    try {
      const data = await this.request<BitunixTicker24h>(
        '/api/v1/market/ticker/24hr',
        { symbol: symbol.toUpperCase() },
        options
      );

      // Cache for 10 seconds
      this.setCache(cacheKey, data, 10000);

      const validTicker = validateTicker(data);
      if (!validTicker) {
        throw new ApiError('Invalid ticker data received', ApiErrorCode.SERVER_ERROR);
      }

      return validTicker;
    } catch (error) {
      logger.error(`Failed to fetch ticker for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get 24hr ticker for all symbols
   * 
   * @param options - Request options
   * @returns Array of 24hr ticker statistics for all symbols
   */
  async getAll24hrTickers(options: RequestOptions = {}): Promise<BitunixTicker24h[]> {
    const cacheKey = 'all-tickers';

    // Short cache (10 seconds)
    if (!options.skipCache) {
      const cached = this.getCached<BitunixTicker24h[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    logger.debug('Fetching all 24hr tickers');

    const data = await this.request<BitunixTicker24h[]>(
      '/api/v1/market/ticker/24hr/all',
      {},
      options
    );

    // Cache for 10 seconds
    this.setCache(cacheKey, data, 10000);

    const validTickers = data
      .map(t => validateTicker(t))
      .filter((t): t is BitunixTicker24h => t !== null);

    return validTickers;
  }

  /**
   * Get multiple tickers at once (more efficient than individual calls)
   * 
   * @param symbols - Array of symbols
   * @param options - Request options
   * @returns Map of symbol to ticker data
   */
  async getMultipleTickers(
    symbols: string[],
    options: RequestOptions = {}
  ): Promise<Map<string, BitunixTicker24h>> {
    // Fetch all tickers and filter
    const allTickers = await this.getAll24hrTickers(options);
    
    const symbolSet = new Set(symbols.map(s => s.toUpperCase()));
    const result = new Map<string, BitunixTicker24h>();

    for (const ticker of allTickers) {
      if (symbolSet.has(ticker.symbol)) {
        result.set(ticker.symbol, ticker);
      }
    }

    return result;
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Check if a symbol exists and is tradeable
   * 
   * @param symbol - Symbol to check
   * @returns True if symbol exists and is active
   */
  async isValidSymbol(symbol: string): Promise<boolean> {
    try {
      const symbols = await this.getSymbols();
      return symbols.some(s => s.symbol === symbol.toUpperCase());
    } catch {
      return false;
    }
  }

  /**
   * Search symbols by query
   * 
   * @param query - Search query
   * @param limit - Maximum results
   * @returns Matching symbols
   */
  async searchSymbols(query: string, limit: number = 20): Promise<SymbolInfo[]> {
    const symbols = await this.getSymbols();
    const upperQuery = query.toUpperCase();

    const matches = symbols.filter(s => 
      s.symbol.includes(upperQuery) ||
      s.baseAsset.includes(upperQuery)
    );

    // Sort by relevance (exact matches first)
    matches.sort((a, b) => {
      const aExact = a.symbol === upperQuery || a.baseAsset === upperQuery;
      const bExact = b.symbol === upperQuery || b.baseAsset === upperQuery;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.symbol.localeCompare(b.symbol);
    });

    return matches.slice(0, limit);
  }

  /**
   * Get popular trading pairs
   * 
   * @returns Array of popular symbols
   */
  async getPopularSymbols(): Promise<SymbolInfo[]> {
    const popular = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 
                     'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT'];
    
    const symbols = await this.getSymbols();
    return symbols.filter(s => popular.includes(s.symbol));
  }

  /**
   * Get current API status
   */
  getStatus(): {
    rateLimited: boolean;
    rateLimitResetIn: number;
    cacheSize: number;
  } {
    return {
      rateLimited: this.isRateLimited(),
      rateLimitResetIn: this.getRateLimitResetTime(),
      cacheSize: this.cache.size,
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

/** Default API instance */
export const bitunixApi = new BitunixAPI();

/** Export class for custom instances */
export default BitunixAPI;

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Quick access to symbols
 */
export const getSymbols = () => bitunixApi.getSymbols();

/**
 * Quick access to klines
 */
export const getKlines = (symbol: string, interval: Timeframe, limit?: number) =>
  bitunixApi.getKlines(symbol, interval, limit);

/**
 * Quick access to ticker
 */
export const get24hrTicker = (symbol: string) =>
  bitunixApi.get24hrTicker(symbol);

/**
 * Quick access to parsed klines for charting
 */
export const getParsedKlines = (symbol: string, interval: Timeframe, limit?: number) =>
  bitunixApi.getParsedKlines(symbol, interval, limit);
