/**
 * Indicator Definitions Registry
 * 
 * Complete definitions for all 25 technical indicators including:
 * - Parameter definitions with validation
 * - Default values and ranges
 * - Display properties (colors, placement)
 * - Output specifications
 */

import type {
  IndicatorType,
  IndicatorDefinition,
  IndicatorCategory,
  ParamDefinition,
} from '../../types/indicators';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a period parameter definition
 */
function periodParam(
  defaultValue: number,
  options: Partial<ParamDefinition> = {}
): ParamDefinition {
  return {
    key: 'period',
    label: 'Period',
    type: 'number',
    default: defaultValue,
    min: 1,
    max: 500,
    step: 1,
    description: 'Number of periods for calculation',
    ...options,
  };
}

/**
 * Create source parameter definition
 */
function sourceParam(defaultValue = 'close'): ParamDefinition {
  return {
    key: 'source',
    label: 'Source',
    type: 'select',
    default: defaultValue,
    options: [
      { value: 'open', label: 'Open' },
      { value: 'high', label: 'High' },
      { value: 'low', label: 'Low' },
      { value: 'close', label: 'Close' },
      { value: 'hl2', label: 'HL/2 (High+Low)/2' },
      { value: 'hlc3', label: 'HLC/3 (High+Low+Close)/3' },
      { value: 'ohlc4', label: 'OHLC/4' },
    ],
    description: 'Price source for calculation',
  };
}

/**
 * Create overbought/oversold parameter pair
 */
function overboughtOversoldParams(
  overbought: number,
  oversold: number
): ParamDefinition[] {
  return [
    {
      key: 'overbought',
      label: 'Overbought',
      type: 'number',
      default: overbought,
      min: 50,
      max: 100,
      step: 1,
      group: 'Levels',
      description: 'Overbought threshold level',
    },
    {
      key: 'oversold',
      label: 'Oversold',
      type: 'number',
      default: oversold,
      min: 0,
      max: 50,
      step: 1,
      group: 'Levels',
      description: 'Oversold threshold level',
    },
  ];
}

// =============================================================================
// Color Palette
// =============================================================================

const COLORS = {
  // Primary colors for main lines
  blue: '#2962ff',
  orange: '#ff6d00',
  teal: '#00bfa5',
  purple: '#7c4dff',
  green: '#00c853',
  red: '#ef5350',
  yellow: '#ffd600',
  cyan: '#00b8d4',
  pink: '#ff4081',
  
  // For bands/clouds
  bandFill: 'rgba(41, 98, 255, 0.1)',
  cloudGreen: 'rgba(38, 166, 154, 0.3)',
  cloudRed: 'rgba(239, 83, 80, 0.3)',
  
  // For histogram
  histogramUp: '#26a69a',
  histogramDown: '#ef5350',
};

// =============================================================================
// TREND INDICATORS
// =============================================================================

const SMA: IndicatorDefinition = {
  type: 'SMA',
  name: 'Simple Moving Average',
  shortName: 'SMA',
  category: 'trend',
  placement: 'overlay',
  description: 'The average price over a specified number of periods. Smooths price data to identify trend direction and potential support/resistance levels.',
  defaultParams: {
    period: 20,
    source: 'close',
  },
  paramDefinitions: [
    periodParam(20, { min: 1, max: 500 }),
    sourceParam(),
  ],
  outputs: ['sma'],
  outputDefinitions: [
    { key: 'sma', name: 'SMA', type: 'line', color: COLORS.blue, lineWidth: 2 },
  ],
  minDataPoints: 20,
};

const EMA: IndicatorDefinition = {
  type: 'EMA',
  name: 'Exponential Moving Average',
  shortName: 'EMA',
  category: 'trend',
  placement: 'overlay',
  description: 'A weighted moving average that gives more weight to recent prices, making it more responsive to new information than SMA.',
  defaultParams: {
    period: 20,
    source: 'close',
  },
  paramDefinitions: [
    periodParam(20),
    sourceParam(),
  ],
  outputs: ['ema'],
  outputDefinitions: [
    { key: 'ema', name: 'EMA', type: 'line', color: COLORS.orange, lineWidth: 2 },
  ],
  minDataPoints: 20,
};

const WMA: IndicatorDefinition = {
  type: 'WMA',
  name: 'Weighted Moving Average',
  shortName: 'WMA',
  category: 'trend',
  placement: 'overlay',
  description: 'A moving average with linearly weighted values, giving more weight to recent prices. Falls between SMA and EMA in responsiveness.',
  defaultParams: {
    period: 20,
    source: 'close',
  },
  paramDefinitions: [
    periodParam(20),
    sourceParam(),
  ],
  outputs: ['wma'],
  outputDefinitions: [
    { key: 'wma', name: 'WMA', type: 'line', color: COLORS.teal, lineWidth: 2 },
  ],
  minDataPoints: 20,
};

const VWAP: IndicatorDefinition = {
  type: 'VWAP',
  name: 'Volume Weighted Average Price',
  shortName: 'VWAP',
  category: 'volume',
  placement: 'overlay',
  description: 'The average price weighted by volume. Commonly used as a benchmark for institutional trading. Resets at the start of each trading day.',
  defaultParams: {
    resetDaily: true,
    showBands: false,
    bandMultiplier: 2,
  },
  paramDefinitions: [
    {
      key: 'resetDaily',
      label: 'Reset Daily',
      type: 'boolean',
      default: true,
      description: 'Reset VWAP calculation at the start of each day',
    },
    {
      key: 'showBands',
      label: 'Show Bands',
      type: 'boolean',
      default: false,
      description: 'Show standard deviation bands',
      group: 'Bands',
    },
    {
      key: 'bandMultiplier',
      label: 'Band Multiplier',
      type: 'number',
      default: 2,
      min: 0.5,
      max: 5,
      step: 0.5,
      group: 'Bands',
      description: 'Standard deviation multiplier for bands',
    },
  ],
  outputs: ['vwap', 'upperBand', 'lowerBand'],
  outputDefinitions: [
    { key: 'vwap', name: 'VWAP', type: 'line', color: COLORS.purple, lineWidth: 2 },
    { key: 'upperBand', name: 'Upper Band', type: 'line', color: COLORS.purple, lineWidth: 1 },
    { key: 'lowerBand', name: 'Lower Band', type: 'line', color: COLORS.purple, lineWidth: 1 },
  ],
  minDataPoints: 1,
  requiresVolume: true,
};

const ICHIMOKU: IndicatorDefinition = {
  type: 'ICHIMOKU',
  name: 'Ichimoku Cloud',
  shortName: 'Ichimoku',
  category: 'trend',
  placement: 'overlay',
  description: 'A comprehensive indicator showing support, resistance, momentum, and trend direction. Includes Tenkan-sen, Kijun-sen, Senkou Span A/B (cloud), and Chikou Span.',
  defaultParams: {
    tenkanPeriod: 9,
    kijunPeriod: 26,
    senkouPeriod: 52,
    displacement: 26,
  },
  paramDefinitions: [
    {
      key: 'tenkanPeriod',
      label: 'Tenkan Period',
      type: 'number',
      default: 9,
      min: 1,
      max: 100,
      step: 1,
      group: 'Lines',
      description: 'Conversion line period (fast)',
    },
    {
      key: 'kijunPeriod',
      label: 'Kijun Period',
      type: 'number',
      default: 26,
      min: 1,
      max: 200,
      step: 1,
      group: 'Lines',
      description: 'Base line period (medium)',
    },
    {
      key: 'senkouPeriod',
      label: 'Senkou Span B Period',
      type: 'number',
      default: 52,
      min: 1,
      max: 300,
      step: 1,
      group: 'Cloud',
      description: 'Leading Span B period (slow)',
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
      description: 'Cloud displacement (shift forward)',
    },
  ],
  outputs: ['tenkan', 'kijun', 'senkouA', 'senkouB', 'chikou'],
  outputDefinitions: [
    { key: 'tenkan', name: 'Tenkan-sen', type: 'line', color: COLORS.blue, lineWidth: 1 },
    { key: 'kijun', name: 'Kijun-sen', type: 'line', color: COLORS.red, lineWidth: 1 },
    { key: 'senkouA', name: 'Senkou Span A', type: 'cloud', color: COLORS.green, pairedWith: 'senkouB' },
    { key: 'senkouB', name: 'Senkou Span B', type: 'cloud', color: COLORS.red, pairedWith: 'senkouA' },
    { key: 'chikou', name: 'Chikou Span', type: 'line', color: COLORS.purple, lineWidth: 1 },
  ],
  minDataPoints: 52,
};

const PSAR: IndicatorDefinition = {
  type: 'PSAR',
  name: 'Parabolic SAR',
  shortName: 'PSAR',
  category: 'trend',
  placement: 'overlay',
  description: 'A stop-and-reverse system that provides potential entry and exit points. Dots appear below price in uptrends and above price in downtrends.',
  defaultParams: {
    acceleration: 0.02,
    maximum: 0.2,
  },
  paramDefinitions: [
    {
      key: 'acceleration',
      label: 'Acceleration',
      type: 'number',
      default: 0.02,
      min: 0.001,
      max: 0.1,
      step: 0.001,
      description: 'Acceleration factor (AF) starting value',
    },
    {
      key: 'maximum',
      label: 'Maximum',
      type: 'number',
      default: 0.2,
      min: 0.1,
      max: 0.5,
      step: 0.01,
      description: 'Maximum acceleration factor',
    },
  ],
  outputs: ['psar', 'trend'],
  outputDefinitions: [
    { key: 'psar', name: 'PSAR', type: 'dots', color: COLORS.blue },
    { key: 'trend', name: 'Trend', type: 'line', color: COLORS.green },
  ],
  minDataPoints: 5,
};

const SUPERTREND: IndicatorDefinition = {
  type: 'SUPERTREND',
  name: 'Supertrend',
  shortName: 'ST',
  category: 'trend',
  placement: 'overlay',
  description: 'A trend-following indicator that uses ATR to set dynamic support/resistance levels. Green when bullish, red when bearish.',
  defaultParams: {
    period: 10,
    multiplier: 3,
  },
  paramDefinitions: [
    {
      key: 'period',
      label: 'ATR Period',
      type: 'number',
      default: 10,
      min: 1,
      max: 100,
      step: 1,
      description: 'ATR calculation period',
    },
    {
      key: 'multiplier',
      label: 'Multiplier',
      type: 'number',
      default: 3,
      min: 0.5,
      max: 10,
      step: 0.1,
      description: 'ATR multiplier for band distance',
    },
  ],
  outputs: ['supertrend', 'direction'],
  outputDefinitions: [
    { key: 'supertrend', name: 'Supertrend', type: 'line', color: COLORS.blue, lineWidth: 2 },
    { key: 'direction', name: 'Direction', type: 'line', color: COLORS.green },
  ],
  minDataPoints: 14,
};

// =============================================================================
// MOMENTUM INDICATORS
// =============================================================================

const RSI: IndicatorDefinition = {
  type: 'RSI',
  name: 'Relative Strength Index',
  shortName: 'RSI',
  category: 'momentum',
  placement: 'separate',
  description: 'A momentum oscillator that measures the speed and magnitude of recent price changes. Values range from 0 to 100, with 70+ indicating overbought and 30- indicating oversold.',
  defaultParams: {
    period: 14,
    overbought: 70,
    oversold: 30,
    source: 'close',
  },
  paramDefinitions: [
    periodParam(14, { min: 2, max: 100 }),
    sourceParam(),
    ...overboughtOversoldParams(70, 30),
  ],
  outputs: ['rsi'],
  outputDefinitions: [
    { key: 'rsi', name: 'RSI', type: 'line', color: COLORS.purple, lineWidth: 2 },
  ],
  minDataPoints: 14,
};

const MACD: IndicatorDefinition = {
  type: 'MACD',
  name: 'Moving Average Convergence Divergence',
  shortName: 'MACD',
  category: 'momentum',
  placement: 'separate',
  description: 'Shows the relationship between two EMAs. MACD line crosses above signal line = bullish. Histogram shows momentum strength.',
  defaultParams: {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    source: 'close',
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
      description: 'Fast EMA period',
    },
    {
      key: 'slowPeriod',
      label: 'Slow Period',
      type: 'number',
      default: 26,
      min: 1,
      max: 200,
      step: 1,
      description: 'Slow EMA period',
    },
    {
      key: 'signalPeriod',
      label: 'Signal Period',
      type: 'number',
      default: 9,
      min: 1,
      max: 50,
      step: 1,
      description: 'Signal line EMA period',
    },
    sourceParam(),
  ],
  outputs: ['macd', 'signal', 'histogram'],
  outputDefinitions: [
    { key: 'macd', name: 'MACD Line', type: 'line', color: COLORS.blue, lineWidth: 2 },
    { key: 'signal', name: 'Signal Line', type: 'line', color: COLORS.orange, lineWidth: 1 },
    { key: 'histogram', name: 'Histogram', type: 'histogram', color: COLORS.histogramUp },
  ],
  minDataPoints: 35,
};

const STOCH: IndicatorDefinition = {
  type: 'STOCH',
  name: 'Stochastic Oscillator',
  shortName: 'Stoch',
  category: 'momentum',
  placement: 'separate',
  description: 'Compares the closing price to the price range over a period. %K is the fast line, %D is the smoothed signal line. Values 0-100.',
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
      description: 'Lookback period for %K calculation',
    },
    {
      key: 'dPeriod',
      label: '%D Period',
      type: 'number',
      default: 3,
      min: 1,
      max: 50,
      step: 1,
      description: 'Smoothing period for %D (signal)',
    },
    {
      key: 'smooth',
      label: '%K Smoothing',
      type: 'number',
      default: 3,
      min: 1,
      max: 20,
      step: 1,
      description: 'Smoothing applied to %K',
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
    { key: 'k', name: '%K', type: 'line', color: COLORS.blue, lineWidth: 2 },
    { key: 'd', name: '%D', type: 'line', color: COLORS.orange, lineWidth: 1 },
  ],
  minDataPoints: 14,
};

const STOCHRSI: IndicatorDefinition = {
  type: 'STOCHRSI',
  name: 'Stochastic RSI',
  shortName: 'StochRSI',
  category: 'momentum',
  placement: 'separate',
  description: 'Stochastic oscillator applied to RSI values instead of price. More sensitive than standard RSI, better for detecting overbought/oversold extremes.',
  defaultParams: {
    rsiPeriod: 14,
    stochPeriod: 14,
    kPeriod: 3,
    dPeriod: 3,
    overbought: 80,
    oversold: 20,
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
      description: 'RSI calculation period',
    },
    {
      key: 'stochPeriod',
      label: 'Stochastic Period',
      type: 'number',
      default: 14,
      min: 1,
      max: 100,
      step: 1,
      description: 'Stochastic lookback period',
    },
    {
      key: 'kPeriod',
      label: '%K Smoothing',
      type: 'number',
      default: 3,
      min: 1,
      max: 20,
      step: 1,
      description: 'Smoothing for %K line',
    },
    {
      key: 'dPeriod',
      label: '%D Period',
      type: 'number',
      default: 3,
      min: 1,
      max: 20,
      step: 1,
      description: 'Signal line period',
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
    { key: 'k', name: '%K', type: 'line', color: COLORS.blue, lineWidth: 2 },
    { key: 'd', name: '%D', type: 'line', color: COLORS.orange, lineWidth: 1 },
  ],
  minDataPoints: 28,
};

const CCI: IndicatorDefinition = {
  type: 'CCI',
  name: 'Commodity Channel Index',
  shortName: 'CCI',
  category: 'momentum',
  placement: 'separate',
  description: 'Measures deviation of price from its statistical mean. Values above +100 suggest overbought, below -100 suggest oversold. Unbounded oscillator.',
  defaultParams: {
    period: 20,
    overbought: 100,
    oversold: -100,
  },
  paramDefinitions: [
    periodParam(20, { min: 2, max: 200 }),
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
  outputDefinitions: [
    { key: 'cci', name: 'CCI', type: 'line', color: COLORS.teal, lineWidth: 2 },
  ],
  minDataPoints: 20,
};

const WILLR: IndicatorDefinition = {
  type: 'WILLR',
  name: "Williams %R",
  shortName: '%R',
  category: 'momentum',
  placement: 'separate',
  description: "Momentum indicator showing the level of the close relative to the high-low range. Ranges from -100 to 0. Similar to Stochastic but inverted scale.",
  defaultParams: {
    period: 14,
    overbought: -20,
    oversold: -80,
  },
  paramDefinitions: [
    periodParam(14, { min: 1, max: 100 }),
    {
      key: 'overbought',
      label: 'Overbought',
      type: 'number',
      default: -20,
      min: -50,
      max: 0,
      step: 5,
      group: 'Levels',
      description: 'Overbought level (closer to 0)',
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
      description: 'Oversold level (closer to -100)',
    },
  ],
  outputs: ['willr'],
  outputDefinitions: [
    { key: 'willr', name: '%R', type: 'line', color: COLORS.purple, lineWidth: 2 },
  ],
  minDataPoints: 14,
};

const ROC: IndicatorDefinition = {
  type: 'ROC',
  name: 'Rate of Change',
  shortName: 'ROC',
  category: 'momentum',
  placement: 'separate',
  description: 'Measures the percentage change in price over a specified period. Positive values indicate upward momentum, negative values indicate downward momentum.',
  defaultParams: {
    period: 12,
    source: 'close',
  },
  paramDefinitions: [
    periodParam(12, { min: 1, max: 200 }),
    sourceParam(),
  ],
  outputs: ['roc'],
  outputDefinitions: [
    { key: 'roc', name: 'ROC', type: 'line', color: COLORS.orange, lineWidth: 2 },
  ],
  minDataPoints: 12,
};

const MFI: IndicatorDefinition = {
  type: 'MFI',
  name: 'Money Flow Index',
  shortName: 'MFI',
  category: 'momentum',
  placement: 'separate',
  description: 'Volume-weighted RSI that measures buying and selling pressure. Ranges 0-100, with readings above 80 indicating overbought and below 20 indicating oversold.',
  defaultParams: {
    period: 14,
    overbought: 80,
    oversold: 20,
  },
  paramDefinitions: [
    periodParam(14, { min: 2, max: 100 }),
    ...overboughtOversoldParams(80, 20),
  ],
  outputs: ['mfi'],
  outputDefinitions: [
    { key: 'mfi', name: 'MFI', type: 'line', color: COLORS.teal, lineWidth: 2 },
  ],
  minDataPoints: 14,
  requiresVolume: true,
};

// =============================================================================
// VOLATILITY INDICATORS
// =============================================================================

const BB: IndicatorDefinition = {
  type: 'BB',
  name: 'Bollinger Bands',
  shortName: 'BB',
  category: 'volatility',
  placement: 'overlay',
  description: 'Volatility bands placed above and below a moving average. Bands widen during volatile periods and contract during calm periods. Commonly used with 2 standard deviations.',
  defaultParams: {
    period: 20,
    stdDev: 2,
    source: 'close',
  },
  paramDefinitions: [
    periodParam(20, { min: 2, max: 200 }),
    {
      key: 'stdDev',
      label: 'Std Dev Multiplier',
      type: 'number',
      default: 2,
      min: 0.5,
      max: 5,
      step: 0.1,
      description: 'Number of standard deviations for bands',
    },
    sourceParam(),
  ],
  outputs: ['upper', 'middle', 'lower', 'bandwidth', 'percentB'],
  outputDefinitions: [
    { key: 'upper', name: 'Upper Band', type: 'band', color: COLORS.blue, pairedWith: 'lower' },
    { key: 'middle', name: 'Middle (SMA)', type: 'line', color: COLORS.orange, lineWidth: 1 },
    { key: 'lower', name: 'Lower Band', type: 'band', color: COLORS.blue, pairedWith: 'upper' },
  ],
  minDataPoints: 20,
};

const ATR: IndicatorDefinition = {
  type: 'ATR',
  name: 'Average True Range',
  shortName: 'ATR',
  category: 'volatility',
  placement: 'separate',
  description: 'Measures market volatility by calculating the average of true ranges over a period. Higher ATR indicates higher volatility. Useful for setting stop-losses.',
  defaultParams: {
    period: 14,
  },
  paramDefinitions: [
    periodParam(14, { min: 1, max: 100 }),
  ],
  outputs: ['atr'],
  outputDefinitions: [
    { key: 'atr', name: 'ATR', type: 'line', color: COLORS.orange, lineWidth: 2 },
  ],
  minDataPoints: 14,
};

const KC: IndicatorDefinition = {
  type: 'KC',
  name: 'Keltner Channel',
  shortName: 'KC',
  category: 'volatility',
  placement: 'overlay',
  description: 'Volatility-based envelope around an EMA using ATR for band distance. Similar to Bollinger Bands but uses ATR instead of standard deviation.',
  defaultParams: {
    period: 20,
    multiplier: 2,
    atrPeriod: 10,
  },
  paramDefinitions: [
    {
      key: 'period',
      label: 'EMA Period',
      type: 'number',
      default: 20,
      min: 2,
      max: 200,
      step: 1,
      description: 'Period for the center EMA line',
    },
    {
      key: 'multiplier',
      label: 'ATR Multiplier',
      type: 'number',
      default: 2,
      min: 0.5,
      max: 5,
      step: 0.1,
      description: 'Multiplier for ATR band distance',
    },
    {
      key: 'atrPeriod',
      label: 'ATR Period',
      type: 'number',
      default: 10,
      min: 1,
      max: 100,
      step: 1,
      description: 'Period for ATR calculation',
    },
  ],
  outputs: ['upper', 'middle', 'lower'],
  outputDefinitions: [
    { key: 'upper', name: 'Upper', type: 'band', color: COLORS.teal, pairedWith: 'lower' },
    { key: 'middle', name: 'Middle (EMA)', type: 'line', color: COLORS.blue, lineWidth: 1 },
    { key: 'lower', name: 'Lower', type: 'band', color: COLORS.teal, pairedWith: 'upper' },
  ],
  minDataPoints: 20,
};

const DC: IndicatorDefinition = {
  type: 'DC' as IndicatorType,
  name: 'Donchian Channel',
  shortName: 'DC',
  category: 'volatility',
  placement: 'overlay',
  description: 'Price channel based on highest high and lowest low over a period. Used to identify breakouts and trend direction. Popular in turtle trading.',
  defaultParams: {
    period: 20,
    showMiddle: true,
  },
  paramDefinitions: [
    periodParam(20, { min: 2, max: 200 }),
    {
      key: 'showMiddle',
      label: 'Show Middle Line',
      type: 'boolean',
      default: true,
      description: 'Display the middle line (average of upper and lower)',
    },
  ],
  outputs: ['upper', 'middle', 'lower'],
  outputDefinitions: [
    { key: 'upper', name: 'Upper', type: 'band', color: COLORS.blue, pairedWith: 'lower' },
    { key: 'middle', name: 'Middle', type: 'line', color: COLORS.orange, lineWidth: 1 },
    { key: 'lower', name: 'Lower', type: 'band', color: COLORS.blue, pairedWith: 'upper' },
  ],
  minDataPoints: 20,
};

const STDDEV: IndicatorDefinition = {
  type: 'STDDEV' as IndicatorType,
  name: 'Standard Deviation',
  shortName: 'StdDev',
  category: 'volatility',
  placement: 'separate',
  description: 'Measures the dispersion of price from its mean. Higher values indicate greater volatility. Often used as input for other indicators like Bollinger Bands.',
  defaultParams: {
    period: 20,
    source: 'close',
  },
  paramDefinitions: [
    periodParam(20, { min: 2, max: 200 }),
    sourceParam(),
  ],
  outputs: ['stddev'],
  outputDefinitions: [
    { key: 'stddev', name: 'Std Dev', type: 'line', color: COLORS.purple, lineWidth: 2 },
  ],
  minDataPoints: 20,
};

// =============================================================================
// VOLUME INDICATORS
// =============================================================================

const OBV: IndicatorDefinition = {
  type: 'OBV',
  name: 'On-Balance Volume',
  shortName: 'OBV',
  category: 'volume',
  placement: 'separate',
  description: 'Cumulative indicator that adds volume on up days and subtracts on down days. Divergence between OBV and price can signal reversals.',
  defaultParams: {},
  paramDefinitions: [],
  outputs: ['obv'],
  outputDefinitions: [
    { key: 'obv', name: 'OBV', type: 'line', color: COLORS.teal, lineWidth: 2 },
  ],
  minDataPoints: 2,
  requiresVolume: true,
};

const VP: IndicatorDefinition = {
  type: 'VP' as IndicatorType,
  name: 'Volume Profile',
  shortName: 'VP',
  category: 'volume',
  placement: 'overlay',
  description: 'Shows volume traded at each price level as horizontal histogram. Identifies high volume nodes (support/resistance) and low volume nodes (potential breakout areas).',
  defaultParams: {
    rowCount: 24,
    valueArea: 0.7,
    showPOC: true,
    showValueArea: true,
  },
  paramDefinitions: [
    {
      key: 'rowCount',
      label: 'Row Count',
      type: 'number',
      default: 24,
      min: 5,
      max: 100,
      step: 1,
      description: 'Number of price rows to display',
    },
    {
      key: 'valueArea',
      label: 'Value Area %',
      type: 'number',
      default: 0.7,
      min: 0.5,
      max: 0.95,
      step: 0.05,
      description: 'Percentage of volume in value area (typically 70%)',
    },
    {
      key: 'showPOC',
      label: 'Show POC',
      type: 'boolean',
      default: true,
      description: 'Show Point of Control (highest volume price)',
      group: 'Display',
    },
    {
      key: 'showValueArea',
      label: 'Show Value Area',
      type: 'boolean',
      default: true,
      description: 'Highlight the value area bounds',
      group: 'Display',
    },
  ],
  outputs: ['histogram', 'poc', 'vah', 'val'],
  outputDefinitions: [
    { key: 'histogram', name: 'Volume Histogram', type: 'histogram', color: COLORS.blue },
    { key: 'poc', name: 'Point of Control', type: 'line', color: COLORS.red },
    { key: 'vah', name: 'Value Area High', type: 'line', color: COLORS.yellow },
    { key: 'val', name: 'Value Area Low', type: 'line', color: COLORS.yellow },
  ],
  minDataPoints: 10,
  requiresVolume: true,
};

const CMF: IndicatorDefinition = {
  type: 'CMF',
  name: 'Chaikin Money Flow',
  shortName: 'CMF',
  category: 'volume',
  placement: 'separate',
  description: 'Measures accumulation/distribution pressure over a period. Values range from -1 to +1. Positive values suggest buying pressure, negative values suggest selling pressure.',
  defaultParams: {
    period: 20,
  },
  paramDefinitions: [
    periodParam(20, { min: 2, max: 100 }),
  ],
  outputs: ['cmf'],
  outputDefinitions: [
    { key: 'cmf', name: 'CMF', type: 'histogram', color: COLORS.teal },
  ],
  minDataPoints: 20,
  requiresVolume: true,
};

const AD: IndicatorDefinition = {
  type: 'AD',
  name: 'Accumulation/Distribution Line',
  shortName: 'A/D',
  category: 'volume',
  placement: 'separate',
  description: 'Cumulative indicator measuring the flow of money into or out of a security. Combines price and volume to show whether a stock is being accumulated or distributed.',
  defaultParams: {},
  paramDefinitions: [],
  outputs: ['ad'],
  outputDefinitions: [
    { key: 'ad', name: 'A/D Line', type: 'line', color: COLORS.green, lineWidth: 2 },
  ],
  minDataPoints: 1,
  requiresVolume: true,
};

// =============================================================================
// CUSTOM INDICATORS
// =============================================================================

const PIVOT: IndicatorDefinition = {
  type: 'PIVOT' as IndicatorType,
  name: 'Pivot Points',
  shortName: 'Pivot',
  category: 'custom' as IndicatorCategory,
  placement: 'overlay',
  description: 'Support and resistance levels calculated from previous period high, low, and close. Available in Standard, Fibonacci, Camarilla, and Woodie variations.',
  defaultParams: {
    type: 'standard',
    showLabels: true,
    timeframe: 'daily',
  },
  paramDefinitions: [
    {
      key: 'type',
      label: 'Pivot Type',
      type: 'select',
      default: 'standard',
      options: [
        { value: 'standard', label: 'Standard' },
        { value: 'fibonacci', label: 'Fibonacci' },
        { value: 'camarilla', label: 'Camarilla' },
        { value: 'woodie', label: 'Woodie' },
        { value: 'demark', label: 'DeMark' },
      ],
      description: 'Pivot point calculation method',
    },
    {
      key: 'timeframe',
      label: 'Timeframe',
      type: 'select',
      default: 'daily',
      options: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
      ],
      description: 'Period used for pivot calculation',
    },
    {
      key: 'showLabels',
      label: 'Show Labels',
      type: 'boolean',
      default: true,
      description: 'Display level labels (P, R1, S1, etc.)',
    },
  ],
  outputs: ['pivot', 'r1', 'r2', 'r3', 's1', 's2', 's3'],
  outputDefinitions: [
    { key: 'pivot', name: 'Pivot', type: 'line', color: COLORS.orange, lineWidth: 2 },
    { key: 'r1', name: 'R1', type: 'line', color: COLORS.red, lineWidth: 1 },
    { key: 'r2', name: 'R2', type: 'line', color: COLORS.red, lineWidth: 1 },
    { key: 'r3', name: 'R3', type: 'line', color: COLORS.red, lineWidth: 1 },
    { key: 's1', name: 'S1', type: 'line', color: COLORS.green, lineWidth: 1 },
    { key: 's2', name: 'S2', type: 'line', color: COLORS.green, lineWidth: 1 },
    { key: 's3', name: 'S3', type: 'line', color: COLORS.green, lineWidth: 1 },
  ],
  minDataPoints: 1,
};

// =============================================================================
// INDICATOR DEFINITIONS REGISTRY
// =============================================================================

/**
 * Complete registry of all indicator definitions
 */
export const INDICATOR_DEFINITIONS: Record<string, IndicatorDefinition> = {
  // Trend
  SMA,
  EMA,
  WMA,
  VWAP,
  ICHIMOKU,
  PSAR,
  SUPERTREND,
  
  // Momentum
  RSI,
  MACD,
  STOCH,
  STOCHRSI,
  CCI,
  WILLR,
  ROC,
  MFI,
  
  // Volatility
  BB,
  ATR,
  KC,
  DC,
  STDDEV,
  
  // Volume
  OBV,
  VP,
  CMF,
  AD,
  
  // Custom
  PIVOT,
};

// =============================================================================
// GROUPED DEFINITIONS
// =============================================================================

/**
 * Indicators grouped by category
 */
export const INDICATORS_BY_CATEGORY: Record<IndicatorCategory, IndicatorDefinition[]> = {
  trend: [SMA, EMA, WMA, ICHIMOKU, PSAR, SUPERTREND],
  momentum: [RSI, MACD, STOCH, STOCHRSI, CCI, WILLR, ROC, MFI],
  volatility: [BB, ATR, KC, DC, STDDEV],
  volume: [VWAP, OBV, VP, CMF, AD],
  custom: [PIVOT],
};

/**
 * Overlay indicators (drawn on price chart)
 */
export const OVERLAY_INDICATORS: IndicatorDefinition[] = [
  SMA, EMA, WMA, VWAP, ICHIMOKU, PSAR, SUPERTREND, BB, KC, DC, VP, PIVOT,
];

/**
 * Separate pane indicators
 */
export const SEPARATE_INDICATORS: IndicatorDefinition[] = [
  RSI, MACD, STOCH, STOCHRSI, CCI, WILLR, ROC, MFI, ATR, STDDEV, OBV, CMF, AD,
];

/**
 * Indicators requiring volume data
 */
export const VOLUME_REQUIRED_INDICATORS: IndicatorDefinition[] = [
  VWAP, MFI, OBV, VP, CMF, AD,
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get indicator definition by type
 */
export function getIndicatorDefinition(type: string): IndicatorDefinition | undefined {
  return INDICATOR_DEFINITIONS[type];
}

/**
 * Get all indicator types as array
 */
export function getIndicatorTypes(): string[] {
  return Object.keys(INDICATOR_DEFINITIONS);
}

/**
 * Get indicator default params
 */
export function getDefaultParams(type: string): Record<string, number | string | boolean> {
  const def = INDICATOR_DEFINITIONS[type];
  return def?.defaultParams ?? {};
}

/**
 * Check if indicator is overlay type
 */
export function isOverlayIndicator(type: string): boolean {
  const def = INDICATOR_DEFINITIONS[type];
  return def?.placement === 'overlay';
}

/**
 * Check if indicator requires volume
 */
export function requiresVolume(type: string): boolean {
  const def = INDICATOR_DEFINITIONS[type];
  return def?.requiresVolume ?? false;
}

/**
 * Get indicator color from definition
 */
export function getIndicatorColor(type: string): string {
  const def = INDICATOR_DEFINITIONS[type];
  return def?.outputDefinitions?.[0]?.color ?? COLORS.blue;
}

/**
 * Get indicator short name
 */
export function getIndicatorShortName(type: string): string {
  const def = INDICATOR_DEFINITIONS[type];
  return def?.shortName ?? type;
}

/**
 * Format indicator with params for display
 */
export function formatIndicatorLabel(type: string, params: Record<string, unknown>): string {
  const def = INDICATOR_DEFINITIONS[type];
  const shortName = def?.shortName ?? type;
  
  // Get period if exists
  const period = params.period;
  if (period !== undefined) {
    return `${shortName}(${period})`;
  }
  
  // Special cases
  if (type === 'MACD') {
    return `MACD(${params.fastPeriod},${params.slowPeriod},${params.signalPeriod})`;
  }
  
  if (type === 'BB') {
    return `BB(${params.period},${params.stdDev})`;
  }
  
  if (type === 'STOCH') {
    return `Stoch(${params.kPeriod},${params.dPeriod})`;
  }
  
  return shortName;
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  // Individual definitions for direct import
  SMA,
  EMA,
  WMA,
  VWAP,
  ICHIMOKU,
  PSAR,
  SUPERTREND,
  RSI,
  MACD,
  STOCH,
  STOCHRSI,
  CCI,
  WILLR,
  ROC,
  MFI,
  BB,
  ATR,
  KC,
  DC,
  STDDEV,
  OBV,
  VP,
  CMF,
  AD,
  PIVOT,
  // Colors for external use
  COLORS as INDICATOR_COLORS,
};

export default INDICATOR_DEFINITIONS;
