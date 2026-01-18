import { Stochastic, SMA } from 'technicalindicators';
import type { ParsedKline } from '../../types/bitunix';
import {
  STOCHASTIC_BANDS,
  type StochasticBandKey,
  type StochasticValue,
  type QuadStochasticData,
  type QuadStochasticSnapshot,
  type SignalConfig,
  DEFAULT_SIGNAL_CONFIG,
} from '../../types/quadStochastic';

interface RawStochasticResult {
  k: number;
  d: number;
}

interface BandCalculationResult {
  values: StochasticValue[];
  isOversold: boolean;
  isOverbought: boolean;
  isBullish: boolean;
  isBearish: boolean;
  kSlope: number;
  dSlope: number;
}

export interface QuadStochasticAnalysis {
  data: QuadStochasticData;
  snapshot: QuadStochasticSnapshot;
  bands: Record<StochasticBandKey, BandCalculationResult>;
  overall: {
    oversoldCount: number;
    overboughtCount: number;
    bullishCount: number;
    bearishCount: number;
    isQuadAligned: boolean;
    alignmentDirection: 1 | -1 | 0;
    isQuadRotating: boolean;
    rotationDirection: 1 | -1 | 0;
  };
}

export function calculateStochasticBand(
  klines: ParsedKline[],
  kPeriod: number,
  dPeriod: number,
  smooth: number
): StochasticValue[] {
  if (klines.length < kPeriod) {
    return [];
  }

  const rawResult = Stochastic.calculate({
    high: klines.map(k => k.high),
    low: klines.map(k => k.low),
    close: klines.map(k => k.close),
    period: kPeriod,
    signalPeriod: dPeriod,
  }) as RawStochasticResult[];

  let smoothedK: number[];
  if (smooth > 1) {
    const rawK = rawResult.map(r => r.k);
    smoothedK = SMA.calculate({ period: smooth, values: rawK });
  } else {
    smoothedK = rawResult.map(r => r.k);
  }

  const finalD = SMA.calculate({ period: dPeriod, values: smoothedK });

  const kOffset = rawResult.length - smoothedK.length;
  const dOffset = smoothedK.length - finalD.length;
  const totalOffset = klines.length - rawResult.length + kOffset + dOffset;

  const result: StochasticValue[] = [];

  for (let i = 0; i < klines.length; i++) {
    const klineTime = klines[i].time;
    const dIdx = i - totalOffset;

    if (dIdx >= 0 && dIdx < finalD.length) {
      const kIdx = dIdx + dOffset;
      result.push({
        time: klineTime,
        k: smoothedK[kIdx] ?? 0,
        d: finalD[dIdx] ?? 0,
      });
    } else {
      result.push({
        time: klineTime,
        k: NaN,
        d: NaN,
      });
    }
  }

  return result;
}

export function calculateQuadStochastic(klines: ParsedKline[]): QuadStochasticData {
  const { FAST, STANDARD, MEDIUM, SLOW } = STOCHASTIC_BANDS;

  return {
    fast: calculateStochasticBand(klines, FAST.kPeriod, FAST.dPeriod, FAST.smooth),
    standard: calculateStochasticBand(klines, STANDARD.kPeriod, STANDARD.dPeriod, STANDARD.smooth),
    medium: calculateStochasticBand(klines, MEDIUM.kPeriod, MEDIUM.dPeriod, MEDIUM.smooth),
    slow: calculateStochasticBand(klines, SLOW.kPeriod, SLOW.dPeriod, SLOW.smooth),
  };
}

export function getLatestSnapshot(data: QuadStochasticData): QuadStochasticSnapshot | null {
  const getLastValid = (values: StochasticValue[]): { k: number; d: number } | null => {
    for (let i = values.length - 1; i >= 0; i--) {
      if (!isNaN(values[i].k) && !isNaN(values[i].d)) {
        return { k: values[i].k, d: values[i].d };
      }
    }
    return null;
  };

  const fast = getLastValid(data.fast);
  const standard = getLastValid(data.standard);
  const medium = getLastValid(data.medium);
  const slow = getLastValid(data.slow);

  if (!fast || !standard || !medium || !slow) {
    return null;
  }

  return { fast, standard, medium, slow };
}

export function calculateSlope(
  values: StochasticValue[],
  key: 'k' | 'd',
  lookback: number = 3
): number {
  const validValues: number[] = [];
  
  for (let i = values.length - 1; i >= 0 && validValues.length < lookback; i--) {
    const val = values[i][key];
    if (!isNaN(val)) {
      validValues.unshift(val);
    }
  }

  if (validValues.length < 2) {
    return 0;
  }

  const n = validValues.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += validValues[i];
    sumXY += i * validValues[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

function analyzeBand(
  values: StochasticValue[],
  config: SignalConfig
): BandCalculationResult {
  const lastValid = values.filter(v => !isNaN(v.k) && !isNaN(v.d));
  const latest = lastValid[lastValid.length - 1];

  const result: BandCalculationResult = {
    values,
    isOversold: false,
    isOverbought: false,
    isBullish: false,
    isBearish: false,
    kSlope: 0,
    dSlope: 0,
  };

  if (!latest) {
    return result;
  }

  result.isOversold = latest.k <= config.oversoldLevel && latest.d <= config.oversoldLevel;
  result.isOverbought = latest.k >= config.overboughtLevel && latest.d >= config.overboughtLevel;
  result.isBullish = latest.k > latest.d;
  result.isBearish = latest.k < latest.d;
  result.kSlope = calculateSlope(values, 'k');
  result.dSlope = calculateSlope(values, 'd');

  return result;
}

export function analyzeQuadStochastic(
  klines: ParsedKline[],
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): QuadStochasticAnalysis | null {
  const data = calculateQuadStochastic(klines);
  const snapshot = getLatestSnapshot(data);

  if (!snapshot) {
    return null;
  }

  const bands: Record<StochasticBandKey, BandCalculationResult> = {
    FAST: analyzeBand(data.fast, config),
    STANDARD: analyzeBand(data.standard, config),
    MEDIUM: analyzeBand(data.medium, config),
    SLOW: analyzeBand(data.slow, config),
  };

  const bandKeys: StochasticBandKey[] = ['FAST', 'STANDARD', 'MEDIUM', 'SLOW'];
  
  let oversoldCount = 0;
  let overboughtCount = 0;
  let bullishCount = 0;
  let bearishCount = 0;
  let risingCount = 0;
  let fallingCount = 0;

  for (const key of bandKeys) {
    const band = bands[key];
    if (band.isOversold) oversoldCount++;
    if (band.isOverbought) overboughtCount++;
    if (band.isBullish) bullishCount++;
    if (band.isBearish) bearishCount++;
    if (band.kSlope > 0) risingCount++;
    if (band.kSlope < 0) fallingCount++;
  }

  const isQuadAligned = bullishCount === 4 || bearishCount === 4;
  const alignmentDirection = bullishCount === 4 ? 1 : bearishCount === 4 ? -1 : 0;
  
  const isQuadRotating = risingCount === 4 || fallingCount === 4;
  const rotationDirection = risingCount === 4 ? 1 : fallingCount === 4 ? -1 : 0;

  return {
    data,
    snapshot,
    bands,
    overall: {
      oversoldCount,
      overboughtCount,
      bullishCount,
      bearishCount,
      isQuadAligned,
      alignmentDirection,
      isQuadRotating,
      rotationDirection,
    },
  };
}

export function checkTwentyTwentyFlag(
  snapshot: QuadStochasticSnapshot,
  direction: 'LONG' | 'SHORT',
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): boolean {
  const { fast } = snapshot;

  if (direction === 'LONG') {
    return fast.k <= config.oversoldLevel && fast.d <= config.oversoldLevel;
  } else {
    return fast.k >= config.overboughtLevel && fast.d >= config.overboughtLevel;
  }
}

export function checkQuadExtreme(
  snapshot: QuadStochasticSnapshot,
  territory: 'oversold' | 'overbought',
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): boolean {
  const threshold = territory === 'oversold' 
    ? config.oversoldLevel 
    : config.overboughtLevel;
  
  const allBands = [snapshot.fast, snapshot.standard, snapshot.medium, snapshot.slow];

  if (territory === 'oversold') {
    return allBands.every(b => b.k <= threshold);
  } else {
    return allBands.every(b => b.k >= threshold);
  }
}

export function calculateStochConfluence(
  analysis: QuadStochasticAnalysis,
  direction: 'LONG' | 'SHORT'
): number {
  let score = 0;
  const { overall } = analysis;

  if (direction === 'LONG') {
    score += overall.bullishCount;
    
    if (overall.isQuadAligned && overall.alignmentDirection === 1) {
      score += 1;
    }
    
    if (overall.isQuadRotating && overall.rotationDirection === 1) {
      score += 1;
    }
  } else {
    score += overall.bearishCount;
    
    if (overall.isQuadAligned && overall.alignmentDirection === -1) {
      score += 1;
    }
    
    if (overall.isQuadRotating && overall.rotationDirection === -1) {
      score += 1;
    }
  }

  return Math.min(score, 7);
}

export function checkHTFAlignment(
  analysis: QuadStochasticAnalysis,
  direction: 'LONG' | 'SHORT'
): boolean {
  const slowBand = analysis.bands.SLOW;

  if (direction === 'LONG') {
    return slowBand.isBullish || slowBand.kSlope > 0;
  } else {
    return slowBand.isBearish || slowBand.kSlope < 0;
  }
}

export function describeQuadState(analysis: QuadStochasticAnalysis): string {
  const { overall, snapshot } = analysis;
  const parts: string[] = [];

  if (overall.isQuadAligned) {
    parts.push(overall.alignmentDirection === 1 ? 'QUAD BULLISH' : 'QUAD BEARISH');
  } else {
    parts.push(`Mixed (${overall.bullishCount}B/${overall.bearishCount}S)`);
  }

  if (overall.isQuadRotating) {
    parts.push(overall.rotationDirection === 1 ? 'Rotating UP' : 'Rotating DOWN');
  }

  if (overall.oversoldCount === 4) {
    parts.push('QUAD OVERSOLD');
  } else if (overall.overboughtCount === 4) {
    parts.push('QUAD OVERBOUGHT');
  } else if (overall.oversoldCount > 0) {
    parts.push(`${overall.oversoldCount} oversold`);
  } else if (overall.overboughtCount > 0) {
    parts.push(`${overall.overboughtCount} overbought`);
  }

  parts.push(`FAST: ${snapshot.fast.k.toFixed(1)}/${snapshot.fast.d.toFixed(1)}`);

  return parts.join(' | ');
}
