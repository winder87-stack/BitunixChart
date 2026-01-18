/**
 * Indicator Calculation Engine
 * 
 * Comprehensive calculation functions for all 25 technical indicators.
 * Uses 'technicalindicators' package where possible, with custom implementations
 * for indicators not available in the package.
 * 
 * Features:
 * - Optimized calculations with typed arrays where beneficial
 * - Memoization for expensive calculations
 * - Proper null handling for initial periods
 * - Aligned output arrays with kline timestamps
 */

import {
  SMA,
  EMA,
  WMA,
  RSI,
  MACD,
  BollingerBands,
  Stochastic,
  StochasticRSI,
  CCI,
  WilliamsR,
  ROC,
  MFI,
  ATR,
  OBV,
  ADL,
  PSAR,
  ADX,
} from 'technicalindicators';

import type { ParsedKline } from '../../types/bitunix';
import type { IndicatorType, IndicatorResult } from '../../types/indicators';

// =============================================================================
// Types
// =============================================================================

/**
 * Source type for price data
 */
export type PriceSource = 'open' | 'high' | 'low' | 'close' | 'hl2' | 'hlc3' | 'ohlc4';

/**
 * Parameters for indicator calculations
 */
export interface CalculationParams {
  [key: string]: number | string | boolean;
}

/**
 * Result from indicator calculation
 */
export interface CalculationResult {
  /** Indicator type */
  type: IndicatorType;
  /** Array of results aligned with input klines */
  data: IndicatorResult[];
  /** Calculation metadata */
  meta: {
    calculationTime: number;
    dataPoints: number;
    startTime: number;
    endTime: number;
  };
}

// =============================================================================
// Memoization Cache
// =============================================================================

interface CacheEntry {
  hash: string;
  result: CalculationResult;
  timestamp: number;
}

const calculationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60000; // 1 minute
const MAX_CACHE_SIZE = 100;

/**
 * Generate a hash for memoization
 */
function generateCacheKey(
  type: string,
  klinesHash: string,
  params: CalculationParams
): string {
  return `${type}:${klinesHash}:${JSON.stringify(params)}`;
}

/**
 * Get klines hash for cache key
 */
function getKlinesHash(klines: ParsedKline[]): string {
  if (klines.length === 0) return 'empty';
  const first = klines[0];
  const last = klines[klines.length - 1];
  return `${klines.length}:${first.time}:${last.time}:${last.close}`;
}

/**
 * Clean expired cache entries
 */
function cleanCache(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  calculationCache.forEach((entry, key) => {
    if (now - entry.timestamp > CACHE_TTL) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => calculationCache.delete(key));
  
  // Also limit cache size
  if (calculationCache.size > MAX_CACHE_SIZE) {
    const sortedEntries = Array.from(calculationCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = sortedEntries.slice(0, sortedEntries.length - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => calculationCache.delete(key));
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract price series based on source type
 */
function getPriceSource(klines: ParsedKline[], source: PriceSource = 'close'): number[] {
  switch (source) {
    case 'open':
      return klines.map(k => k.open);
    case 'high':
      return klines.map(k => k.high);
    case 'low':
      return klines.map(k => k.low);
    case 'close':
      return klines.map(k => k.close);
    case 'hl2':
      return klines.map(k => (k.high + k.low) / 2);
    case 'hlc3':
      return klines.map(k => (k.high + k.low + k.close) / 3);
    case 'ohlc4':
      return klines.map(k => (k.open + k.high + k.low + k.close) / 4);
    default:
      return klines.map(k => k.close);
  }
}

/**
 * Pad result array with nulls to align with input klines
 */
function alignResults(
  klines: ParsedKline[],
  values: (number | undefined | null)[],
  outputKey: string
): IndicatorResult[] {
  const offset = klines.length - values.length;
  
  return klines.map((k, i) => {
    const idx = i - offset;
    const value = idx >= 0 && idx < values.length ? values[idx] : undefined;
    
    return {
      time: k.time,
      values: {
        [outputKey]: value !== undefined && value !== null && !isNaN(value) ? value : null,
      },
    };
  });
}

/**
 * Create aligned results for multiple outputs
 */
function alignMultipleResults(
  klines: ParsedKline[],
  outputs: Record<string, (number | undefined)[]>
): IndicatorResult[] {
  // Find the minimum length among all outputs
  let minLength = klines.length;
  Object.values(outputs).forEach(arr => {
    if (arr.length < minLength) minLength = arr.length;
  });
  
  // Offset used for aligning arrays (kept for reference)
  // const offset = klines.length - minLength;
  
  return klines.map((k, i) => {
    const values: Record<string, number | null> = {};
    
    Object.entries(outputs).forEach(([key, arr]) => {
      const arrOffset = klines.length - arr.length;
      const arrIndex = i - arrOffset;
      const value = arrIndex >= 0 && arrIndex < arr.length ? arr[arrIndex] : undefined;
      values[key] = value !== undefined && value !== null && !isNaN(value) ? value : null;
    });
    
    return { time: k.time, values };
  });
}

/**
 * Calculate EMA manually (for internal use in custom indicators)
 */
function calculateEMAInternal(values: number[], period: number): number[] {
  if (values.length < period) return [];
  
  const multiplier = 2 / (period + 1);
  const result: number[] = [];
  
  // Calculate initial SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  result.push(sum / period);
  
  // Calculate EMA
  for (let i = period; i < values.length; i++) {
    const ema = (values[i] - result[result.length - 1]) * multiplier + result[result.length - 1];
    result.push(ema);
  }
  
  return result;
}

/**
 * Calculate SMA manually (for internal use)
 */
function calculateSMAInternal(values: number[], period: number): number[] {
  if (values.length < period) return [];
  
  const result: number[] = [];
  
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += values[i - j];
    }
    result.push(sum / period);
  }
  
  return result;
}

/**
 * Calculate True Range
 */
function calculateTrueRange(klines: ParsedKline[]): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < klines.length; i++) {
    if (i === 0) {
      result.push(klines[i].high - klines[i].low);
    } else {
      const tr = Math.max(
        klines[i].high - klines[i].low,
        Math.abs(klines[i].high - klines[i - 1].close),
        Math.abs(klines[i].low - klines[i - 1].close)
      );
      result.push(tr);
    }
  }
  
  return result;
}

// =============================================================================
// Individual Indicator Calculations
// =============================================================================

/**
 * Simple Moving Average
 */
function calculateSMA(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 20;
  const source = (params.source as PriceSource) || 'close';
  const values = getPriceSource(klines, source);
  
  const result = SMA.calculate({ period, values });
  return alignResults(klines, result, 'sma');
}

/**
 * Exponential Moving Average
 */
function calculateEMA(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 20;
  const source = (params.source as PriceSource) || 'close';
  const values = getPriceSource(klines, source);
  
  const result = EMA.calculate({ period, values });
  return alignResults(klines, result, 'ema');
}

/**
 * Weighted Moving Average
 */
function calculateWMA(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 20;
  const source = (params.source as PriceSource) || 'close';
  const values = getPriceSource(klines, source);
  
  const result = WMA.calculate({ period, values });
  return alignResults(klines, result, 'wma');
}

/**
 * Volume Weighted Average Price (VWAP)
 * Custom implementation - resets daily
 */
function calculateVWAP(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const resetDaily = params.resetDaily !== false;
  const showBands = params.showBands === true;
  const bandMultiplier = Number(params.bandMultiplier) || 2;
  
  let cumTypicalPriceVol = 0;
  let cumVolume = 0;
  let cumSquaredDev = 0;
  let currentDay = -1;
  
  const vwapValues: number[] = [];
  const upperBandValues: number[] = [];
  const lowerBandValues: number[] = [];
  
  for (let i = 0; i < klines.length; i++) {
    const k = klines[i];
    const date = new Date(k.time * 1000);
    const day = date.getUTCDate();
    
    // Reset at start of new day
    if (resetDaily && day !== currentDay) {
      cumTypicalPriceVol = 0;
      cumVolume = 0;
      cumSquaredDev = 0;
      currentDay = day;
    }
    
    const typicalPrice = (k.high + k.low + k.close) / 3;
    cumTypicalPriceVol += typicalPrice * k.volume;
    cumVolume += k.volume;
    
    const vwap = cumVolume > 0 ? cumTypicalPriceVol / cumVolume : typicalPrice;
    vwapValues.push(vwap);
    
    // Calculate standard deviation for bands
    if (showBands) {
      cumSquaredDev += k.volume * Math.pow(typicalPrice - vwap, 2);
      const variance = cumVolume > 0 ? cumSquaredDev / cumVolume : 0;
      const stdDev = Math.sqrt(variance);
      upperBandValues.push(vwap + bandMultiplier * stdDev);
      lowerBandValues.push(vwap - bandMultiplier * stdDev);
    }
  }
  
  if (showBands) {
    return alignMultipleResults(klines, {
      vwap: vwapValues,
      upperBand: upperBandValues,
      lowerBand: lowerBandValues,
    });
  }
  
  return alignResults(klines, vwapValues, 'vwap');
}

/**
 * Ichimoku Cloud
 * Custom implementation with proper displacement
 */
function calculateIchimoku(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const tenkanPeriod = Number(params.tenkanPeriod) || 9;
  const kijunPeriod = Number(params.kijunPeriod) || 26;
  const senkouPeriod = Number(params.senkouPeriod) || 52;
  const displacement = Number(params.displacement) || 26;
  
  // Helper to calculate (highest high + lowest low) / 2 for a period
  const calculateMidpoint = (startIdx: number, period: number): number | null => {
    if (startIdx - period + 1 < 0) return null;
    
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    for (let i = startIdx - period + 1; i <= startIdx; i++) {
      if (klines[i].high > highestHigh) highestHigh = klines[i].high;
      if (klines[i].low < lowestLow) lowestLow = klines[i].low;
    }
    
    return (highestHigh + lowestLow) / 2;
  };
  
  const tenkan: (number | null)[] = [];
  const kijun: (number | null)[] = [];
  const chikou: (number | null)[] = [];
  
  for (let i = 0; i < klines.length; i++) {
    // Tenkan-sen (Conversion Line)
    tenkan.push(calculateMidpoint(i, tenkanPeriod));
    
    // Kijun-sen (Base Line)
    kijun.push(calculateMidpoint(i, kijunPeriod));
    
    // Chikou Span (Lagging Span) - shifted back by displacement periods
    // At index i, we show the close from displacement periods ahead
    const chikouIndex = i + displacement;
    chikou.push(chikouIndex < klines.length ? klines[chikouIndex].close : null);
  }
  
  // Calculate Senkou spans - these need to be shifted forward
  // We'll calculate them based on current values, then shift when creating results
  const senkouARaw: (number | null)[] = [];
  const senkouBRaw: (number | null)[] = [];
  
  for (let i = 0; i < klines.length; i++) {
    const t = tenkan[i];
    const k = kijun[i];
    senkouARaw.push(t !== null && k !== null ? (t + k) / 2 : null);
    senkouBRaw.push(calculateMidpoint(i, senkouPeriod));
  }
  
  // Create results with proper shifts
  return klines.map((k, i) => {
    // Senkou spans are shifted forward by displacement
    const senkouIdx = i - displacement;
    
    return {
      time: k.time,
      values: {
        tenkan: tenkan[i],
        kijun: kijun[i],
        senkouA: senkouIdx >= 0 ? senkouARaw[senkouIdx] : null,
        senkouB: senkouIdx >= 0 ? senkouBRaw[senkouIdx] : null,
        chikou: chikou[i],
      },
    };
  });
}

/**
 * Parabolic SAR
 */
function calculatePSAR(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const step = Number(params.acceleration) || Number(params.step) || 0.02;
  const max = Number(params.maximum) || Number(params.max) || 0.2;
  
  const result = PSAR.calculate({
    high: klines.map(k => k.high),
    low: klines.map(k => k.low),
    step,
    max,
  });
  
  // PSAR returns array of numbers
  const psarValues = result as number[];
  
  // Calculate trend direction (1 = bullish, -1 = bearish)
  const trendValues: (number | undefined)[] = [];
  for (let i = 0; i < psarValues.length; i++) {
    const klineIdx = klines.length - psarValues.length + i;
    if (klineIdx >= 0) {
      trendValues.push(psarValues[i] < klines[klineIdx].close ? 1 : -1);
    }
  }
  
  return alignMultipleResults(klines, {
    psar: psarValues,
    trend: trendValues,
  });
}

/**
 * Supertrend
 * Custom ATR-based trend indicator
 */
function calculateSupertrend(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 10;
  const multiplier = Number(params.multiplier) || 3;
  
  if (klines.length < period + 1) {
    return klines.map(k => ({
      time: k.time,
      values: { supertrend: null, direction: null },
    }));
  }
  
  // Calculate ATR
  const trueRange = calculateTrueRange(klines);
  const atr = calculateSMAInternal(trueRange, period);
  const atrOffset = klines.length - atr.length;
  
  const supertrend: (number | null)[] = new Array(klines.length).fill(null);
  const direction: (number | null)[] = new Array(klines.length).fill(null);
  
  let prevUpperBand = 0;
  let prevLowerBand = 0;
  let prevSupertrend = 0;
  // Direction tracking: 1 = bullish, -1 = bearish
  
  for (let i = atrOffset; i < klines.length; i++) {
    const atrIdx = i - atrOffset;
    const currentATR = atr[atrIdx];
    const hl2 = (klines[i].high + klines[i].low) / 2;
    
    // Calculate basic bands
    let upperBand = hl2 + multiplier * currentATR;
    let lowerBand = hl2 - multiplier * currentATR;
    
    // Adjust bands based on previous values
    if (i > atrOffset) {
      // Lower band
      if (lowerBand > prevLowerBand || klines[i - 1].close < prevLowerBand) {
        // Keep the new lower band
      } else {
        lowerBand = prevLowerBand;
      }
      
      // Upper band
      if (upperBand < prevUpperBand || klines[i - 1].close > prevUpperBand) {
        // Keep the new upper band
      } else {
        upperBand = prevUpperBand;
      }
    }
    
    // Determine supertrend value and direction
    let currentSupertrend: number;
    let currentDirection: number;
    
    if (i === atrOffset) {
      // First value
      currentSupertrend = lowerBand;
      currentDirection = 1;
    } else {
      if (prevSupertrend === prevUpperBand) {
        // Previous was bearish
        if (klines[i].close > upperBand) {
          currentSupertrend = lowerBand;
          currentDirection = 1;
        } else {
          currentSupertrend = upperBand;
          currentDirection = -1;
        }
      } else {
        // Previous was bullish
        if (klines[i].close < lowerBand) {
          currentSupertrend = upperBand;
          currentDirection = -1;
        } else {
          currentSupertrend = lowerBand;
          currentDirection = 1;
        }
      }
    }
    
    supertrend[i] = currentSupertrend;
    direction[i] = currentDirection;
    
    prevUpperBand = upperBand;
    prevLowerBand = lowerBand;
    prevSupertrend = currentSupertrend;
    // prevDirection not used but kept for clarity
  }
  
  return klines.map((k, i) => ({
    time: k.time,
    values: {
      supertrend: supertrend[i],
      direction: direction[i],
    },
  }));
}

/**
 * Relative Strength Index
 */
function calculateRSI(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 14;
  const source = (params.source as PriceSource) || 'close';
  const values = getPriceSource(klines, source);
  
  const result = RSI.calculate({ period, values });
  return alignResults(klines, result, 'rsi');
}

/**
 * Moving Average Convergence Divergence
 */
function calculateMACD(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const fastPeriod = Number(params.fastPeriod) || 12;
  const slowPeriod = Number(params.slowPeriod) || 26;
  const signalPeriod = Number(params.signalPeriod) || 9;
  const source = (params.source as PriceSource) || 'close';
  const values = getPriceSource(klines, source);
  
  const result = MACD.calculate({
    values,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  
  return alignMultipleResults(klines, {
    macd: result.map(r => r.MACD),
    signal: result.map(r => r.signal),
    histogram: result.map(r => r.histogram),
  });
}

/**
 * Stochastic Oscillator
 */
function calculateStochastic(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const kPeriod = Number(params.kPeriod) || 14;
  const dPeriod = Number(params.dPeriod) || 3;
  // smooth param available but Stochastic uses signalPeriod
  
  const result = Stochastic.calculate({
    high: klines.map(k => k.high),
    low: klines.map(k => k.low),
    close: klines.map(k => k.close),
    period: kPeriod,
    signalPeriod: dPeriod,
  });
  
  return alignMultipleResults(klines, {
    k: result.map(r => r.k),
    d: result.map(r => r.d),
  });
}

/**
 * Stochastic RSI
 */
function calculateStochRSI(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const rsiPeriod = Number(params.rsiPeriod) || 14;
  const stochPeriod = Number(params.stochPeriod) || 14;
  const kPeriod = Number(params.kPeriod) || 3;
  const dPeriod = Number(params.dPeriod) || 3;
  
  const closes = klines.map(k => k.close);
  
  const result = StochasticRSI.calculate({
    values: closes,
    rsiPeriod,
    stochasticPeriod: stochPeriod,
    kPeriod,
    dPeriod,
  });
  
  return alignMultipleResults(klines, {
    k: result.map(r => r.k),
    d: result.map(r => r.d),
  });
}

/**
 * Commodity Channel Index
 */
function calculateCCI(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 20;
  
  const result = CCI.calculate({
    high: klines.map(k => k.high),
    low: klines.map(k => k.low),
    close: klines.map(k => k.close),
    period,
  });
  
  return alignResults(klines, result, 'cci');
}

/**
 * Williams %R
 */
function calculateWilliamsR(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 14;
  
  const result = WilliamsR.calculate({
    high: klines.map(k => k.high),
    low: klines.map(k => k.low),
    close: klines.map(k => k.close),
    period,
  });
  
  return alignResults(klines, result, 'willr');
}

/**
 * Rate of Change
 */
function calculateROC(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 12;
  const source = (params.source as PriceSource) || 'close';
  const values = getPriceSource(klines, source);
  
  const result = ROC.calculate({ period, values });
  return alignResults(klines, result, 'roc');
}

/**
 * Money Flow Index
 */
function calculateMFI(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 14;
  
  const result = MFI.calculate({
    high: klines.map(k => k.high),
    low: klines.map(k => k.low),
    close: klines.map(k => k.close),
    volume: klines.map(k => k.volume),
    period,
  });
  
  return alignResults(klines, result, 'mfi');
}

/**
 * Bollinger Bands
 */
function calculateBollingerBands(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 20;
  const stdDev = Number(params.stdDev) || 2;
  const source = (params.source as PriceSource) || 'close';
  const values = getPriceSource(klines, source);
  
  const result = BollingerBands.calculate({
    period,
    values,
    stdDev,
  });
  
  const outputs = {
    upper: result.map(r => r.upper),
    middle: result.map(r => r.middle),
    lower: result.map(r => r.lower),
    bandwidth: result.map(r => {
      if (r.middle === 0) return 0;
      return ((r.upper - r.lower) / r.middle) * 100;
    }),
    percentB: result.map((r, i) => {
      const bandWidth = r.upper - r.lower;
      if (bandWidth === 0) return 50; // Flat bands = price at midpoint
      const priceIndex = values.length - result.length + i;
      const price = values[priceIndex];
      const percentB = ((price - r.lower) / bandWidth) * 100;
      return Number.isFinite(percentB) ? percentB : 50;
    }),
  };
  
  return alignMultipleResults(klines, outputs);
}

/**
 * Average True Range
 */
function calculateATR(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 14;
  
  const result = ATR.calculate({
    high: klines.map(k => k.high),
    low: klines.map(k => k.low),
    close: klines.map(k => k.close),
    period,
  });
  
  return alignResults(klines, result, 'atr');
}

/**
 * Keltner Channel
 * Custom implementation: EMA +/- (multiplier * ATR)
 */
function calculateKeltnerChannel(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 20;
  const multiplier = Number(params.multiplier) || 2;
  const atrPeriod = Number(params.atrPeriod) || 10;
  
  // Calculate middle line (EMA of typical price or close)
  const typicalPrices = klines.map(k => (k.high + k.low + k.close) / 3);
  const emaValues = calculateEMAInternal(typicalPrices, period);
  const emaOffset = klines.length - emaValues.length;
  
  // Calculate ATR
  const atrResult = ATR.calculate({
    high: klines.map(k => k.high),
    low: klines.map(k => k.low),
    close: klines.map(k => k.close),
    period: atrPeriod,
  });
  const atrOffset = klines.length - atrResult.length;
  
  const upper: (number | null)[] = new Array(klines.length).fill(null);
  const middle: (number | null)[] = new Array(klines.length).fill(null);
  const lower: (number | null)[] = new Array(klines.length).fill(null);
  
  const startIdx = Math.max(emaOffset, atrOffset);
  
  for (let i = startIdx; i < klines.length; i++) {
    const emaIdx = i - emaOffset;
    const atrIdx = i - atrOffset;
    
    if (emaIdx >= 0 && emaIdx < emaValues.length && atrIdx >= 0 && atrIdx < atrResult.length) {
      const emaVal = emaValues[emaIdx];
      const atrVal = atrResult[atrIdx];
      
      middle[i] = emaVal;
      upper[i] = emaVal + multiplier * atrVal;
      lower[i] = emaVal - multiplier * atrVal;
    }
  }
  
  return klines.map((k, i) => ({
    time: k.time,
    values: {
      upper: upper[i],
      middle: middle[i],
      lower: lower[i],
    },
  }));
}

/**
 * Donchian Channel
 * Highest high and lowest low over period
 */
function calculateDonchianChannel(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 20;
  const showMiddle = params.showMiddle !== false;
  
  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];
  
  for (let i = 0; i < klines.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
      continue;
    }
    
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    for (let j = i - period + 1; j <= i; j++) {
      if (klines[j].high > highestHigh) highestHigh = klines[j].high;
      if (klines[j].low < lowestLow) lowestLow = klines[j].low;
    }
    
    upper.push(highestHigh);
    lower.push(lowestLow);
    middle.push(showMiddle ? (highestHigh + lowestLow) / 2 : null);
  }
  
  return klines.map((k, i) => ({
    time: k.time,
    values: {
      upper: upper[i],
      middle: middle[i],
      lower: lower[i],
    },
  }));
}

/**
 * Standard Deviation
 */
function calculateStdDev(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 20;
  const source = (params.source as PriceSource) || 'close';
  const values = getPriceSource(klines, source);
  
  const result: (number | null)[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    
    // Calculate mean
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += values[j];
    }
    const mean = sum / period;
    
    // Calculate variance
    let squaredDiff = 0;
    for (let j = i - period + 1; j <= i; j++) {
      squaredDiff += Math.pow(values[j] - mean, 2);
    }
    
    result.push(Math.sqrt(squaredDiff / period));
  }
  
  return klines.map((k, i) => ({
    time: k.time,
    values: { stddev: result[i] },
  }));
}

/**
 * On-Balance Volume
 */
function calculateOBV(
  klines: ParsedKline[],
  _params: CalculationParams
): IndicatorResult[] {
  const result = OBV.calculate({
    close: klines.map(k => k.close),
    volume: klines.map(k => k.volume),
  });
  
  return alignResults(klines, result, 'obv');
}

/**
 * Volume Profile
 * Custom implementation - buckets volume by price level
 */
function calculateVolumeProfile(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const rowCount = Number(params.rowCount) || 24;
  const valueAreaPercent = Number(params.valueArea) || 0.7;
  
  if (klines.length === 0) {
    return [];
  }
  
  // Find price range
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  
  for (const k of klines) {
    if (k.low < minPrice) minPrice = k.low;
    if (k.high > maxPrice) maxPrice = k.high;
  }
  
  const priceRange = maxPrice - minPrice;
  
  // Prevent division by zero if all prices are the same
  if (priceRange === 0) {
    return [];
  }

  const rowHeight = priceRange / rowCount;
  
  // Initialize volume buckets
  const volumeByRow: number[] = new Array(rowCount).fill(0);
  let totalVolume = 0;
  
  // Distribute volume into buckets
  for (const k of klines) {
    const avgPrice = (k.high + k.low + k.close) / 3;
    const rowIndex = Math.min(
      Math.floor((avgPrice - minPrice) / rowHeight),
      rowCount - 1
    );
    volumeByRow[rowIndex] += k.volume;
    totalVolume += k.volume;
  }
  
  // Find POC (Point of Control) - row with most volume
  let pocIndex = 0;
  let maxVolume = 0;
  for (let i = 0; i < volumeByRow.length; i++) {
    if (volumeByRow[i] > maxVolume) {
      maxVolume = volumeByRow[i];
      pocIndex = i;
    }
  }
  
  const pocPrice = minPrice + (pocIndex + 0.5) * rowHeight;
  
  // Calculate Value Area (70% of volume around POC)
  const targetVolume = totalVolume * valueAreaPercent;
  let vaVolume = volumeByRow[pocIndex];
  let vahIndex = pocIndex;
  let valIndex = pocIndex;
  
  while (vaVolume < targetVolume) {
    const upperVol = vahIndex < rowCount - 1 ? volumeByRow[vahIndex + 1] : 0;
    const lowerVol = valIndex > 0 ? volumeByRow[valIndex - 1] : 0;
    
    if (upperVol >= lowerVol && vahIndex < rowCount - 1) {
      vahIndex++;
      vaVolume += volumeByRow[vahIndex];
    } else if (valIndex > 0) {
      valIndex--;
      vaVolume += volumeByRow[valIndex];
    } else {
      break;
    }
  }
  
  const vahPrice = minPrice + (vahIndex + 1) * rowHeight;
  const valPrice = minPrice + valIndex * rowHeight;
  
  // Return results - these are horizontal lines, so we extend across all klines
  return klines.map(k => ({
    time: k.time,
    values: {
      poc: pocPrice,
      vah: vahPrice,
      val: valPrice,
      // Volume histogram would be rendered differently in the chart component
    },
  }));
}

/**
 * Chaikin Money Flow
 */
function calculateCMF(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 20;
  
  // Calculate Money Flow Multiplier and Money Flow Volume
  const mfv: number[] = [];
  
  for (const k of klines) {
    const mfMultiplier = ((k.close - k.low) - (k.high - k.close)) / (k.high - k.low);
    const mfVolume = (isNaN(mfMultiplier) ? 0 : mfMultiplier) * k.volume;
    mfv.push(mfVolume);
  }
  
  // Calculate CMF
  const result: (number | null)[] = [];
  
  for (let i = 0; i < klines.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    
    let sumMFV = 0;
    let sumVolume = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      sumMFV += mfv[j];
      sumVolume += klines[j].volume;
    }
    
    result.push(sumVolume > 0 ? sumMFV / sumVolume : 0);
  }
  
  return klines.map((k, i) => ({
    time: k.time,
    values: { cmf: result[i] },
  }));
}

/**
 * Accumulation/Distribution Line
 */
function calculateAD(
  klines: ParsedKline[],
  _params: CalculationParams
): IndicatorResult[] {
  const result = ADL.calculate({
    high: klines.map(k => k.high),
    low: klines.map(k => k.low),
    close: klines.map(k => k.close),
    volume: klines.map(k => k.volume),
  });
  
  return alignResults(klines, result, 'ad');
}

/**
 * ADX (Average Directional Index)
 */
function calculateADX(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 14;
  
  const result = ADX.calculate({
    high: klines.map(k => k.high),
    low: klines.map(k => k.low),
    close: klines.map(k => k.close),
    period,
  });
  
  return alignMultipleResults(klines, {
    adx: result.map(r => r.adx),
    pdi: result.map(r => r.pdi),
    mdi: result.map(r => r.mdi),
  });
}

/**
 * Pivot Points
 * Supports Standard, Fibonacci, Camarilla, Woodie, and DeMark methods
 */
function calculatePivotPoints(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const pivotType = (params.type as string) || 'standard';
  
  // Get previous period data (use last complete candle)
  // For simplicity, we'll use the previous candle's HLC
  if (klines.length < 2) {
    return klines.map(k => ({
      time: k.time,
      values: { pivot: null, r1: null, r2: null, r3: null, s1: null, s2: null, s3: null },
    }));
  }
  
  const results: IndicatorResult[] = [];
  
  for (let i = 0; i < klines.length; i++) {
    if (i === 0) {
      results.push({
        time: klines[i].time,
        values: { pivot: null, r1: null, r2: null, r3: null, s1: null, s2: null, s3: null },
      });
      continue;
    }
    
    const prev = klines[i - 1];
    const high = prev.high;
    const low = prev.low;
    const close = prev.close;
    const open = prev.open;
    
    let pivot: number;
    let r1: number, r2: number, r3: number;
    let s1: number, s2: number, s3: number;
    
    switch (pivotType) {
      case 'fibonacci':
        pivot = (high + low + close) / 3;
        r1 = pivot + (high - low) * 0.382;
        r2 = pivot + (high - low) * 0.618;
        r3 = pivot + (high - low) * 1.000;
        s1 = pivot - (high - low) * 0.382;
        s2 = pivot - (high - low) * 0.618;
        s3 = pivot - (high - low) * 1.000;
        break;
        
      case 'camarilla':
        pivot = (high + low + close) / 3;
        r1 = close + (high - low) * 1.1 / 12;
        r2 = close + (high - low) * 1.1 / 6;
        r3 = close + (high - low) * 1.1 / 4;
        s1 = close - (high - low) * 1.1 / 12;
        s2 = close - (high - low) * 1.1 / 6;
        s3 = close - (high - low) * 1.1 / 4;
        break;
        
      case 'woodie':
        pivot = (high + low + 2 * close) / 4;
        r1 = 2 * pivot - low;
        r2 = pivot + (high - low);
        r3 = high + 2 * (pivot - low);
        s1 = 2 * pivot - high;
        s2 = pivot - (high - low);
        s3 = low - 2 * (high - pivot);
        break;
        
      case 'demark': {
        let x: number;
        if (close < open) {
          x = high + 2 * low + close;
        } else if (close > open) {
          x = 2 * high + low + close;
        } else {
          x = high + low + 2 * close;
        }
        pivot = x / 4;
        r1 = x / 2 - low;
        s1 = x / 2 - high;
        r2 = r1;
        r3 = r1;
        s2 = s1;
        s3 = s1;
        break;
      }
        
      case 'standard':
      default:
        pivot = (high + low + close) / 3;
        r1 = 2 * pivot - low;
        r2 = pivot + (high - low);
        r3 = high + 2 * (pivot - low);
        s1 = 2 * pivot - high;
        s2 = pivot - (high - low);
        s3 = low - 2 * (high - pivot);
        break;
    }
    
    results.push({
      time: klines[i].time,
      values: { pivot, r1, r2, r3, s1, s2, s3 },
    });
  }
  
  return results;
}

// =============================================================================
// Additional Indicators from types (not in definitions.ts but in indicators.ts)
// =============================================================================

/**
 * Hull Moving Average
 */
function calculateHMA(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 20;
  const source = (params.source as PriceSource) || 'close';
  const values = getPriceSource(klines, source);
  
  if (values.length < period) {
    return klines.map(k => ({
      time: k.time,
      values: { hma: null },
    }));
  }
  
  // HMA = WMA(2*WMA(n/2) - WMA(n), sqrt(n))
  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.floor(Math.sqrt(period));
  
  const wmaHalf = WMA.calculate({ period: halfPeriod, values });
  const wmaFull = WMA.calculate({ period, values });
  
  // Align the two WMAs
  const offset = wmaFull.length - wmaHalf.length;
  const diff: number[] = [];
  
  for (let i = 0; i < wmaFull.length; i++) {
    const halfIdx = i + offset;
    if (halfIdx >= 0 && halfIdx < wmaHalf.length) {
      diff.push(2 * wmaHalf[halfIdx] - wmaFull[i]);
    }
  }
  
  const hma = WMA.calculate({ period: sqrtPeriod, values: diff });
  return alignResults(klines, hma, 'hma');
}

/**
 * Double EMA
 */
function calculateDEMA(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 20;
  const source = (params.source as PriceSource) || 'close';
  const values = getPriceSource(klines, source);
  
  const ema1 = EMA.calculate({ period, values });
  const ema2 = EMA.calculate({ period, values: ema1 });
  
  // DEMA = 2 * EMA - EMA(EMA)
  const offset = ema1.length - ema2.length;
  const dema: number[] = [];
  
  for (let i = 0; i < ema2.length; i++) {
    dema.push(2 * ema1[i + offset] - ema2[i]);
  }
  
  return alignResults(klines, dema, 'dema');
}

/**
 * Triple EMA
 */
function calculateTEMA(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 20;
  const source = (params.source as PriceSource) || 'close';
  const values = getPriceSource(klines, source);
  
  const ema1 = EMA.calculate({ period, values });
  const ema2 = EMA.calculate({ period, values: ema1 });
  const ema3 = EMA.calculate({ period, values: ema2 });
  
  // TEMA = 3 * EMA - 3 * EMA(EMA) + EMA(EMA(EMA))
  const offset1 = ema1.length - ema2.length;
  const offset2 = ema2.length - ema3.length;
  const totalOffset = offset1 + offset2;
  
  const tema: number[] = [];
  
  for (let i = 0; i < ema3.length; i++) {
    const e1 = ema1[i + totalOffset];
    const e2 = ema2[i + offset2];
    const e3 = ema3[i];
    tema.push(3 * e1 - 3 * e2 + e3);
  }
  
  return alignResults(klines, tema, 'tema');
}

/**
 * Volume Weighted Moving Average
 */
function calculateVWMA(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 20;
  
  const result: (number | null)[] = [];
  
  for (let i = 0; i < klines.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    
    let sumPriceVol = 0;
    let sumVol = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      sumPriceVol += klines[j].close * klines[j].volume;
      sumVol += klines[j].volume;
    }
    
    result.push(sumVol > 0 ? sumPriceVol / sumVol : null);
  }
  
  return klines.map((k, i) => ({
    time: k.time,
    values: { vwma: result[i] },
  }));
}

/**
 * Momentum
 */
function calculateMomentum(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period = Number(params.period) || 10;
  const source = (params.source as PriceSource) || 'close';
  const values = getPriceSource(klines, source);
  
  const result: (number | null)[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < period) {
      result.push(null);
    } else {
      result.push(values[i] - values[i - period]);
    }
  }
  
  return klines.map((k, i) => ({
    time: k.time,
    values: { momentum: result[i] },
  }));
}

/**
 * Awesome Oscillator
 */
function calculateAO(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const fastPeriod = Number(params.fastPeriod) || 5;
  const slowPeriod = Number(params.slowPeriod) || 34;
  
  // AO uses median price (hl2)
  const medianPrices = klines.map(k => (k.high + k.low) / 2);
  
  const fastSMA = SMA.calculate({ period: fastPeriod, values: medianPrices });
  const slowSMA = SMA.calculate({ period: slowPeriod, values: medianPrices });
  
  const offset = fastSMA.length - slowSMA.length;
  const ao: number[] = [];
  
  for (let i = 0; i < slowSMA.length; i++) {
    ao.push(fastSMA[i + offset] - slowSMA[i]);
  }
  
  return alignResults(klines, ao, 'ao');
}

/**
 * Ultimate Oscillator
 */
function calculateUO(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const period1 = Number(params.period1) || 7;
  const period2 = Number(params.period2) || 14;
  const period3 = Number(params.period3) || 28;
  const weight1 = Number(params.weight1) || 4;
  const weight2 = Number(params.weight2) || 2;
  const weight3 = Number(params.weight3) || 1;
  
  if (klines.length < period3 + 1) {
    return klines.map(k => ({
      time: k.time,
      values: { uo: null },
    }));
  }
  
  // Calculate BP (Buying Pressure) and TR (True Range)
  const bp: number[] = [];
  const tr: number[] = [];
  
  for (let i = 0; i < klines.length; i++) {
    if (i === 0) {
      bp.push(klines[i].close - klines[i].low);
      tr.push(klines[i].high - klines[i].low);
    } else {
      const trueLow = Math.min(klines[i].low, klines[i - 1].close);
      const trueHigh = Math.max(klines[i].high, klines[i - 1].close);
      bp.push(klines[i].close - trueLow);
      tr.push(trueHigh - trueLow);
    }
  }
  
  const result: (number | null)[] = [];
  
  for (let i = 0; i < klines.length; i++) {
    if (i < period3) {
      result.push(null);
      continue;
    }
    
    const sumBP1 = bp.slice(i - period1 + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumTR1 = tr.slice(i - period1 + 1, i + 1).reduce((a, b) => a + b, 0);
    const avg1 = sumTR1 > 0 ? sumBP1 / sumTR1 : 0;
    
    const sumBP2 = bp.slice(i - period2 + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumTR2 = tr.slice(i - period2 + 1, i + 1).reduce((a, b) => a + b, 0);
    const avg2 = sumTR2 > 0 ? sumBP2 / sumTR2 : 0;
    
    const sumBP3 = bp.slice(i - period3 + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumTR3 = tr.slice(i - period3 + 1, i + 1).reduce((a, b) => a + b, 0);
    const avg3 = sumTR3 > 0 ? sumBP3 / sumTR3 : 0;
    
    const uo = 100 * ((weight1 * avg1 + weight2 * avg2 + weight3 * avg3) / (weight1 + weight2 + weight3));
    result.push(uo);
  }
  
  return klines.map((k, i) => ({
    time: k.time,
    values: { uo: result[i] },
  }));
}

/**
 * Volume indicator with optional MA
 */
function calculateVolume(
  klines: ParsedKline[],
  params: CalculationParams
): IndicatorResult[] {
  const showMA = params.showMA !== false;
  const maPeriod = Number(params.maPeriod) || 20;
  
  const volumes = klines.map(k => k.volume);
  const volumeMA = showMA ? SMA.calculate({ period: maPeriod, values: volumes }) : [];
  
  return klines.map((k, i) => {
    const maIdx = i - (klines.length - volumeMA.length);
    return {
      time: k.time,
      values: {
        volume: k.volume,
        ma: showMA && maIdx >= 0 && maIdx < volumeMA.length ? volumeMA[maIdx] : null,
      },
    };
  });
}

// =============================================================================
// Master Calculator Map
// =============================================================================

type CalculatorFunction = (klines: ParsedKline[], params: CalculationParams) => IndicatorResult[];

const CALCULATORS: Record<string, CalculatorFunction> = {
  // Trend
  SMA: calculateSMA,
  EMA: calculateEMA,
  WMA: calculateWMA,
  VWMA: calculateVWMA,
  HMA: calculateHMA,
  DEMA: calculateDEMA,
  TEMA: calculateTEMA,
  VWAP: calculateVWAP,
  ICHIMOKU: calculateIchimoku,
  PSAR: calculatePSAR,
  SUPERTREND: calculateSupertrend,
  
  // Momentum
  RSI: calculateRSI,
  MACD: calculateMACD,
  STOCH: calculateStochastic,
  STOCHRSI: calculateStochRSI,
  CCI: calculateCCI,
  WILLR: calculateWilliamsR,
  ROC: calculateROC,
  MOM: calculateMomentum,
  MFI: calculateMFI,
  AO: calculateAO,
  UO: calculateUO,
  ADX: calculateADX,
  
  // Volatility
  BB: calculateBollingerBands,
  ATR: calculateATR,
  KC: calculateKeltnerChannel,
  DC: calculateDonchianChannel,
  STDDEV: calculateStdDev,
  
  // Volume
  OBV: calculateOBV,
  VP: calculateVolumeProfile,
  CMF: calculateCMF,
  AD: calculateAD,
  VOLUME: calculateVolume,
  
  // Custom
  PIVOT: calculatePivotPoints,
};

// =============================================================================
// Main Export Functions
// =============================================================================

/**
 * Calculate a single indicator
 */
export function calculateIndicator(
  type: IndicatorType | string,
  klines: ParsedKline[],
  params: CalculationParams = {}
): CalculationResult {
  const startTime = performance.now();
  
  // Check cache
  const klinesHash = getKlinesHash(klines);
  const cacheKey = generateCacheKey(type, klinesHash, params);
  
  const cached = calculationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  
  // Clean cache periodically
  if (Math.random() < 0.1) {
    cleanCache();
  }
  
  // Get calculator
  const calculator = CALCULATORS[type.toUpperCase()];
  
  if (!calculator) {
    console.warn(`Unknown indicator type: ${type}`);
    return {
      type: type as IndicatorType,
      data: klines.map(k => ({ time: k.time, values: {} })),
      meta: {
        calculationTime: 0,
        dataPoints: klines.length,
        startTime: klines[0]?.time || 0,
        endTime: klines[klines.length - 1]?.time || 0,
      },
    };
  }
  
  // Calculate
  const data = calculator(klines, params);
  
  const endTime = performance.now();
  
  const result: CalculationResult = {
    type: type as IndicatorType,
    data,
    meta: {
      calculationTime: endTime - startTime,
      dataPoints: klines.length,
      startTime: klines[0]?.time || 0,
      endTime: klines[klines.length - 1]?.time || 0,
    },
  };
  
  // Cache result
  calculationCache.set(cacheKey, {
    hash: klinesHash,
    result,
    timestamp: Date.now(),
  });
  
  return result;
}

/**
 * Calculate multiple indicators at once (optimized)
 */
export function calculateIndicators(
  types: Array<{ type: IndicatorType | string; params?: CalculationParams }>,
  klines: ParsedKline[]
): CalculationResult[] {
  return types.map(({ type, params }) => calculateIndicator(type, klines, params || {}));
}

/**
 * Get the last calculated value for an indicator
 */
export function getLatestValue(
  type: IndicatorType | string,
  klines: ParsedKline[],
  params: CalculationParams = {}
): Record<string, number | null> {
  const result = calculateIndicator(type, klines, params);
  const lastData = result.data[result.data.length - 1];
  return lastData?.values || {};
}

/**
 * Clear the calculation cache
 */
export function clearCalculationCache(): void {
  calculationCache.clear();
}

/**
 * Get available indicator types
 */
export function getAvailableIndicators(): string[] {
  return Object.keys(CALCULATORS);
}

/**
 * Check if an indicator type is supported
 */
export function isIndicatorSupported(type: string): boolean {
  return type.toUpperCase() in CALCULATORS;
}

// =============================================================================
// Exports
// =============================================================================

export {
  // Individual calculators for direct use
  calculateSMA,
  calculateEMA,
  calculateWMA,
  calculateVWAP,
  calculateIchimoku,
  calculatePSAR,
  calculateSupertrend,
  calculateRSI,
  calculateMACD,
  calculateStochastic,
  calculateStochRSI,
  calculateCCI,
  calculateWilliamsR,
  calculateROC,
  calculateMFI,
  calculateBollingerBands,
  calculateATR,
  calculateKeltnerChannel,
  calculateDonchianChannel,
  calculateStdDev,
  calculateOBV,
  calculateVolumeProfile,
  calculateCMF,
  calculateAD,
  calculatePivotPoints,
  calculateADX,
  calculateHMA,
  calculateDEMA,
  calculateTEMA,
  calculateVWMA,
  calculateMomentum,
  calculateAO,
  calculateUO,
  calculateVolume,
  // Helper functions
  getPriceSource,
  calculateTrueRange,
  calculateEMAInternal,
  calculateSMAInternal,
};

export default calculateIndicator;
