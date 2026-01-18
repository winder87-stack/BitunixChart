import { Stochastic, SMA } from 'technicalindicators';
import type { ParsedKline } from '../../types/bitunix';
import {
  STOCHASTIC_BANDS,
  type StochasticBandKey,
  type StochasticValue,
  type QuadStochasticData,
  type DivergenceType,
  type DivergenceDetails,
  type SignalConfig,
  DEFAULT_SIGNAL_CONFIG,
} from '../../types/quadStochastic';

export type StochZone = 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
export type CrossoverType = 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NONE';

interface SwingPoint {
  index: number;
  time: number;
  price: number;
  stochK: number;
  stochD: number;
}

interface RawStochResult {
  k: number;
  d: number;
}

function clampStochValue(value: number): number {
  if (!Number.isFinite(value)) {
    console.warn(`[QuadStochCalc] Invalid stoch value: ${value}, clamping to 50`);
    return 50;
  }
  return Math.max(0, Math.min(100, value));
}

function validateKlines(klines: ParsedKline[], minLength: number): boolean {
  if (!klines || klines.length < minLength) {
    return false;
  }
  
  for (let i = 0; i < Math.min(5, klines.length); i++) {
    const k = klines[i];
    if (!Number.isFinite(k.high) || !Number.isFinite(k.low) || !Number.isFinite(k.close)) {
      console.warn(`[QuadStochCalc] Invalid kline data at index ${i}`);
      return false;
    }
  }
  
  return true;
}

export function calculateSingleStochastic(
  klines: ParsedKline[],
  kPeriod: number,
  dPeriod: number,
  smooth: number
): StochasticValue[] {
  if (!validateKlines(klines, kPeriod)) {
    return [];
  }

  try {
    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);
    const closes = klines.map(k => k.close);

    const rawResult = Stochastic.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: kPeriod,
      signalPeriod: dPeriod,
    }) as RawStochResult[];

    if (!rawResult || rawResult.length === 0) {
      return [];
    }

    let smoothedK: number[];
    if (smooth > 1) {
      const rawKValues = rawResult.map(r => r.k);
      smoothedK = SMA.calculate({ period: smooth, values: rawKValues });
    } else {
      smoothedK = rawResult.map(r => r.k);
    }

    const finalD = SMA.calculate({ period: dPeriod, values: smoothedK });

    const kOffset = rawResult.length - smoothedK.length;
    const dOffset = smoothedK.length - finalD.length;
    const totalOffset = klines.length - rawResult.length + kOffset + dOffset;

    const result: StochasticValue[] = [];

    for (let i = 0; i < klines.length; i++) {
      const dIdx = i - totalOffset;

      if (dIdx >= 0 && dIdx < finalD.length) {
        const kIdx = dIdx + dOffset;
        result.push({
          time: klines[i].time,
          k: clampStochValue(smoothedK[kIdx] ?? NaN),
          d: clampStochValue(finalD[dIdx] ?? NaN),
        });
      } else {
        result.push({
          time: klines[i].time,
          k: NaN,
          d: NaN,
        });
      }
    }

    return result;
  } catch (error) {
    console.error('[QuadStochCalc] Error calculating stochastic:', error);
    return [];
  }
}

export function calculateQuadStochastic(klines: ParsedKline[]): QuadStochasticData {
  const { FAST, STANDARD, MEDIUM, SLOW } = STOCHASTIC_BANDS;

  const fast = calculateSingleStochastic(klines, FAST.kPeriod, FAST.dPeriod, FAST.smooth);
  const standard = calculateSingleStochastic(klines, STANDARD.kPeriod, STANDARD.dPeriod, STANDARD.smooth);
  const medium = calculateSingleStochastic(klines, MEDIUM.kPeriod, MEDIUM.dPeriod, MEDIUM.smooth);
  const slow = calculateSingleStochastic(klines, SLOW.kPeriod, SLOW.dPeriod, SLOW.smooth);

  const targetLength = klines.length;
  const alignedFast = alignArrayByTimestamp(fast, klines, targetLength);
  const alignedStandard = alignArrayByTimestamp(standard, klines, targetLength);
  const alignedMedium = alignArrayByTimestamp(medium, klines, targetLength);
  const alignedSlow = alignArrayByTimestamp(slow, klines, targetLength);

  return {
    fast: alignedFast,
    standard: alignedStandard,
    medium: alignedMedium,
    slow: alignedSlow,
  };
}

function alignArrayByTimestamp(
  stochData: StochasticValue[],
  klines: ParsedKline[],
  targetLength: number
): StochasticValue[] {
  if (stochData.length === targetLength) {
    return stochData;
  }

  const timeMap = new Map<number, StochasticValue>();
  for (const sv of stochData) {
    timeMap.set(sv.time, sv);
  }

  return klines.map(k => {
    const existing = timeMap.get(k.time);
    if (existing) {
      return existing;
    }
    return { time: k.time, k: NaN, d: NaN };
  });
}

export function getStochZone(value: number, config: SignalConfig = DEFAULT_SIGNAL_CONFIG): StochZone {
  if (!Number.isFinite(value)) {
    return 'NEUTRAL';
  }
  
  if (value <= config.oversoldLevel) {
    return 'OVERSOLD';
  }
  if (value >= config.overboughtLevel) {
    return 'OVERBOUGHT';
  }
  return 'NEUTRAL';
}

export function getStochCrossover(
  current: StochasticValue,
  previous: StochasticValue
): CrossoverType {
  if (!current || !previous) {
    return 'NONE';
  }
  
  if (!Number.isFinite(current.k) || !Number.isFinite(current.d) ||
      !Number.isFinite(previous.k) || !Number.isFinite(previous.d)) {
    return 'NONE';
  }

  const prevKBelowD = previous.k < previous.d;
  const currKAboveD = current.k > current.d;
  
  const prevKAboveD = previous.k > previous.d;
  const currKBelowD = current.k < current.d;

  if (prevKBelowD && currKAboveD) {
    return 'BULLISH_CROSS';
  }
  
  if (prevKAboveD && currKBelowD) {
    return 'BEARISH_CROSS';
  }

  return 'NONE';
}

export function findSwingLows(
  klines: ParsedKline[],
  stochData: StochasticValue[],
  lookback: number = 5,
  minSwingSize: number = 0.001
): SwingPoint[] {
  const swings: SwingPoint[] = [];
  
  if (klines.length < lookback * 2 + 1) {
    return swings;
  }

  for (let i = lookback; i < klines.length - lookback; i++) {
    const current = klines[i];
    const stoch = stochData[i];
    
    if (!Number.isFinite(stoch?.k)) {
      continue;
    }

    let isSwingLow = true;
    const currentLow = current.low;

    for (let j = 1; j <= lookback; j++) {
      const leftLow = klines[i - j].low;
      const rightLow = klines[i + j].low;
      
      if (currentLow >= leftLow || currentLow >= rightLow) {
        isSwingLow = false;
        break;
      }
    }

    if (isSwingLow) {
      const leftHigh = Math.max(...klines.slice(i - lookback, i).map(k => k.high));
      const swingPercent = (leftHigh - currentLow) / leftHigh;
      
      if (swingPercent >= minSwingSize) {
        swings.push({
          index: i,
          time: current.time,
          price: currentLow,
          stochK: stoch.k,
          stochD: stoch.d,
        });
      }
    }
  }

  return swings;
}

export function findSwingHighs(
  klines: ParsedKline[],
  stochData: StochasticValue[],
  lookback: number = 5,
  minSwingSize: number = 0.001
): SwingPoint[] {
  const swings: SwingPoint[] = [];
  
  if (klines.length < lookback * 2 + 1) {
    return swings;
  }

  for (let i = lookback; i < klines.length - lookback; i++) {
    const current = klines[i];
    const stoch = stochData[i];
    
    if (!Number.isFinite(stoch?.k)) {
      continue;
    }

    let isSwingHigh = true;
    const currentHigh = current.high;

    for (let j = 1; j <= lookback; j++) {
      const leftHigh = klines[i - j].high;
      const rightHigh = klines[i + j].high;
      
      if (currentHigh <= leftHigh || currentHigh <= rightHigh) {
        isSwingHigh = false;
        break;
      }
    }

    if (isSwingHigh) {
      const leftLow = Math.min(...klines.slice(i - lookback, i).map(k => k.low));
      const swingPercent = (currentHigh - leftLow) / currentHigh;
      
      if (swingPercent >= minSwingSize) {
        swings.push({
          index: i,
          time: current.time,
          price: currentHigh,
          stochK: stoch.k,
          stochD: stoch.d,
        });
      }
    }
  }

  return swings;
}

export function calculateDivergenceAngle(
  point1: SwingPoint,
  point2: SwingPoint,
  klines: ParsedKline[]
): number {
  if (!point1 || !point2 || point1.index >= point2.index) {
    return 0;
  }

  const candleSpan = point2.index - point1.index;
  if (candleSpan === 0) {
    return 0;
  }

  let priceMin = Infinity;
  let priceMax = -Infinity;
  for (let i = point1.index; i <= point2.index && i < klines.length; i++) {
    if (klines[i].low < priceMin) priceMin = klines[i].low;
    if (klines[i].high > priceMax) priceMax = klines[i].high;
  }
  const priceRange = priceMax - priceMin;
  if (priceRange === 0) {
    return 0;
  }

  const priceDelta = point2.price - point1.price;
  const stochDelta = point2.stochK - point1.stochK;

  const normalizedPriceSlope = (priceDelta / priceRange) / candleSpan;
  const normalizedStochSlope = (stochDelta / 100) / candleSpan;

  const slopeDifference = Math.abs(normalizedPriceSlope - normalizedStochSlope);
  const angleRadians = Math.atan(slopeDifference * 50);
  const angleDegrees = angleRadians * (180 / Math.PI);

  return Math.abs(angleDegrees);
}

export function detectBullishDivergence(
  swingLows: SwingPoint[],
  band: StochasticBandKey,
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): DivergenceDetails[] {
  const divergences: DivergenceDetails[] = [];

  if (swingLows.length < 2) {
    return divergences;
  }

  const seen = new Set<string>();

  for (let i = swingLows.length - 1; i >= 1; i--) {
    const recent = swingLows[i];
    const earlier = swingLows[i - 1];

    if (recent.index - earlier.index < config.minDivergenceSpan) {
      continue;
    }

    const key = `${earlier.index}-${recent.index}`;
    if (seen.has(key)) {
      continue;
    }

    if (recent.price < earlier.price && recent.stochK > earlier.stochK) {
      const angle = Math.abs(
        Math.atan2(recent.stochK - earlier.stochK, recent.index - earlier.index) * (180 / Math.PI)
      );

      if (angle >= config.minDivergenceAngle) {
        seen.add(key);
        divergences.push({
          type: 'BULLISH',
          angle,
          pricePoints: [earlier.price, recent.price],
          stochPoints: [earlier.stochK, recent.stochK],
          candleSpan: recent.index - earlier.index,
          band,
        });
      }
    }

    if (recent.price > earlier.price && recent.stochK < earlier.stochK) {
      const angle = Math.abs(
        Math.atan2(earlier.stochK - recent.stochK, recent.index - earlier.index) * (180 / Math.PI)
      );

      if (angle >= config.minDivergenceAngle) {
        const hiddenKey = `hidden-${earlier.index}-${recent.index}`;
        if (!seen.has(hiddenKey)) {
          seen.add(hiddenKey);
          divergences.push({
            type: 'HIDDEN_BULLISH',
            angle,
            pricePoints: [earlier.price, recent.price],
            stochPoints: [earlier.stochK, recent.stochK],
            candleSpan: recent.index - earlier.index,
            band,
          });
        }
      }
    }
  }

  return divergences;
}

export function detectBearishDivergence(
  swingHighs: SwingPoint[],
  band: StochasticBandKey,
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): DivergenceDetails[] {
  const divergences: DivergenceDetails[] = [];

  if (swingHighs.length < 2) {
    return divergences;
  }

  const seen = new Set<string>();

  for (let i = swingHighs.length - 1; i >= 1; i--) {
    const recent = swingHighs[i];
    const earlier = swingHighs[i - 1];

    if (recent.index - earlier.index < config.minDivergenceSpan) {
      continue;
    }

    const key = `${earlier.index}-${recent.index}`;
    if (seen.has(key)) {
      continue;
    }

    if (recent.price > earlier.price && recent.stochK < earlier.stochK) {
      const angle = Math.abs(
        Math.atan2(earlier.stochK - recent.stochK, recent.index - earlier.index) * (180 / Math.PI)
      );

      if (angle >= config.minDivergenceAngle) {
        seen.add(key);
        divergences.push({
          type: 'BEARISH',
          angle,
          pricePoints: [earlier.price, recent.price],
          stochPoints: [earlier.stochK, recent.stochK],
          candleSpan: recent.index - earlier.index,
          band,
        });
      }
    }

    if (recent.price < earlier.price && recent.stochK > earlier.stochK) {
      const angle = Math.abs(
        Math.atan2(recent.stochK - earlier.stochK, recent.index - earlier.index) * (180 / Math.PI)
      );

      if (angle >= config.minDivergenceAngle) {
        const hiddenKey = `hidden-${earlier.index}-${recent.index}`;
        if (!seen.has(hiddenKey)) {
          seen.add(hiddenKey);
          divergences.push({
            type: 'HIDDEN_BEARISH',
            angle,
            pricePoints: [earlier.price, recent.price],
            stochPoints: [earlier.stochK, recent.stochK],
            candleSpan: recent.index - earlier.index,
            band,
          });
        }
      }
    }
  }

  return divergences;
}

export function detectAllDivergences(
  klines: ParsedKline[],
  stochData: StochasticValue[],
  band: StochasticBandKey,
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): DivergenceDetails[] {
  if (klines.length < config.lookbackPeriod) {
    return [];
  }

  const recentKlines = klines.slice(-config.lookbackPeriod);
  const recentStoch = stochData.slice(-config.lookbackPeriod);

  const swingLows = findSwingLows(recentKlines, recentStoch, 3, 0.0005);
  const swingHighs = findSwingHighs(recentKlines, recentStoch, 3, 0.0005);

  const bullishDivs = detectBullishDivergence(swingLows, band, config);
  const bearishDivs = detectBearishDivergence(swingHighs, band, config);

  const allDivergences = [...bullishDivs, ...bearishDivs];

  allDivergences.sort((a, b) => b.candleSpan - a.candleSpan);

  return allDivergences;
}

export function detectQuadDivergences(
  klines: ParsedKline[],
  quadData: QuadStochasticData,
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): DivergenceDetails[] {
  const allDivergences: DivergenceDetails[] = [];

  const bandMap: Array<[StochasticBandKey, StochasticValue[]]> = [
    ['FAST', quadData.fast],
    ['STANDARD', quadData.standard],
    ['MEDIUM', quadData.medium],
    ['SLOW', quadData.slow],
  ];

  for (const [bandKey, stochData] of bandMap) {
    const divs = detectAllDivergences(klines, stochData, bandKey, config);
    allDivergences.push(...divs);
  }

  allDivergences.sort((a, b) => {
    if (a.band === 'SLOW' && b.band !== 'SLOW') return -1;
    if (a.band !== 'SLOW' && b.band === 'SLOW') return 1;
    if (a.band === 'MEDIUM' && b.band !== 'MEDIUM') return -1;
    if (a.band !== 'MEDIUM' && b.band === 'MEDIUM') return 1;
    return b.angle - a.angle;
  });

  return allDivergences;
}

export function isDivergenceBullish(type: DivergenceType): boolean {
  return type === 'BULLISH' || type === 'HIDDEN_BULLISH';
}

export function isDivergenceBearish(type: DivergenceType): boolean {
  return type === 'BEARISH' || type === 'HIDDEN_BEARISH';
}

export function getLatestQuadSnapshot(quadData: QuadStochasticData): {
  fast: { k: number; d: number };
  standard: { k: number; d: number };
  medium: { k: number; d: number };
  slow: { k: number; d: number };
} | null {
  const getLastValid = (arr: StochasticValue[]): { k: number; d: number } | null => {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (Number.isFinite(arr[i].k) && Number.isFinite(arr[i].d)) {
        return { k: arr[i].k, d: arr[i].d };
      }
    }
    return null;
  };

  const fast = getLastValid(quadData.fast);
  const standard = getLastValid(quadData.standard);
  const medium = getLastValid(quadData.medium);
  const slow = getLastValid(quadData.slow);

  if (!fast || !standard || !medium || !slow) {
    return null;
  }

  return { fast, standard, medium, slow };
}

export function countBandsInZone(
  quadData: QuadStochasticData,
  zone: StochZone,
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): number {
  const snapshot = getLatestQuadSnapshot(quadData);
  if (!snapshot) {
    return 0;
  }

  let count = 0;
  const bands = [snapshot.fast, snapshot.standard, snapshot.medium, snapshot.slow];

  for (const band of bands) {
    if (getStochZone(band.k, config) === zone) {
      count++;
    }
  }

  return count;
}

export function areAllBandsBullish(quadData: QuadStochasticData): boolean {
  const snapshot = getLatestQuadSnapshot(quadData);
  if (!snapshot) {
    return false;
  }

  return (
    snapshot.fast.k > snapshot.fast.d &&
    snapshot.standard.k > snapshot.standard.d &&
    snapshot.medium.k > snapshot.medium.d &&
    snapshot.slow.k > snapshot.slow.d
  );
}

export function areAllBandsBearish(quadData: QuadStochasticData): boolean {
  const snapshot = getLatestQuadSnapshot(quadData);
  if (!snapshot) {
    return false;
  }

  return (
    snapshot.fast.k < snapshot.fast.d &&
    snapshot.standard.k < snapshot.standard.d &&
    snapshot.medium.k < snapshot.medium.d &&
    snapshot.slow.k < snapshot.slow.d
  );
}

// =============================================================================
// PART 4: Quad Rotation Detection (Super Signal)
// =============================================================================

export type QuadRotationStrength = 'EXTREME' | 'STRONG' | 'MODERATE' | 'NONE';

export interface QuadRotationResult {
  isQuadOversold: boolean;
  isQuadOverbought: boolean;
  strength: QuadRotationStrength;
  avgKValue: number;
}

export function detectQuadRotation(
  quadData: QuadStochasticData,
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): QuadRotationResult {
  const snapshot = getLatestQuadSnapshot(quadData);
  
  if (!snapshot) {
    return { isQuadOversold: false, isQuadOverbought: false, strength: 'NONE', avgKValue: 50 };
  }

  const kValues = [snapshot.fast.k, snapshot.standard.k, snapshot.medium.k, snapshot.slow.k];
  const avgK = kValues.reduce((a, b) => a + b, 0) / 4;

  const allOversold = kValues.every(k => k <= config.oversoldLevel);
  const allOverbought = kValues.every(k => k >= config.overboughtLevel);

  let strength: QuadRotationStrength = 'NONE';

  if (allOversold) {
    if (kValues.every(k => k <= 10)) {
      strength = 'EXTREME';
    } else if (kValues.every(k => k <= 15)) {
      strength = 'STRONG';
    } else {
      strength = 'MODERATE';
    }
  } else if (allOverbought) {
    if (kValues.every(k => k >= 90)) {
      strength = 'EXTREME';
    } else if (kValues.every(k => k >= 85)) {
      strength = 'STRONG';
    } else {
      strength = 'MODERATE';
    }
  }

  return {
    isQuadOversold: allOversold,
    isQuadOverbought: allOverbought,
    strength,
    avgKValue: avgK,
  };
}

// =============================================================================
// PART 5: 20/20 Flag Detection
// =============================================================================

export interface TwentyTwentyFlagResult {
  isBearFlag: boolean;
  isBullFlag: boolean;
  fastK: number;
  fastD: number;
  slowK: number;
  slowD: number;
}

export function detect2020Flag(
  quadData: QuadStochasticData,
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): TwentyTwentyFlagResult {
  const snapshot = getLatestQuadSnapshot(quadData);

  if (!snapshot) {
    return { isBearFlag: false, isBullFlag: false, fastK: 50, fastD: 50, slowK: 50, slowD: 50 };
  }

  const { fast, slow } = snapshot;

  const isBearFlag = fast.k >= config.overboughtLevel && slow.k <= config.oversoldLevel;
  const isBullFlag = fast.k <= config.oversoldLevel && slow.k >= config.overboughtLevel;

  return {
    isBearFlag,
    isBullFlag,
    fastK: fast.k,
    fastD: fast.d,
    slowK: slow.k,
    slowD: slow.d,
  };
}

// =============================================================================
// PART 6: Channel Detection
// =============================================================================

export interface ChannelResult {
  upper: number;
  lower: number;
  midline: number;
  isValid: boolean;
  touches: { upper: number; lower: number };
  channelHeight: number;
  channelHeightPercent: number;
}

export type ChannelPosition = 'UPPER' | 'LOWER' | 'MIDDLE' | 'OUTSIDE';

export function detectChannel(
  klines: ParsedKline[],
  lookback: number = 50
): ChannelResult {
  const invalidResult: ChannelResult = {
    upper: 0,
    lower: 0,
    midline: 0,
    isValid: false,
    touches: { upper: 0, lower: 0 },
    channelHeight: 0,
    channelHeightPercent: 0,
  };

  if (klines.length < lookback) {
    return invalidResult;
  }

  const recentKlines = klines.slice(-lookback);
  
  const swingHighs: number[] = [];
  const swingLows: number[] = [];

  for (let i = 2; i < recentKlines.length - 2; i++) {
    const curr = recentKlines[i];
    const isSwingHigh = curr.high > recentKlines[i - 1].high && 
                        curr.high > recentKlines[i - 2].high &&
                        curr.high > recentKlines[i + 1].high && 
                        curr.high > recentKlines[i + 2].high;
    
    const isSwingLow = curr.low < recentKlines[i - 1].low && 
                       curr.low < recentKlines[i - 2].low &&
                       curr.low < recentKlines[i + 1].low && 
                       curr.low < recentKlines[i + 2].low;

    if (isSwingHigh) swingHighs.push(curr.high);
    if (isSwingLow) swingLows.push(curr.low);
  }

  if (swingHighs.length < 2 || swingLows.length < 2) {
    return invalidResult;
  }

  swingHighs.sort((a, b) => b - a);
  swingLows.sort((a, b) => a - b);

  const upper = (swingHighs[0] + swingHighs[1]) / 2;
  const lower = (swingLows[0] + swingLows[1]) / 2;
  const midline = (upper + lower) / 2;
  const channelHeight = upper - lower;
  const channelHeightPercent = (channelHeight / midline) * 100;

  const isValidChannel = channelHeightPercent >= 1 && channelHeightPercent <= 10;

  let upperTouches = 0;
  let lowerTouches = 0;
  const touchThreshold = channelHeight * 0.05;

  for (const k of recentKlines) {
    if (Math.abs(k.high - upper) <= touchThreshold) upperTouches++;
    if (Math.abs(k.low - lower) <= touchThreshold) lowerTouches++;
  }

  return {
    upper,
    lower,
    midline,
    isValid: isValidChannel,
    touches: { upper: upperTouches, lower: lowerTouches },
    channelHeight,
    channelHeightPercent,
  };
}

export function isAtChannelExtreme(
  price: number,
  channel: ChannelResult,
  thresholdPercent: number = 2
): ChannelPosition {
  if (!channel.isValid) {
    return 'OUTSIDE';
  }

  const threshold = channel.channelHeight * (thresholdPercent / 100);

  if (price >= channel.upper - threshold) {
    return 'UPPER';
  }
  if (price <= channel.lower + threshold) {
    return 'LOWER';
  }
  
  const midRange = channel.channelHeight * 0.25;
  if (Math.abs(price - channel.midline) <= midRange) {
    return 'MIDDLE';
  }

  return 'OUTSIDE';
}

// =============================================================================
// PART 7: VWAP and MA Confluence
// =============================================================================

export function calculateVWAP(klines: ParsedKline[]): number {
  if (klines.length === 0) return 0;

  let cumTypicalPriceVol = 0;
  let cumVolume = 0;

  for (const k of klines) {
    const typicalPrice = (k.high + k.low + k.close) / 3;
    cumTypicalPriceVol += typicalPrice * k.volume;
    cumVolume += k.volume;
  }

  return cumVolume > 0 ? cumTypicalPriceVol / cumVolume : 0;
}

export function calculateSMA(closes: number[], period: number): number {
  if (closes.length < period) return 0;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function checkVwapConfluence(
  price: number,
  vwap: number,
  thresholdPercent: number = 0.5
): boolean {
  if (vwap === 0) return false;
  const threshold = vwap * (thresholdPercent / 100);
  return Math.abs(price - vwap) <= threshold;
}

export function checkMAConfluence(
  price: number,
  ma20: number,
  ma50: number,
  signalType: 'LONG' | 'SHORT'
): boolean {
  if (ma20 === 0 || ma50 === 0) return false;

  if (signalType === 'LONG') {
    return ma20 > ma50 || price > ma20;
  } else {
    return ma20 < ma50 || price < ma20;
  }
}

export function checkVolumeSpike(klines: ParsedKline[], multiplier: number = 1.5): boolean {
  if (klines.length < 21) return false;

  const recentVolumes = klines.slice(-21, -1).map(k => k.volume);
  const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / 20;
  const currentVolume = klines[klines.length - 1].volume;

  return currentVolume > avgVolume * multiplier;
}

// =============================================================================
// PART 8: Signal Scoring
// =============================================================================

export interface SignalFactors {
  divergenceAngle: number | null;
  hasQuadRotation: boolean;
  quadRotationStrength: QuadRotationStrength;
  isAtChannelExtreme: boolean;
  has2020Flag: boolean;
  hasVwapConfluence: boolean;
  hasMAConfluence: boolean;
  hasVolumeSpike: boolean;
  hasHTFAlignment: boolean;
}

export type SignalStrengthLevel = 'SUPER' | 'STRONG' | 'MODERATE' | 'WEAK';

export function calculateSignalStrength(factors: SignalFactors): {
  strength: SignalStrengthLevel;
  score: number;
} {
  let score = 0;

  if (factors.divergenceAngle !== null) {
    if (factors.divergenceAngle >= 15) score += 3;
    else if (factors.divergenceAngle >= 10) score += 2;
    else if (factors.divergenceAngle >= 7) score += 1;
  }

  if (factors.hasQuadRotation) {
    if (factors.quadRotationStrength === 'EXTREME') score += 5;
    else if (factors.quadRotationStrength === 'STRONG') score += 4;
    else score += 3;
  }

  if (factors.isAtChannelExtreme) score += 2;
  if (factors.has2020Flag) score += 2;
  if (factors.hasVwapConfluence) score += 1;
  if (factors.hasMAConfluence) score += 1;
  if (factors.hasVolumeSpike) score += 1;
  if (factors.hasHTFAlignment) score += 1;

  let strength: SignalStrengthLevel;
  if (score >= 7) strength = 'SUPER';
  else if (score >= 5) strength = 'STRONG';
  else if (score >= 3) strength = 'MODERATE';
  else strength = 'WEAK';

  return { strength, score };
}

export function shouldTakeSignal(
  strength: SignalStrengthLevel,
  hasQuadRotation: boolean,
  minStrength: SignalStrengthLevel = 'MODERATE'
): boolean {
  if (hasQuadRotation) return true;

  const strengthOrder: SignalStrengthLevel[] = ['WEAK', 'MODERATE', 'STRONG', 'SUPER'];
  const currentIdx = strengthOrder.indexOf(strength);
  const minIdx = strengthOrder.indexOf(minStrength);

  return currentIdx >= minIdx;
}

// =============================================================================
// PART 9: Entry/Exit Calculation
// =============================================================================

export interface EntryExitLevels {
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskRewardRatio: number;
  riskAmount: number;
  rewardAmount: number;
}

export function calculateEntryExit(
  klines: ParsedKline[],
  signalType: 'LONG' | 'SHORT',
  channel: ChannelResult | null,
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): EntryExitLevels {
  const latest = klines[klines.length - 1];
  const entryPrice = latest.close;

  let recentSwingLow = Infinity;
  let recentSwingHigh = -Infinity;
  const lookback = Math.min(20, klines.length);

  for (let i = klines.length - lookback; i < klines.length; i++) {
    if (klines[i].low < recentSwingLow) recentSwingLow = klines[i].low;
    if (klines[i].high > recentSwingHigh) recentSwingHigh = klines[i].high;
  }

  let stopLoss: number;
  let target1: number;
  let target2: number;
  let target3: number;

  if (signalType === 'LONG') {
    const buffer = entryPrice * (config.stopLossBuffer / 100);
    stopLoss = Math.min(recentSwingLow - buffer, entryPrice * 0.99);

    target1 = entryPrice * (1 + config.target1Percent / 100);
    target2 = channel?.isValid ? channel.upper : entryPrice * (1 + config.target2Percent / 100);
    target3 = entryPrice * (1 + config.target3Percent / 100);
  } else {
    const buffer = entryPrice * (config.stopLossBuffer / 100);
    stopLoss = Math.max(recentSwingHigh + buffer, entryPrice * 1.01);

    target1 = entryPrice * (1 - config.target1Percent / 100);
    target2 = channel?.isValid ? channel.lower : entryPrice * (1 - config.target2Percent / 100);
    target3 = entryPrice * (1 - config.target3Percent / 100);
  }

  const riskAmount = Math.abs(entryPrice - stopLoss);
  const rewardAmount = Math.abs(target1 - entryPrice);
  const riskRewardRatio = riskAmount > 0 ? rewardAmount / riskAmount : 0;

  return {
    entryPrice,
    stopLoss,
    target1,
    target2,
    target3,
    riskRewardRatio,
    riskAmount,
    rewardAmount,
  };
}

export function generateSignalId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `sig_${timestamp}_${random}`;
}

// =============================================================================
// PART 10: Main Signal Generator
// =============================================================================

import type {
  QuadSignal,
  ConfluenceFlags,
  QuadStochasticSnapshot,
} from '../../types/quadStochastic';

export interface MAData {
  ma20: number;
  ma50: number;
}

export interface SignalGenerationResult {
  signals: QuadSignal[];
  quadData: QuadStochasticData;
  maData: MAData;
  channel: ChannelResult;
  vwap: number;
  quadRotation: QuadRotationResult;
  flag2020: TwentyTwentyFlagResult;
}

export function generateSignals(
  symbol: string,
  klines: ParsedKline[],
  quadData: QuadStochasticData,
  maData: MAData,
  vwap: number,
  channel: ChannelResult,
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): QuadSignal[] {
  const signals: QuadSignal[] = [];

  if (klines.length < 60) {
    return signals;
  }

  const snapshot = getLatestQuadSnapshot(quadData);
  if (!snapshot) {
    return signals;
  }

  const currentPrice = klines[klines.length - 1].close;
  const quadRotation = detectQuadRotation(quadData, config);
  const flag2020 = detect2020Flag(quadData, config);
  const divergences = detectQuadDivergences(klines, quadData, config);

  const hasVolumeSpike = checkVolumeSpike(klines);
  const channelPos = isAtChannelExtreme(currentPrice, channel);
  const htfAligned = snapshot.slow.k > snapshot.slow.d;

  const potentialSignals: Array<{ type: 'LONG' | 'SHORT'; reason: string; divergence: DivergenceDetails | null }> = [];

  if (quadRotation.isQuadOversold && areAllBandsBullish(quadData)) {
    potentialSignals.push({ type: 'LONG', reason: 'Quad oversold rotation', divergence: null });
  }
  if (quadRotation.isQuadOverbought && areAllBandsBearish(quadData)) {
    potentialSignals.push({ type: 'SHORT', reason: 'Quad overbought rotation', divergence: null });
  }

  for (const div of divergences) {
    if (isDivergenceBullish(div.type) && !potentialSignals.some(s => s.type === 'LONG')) {
      potentialSignals.push({ type: 'LONG', reason: `${div.type} divergence on ${div.band}`, divergence: div });
    }
    if (isDivergenceBearish(div.type) && !potentialSignals.some(s => s.type === 'SHORT')) {
      potentialSignals.push({ type: 'SHORT', reason: `${div.type} divergence on ${div.band}`, divergence: div });
    }
  }

  if (flag2020.isBullFlag && !potentialSignals.some(s => s.type === 'LONG')) {
    potentialSignals.push({ type: 'LONG', reason: '20/20 Bull Flag', divergence: null });
  }
  if (flag2020.isBearFlag && !potentialSignals.some(s => s.type === 'SHORT')) {
    potentialSignals.push({ type: 'SHORT', reason: '20/20 Bear Flag', divergence: null });
  }

  for (const potential of potentialSignals) {
    const isLong = potential.type === 'LONG';

    const factors: SignalFactors = {
      divergenceAngle: potential.divergence?.angle ?? null,
      hasQuadRotation: isLong ? quadRotation.isQuadOversold : quadRotation.isQuadOverbought,
      quadRotationStrength: quadRotation.strength,
      isAtChannelExtreme: (isLong && channelPos === 'LOWER') || (!isLong && channelPos === 'UPPER'),
      has2020Flag: isLong ? flag2020.isBullFlag : flag2020.isBearFlag,
      hasVwapConfluence: checkVwapConfluence(currentPrice, vwap),
      hasMAConfluence: checkMAConfluence(currentPrice, maData.ma20, maData.ma50, potential.type),
      hasVolumeSpike: hasVolumeSpike,
      hasHTFAlignment: isLong ? htfAligned : !htfAligned,
    };

    const { strength, score } = calculateSignalStrength(factors);

    if (!shouldTakeSignal(strength, factors.hasQuadRotation, config.minNotificationStrength as SignalStrengthLevel)) {
      continue;
    }

    const levels = calculateEntryExit(klines, potential.type, channel, config);

    if (levels.riskRewardRatio < 1.5 && !factors.hasQuadRotation) {
      continue;
    }

    const confluence: ConfluenceFlags = {
      quadRotation: factors.hasQuadRotation,
      channelExtreme: factors.isAtChannelExtreme,
      twentyTwentyFlag: factors.has2020Flag,
      vwapConfluence: factors.hasVwapConfluence,
      maConfluence: factors.hasMAConfluence,
      volumeSpike: factors.hasVolumeSpike,
      htfAlignment: factors.hasHTFAlignment,
    };

    const stochStates: QuadStochasticSnapshot = {
      fast: { k: snapshot.fast.k, d: snapshot.fast.d },
      standard: { k: snapshot.standard.k, d: snapshot.standard.d },
      medium: { k: snapshot.medium.k, d: snapshot.medium.d },
      slow: { k: snapshot.slow.k, d: snapshot.slow.d },
    };

    let positionSize = config.defaultPositionSize;
    if (strength === 'SUPER') positionSize = config.maxPositionSize;
    else if (strength === 'STRONG') positionSize = config.defaultPositionSize * 1.5;
    positionSize = Math.min(positionSize, config.maxPositionSize);

    const signal: QuadSignal = {
      id: generateSignalId(),
      timestamp: Date.now(),
      symbol,
      type: potential.type,
      strength: strength as 'WEAK' | 'MODERATE' | 'STRONG' | 'SUPER',
      entryPrice: levels.entryPrice,
      stopLoss: levels.stopLoss,
      target1: levels.target1,
      target2: levels.target2,
      target3: levels.target3,
      divergence: potential.divergence,
      confluence,
      confluenceScore: score,
      stochStates,
      status: 'PENDING',
      riskRewardRatio: levels.riskRewardRatio,
      positionSize,
      pnlPercent: 0,
      pnlAmount: 0,
      actualEntry: null,
      actualExit: null,
      entryTime: null,
      exitTime: null,
      notes: potential.reason,
    };

    signals.push(signal);
  }

  signals.sort((a, b) => {
    const strengthOrder = { SUPER: 0, STRONG: 1, MODERATE: 2, WEAK: 3 };
    return strengthOrder[a.strength] - strengthOrder[b.strength];
  });

  return signals.slice(0, 3);
}

export function calculateQuadStochSignals(
  symbol: string,
  klines: ParsedKline[],
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): SignalGenerationResult {
  const quadData = calculateQuadStochastic(klines);

  const closes = klines.map(k => k.close);
  const ma20 = calculateSMA(closes, 20);
  const ma50 = calculateSMA(closes, 50);
  const maData: MAData = { ma20, ma50 };

  const vwap = calculateVWAP(klines);
  const channel = detectChannel(klines, 50);
  const quadRotation = detectQuadRotation(quadData, config);
  const flag2020 = detect2020Flag(quadData, config);

  const signals = generateSignals(symbol, klines, quadData, maData, vwap, channel, config);

  return {
    signals,
    quadData,
    maData,
    channel,
    vwap,
    quadRotation,
    flag2020,
  };
}
