/**
 * Quad Stochastic Signal System Types
 * 
 * A multi-timeframe stochastic oscillator system using 4 bands for signal generation:
 * - FAST (9,3,3): Primary 1-minute scalping signal
 * - STANDARD (14,3,3): Confirmation layer
 * - MEDIUM (44,3,3): Trend context filter
 * - SLOW (60,10,10): 5-minute proxy for higher timeframe alignment
 * 
 * @module quadStochastic
 */

// =============================================================================
// Stochastic Band Configuration
// =============================================================================

/**
 * Configuration for a single stochastic oscillator band
 */
export interface StochasticBandConfig {
  /** %K period - main stochastic lookback */
  readonly kPeriod: number;
  /** %D period - signal line smoothing */
  readonly dPeriod: number;
  /** Additional smoothing applied to %K */
  readonly smooth: number;
}

/**
 * The four stochastic bands used in the Quad system.
 * Each band serves a specific purpose in signal generation and confirmation.
 * 
 * @example
 * ```typescript
 * const fastConfig = STOCHASTIC_BANDS.FAST;
 * console.log(fastConfig.kPeriod); // 9
 * ```
 */
export const STOCHASTIC_BANDS = {
  /**
   * FAST band (9,3,3) - Primary 1-minute signal generator.
   * Most responsive to price action, used for entry timing.
   */
  FAST: {
    kPeriod: 9,
    dPeriod: 3,
    smooth: 3,
  },
  
  /**
   * STANDARD band (14,3,3) - Confirmation layer.
   * Classic stochastic settings, confirms FAST band signals.
   */
  STANDARD: {
    kPeriod: 14,
    dPeriod: 3,
    smooth: 3,
  },
  
  /**
   * MEDIUM band (44,3,3) - Trend context filter.
   * Provides intermediate trend direction, filters counter-trend trades.
   */
  MEDIUM: {
    kPeriod: 44,
    dPeriod: 3,
    smooth: 3,
  },
  
  /**
   * SLOW band (60,10,10) - 5-minute proxy.
   * Simulates higher timeframe alignment on 1-min chart.
   * Heavy smoothing reduces noise for trend identification.
   */
  SLOW: {
    kPeriod: 60,
    dPeriod: 10,
    smooth: 10,
  },
} as const;

/**
 * 3-Minute timeframe stochastic bands.
 * Adjusted from 1M settings: periods scaled ~0.33x with minimum viable values.
 * 
 * FAST (5,2,2) = ~15 min of data (5 candles × 3m)
 * STANDARD (7,3,3) = ~21 min of data
 * MEDIUM (15,3,3) = ~45 min of data  
 * SLOW (20,5,5) = ~60 min of data (mimics 15M alignment)
 */
export const STOCHASTIC_BANDS_3M = {
  FAST: {
    kPeriod: 5,
    dPeriod: 2,
    smooth: 2,
  },
  STANDARD: {
    kPeriod: 7,
    dPeriod: 3,
    smooth: 3,
  },
  MEDIUM: {
    kPeriod: 15,
    dPeriod: 3,
    smooth: 3,
  },
  SLOW: {
    kPeriod: 20,
    dPeriod: 5,
    smooth: 5,
  },
} as const;

/**
 * 5-Minute timeframe stochastic bands.
 * Scaled for 5M chart to maintain similar time coverage as 1M.
 * 
 * FAST (3,2,2) = ~15 min of data (3 candles × 5m)
 * STANDARD (5,2,2) = ~25 min of data
 * MEDIUM (9,3,3) = ~45 min of data
 * SLOW (12,4,4) = ~60 min of data (mimics 15M alignment)
 */
export const STOCHASTIC_BANDS_5M = {
  FAST: {
    kPeriod: 3,
    dPeriod: 2,
    smooth: 2,
  },
  STANDARD: {
    kPeriod: 5,
    dPeriod: 2,
    smooth: 2,
  },
  MEDIUM: {
    kPeriod: 9,
    dPeriod: 3,
    smooth: 3,
  },
  SLOW: {
    kPeriod: 12,
    dPeriod: 4,
    smooth: 4,
  },
} as const;

/**
 * 15-Minute timeframe stochastic bands.
 * Scaled for 15M chart - minimal periods since each candle = 15 min.
 * 
 * FAST (3,2,2) = ~45 min of data (3 candles × 15m)
 * STANDARD (4,2,2) = ~60 min of data  
 * MEDIUM (8,3,3) = ~2 hours of data
 * SLOW (12,4,4) = ~3 hours of data (mimics 1H alignment)
 */
export const STOCHASTIC_BANDS_15M = {
  FAST: {
    kPeriod: 3,
    dPeriod: 2,
    smooth: 2,
  },
  STANDARD: {
    kPeriod: 4,
    dPeriod: 2,
    smooth: 2,
  },
  MEDIUM: {
    kPeriod: 8,
    dPeriod: 3,
    smooth: 3,
  },
  SLOW: {
    kPeriod: 12,
    dPeriod: 4,
    smooth: 4,
  },
} as const;

/** Type for stochastic band configurations - structural type for flexibility */
export interface StochasticBandsConfig {
  readonly FAST: StochasticBandConfig;
  readonly STANDARD: StochasticBandConfig;
  readonly MEDIUM: StochasticBandConfig;
  readonly SLOW: StochasticBandConfig;
}

/**
 * Timeframe-specific stochastic band configurations.
 * Maps interval strings to optimized stochastic settings.
 */
export const TIMEFRAME_CONFIGS: Record<string, StochasticBandsConfig> = {
  '1m': STOCHASTIC_BANDS,
  '3m': STOCHASTIC_BANDS_3M,
  '5m': STOCHASTIC_BANDS_5M,
  '15m': STOCHASTIC_BANDS_15M,
};

/**
 * Get the appropriate stochastic band configuration for a given timeframe.
 * Falls back to original 1M settings if timeframe is not found.
 * 
 * @param interval - The chart timeframe (e.g., '1m', '3m', '5m', '15m')
 * @returns The stochastic band configuration for that timeframe
 * 
 * @example
 * ```typescript
 * const bands = getStochasticBands('3m');
 * console.log(bands.FAST.kPeriod); // 5 (optimized for 3M)
 * 
 * const defaultBands = getStochasticBands('1h'); 
 * console.log(defaultBands.FAST.kPeriod); // 9 (falls back to 1M)
 * ```
 */
export function getStochasticBands(interval: string): StochasticBandsConfig {
  return TIMEFRAME_CONFIGS[interval] || STOCHASTIC_BANDS;
}

/** Band identifier keys */
export type StochasticBandKey = keyof typeof STOCHASTIC_BANDS;

// =============================================================================
// Stochastic Data Types
// =============================================================================

/**
 * Single stochastic oscillator value at a point in time.
 * Contains both %K (fast) and %D (slow/signal) lines.
 */
export interface StochasticValue {
  /** Unix timestamp in seconds */
  time: number;
  /** %K value (0-100) - fast stochastic line */
  k: number;
  /** %D value (0-100) - signal/slow line */
  d: number;
}

/**
 * Complete quad stochastic data containing all four bands.
 * Arrays are time-aligned (same index = same timestamp).
 */
export interface QuadStochasticData {
  /** FAST band (9,3,3) values */
  fast: StochasticValue[];
  /** STANDARD band (14,3,3) values */
  standard: StochasticValue[];
  /** MEDIUM band (44,3,3) values */
  medium: StochasticValue[];
  /** SLOW band (60,10,10) values */
  slow: StochasticValue[];
}

/**
 * Snapshot of all four stochastic bands at a single point in time.
 * Used to capture state when a signal is generated.
 */
export interface QuadStochasticSnapshot {
  /** FAST band state */
  fast: { k: number; d: number };
  /** STANDARD band state */
  standard: { k: number; d: number };
  /** MEDIUM band state */
  medium: { k: number; d: number };
  /** SLOW band state */
  slow: { k: number; d: number };
}

// =============================================================================
// Divergence Types
// =============================================================================

/**
 * Types of divergence between price and stochastic oscillator.
 * 
 * - BULLISH: Price makes lower low, stoch makes higher low (reversal up)
 * - BEARISH: Price makes higher high, stoch makes lower high (reversal down)
 * - HIDDEN_BULLISH: Price makes higher low, stoch makes lower low (continuation up)
 * - HIDDEN_BEARISH: Price makes lower high, stoch makes higher high (continuation down)
 */
export type DivergenceType = 
  | 'BULLISH' 
  | 'BEARISH' 
  | 'HIDDEN_BULLISH' 
  | 'HIDDEN_BEARISH';

/**
 * Detailed divergence information for signal analysis.
 */
export interface DivergenceDetails {
  /** Type of divergence detected */
  type: DivergenceType;
  /** Angle of divergence in degrees (steeper = stronger) */
  angle: number;
  /** Price points forming the divergence [point1, point2] */
  pricePoints: [number, number];
  /** Stochastic points forming the divergence [point1, point2] */
  stochPoints: [number, number];
  /** Number of candles between divergence points */
  candleSpan: number;
  /** Which stochastic band showed the divergence */
  band: StochasticBandKey;
}

// =============================================================================
// Signal Types
// =============================================================================

/**
 * Signal strength classification based on confluence factors.
 * 
 * - WEAK: 1-2 factors aligned
 * - MODERATE: 3-4 factors aligned
 * - STRONG: 5-6 factors aligned
 * - SUPER: 7+ factors aligned (rare, high probability)
 */
export type SignalStrength = 'WEAK' | 'MODERATE' | 'STRONG' | 'SUPER';

/**
 * Signal direction/type.
 */
export type SignalType = 'LONG' | 'SHORT';

/**
 * Current status of a signal in its lifecycle.
 */
export type SignalStatus = 
  | 'PENDING'      // Signal generated, waiting for entry
  | 'ACTIVE'       // Position entered
  | 'PARTIAL'      // Some targets hit, position reduced
  | 'TARGET1_HIT'  // First target reached
  | 'TARGET2_HIT'  // Second target reached
  | 'TARGET3_HIT'  // Final target reached (full profit)
  | 'STOPPED'      // Stop loss triggered
  | 'EXPIRED';     // Signal invalidated without entry

/**
 * Confluence flags indicating which conditions aligned for the signal.
 */
export interface ConfluenceFlags {
  /** 
   * Quad Rotation: All 4 bands rotating in signal direction.
   * LONG: All bands turning up from oversold
   * SHORT: All bands turning down from overbought
   */
  quadRotation: boolean;
  
  /**
   * Channel Extreme: Price at or beyond Bollinger/Keltner channel boundary.
   * Indicates overextension and potential mean reversion.
   */
  channelExtreme: boolean;
  
  /**
   * 20/20 Flag: Both FAST %K and %D below 20 (LONG) or above 80 (SHORT).
   * Strong oversold/overbought confirmation.
   */
  twentyTwentyFlag: boolean;
  
  /**
   * VWAP Confluence: Price interaction with VWAP supports signal direction.
   * LONG: Price below VWAP (discount)
   * SHORT: Price above VWAP (premium)
   */
  vwapConfluence: boolean;
  
  /**
   * MA Confluence: Signal aligns with moving average structure.
   * LONG: Price above key MAs or MAs stacked bullish
   * SHORT: Price below key MAs or MAs stacked bearish
   */
  maConfluence: boolean;
  
  /**
   * Volume Spike: Volume significantly above average at signal time.
   */
  volumeSpike: boolean;
  
  /**
   * Higher Timeframe Alignment: SLOW band direction matches signal.
   */
  htfAlignment: boolean;
}

/**
 * Complete quad stochastic trading signal.
 * Contains all information needed to execute and track a trade.
 */
export interface QuadSignal {
  /** Unique signal identifier (UUID) */
  id: string;
  
  /** Signal generation timestamp (Unix ms) */
  timestamp: number;
  
  /** Trading pair symbol (e.g., 'BTCUSDT') */
  symbol: string;
  
  /** Signal direction */
  type: SignalType;
  
  /** Signal strength based on confluence count */
  strength: SignalStrength;
  
  // === Price Levels ===
  
  /** Recommended entry price */
  entryPrice: number;
  
  /** Stop loss price */
  stopLoss: number;
  
  /** First profit target (conservative) */
  target1: number;
  
  /** Second profit target (moderate) */
  target2: number;
  
  /** Third profit target (aggressive) */
  target3: number;
  
  // === Divergence ===
  
  /** Divergence details if present, null otherwise */
  divergence: DivergenceDetails | null;
  
  // === Confluence ===
  
  /** Confluence flags at signal generation */
  confluence: ConfluenceFlags;
  
  /** Confluence score (number of true flags) */
  confluenceScore: number;

  // === Confirmation System ===
  
  /** 
   * Detailed confirmation analysis results.
   * Includes score breakdown and lists of passed/failed checks.
   */
  confirmationDetails: {
    /** List of passed confirmation IDs */
    achieved: string[];
    /** List of failed/missing confirmation IDs */
    missing: string[];
    /** Total weighted score achieved */
    score: number;
    /** Maximum possible score */
    maxScore: number;
    /** Percentage score (0-100) */
    percentage: number;
  };

  /** Normalized confirmation score (0-100) */
  confirmationScore: number;

  // === Advanced Trade Setup ===
  
  /** Entry zone details */
  entryZone?: {
    ideal: number;
    max: number;
    min: number;
  };

  /** Multiple targets with position sizing */
  smartTargets?: Array<{
    price: number;
    percentage: number;
    reason: string;
  }>;

  /** Enhanced stop loss configuration */
  stopLossConfig?: {
    initial: number;
    breakeven: number;
    trailing: {
      enabled: boolean;
      method: 'MA20' | 'ATR' | 'PERCENT' | 'SWING';
      value: number;
    };
  };

  /** Signal validity expiration timestamp */
  validUntil?: number;

  /** Maximum holding time in ms */
  maxHoldTime?: number;

  /** Explicit action (BUY/SELL) */
  action?: 'BUY' | 'SELL';

  /** Entry strategy type */
  entryType?: 'MARKET' | 'LIMIT_PULLBACK' | 'STOP_ENTRY';
  
  // === Stochastic State ===
  
  /** Snapshot of all 4 stochastic bands at signal time */
  stochStates: QuadStochasticSnapshot;
  
  // === Trade Management ===
  
  /** Current signal status */
  status: SignalStatus;
  
  /** Risk/reward ratio (target1 distance / stop distance) */
  riskRewardRatio: number;
  
  /** Suggested position size as % of account */
  positionSize: number;
  
  /** Realized P&L percentage (0 if not closed) */
  pnlPercent: number;
  
  /** Realized P&L amount in quote currency */
  pnlAmount: number;
  
  // === Metadata ===
  
  /** Actual entry price if filled */
  actualEntry: number | null;
  
  /** Actual exit price if closed */
  actualExit: number | null;
  
  /** Entry timestamp if filled */
  entryTime: number | null;
  
  /** Exit timestamp if closed */
  exitTime: number | null;
  
  /** User notes */
  notes: string;
}

// =============================================================================
// Channel Types
// =============================================================================

/**
 * Price channel boundary information (Bollinger, Keltner, etc.).
 */
export interface ChannelBoundary {
  /** Upper band value */
  upper: number;
  
  /** Lower band value */
  lower: number;
  
  /** Middle line (usually SMA or EMA) */
  midline: number;
  
  /** Whether the channel has valid data */
  isValid: boolean;
  
  /** Number of recent touches on boundaries */
  touches: {
    /** Recent upper band touches */
    upper: number;
    /** Recent lower band touches */
    lower: number;
  };
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Configuration for the Quad Stochastic Signal System.
 * All values have sensible defaults defined in DEFAULT_SIGNAL_CONFIG.
 */
export interface SignalConfig {
  // === Stochastic Thresholds ===
  
  /** 
   * Oversold threshold (0-100).
   * Signals below this are considered oversold.
   * @default 20
   */
  oversoldLevel: number;
  
  /**
   * Overbought threshold (0-100).
   * Signals above this are considered overbought.
   * @default 80
   */
  overboughtLevel: number;
  
  // === Divergence Settings ===
  
  /**
   * Minimum divergence angle in degrees to qualify as valid.
   * Filters out weak/flat divergences.
   * @default 7
   */
  minDivergenceAngle: number;
  
  /**
   * Number of candles to look back for divergence detection.
   * @default 50
   */
  lookbackPeriod: number;
  
  /**
   * Minimum candle span for valid divergence.
   * Prevents detecting micro-divergences.
   * @default 5
   */
  minDivergenceSpan: number;
  
  // === Filters ===
  
  /**
   * Minimum 24h volume in quote currency.
   * Filters out illiquid pairs.
   * @default 1000000 (1M USDT)
   */
  minVolume24h: number;
  
  /**
   * Minimum price for tradeable pairs.
   * Filters out dust/dead coins.
   * @default 0.0001
   */
  minPrice: number;
  
  // === Risk Management ===
  
  /**
   * Buffer added to stop loss as % of entry.
   * Accounts for slippage and wicks.
   * @default 0.1 (0.1%)
   */
  stopLossBuffer: number;
  
  /**
   * First target as % from entry.
   * @default 0.5 (0.5%)
   */
  target1Percent: number;
  
  /**
   * Second target as % from entry.
   * @default 1.0 (1.0%)
   */
  target2Percent: number;
  
  /**
   * Third target as % from entry.
   * @default 2.0 (2.0%)
   */
  target3Percent: number;
  
  /**
   * Default position size as % of account.
   * @default 2.0 (2%)
   */
  defaultPositionSize: number;
  
  /**
   * Maximum position size as % of account.
   * @default 5.0 (5%)
   */
  maxPositionSize: number;
  
  // === Notifications ===
  
  /**
   * Enable sound alerts on signal generation.
   * @default true
   */
  enableSound: boolean;
  
  /**
   * Enable system/push notifications.
   * @default true
   */
  enableNotifications: boolean;
  
  /**
   * Minimum signal strength to trigger notification.
   * @default 'MODERATE'
   */
  minNotificationStrength: SignalStrength;
  
  // === Advanced ===
  
  /**
   * Require all 4 bands to confirm (strict mode).
   * @default false
   */
  requireQuadConfirmation: boolean;
  
  /**
   * Allow counter-trend signals.
   * @default false
   */
  allowCounterTrend: boolean;
  
  /**
   * Signal expiry time in milliseconds.
   * @default 300000 (5 minutes)
   */
  signalExpiryMs: number;
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default configuration for the Quad Stochastic Signal System.
 * Provides sensible defaults for all parameters.
 * 
 * @example
 * ```typescript
 * const config: SignalConfig = {
 *   ...DEFAULT_SIGNAL_CONFIG,
 *   oversoldLevel: 15, // Override specific values
 * };
 * ```
 */
export const DEFAULT_SIGNAL_CONFIG: SignalConfig = {
  // Stochastic Thresholds
  oversoldLevel: 20,
  overboughtLevel: 80,
  
  // Divergence Settings
  minDivergenceAngle: 7,
  lookbackPeriod: 50,
  minDivergenceSpan: 5,
  
  // Filters
  minVolume24h: 1_000_000,
  minPrice: 0.0001,
  
  // Risk Management
  stopLossBuffer: 0.1,
  target1Percent: 0.5,
  target2Percent: 1.0,
  target3Percent: 2.0,
  defaultPositionSize: 2.0,
  maxPositionSize: 5.0,
  
  // Notifications
  enableSound: true,
  enableNotifications: true,
  minNotificationStrength: 'MODERATE',
  
  // Advanced
  requireQuadConfirmation: false,
  allowCounterTrend: false,
  signalExpiryMs: 5 * 60 * 1000, // 5 minutes
};

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validates a SignalConfig object for correctness.
 * Checks that all values are within acceptable ranges.
 * 
 * @param config - The configuration to validate
 * @returns true if config is valid, false otherwise
 * 
 * @example
 * ```typescript
 * const config = { ...DEFAULT_SIGNAL_CONFIG, oversoldLevel: 150 };
 * console.log(isValidSignalConfig(config)); // false (oversold > 100)
 * ```
 */
export function isValidSignalConfig(config: unknown): config is SignalConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }
  
  const c = config as Partial<SignalConfig>;
  
  // Stochastic thresholds must be 0-100
  if (
    typeof c.oversoldLevel !== 'number' ||
    c.oversoldLevel < 0 ||
    c.oversoldLevel > 100
  ) {
    return false;
  }
  
  if (
    typeof c.overboughtLevel !== 'number' ||
    c.overboughtLevel < 0 ||
    c.overboughtLevel > 100
  ) {
    return false;
  }
  
  // Oversold must be less than overbought
  if (c.oversoldLevel >= c.overboughtLevel) {
    return false;
  }
  
  // Divergence angle must be positive
  if (
    typeof c.minDivergenceAngle !== 'number' ||
    c.minDivergenceAngle < 0 ||
    c.minDivergenceAngle > 90
  ) {
    return false;
  }
  
  // Lookback period must be positive integer
  if (
    typeof c.lookbackPeriod !== 'number' ||
    c.lookbackPeriod < 1 ||
    !Number.isInteger(c.lookbackPeriod)
  ) {
    return false;
  }
  
  // Min divergence span must be positive integer
  if (
    typeof c.minDivergenceSpan !== 'number' ||
    c.minDivergenceSpan < 1 ||
    !Number.isInteger(c.minDivergenceSpan)
  ) {
    return false;
  }
  
  // Volume filter must be non-negative
  if (typeof c.minVolume24h !== 'number' || c.minVolume24h < 0) {
    return false;
  }
  
  // Min price must be positive
  if (typeof c.minPrice !== 'number' || c.minPrice <= 0) {
    return false;
  }
  
  // Stop loss buffer must be non-negative percentage
  if (
    typeof c.stopLossBuffer !== 'number' ||
    c.stopLossBuffer < 0 ||
    c.stopLossBuffer > 100
  ) {
    return false;
  }
  
  // Targets must be positive and in ascending order
  if (
    typeof c.target1Percent !== 'number' ||
    typeof c.target2Percent !== 'number' ||
    typeof c.target3Percent !== 'number' ||
    c.target1Percent <= 0 ||
    c.target2Percent <= c.target1Percent ||
    c.target3Percent <= c.target2Percent
  ) {
    return false;
  }
  
  // Position sizes must be positive
  if (
    typeof c.defaultPositionSize !== 'number' ||
    typeof c.maxPositionSize !== 'number' ||
    c.defaultPositionSize <= 0 ||
    c.maxPositionSize <= 0 ||
    c.defaultPositionSize > c.maxPositionSize
  ) {
    return false;
  }
  
  // Booleans
  if (
    typeof c.enableSound !== 'boolean' ||
    typeof c.enableNotifications !== 'boolean' ||
    typeof c.requireQuadConfirmation !== 'boolean' ||
    typeof c.allowCounterTrend !== 'boolean'
  ) {
    return false;
  }
  
  // Signal strength validation
  const validStrengths: SignalStrength[] = ['WEAK', 'MODERATE', 'STRONG', 'SUPER'];
  if (!validStrengths.includes(c.minNotificationStrength as SignalStrength)) {
    return false;
  }
  
  // Expiry must be positive
  if (typeof c.signalExpiryMs !== 'number' || c.signalExpiryMs <= 0) {
    return false;
  }
  
  return true;
}

/**
 * Validates a QuadSignal object for correctness.
 * Checks that all required fields are present and valid.
 * 
 * @param signal - The signal to validate
 * @returns true if signal is valid, false otherwise
 * 
 * @example
 * ```typescript
 * const signal = generateSignal(...);
 * if (isValidQuadSignal(signal)) {
 *   executeSignal(signal);
 * }
 * ```
 */
export function isValidQuadSignal(signal: unknown): signal is QuadSignal {
  if (!signal || typeof signal !== 'object') {
    return false;
  }
  
  const s = signal as Partial<QuadSignal>;
  
  // Required string fields
  if (
    typeof s.id !== 'string' ||
    s.id.length === 0 ||
    typeof s.symbol !== 'string' ||
    s.symbol.length === 0
  ) {
    return false;
  }
  
  // Timestamp must be positive
  if (typeof s.timestamp !== 'number' || s.timestamp <= 0) {
    return false;
  }
  
  // Signal type validation
  if (s.type !== 'LONG' && s.type !== 'SHORT') {
    return false;
  }
  
  // Signal strength validation
  const validStrengths: SignalStrength[] = ['WEAK', 'MODERATE', 'STRONG', 'SUPER'];
  if (!validStrengths.includes(s.strength as SignalStrength)) {
    return false;
  }
  
  // Price levels must be positive
  if (
    typeof s.entryPrice !== 'number' ||
    typeof s.stopLoss !== 'number' ||
    typeof s.target1 !== 'number' ||
    typeof s.target2 !== 'number' ||
    typeof s.target3 !== 'number' ||
    s.entryPrice <= 0 ||
    s.stopLoss <= 0 ||
    s.target1 <= 0 ||
    s.target2 <= 0 ||
    s.target3 <= 0
  ) {
    return false;
  }
  
  // For LONG: stop < entry < targets
  if (s.type === 'LONG') {
    if (
      s.stopLoss >= s.entryPrice ||
      s.target1 <= s.entryPrice ||
      s.target2 <= s.target1 ||
      s.target3 <= s.target2
    ) {
      return false;
    }
  }
  
  // For SHORT: targets < entry < stop
  if (s.type === 'SHORT') {
    if (
      s.stopLoss <= s.entryPrice ||
      s.target1 >= s.entryPrice ||
      s.target2 >= s.target1 ||
      s.target3 >= s.target2
    ) {
      return false;
    }
  }
  
  // Confluence must be present
  if (!s.confluence || typeof s.confluence !== 'object') {
    return false;
  }
  
  // Confluence score must be non-negative integer
  if (
    typeof s.confluenceScore !== 'number' ||
    s.confluenceScore < 0 ||
    !Number.isInteger(s.confluenceScore)
  ) {
    return false;
  }
  
  // Stoch states must be present
  if (!s.stochStates || typeof s.stochStates !== 'object') {
    return false;
  }
  
  // Validate each stoch state
  const bands = ['fast', 'standard', 'medium', 'slow'] as const;
  for (const band of bands) {
    const state = s.stochStates[band];
    if (
      !state ||
      typeof state.k !== 'number' ||
      typeof state.d !== 'number' ||
      state.k < 0 ||
      state.k > 100 ||
      state.d < 0 ||
      state.d > 100
    ) {
      return false;
    }
  }
  
  // Status validation
  const validStatuses: SignalStatus[] = [
    'PENDING',
    'ACTIVE',
    'PARTIAL',
    'TARGET1_HIT',
    'TARGET2_HIT',
    'TARGET3_HIT',
    'STOPPED',
    'EXPIRED',
  ];
  if (!validStatuses.includes(s.status as SignalStatus)) {
    return false;
  }
  
  // Risk/reward must be positive
  if (typeof s.riskRewardRatio !== 'number' || s.riskRewardRatio <= 0) {
    return false;
  }
  
  // Position size must be positive
  if (typeof s.positionSize !== 'number' || s.positionSize <= 0) {
    return false;
  }
  
  // P&L can be any number (including negative)
  if (
    typeof s.pnlPercent !== 'number' ||
    typeof s.pnlAmount !== 'number'
  ) {
    return false;
  }
  
  return true;
}

// =============================================================================
// Helper Types
// =============================================================================

/**
 * Partial signal used during signal construction.
 */
export type PartialQuadSignal = Partial<QuadSignal> & {
  symbol: string;
  type: SignalType;
  entryPrice: number;
};

/**
 * Signal update payload for modifying existing signals.
 */
export interface SignalUpdate {
  id: string;
  status?: SignalStatus;
  actualEntry?: number;
  actualExit?: number;
  entryTime?: number;
  exitTime?: number;
  pnlPercent?: number;
  pnlAmount?: number;
  notes?: string;
}

/**
 * Summary statistics for signal performance.
 */
export interface SignalStatistics {
  totalSignals: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  avgWinPercent: number;
  avgLossPercent: number;
  profitFactor: number;
  expectancy: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}
