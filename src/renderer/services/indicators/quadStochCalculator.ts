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
