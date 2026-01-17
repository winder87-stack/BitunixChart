/**
 * Technical Indicator Type Definitions
 * 
 * Comprehensive type system for 25 technical indicators including:
 * - Trend indicators (SMA, EMA, etc.)
 * - Momentum indicators (RSI, MACD, etc.)
 * - Volatility indicators (ATR, Bollinger Bands, etc.)
 * - Volume indicators (OBV, VWAP, etc.)
 */

// =============================================================================
// Base Types
// =============================================================================

/**
 * All available indicator types
 */
export type IndicatorType =
  // Trend Indicators
  | 'SMA'        // Simple Moving Average
  | 'EMA'        // Exponential Moving Average
  | 'WMA'        // Weighted Moving Average
  | 'VWMA'       // Volume Weighted Moving Average
  | 'HMA'        // Hull Moving Average
  | 'DEMA'       // Double EMA
  | 'TEMA'       // Triple EMA
  | 'SUPERTREND' // Supertrend
  | 'ICHIMOKU'   // Ichimoku Cloud
  // Momentum Indicators
  | 'RSI'        // Relative Strength Index
  | 'MACD'       // Moving Average Convergence Divergence
  | 'STOCH'      // Stochastic Oscillator
  | 'STOCHRSI'   // Stochastic RSI
  | 'CCI'        // Commodity Channel Index
  | 'WILLR'      // Williams %R
  | 'ROC'        // Rate of Change
  | 'MOM'        // Momentum
  | 'AO'         // Awesome Oscillator
  | 'UO'         // Ultimate Oscillator
  | 'ADX'        // Average Directional Index
  // Volatility Indicators
  | 'BB'         // Bollinger Bands
  | 'ATR'        // Average True Range
  | 'KC'         // Keltner Channel
  | 'PSAR'       // Parabolic SAR
  // Volume Indicators
  | 'OBV'        // On-Balance Volume
  | 'VWAP'       // Volume Weighted Average Price
  | 'CMF'        // Chaikin Money Flow
  | 'MFI'        // Money Flow Index
  | 'AD'         // Accumulation/Distribution
  | 'VOLUME';    // Volume Bars

/**
 * Indicator category for grouping in UI
 */
export type IndicatorCategory = 
  | 'trend'      // Trend-following indicators
  | 'momentum'   // Momentum/oscillator indicators
  | 'volatility' // Volatility indicators
  | 'volume'     // Volume-based indicators
  | 'custom';    // User-defined/custom indicators

/**
 * Where the indicator is displayed on the chart
 */
export type IndicatorPlacement = 
  | 'overlay'    // Drawn on the main price chart
  | 'separate';  // Drawn in a separate pane below

/**
 * Line style for drawing
 */
export type LineStyle = 
  | 'solid' 
  | 'dashed' 
  | 'dotted';

/**
 * Indicator output type (how it's drawn)
 */
export type OutputType = 
  | 'line'       // Single line
  | 'histogram'  // Histogram bars
  | 'band'       // Upper/lower bands (like BB)
  | 'cloud'      // Filled area between lines (like Ichimoku)
  | 'dots'       // Individual dots (like PSAR)
  | 'area';      // Filled area under line

// =============================================================================
// Style Configuration
// =============================================================================

/**
 * Style configuration for indicator visualization
 */
export interface IndicatorStyle {
  /** Primary color (hex) */
  color: string;
  
  /** Line width in pixels */
  lineWidth: number;
  
  /** Opacity (0-1) */
  opacity: number;
  
  /** Line style */
  lineStyle?: LineStyle;
  
  /** Additional colors for multi-output indicators */
  colors?: Record<string, string>;
}

/**
 * Default style presets for different indicator types
 */
export const DEFAULT_INDICATOR_STYLES: Record<IndicatorCategory, IndicatorStyle> = {
  trend: {
    color: '#2962ff',
    lineWidth: 2,
    opacity: 1,
    lineStyle: 'solid',
  },
  momentum: {
    color: '#7c4dff',
    lineWidth: 1,
    opacity: 1,
    lineStyle: 'solid',
  },
  volatility: {
    color: '#ff6d00',
    lineWidth: 1,
    opacity: 0.8,
    lineStyle: 'solid',
  },
  volume: {
    color: '#00bfa5',
    lineWidth: 1,
    opacity: 0.7,
    lineStyle: 'solid',
  },
  custom: {
    color: '#9c27b0',
    lineWidth: 2,
    opacity: 1,
    lineStyle: 'solid',
  },
};

/**
 * Color palette for multiple indicators
 */
export const INDICATOR_COLOR_PALETTE = [
  '#2962ff', // Blue
  '#ff6d00', // Orange
  '#00bfa5', // Teal
  '#aa00ff', // Purple
  '#00c853', // Green
  '#ff1744', // Red
  '#ffd600', // Yellow
  '#00b8d4', // Cyan
  '#ff4081', // Pink
  '#76ff03', // Light Green
];

// =============================================================================
// Parameter Definition
// =============================================================================

/**
 * Parameter input type
 */
export type ParamType = 'number' | 'select' | 'boolean' | 'color';

/**
 * Select option for dropdown parameters
 */
export interface SelectOption {
  value: string | number;
  label: string;
}

/**
 * Parameter definition for indicator configuration UI
 */
export interface ParamDefinition {
  /** Parameter key (used in params object) */
  key: string;
  
  /** Display label */
  label: string;
  
  /** Parameter type */
  type: ParamType;
  
  /** Default value */
  default: number | string | boolean;
  
  /** Minimum value (for number type) */
  min?: number;
  
  /** Maximum value (for number type) */
  max?: number;
  
  /** Step increment (for number type) */
  step?: number;
  
  /** Available options (for select type) */
  options?: SelectOption[];
  
  /** Help text/tooltip */
  description?: string;
  
  /** Group name for organizing related params */
  group?: string;
}

// =============================================================================
// Indicator Configuration
// =============================================================================

/**
 * Runtime configuration for an indicator instance
 */
export interface IndicatorConfig {
  /** Unique instance identifier */
  id: string;
  
  /** Indicator type */
  type: IndicatorType;
  
  /** Whether the indicator is active/calculating */
  enabled: boolean;
  
  /** Whether the indicator is visible on chart */
  visible: boolean;
  
  /** Indicator parameters */
  params: Record<string, number | string | boolean>;
  
  /** Visual style configuration */
  style: IndicatorStyle;
  
  /** Custom label (optional) */
  label?: string;
  
  /** Creation timestamp */
  createdAt: number;
  
  /** Last modified timestamp */
  updatedAt: number;
}

/**
 * Create a new indicator config with defaults
 */
export function createIndicatorConfig(
  type: IndicatorType,
  overrides?: Partial<IndicatorConfig>
): IndicatorConfig {
  const definition = INDICATOR_DEFINITIONS[type];
  const category = definition?.category || 'custom';
  
  return {
    id: generateIndicatorId(),
    type,
    enabled: true,
    visible: true,
    params: { ...definition?.defaultParams },
    style: { ...DEFAULT_INDICATOR_STYLES[category] },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

/**
 * Generate unique indicator ID
 */
export function generateIndicatorId(): string {
  return `ind_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// =============================================================================
// Indicator Output Definition
// =============================================================================

/**
 * Definition for a single output series of an indicator
 */
export interface OutputDefinition {
  /** Output key (used in result values) */
  key: string;
  
  /** Display name */
  name: string;
  
  /** How this output is drawn */
  type: OutputType;
  
  /** Default color */
  color: string;
  
  /** Line width */
  lineWidth?: number;
  
  /** For band/cloud types - the paired output */
  pairedWith?: string;
}

// =============================================================================
// Indicator Definition (Metadata)
// =============================================================================

/**
 * Complete metadata definition for an indicator
 */
export interface IndicatorDefinition {
  /** Indicator type identifier */
  type: IndicatorType;
  
  /** Full display name */
  name: string;
  
  /** Short name for compact display */
  shortName: string;
  
  /** Category for grouping */
  category: IndicatorCategory;
  
  /** Where to display on chart */
  placement: IndicatorPlacement;
  
  /** Default parameter values */
  defaultParams: Record<string, number | string | boolean>;
  
  /** Parameter definitions for UI */
  paramDefinitions: ParamDefinition[];
  
  /** Description for tooltips/help */
  description: string;
  
  /** Output series names */
  outputs: string[];
  
  /** Detailed output definitions */
  outputDefinitions?: OutputDefinition[];
  
  /** Minimum data points required */
  minDataPoints?: number;
  
  /** Whether this indicator requires volume data */
  requiresVolume?: boolean;
}

// =============================================================================
// Indicator Result
// =============================================================================

/**
 * Single data point result from indicator calculation
 */
export interface IndicatorResult {
  /** Timestamp (Unix seconds for chart) */
  time: number;
  
  /** Calculated values keyed by output name */
  values: Record<string, number | null>;
}

/**
 * Complete indicator calculation output
 */
export interface IndicatorOutput {
  /** Indicator instance ID */
  indicatorId: string;
  
  /** Indicator type */
  type: IndicatorType;
  
  /** Array of results */
  data: IndicatorResult[];
  
  /** Calculation metadata */
  meta: {
    /** Parameters used for calculation */
    params: Record<string, number | string | boolean>;
    
    /** Start time of data */
    startTime: number;
    
    /** End time of data */
    endTime: number;
    
    /** Number of data points */
    dataPoints: number;
    
    /** Calculation duration in ms */
    calculationTime: number;
  };
}

// =============================================================================
// Indicator Definitions
// =============================================================================

/**
 * Complete definitions for all 25+ indicators
 */
export const INDICATOR_DEFINITIONS: Record<IndicatorType, IndicatorDefinition> = {
  // ===========================================================================
  // TREND INDICATORS
  // ===========================================================================
  
  SMA: {
    type: 'SMA',
    name: 'Simple Moving Average',
    shortName: 'SMA',
    category: 'trend',
    placement: 'overlay',
    description: 'Average price over a specified number of periods. Smooths price data to identify trend direction.',
    defaultParams: { period: 20, source: 'close' },
    paramDefinitions: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 20,
        min: 1,
        max: 500,
        step: 1,
        description: 'Number of periods to average',
      },
      {
        key: 'source',
        label: 'Source',
        type: 'select',
        default: 'close',
        options: [
          { value: 'open', label: 'Open' },
          { value: 'high', label: 'High' },
          { value: 'low', label: 'Low' },
          { value: 'close', label: 'Close' },
          { value: 'hl2', label: 'HL/2' },
          { value: 'hlc3', label: 'HLC/3' },
          { value: 'ohlc4', label: 'OHLC/4' },
        ],
      },
    ],
    outputs: ['sma'],
    outputDefinitions: [
      { key: 'sma', name: 'SMA', type: 'line', color: '#2962ff' },
    ],
    minDataPoints: 20,
  },

  EMA: {
    type: 'EMA',
    name: 'Exponential Moving Average',
    shortName: 'EMA',
    category: 'trend',
    placement: 'overlay',
    description: 'Weighted moving average giving more weight to recent prices. Reacts faster than SMA.',
    defaultParams: { period: 20, source: 'close' },
    paramDefinitions: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 20,
        min: 1,
        max: 500,
        step: 1,
      },
      {
        key: 'source',
        label: 'Source',
        type: 'select',
        default: 'close',
        options: [
          { value: 'open', label: 'Open' },
          { value: 'high', label: 'High' },
          { value: 'low', label: 'Low' },
          { value: 'close', label: 'Close' },
          { value: 'hl2', label: 'HL/2' },
          { value: 'hlc3', label: 'HLC/3' },
          { value: 'ohlc4', label: 'OHLC/4' },
        ],
      },
    ],
    outputs: ['ema'],
    outputDefinitions: [
      { key: 'ema', name: 'EMA', type: 'line', color: '#ff6d00' },
    ],
    minDataPoints: 20,
  },

  WMA: {
    type: 'WMA',
    name: 'Weighted Moving Average',
    shortName: 'WMA',
    category: 'trend',
    placement: 'overlay',
    description: 'Moving average with linearly weighted values, emphasizing recent prices.',
    defaultParams: { period: 20, source: 'close' },
    paramDefinitions: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 20,
        min: 1,
        max: 500,
        step: 1,
      },
      {
        key: 'source',
        label: 'Source',
        type: 'select',
        default: 'close',
        options: [
          { value: 'close', label: 'Close' },
          { value: 'open', label: 'Open' },
          { value: 'high', label: 'High' },
          { value: 'low', label: 'Low' },
        ],
      },
    ],
    outputs: ['wma'],
    minDataPoints: 20,
  },

  VWMA: {
    type: 'VWMA',
    name: 'Volume Weighted Moving Average',
    shortName: 'VWMA',
    category: 'trend',
    placement: 'overlay',
    description: 'Moving average weighted by volume. Gives more weight to periods with higher volume.',
    defaultParams: { period: 20 },
    paramDefinitions: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 20,
        min: 1,
        max: 500,
        step: 1,
      },
    ],
    outputs: ['vwma'],
    minDataPoints: 20,
    requiresVolume: true,
  },

  HMA: {
    type: 'HMA',
    name: 'Hull Moving Average',
    shortName: 'HMA',
    category: 'trend',
    placement: 'overlay',
    description: 'Smooth moving average that reduces lag while maintaining smoothness.',
    defaultParams: { period: 20 },
    paramDefinitions: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 20,
        min: 2,
        max: 500,
        step: 1,
      },
    ],
    outputs: ['hma'],
    minDataPoints: 20,
  },

  DEMA: {
    type: 'DEMA',
    name: 'Double Exponential Moving Average',
    shortName: 'DEMA',
    category: 'trend',
    placement: 'overlay',
    description: 'EMA applied twice to reduce lag in trending markets.',
    defaultParams: { period: 20 },
    paramDefinitions: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 20,
        min: 1,
        max: 500,
        step: 1,
      },
    ],
    outputs: ['dema'],
    minDataPoints: 40,
  },

  TEMA: {
    type: 'TEMA',
    name: 'Triple Exponential Moving Average',
    shortName: 'TEMA',
    category: 'trend',
    placement: 'overlay',
    description: 'Triple-smoothed EMA with minimal lag.',
    defaultParams: { period: 20 },
    paramDefinitions: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 20,
        min: 1,
        max: 500,
        step: 1,
      },
    ],
    outputs: ['tema'],
    minDataPoints: 60,
  },

  SUPERTREND: {
    type: 'SUPERTREND',
    name: 'Supertrend',
    shortName: 'ST',
    category: 'trend',
    placement: 'overlay',
    description: 'Trend-following indicator that uses ATR for dynamic support/resistance.',
    defaultParams: { period: 10, multiplier: 3 },
    paramDefinitions: [
      {
        key: 'period',
        label: 'ATR Period',
        type: 'number',
        default: 10,
        min: 1,
        max: 100,
        step: 1,
      },
      {
        key: 'multiplier',
        label: 'Multiplier',
        type: 'number',
        default: 3,
        min: 0.5,
        max: 10,
        step: 0.1,
      },
    ],
    outputs: ['supertrend', 'direction'],
    outputDefinitions: [
      { key: 'supertrend', name: 'Supertrend', type: 'line', color: '#2962ff' },
      { key: 'direction', name: 'Direction', type: 'line', color: '#00c853' },
    ],
    minDataPoints: 14,
  },

  ICHIMOKU: {
    type: 'ICHIMOKU',
    name: 'Ichimoku Cloud',
    shortName: 'ICHI',
    category: 'trend',
    placement: 'overlay',
    description: 'Complete trading system showing support, resistance, momentum, and trend direction.',
    defaultParams: {
      conversionPeriod: 9,
      basePeriod: 26,
      spanPeriod: 52,
      displacement: 26,
    },
    paramDefinitions: [
      {
        key: 'conversionPeriod',
        label: 'Conversion (Tenkan)',
        type: 'number',
        default: 9,
        min: 1,
        max: 100,
        step: 1,
        group: 'Lines',
      },
      {
        key: 'basePeriod',
        label: 'Base (Kijun)',
        type: 'number',
        default: 26,
        min: 1,
        max: 200,
        step: 1,
        group: 'Lines',
      },
      {
        key: 'spanPeriod',
        label: 'Span B Period',
        type: 'number',
        default: 52,
        min: 1,
        max: 300,
        step: 1,
        group: 'Cloud',
      },
      {
        key: 'displacement',
        label: 'Displacement',
        type: 'number',
        default: 26,
        min: 1,
        max: 100,
        step: 1,
        group: 'Cloud',
      },
    ],
    outputs: ['tenkan', 'kijun', 'spanA', 'spanB', 'chikou'],
    outputDefinitions: [
      { key: 'tenkan', name: 'Tenkan-sen', type: 'line', color: '#2962ff', lineWidth: 1 },
      { key: 'kijun', name: 'Kijun-sen', type: 'line', color: '#ff6d00', lineWidth: 1 },
      { key: 'spanA', name: 'Senkou Span A', type: 'cloud', color: '#26a69a', pairedWith: 'spanB' },
      { key: 'spanB', name: 'Senkou Span B', type: 'cloud', color: '#ef5350', pairedWith: 'spanA' },
      { key: 'chikou', name: 'Chikou Span', type: 'line', color: '#7c4dff', lineWidth: 1 },
    ],
    minDataPoints: 52,
  },

  // ===========================================================================
  // MOMENTUM INDICATORS
  // ===========================================================================

  RSI: {
    type: 'RSI',
    name: 'Relative Strength Index',
    shortName: 'RSI',
    category: 'momentum',
    placement: 'separate',
    description: 'Momentum oscillator measuring speed and magnitude of price movements. Range 0-100.',
    defaultParams: { period: 14, overbought: 70, oversold: 30 },
    paramDefinitions: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 14,
        min: 2,
        max: 100,
        step: 1,
      },
      {
        key: 'overbought',
        label: 'Overbought Level',
        type: 'number',
        default: 70,
        min: 50,
        max: 100,
        step: 1,
        group: 'Levels',
      },
      {
        key: 'oversold',
        label: 'Oversold Level',
        type: 'number',
        default: 30,
        min: 0,
        max: 50,
        step: 1,
        group: 'Levels',
      },
    ],
    outputs: ['rsi'],
    outputDefinitions: [
      { key: 'rsi', name: 'RSI', type: 'line', color: '#7c4dff' },
    ],
    minDataPoints: 14,
  },

  MACD: {
    type: 'MACD',
    name: 'Moving Average Convergence Divergence',
    shortName: 'MACD',
    category: 'momentum',
    placement: 'separate',
    description: 'Trend-following momentum indicator showing relationship between two EMAs.',
    defaultParams: {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    },
    paramDefinitions: [
      {
        key: 'fastPeriod',
        label: 'Fast Period',
        type: 'number',
        default: 12,
        min: 1,
        max: 100,
        step: 1,
      },
      {
        key: 'slowPeriod',
        label: 'Slow Period',
        type: 'number',
        default: 26,
        min: 1,
        max: 200,
        step: 1,
      },
      {
        key: 'signalPeriod',
        label: 'Signal Period',
        type: 'number',
        default: 9,
        min: 1,
        max: 50,
        step: 1,
      },
    ],
    outputs: ['macd', 'signal', 'histogram'],
    outputDefinitions: [
      { key: 'macd', name: 'MACD Line', type: 'line', color: '#2962ff', lineWidth: 2 },
      { key: 'signal', name: 'Signal Line', type: 'line', color: '#ff6d00', lineWidth: 1 },
      { key: 'histogram', name: 'Histogram', type: 'histogram', color: '#26a69a' },
    ],
    minDataPoints: 35,
  },

  STOCH: {
    type: 'STOCH',
    name: 'Stochastic Oscillator',
    shortName: 'STOCH',
    category: 'momentum',
    placement: 'separate',
    description: 'Compares closing price to price range over a period. Range 0-100.',
    defaultParams: {
      kPeriod: 14,
      dPeriod: 3,
      smooth: 3,
      overbought: 80,
      oversold: 20,
    },
    paramDefinitions: [
      {
        key: 'kPeriod',
        label: '%K Period',
        type: 'number',
        default: 14,
        min: 1,
        max: 100,
        step: 1,
      },
      {
        key: 'dPeriod',
        label: '%D Period',
        type: 'number',
        default: 3,
        min: 1,
        max: 50,
        step: 1,
      },
      {
        key: 'smooth',
        label: 'Smoothing',
        type: 'number',
        default: 3,
        min: 1,
        max: 20,
        step: 1,
      },
      {
        key: 'overbought',
        label: 'Overbought',
        type: 'number',
        default: 80,
        min: 50,
        max: 100,
        step: 1,
        group: 'Levels',
      },
      {
        key: 'oversold',
        label: 'Oversold',
        type: 'number',
        default: 20,
        min: 0,
        max: 50,
        step: 1,
        group: 'Levels',
      },
    ],
    outputs: ['k', 'd'],
    outputDefinitions: [
      { key: 'k', name: '%K', type: 'line', color: '#2962ff', lineWidth: 2 },
      { key: 'd', name: '%D', type: 'line', color: '#ff6d00', lineWidth: 1 },
    ],
    minDataPoints: 14,
  },

  STOCHRSI: {
    type: 'STOCHRSI',
    name: 'Stochastic RSI',
    shortName: 'StochRSI',
    category: 'momentum',
    placement: 'separate',
    description: 'Stochastic applied to RSI values. More sensitive than standard RSI.',
    defaultParams: {
      rsiPeriod: 14,
      stochPeriod: 14,
      kPeriod: 3,
      dPeriod: 3,
    },
    paramDefinitions: [
      {
        key: 'rsiPeriod',
        label: 'RSI Period',
        type: 'number',
        default: 14,
        min: 2,
        max: 100,
        step: 1,
      },
      {
        key: 'stochPeriod',
        label: 'Stoch Period',
        type: 'number',
        default: 14,
        min: 1,
        max: 100,
        step: 1,
      },
      {
        key: 'kPeriod',
        label: '%K Smoothing',
        type: 'number',
        default: 3,
        min: 1,
        max: 20,
        step: 1,
      },
      {
        key: 'dPeriod',
        label: '%D Period',
        type: 'number',
        default: 3,
        min: 1,
        max: 20,
        step: 1,
      },
    ],
    outputs: ['k', 'd'],
    outputDefinitions: [
      { key: 'k', name: '%K', type: 'line', color: '#2962ff' },
      { key: 'd', name: '%D', type: 'line', color: '#ff6d00' },
    ],
    minDataPoints: 28,
  },

  CCI: {
    type: 'CCI',
    name: 'Commodity Channel Index',
    shortName: 'CCI',
    category: 'momentum',
    placement: 'separate',
    description: 'Measures deviation from statistical mean. Unbounded oscillator.',
    defaultParams: { period: 20, overbought: 100, oversold: -100 },
    paramDefinitions: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 20,
        min: 2,
        max: 200,
        step: 1,
      },
      {
        key: 'overbought',
        label: 'Overbought',
        type: 'number',
        default: 100,
        min: 50,
        max: 300,
        step: 10,
        group: 'Levels',
      },
      {
        key: 'oversold',
        label: 'Oversold',
        type: 'number',
        default: -100,
        min: -300,
        max: -50,
        step: 10,
        group: 'Levels',
      },
    ],
    outputs: ['cci'],
    minDataPoints: 20,
  },

  WILLR: {
    type: 'WILLR',
    name: "Williams %R",
    shortName: '%R',
    category: 'momentum',
    placement: 'separate',
    description: 'Momentum indicator similar to Stochastic. Range -100 to 0.',
    defaultParams: { period: 14, overbought: -20, oversold: -80 },
    paramDefinitions: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 14,
        min: 1,
        max: 100,
        step: 1,
      },
      {
        key: 'overbought',
        label: 'Overbought',
        type: 'number',
        default: -20,
        min: -50,
        max: 0,
        step: 5,
        group: 'Levels',
      },
      {
        key: 'oversold',
        label: 'Oversold',
        type: 'number',
        default: -80,
        min: -100,
        max: -50,
        step: 5,
        group: 'Levels',
      },
    ],
    outputs: ['willr'],
    minDataPoints: 14,
  },

  ROC: {
    type: 'ROC',
    name: 'Rate of Change',
    shortName: 'ROC',
    category: 'momentum',
    placement: 'separate',
    description: 'Percentage change between current and past price.',
    defaultParams: { period: 12 },
    paramDefinitions: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 12,
        min: 1,
        max: 200,
        step: 1,
      },
    ],
    outputs: ['roc'],
    minDataPoints: 12,
  },

  MOM: {
    type: 'MOM',
    name: 'Momentum',
    shortName: 'MOM',
    category: 'momentum',
    placement: 'separate',
    description: 'Difference between current and past price.',
    defaultParams: { period: 10 },
    paramDefinitions: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 10,
        min: 1,
        max: 200,
        step: 1,
      },
    ],
    outputs: ['momentum'],
    minDataPoints: 10,
  },

  AO: {
    type: 'AO',
    name: 'Awesome Oscillator',
    shortName: 'AO',
    category: 'momentum',
    placement: 'separate',
    description: 'Difference between 5-period and 34-period SMA of median price.',
    defaultParams: { fastPeriod: 5, slowPeriod: 34 },
    paramDefinitions: [
      {
        key: 'fastPeriod',
        label: 'Fast Period',
        type: 'number',
        default: 5,
        min: 1,
        max: 50,
        step: 1,
      },
      {
        key: 'slowPeriod',
        label: 'Slow Period',
        type: 'number',
        default: 34,
        min: 10,
        max: 200,
        step: 1,
      },
    ],
    outputs: ['ao'],
    outputDefinitions: [
      { key: 'ao', name: 'AO', type: 'histogram', color: '#26a69a' },
    ],
    minDataPoints: 34,
  },

  UO: {
    type: 'UO',
    name: 'Ultimate Oscillator',
    shortName: 'UO',
    category: 'momentum',
    placement: 'separate',
    description: 'Multi-timeframe momentum oscillator using three periods.',
    defaultParams: {
      period1: 7,
      period2: 14,
      period3: 28,
      weight1: 4,
      weight2: 2,
      weight3: 1,
    },
    paramDefinitions: [
      {
        key: 'period1',
        label: 'Period 1 (Short)',
        type: 'number',
        default: 7,
        min: 1,
        max: 50,
        step: 1,
      },
      {
        key: 'period2',
        label: 'Period 2 (Mid)',
        type: 'number',
        default: 14,
        min: 1,
        max: 100,
        step: 1,
      },
      {
        key: 'period3',
        label: 'Period 3 (Long)',
        type: 'number',
        default: 28,
        min: 1,
        max: 200,
        step: 1,
      },
    ],
    outputs: ['uo'],
    minDataPoints: 28,
  },

  ADX: {
    type: 'ADX',
    name: 'Average Directional Index',
    shortName: 'ADX',
    category: 'momentum',
    placement: 'separate',
    description: 'Measures trend strength regardless of direction. 0-100 range.',
    defaultParams: { period: 14 },
    paramDefinitions: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 14,
        min: 2,
        max: 100,
        step: 1,
      },
    ],
    outputs: ['adx', 'pdi', 'mdi'],
    outputDefinitions: [
      { key: 'adx', name: 'ADX', type: 'line', color: '#2962ff', lineWidth: 2 },
      { key: 'pdi', name: '+DI', type: 'line', color: '#26a69a', lineWidth: 1 },
      { key: 'mdi', name: '-DI', type: 'line', color: '#ef5350', lineWidth: 1 },
    ],
    minDataPoints: 28,
  },

  // ===========================================================================
  // VOLATILITY INDICATORS
  // ===========================================================================

  BB: {
    type: 'BB',
    name: 'Bollinger Bands',
    shortName: 'BB',
    category: 'volatility',
    placement: 'overlay',
    description: 'Volatility bands placed above and below a moving average using standard deviation.',
    defaultParams: { period: 20, stdDev: 2, source: 'close' },
    paramDefinitions: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 20,
        min: 2,
        max: 200,
        step: 1,
      },
      {
        key: 'stdDev',
        label: 'Std Dev Multiplier',
        type: 'number',
        default: 2,
        min: 0.5,
        max: 5,
        step: 0.1,
      },
      {
        key: 'source',
        label: 'Source',
        type: 'select',
        default: 'close',
        options: [
          { value: 'close', label: 'Close' },
          { value: 'open', label: 'Open' },
          { value: 'high', label: 'High' },
          { value: 'low', label: 'Low' },
        ],
      },
    ],
    outputs: ['upper', 'middle', 'lower'],
    outputDefinitions: [
      { key: 'upper', name: 'Upper Band', type: 'band', color: '#2962ff', pairedWith: 'lower' },
      { key: 'middle', name: 'Middle (SMA)', type: 'line', color: '#ff6d00' },
      { key: 'lower', name: 'Lower Band', type: 'band', color: '#2962ff', pairedWith: 'upper' },
    ],
    minDataPoints: 20,
  },

  ATR: {
    type: 'ATR',
    name: 'Average True Range',
    shortName: 'ATR',
    category: 'volatility',
    placement: 'separate',
    description: 'Measures market volatility by decomposing entire range of an asset.',
    defaultParams: { period: 14 },
    paramDefinitions: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 14,
        min: 1,
        max: 100,
        step: 1,
      },
    ],
    outputs: ['atr'],
    minDataPoints: 14,
  },

  KC: {
    type: 'KC',
    name: 'Keltner Channel',
    shortName: 'KC',
    category: 'volatility',
    placement: 'overlay',
    description: 'Volatility-based envelope set above and below an EMA using ATR.',
    defaultParams: { period: 20, atrPeriod: 10, multiplier: 2 },
    paramDefinitions: [
      {
        key: 'period',
        label: 'EMA Period',
        type: 'number',
        default: 20,
        min: 2,
        max: 200,
        step: 1,
      },
      {
        key: 'atrPeriod',
        label: 'ATR Period',
        type: 'number',
        default: 10,
        min: 1,
        max: 100,
        step: 1,
      },
      {
        key: 'multiplier',
        label: 'ATR Multiplier',
        type: 'number',
        default: 2,
        min: 0.5,
        max: 5,
        step: 0.1,
      },
    ],
    outputs: ['upper', 'middle', 'lower'],
    outputDefinitions: [
      { key: 'upper', name: 'Upper', type: 'band', color: '#ff6d00', pairedWith: 'lower' },
      { key: 'middle', name: 'Middle (EMA)', type: 'line', color: '#2962ff' },
      { key: 'lower', name: 'Lower', type: 'band', color: '#ff6d00', pairedWith: 'upper' },
    ],
    minDataPoints: 20,
  },

  PSAR: {
    type: 'PSAR',
    name: 'Parabolic SAR',
    shortName: 'PSAR',
    category: 'volatility',
    placement: 'overlay',
    description: 'Stop and reverse system that trails price to identify potential reversals.',
    defaultParams: { step: 0.02, max: 0.2 },
    paramDefinitions: [
      {
        key: 'step',
        label: 'Acceleration Step',
        type: 'number',
        default: 0.02,
        min: 0.01,
        max: 0.1,
        step: 0.01,
      },
      {
        key: 'max',
        label: 'Maximum Acceleration',
        type: 'number',
        default: 0.2,
        min: 0.1,
        max: 0.5,
        step: 0.05,
      },
    ],
    outputs: ['psar', 'trend'],
    outputDefinitions: [
      { key: 'psar', name: 'PSAR', type: 'dots', color: '#2962ff' },
      { key: 'trend', name: 'Trend', type: 'line', color: '#26a69a' },
    ],
    minDataPoints: 5,
  },

  // ===========================================================================
  // VOLUME INDICATORS
  // ===========================================================================

  OBV: {
    type: 'OBV',
    name: 'On-Balance Volume',
    shortName: 'OBV',
    category: 'volume',
    placement: 'separate',
    description: 'Cumulative volume flow indicator that adds/subtracts volume based on price direction.',
    defaultParams: {},
    paramDefinitions: [],
    outputs: ['obv'],
    minDataPoints: 2,
    requiresVolume: true,
  },

  VWAP: {
    type: 'VWAP',
    name: 'Volume Weighted Average Price',
    shortName: 'VWAP',
    category: 'volume',
    placement: 'overlay',
    description: 'Average price weighted by volume. Resets daily for intraday trading.',
    defaultParams: { resetDaily: true },
    paramDefinitions: [
      {
        key: 'resetDaily',
        label: 'Reset Daily',
        type: 'boolean',
        default: true,
        description: 'Reset VWAP calculation at the start of each day',
      },
    ],
    outputs: ['vwap'],
    outputDefinitions: [
      { key: 'vwap', name: 'VWAP', type: 'line', color: '#2962ff', lineWidth: 2 },
    ],
    minDataPoints: 1,
    requiresVolume: true,
  },

  CMF: {
    type: 'CMF',
    name: 'Chaikin Money Flow',
    shortName: 'CMF',
    category: 'volume',
    placement: 'separate',
    description: 'Measures accumulation/distribution over a period. Range -1 to +1.',
    defaultParams: { period: 20 },
    paramDefinitions: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 20,
        min: 2,
        max: 100,
        step: 1,
      },
    ],
    outputs: ['cmf'],
    minDataPoints: 20,
    requiresVolume: true,
  },

  MFI: {
    type: 'MFI',
    name: 'Money Flow Index',
    shortName: 'MFI',
    category: 'volume',
    placement: 'separate',
    description: 'Volume-weighted RSI. Range 0-100.',
    defaultParams: { period: 14, overbought: 80, oversold: 20 },
    paramDefinitions: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 14,
        min: 2,
        max: 100,
        step: 1,
      },
      {
        key: 'overbought',
        label: 'Overbought',
        type: 'number',
        default: 80,
        min: 50,
        max: 100,
        step: 5,
        group: 'Levels',
      },
      {
        key: 'oversold',
        label: 'Oversold',
        type: 'number',
        default: 20,
        min: 0,
        max: 50,
        step: 5,
        group: 'Levels',
      },
    ],
    outputs: ['mfi'],
    minDataPoints: 14,
    requiresVolume: true,
  },

  AD: {
    type: 'AD',
    name: 'Accumulation/Distribution',
    shortName: 'A/D',
    category: 'volume',
    placement: 'separate',
    description: 'Cumulative indicator that uses volume flow to assess buying/selling pressure.',
    defaultParams: {},
    paramDefinitions: [],
    outputs: ['ad'],
    minDataPoints: 1,
    requiresVolume: true,
  },

  VOLUME: {
    type: 'VOLUME',
    name: 'Volume',
    shortName: 'VOL',
    category: 'volume',
    placement: 'separate',
    description: 'Trading volume with color based on price direction.',
    defaultParams: { showMA: true, maPeriod: 20 },
    paramDefinitions: [
      {
        key: 'showMA',
        label: 'Show MA',
        type: 'boolean',
        default: true,
        description: 'Show moving average of volume',
      },
      {
        key: 'maPeriod',
        label: 'MA Period',
        type: 'number',
        default: 20,
        min: 2,
        max: 100,
        step: 1,
      },
    ],
    outputs: ['volume', 'ma'],
    outputDefinitions: [
      { key: 'volume', name: 'Volume', type: 'histogram', color: '#26a69a' },
      { key: 'ma', name: 'Volume MA', type: 'line', color: '#ff6d00' },
    ],
    minDataPoints: 1,
    requiresVolume: true,
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get indicator definition by type
 */
export function getIndicatorDefinition(type: IndicatorType): IndicatorDefinition {
  return INDICATOR_DEFINITIONS[type];
}

/**
 * Get all indicators by category
 */
export function getIndicatorsByCategory(category: IndicatorCategory): IndicatorDefinition[] {
  return Object.values(INDICATOR_DEFINITIONS).filter(def => def.category === category);
}

/**
 * Get all overlay indicators
 */
export function getOverlayIndicators(): IndicatorDefinition[] {
  return Object.values(INDICATOR_DEFINITIONS).filter(def => def.placement === 'overlay');
}

/**
 * Get all separate pane indicators
 */
export function getSeparateIndicators(): IndicatorDefinition[] {
  return Object.values(INDICATOR_DEFINITIONS).filter(def => def.placement === 'separate');
}

/**
 * Get indicators that require volume data
 */
export function getVolumeRequiredIndicators(): IndicatorDefinition[] {
  return Object.values(INDICATOR_DEFINITIONS).filter(def => def.requiresVolume);
}

/**
 * Get all indicator types as array
 */
export function getAllIndicatorTypes(): IndicatorType[] {
  return Object.keys(INDICATOR_DEFINITIONS) as IndicatorType[];
}

/**
 * Get indicator categories with their indicators
 */
export function getIndicatorsByCategories(): Record<IndicatorCategory, IndicatorDefinition[]> {
  const categories: IndicatorCategory[] = ['trend', 'momentum', 'volatility', 'volume'];
  const result: Record<IndicatorCategory, IndicatorDefinition[]> = {
    trend: [],
    momentum: [],
    volatility: [],
    volume: [],
    custom: [],
  };

  for (const category of categories) {
    result[category] = getIndicatorsByCategory(category);
  }

  return result;
}

/**
 * Validate indicator params against definition
 */
export function validateIndicatorParams(
  type: IndicatorType,
  params: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const definition = INDICATOR_DEFINITIONS[type];
  const errors: string[] = [];

  if (!definition) {
    return { valid: false, errors: [`Unknown indicator type: ${type}`] };
  }

  for (const paramDef of definition.paramDefinitions) {
    const value = params[paramDef.key];

    if (value === undefined) {
      // Use default value
      continue;
    }

    if (paramDef.type === 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push(`${paramDef.label} must be a number`);
        continue;
      }
      if (paramDef.min !== undefined && numValue < paramDef.min) {
        errors.push(`${paramDef.label} must be at least ${paramDef.min}`);
      }
      if (paramDef.max !== undefined && numValue > paramDef.max) {
        errors.push(`${paramDef.label} must be at most ${paramDef.max}`);
      }
    }

    if (paramDef.type === 'select' && paramDef.options) {
      const validValues = paramDef.options.map(o => o.value);
      if (!validValues.includes(value as string | number)) {
        errors.push(`${paramDef.label} must be one of: ${validValues.join(', ')}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get default params for an indicator
 */
export function getDefaultParams(type: IndicatorType): Record<string, number | string | boolean> {
  const definition = INDICATOR_DEFINITIONS[type];
  return definition?.defaultParams ?? {};
}

/**
 * Format indicator label for display
 */
export function formatIndicatorLabel(config: IndicatorConfig): string {
  const definition = INDICATOR_DEFINITIONS[config.type];
  const shortName = definition?.shortName ?? config.type;
  
  // Get the main period param if exists
  const period = config.params.period;
  if (period !== undefined) {
    return `${shortName}(${period})`;
  }

  // For MACD, show all periods
  if (config.type === 'MACD') {
    const { fastPeriod, slowPeriod, signalPeriod } = config.params;
    return `MACD(${fastPeriod},${slowPeriod},${signalPeriod})`;
  }

  // For Bollinger Bands
  if (config.type === 'BB') {
    const { period, stdDev } = config.params;
    return `BB(${period},${stdDev})`;
  }

  return config.label ?? shortName;
}

/**
 * Get next available color from palette
 */
export function getNextIndicatorColor(usedColors: string[]): string {
  const availableColors = INDICATOR_COLOR_PALETTE.filter(c => !usedColors.includes(c));
  if (availableColors.length > 0) {
    return availableColors[0];
  }
  // If all colors used, cycle back
  return INDICATOR_COLOR_PALETTE[usedColors.length % INDICATOR_COLOR_PALETTE.length];
}
