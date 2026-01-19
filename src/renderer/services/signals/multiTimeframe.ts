import { Stochastic, SMA } from 'technicalindicators';
import type { ParsedKline } from '../../types/bitunix';
import type { TradeSignal } from '../../types/signals';

export type TrendDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type TrendStrength = 'STRONG' | 'MODERATE' | 'WEAK';
export type TradeBias = 'LONG_ONLY' | 'SHORT_ONLY' | 'BOTH' | 'NONE';

export interface TimeframeTrend {
  timeframe: string;
  direction: TrendDirection;
  strength: TrendStrength;
  ma20: number;
  ma50: number;
  ma200?: number;
  stochK: number;
  stochD: number;
  adx?: number;
  lastUpdate: number;
}

export interface MTFAnalysis {
  trends: Record<string, TimeframeTrend>;
  consensus: TrendDirection;
  alignmentScore: number;
  tradeBias: TradeBias;
  recommendation: string;
}

export interface MTFAlignmentResult {
  aligned: boolean;
  reason: string;
}

function calculateMA(values: number[], period: number): number {
  if (values.length < period) return 0;
  const result = SMA.calculate({ period, values });
  return result[result.length - 1] ?? 0;
}

function calculateStochastic(klines: ParsedKline[], period = 14, signalPeriod = 3): { k: number; d: number } {
  if (klines.length < period) {
    return { k: 50, d: 50 };
  }

  const result = Stochastic.calculate({
    high: klines.map(k => k.high),
    low: klines.map(k => k.low),
    close: klines.map(k => k.close),
    period,
    signalPeriod,
  });

  const last = result[result.length - 1];
  return {
    k: last?.k ?? 50,
    d: last?.d ?? 50,
  };
}

export function analyzeTimeframeTrend(
  klines: ParsedKline[],
  timeframe: string
): TimeframeTrend {
  const defaultTrend: TimeframeTrend = {
    timeframe,
    direction: 'NEUTRAL',
    strength: 'WEAK',
    ma20: 0,
    ma50: 0,
    stochK: 50,
    stochD: 50,
    lastUpdate: Date.now(),
  };

  if (klines.length < 50) {
    return defaultTrend;
  }

  const closes = klines.map(k => k.close);
  const ma20 = calculateMA(closes, 20);
  const ma50 = calculateMA(closes, 50);
  const ma200 = closes.length >= 200 ? calculateMA(closes, 200) : undefined;

  const stoch = calculateStochastic(klines);
  const price = closes[closes.length - 1];

  let direction: TrendDirection = 'NEUTRAL';
  if (price > ma20 && ma20 > ma50) {
    direction = 'BULLISH';
  } else if (price < ma20 && ma20 < ma50) {
    direction = 'BEARISH';
  }

  let strength: TrendStrength = 'WEAK';
  if (ma50 !== 0) {
    const maSeparation = Math.abs(ma20 - ma50) / ma50;
    if (maSeparation > 0.02) {
      strength = 'STRONG';
    } else if (maSeparation > 0.01) {
      strength = 'MODERATE';
    }
  }

  return {
    timeframe,
    direction,
    strength,
    ma20,
    ma50,
    ma200,
    stochK: stoch.k,
    stochD: stoch.d,
    lastUpdate: Date.now(),
  };
}

export function analyzeMTF(
  tfData: Record<string, ParsedKline[]>
): MTFAnalysis {
  const trends: Record<string, TimeframeTrend> = {};

  for (const [tf, klines] of Object.entries(tfData)) {
    trends[tf] = analyzeTimeframeTrend(klines, tf);
  }

  const directions = Object.values(trends).map(t => t.direction);
  const bullishCount = directions.filter(d => d === 'BULLISH').length;
  const bearishCount = directions.filter(d => d === 'BEARISH').length;

  let consensus: TrendDirection = 'NEUTRAL';
  if (bullishCount > bearishCount && bullishCount >= directions.length * 0.6) {
    consensus = 'BULLISH';
  } else if (bearishCount > bullishCount && bearishCount >= directions.length * 0.6) {
    consensus = 'BEARISH';
  }

  const maxAlignment = directions.length || 1;
  const actualAlignment = Math.max(bullishCount, bearishCount);
  const alignmentScore = (actualAlignment / maxAlignment) * 100;

  let tradeBias: TradeBias = 'BOTH';
  if (alignmentScore >= 80) {
    tradeBias = consensus === 'BULLISH' ? 'LONG_ONLY' : 'SHORT_ONLY';
  } else if (alignmentScore < 50) {
    tradeBias = 'NONE';
  }

  let recommendation = '';
  if (tradeBias === 'LONG_ONLY') {
    recommendation = 'Strong bullish alignment - favor LONG signals, avoid shorts';
  } else if (tradeBias === 'SHORT_ONLY') {
    recommendation = 'Strong bearish alignment - favor SHORT signals, avoid longs';
  } else if (tradeBias === 'NONE') {
    recommendation = 'Choppy/conflicting trends - reduce position size or wait';
  } else {
    recommendation = 'Mixed signals - trade both directions with caution';
  }

  return {
    trends,
    consensus,
    alignmentScore,
    tradeBias,
    recommendation,
  };
}

export function isSignalAlignedWithMTF(
  signal: TradeSignal,
  mtf: MTFAnalysis
): MTFAlignmentResult {
  if (mtf.tradeBias === 'NONE') {
    return { aligned: false, reason: 'Market too choppy - no clear trend' };
  }

  if (signal.action === 'BUY' && mtf.tradeBias === 'SHORT_ONLY') {
    return { aligned: false, reason: 'LONG signal against bearish MTF trend' };
  }

  if (signal.action === 'SELL' && mtf.tradeBias === 'LONG_ONLY') {
    return { aligned: false, reason: 'SHORT signal against bullish MTF trend' };
  }

  if (mtf.alignmentScore >= 70) {
    return { aligned: true, reason: `Strong MTF alignment (${mtf.alignmentScore.toFixed(0)}%)` };
  }

  return { aligned: true, reason: 'MTF allows both directions' };
}

export function getTimeframePriority(timeframe: string): number {
  const priorities: Record<string, number> = {
    '1m': 1,
    '3m': 2,
    '5m': 3,
    '15m': 4,
    '30m': 5,
    '1h': 6,
    '2h': 7,
    '4h': 8,
    '6h': 9,
    '12h': 10,
    '1d': 11,
    '1w': 12,
    '1M': 13,
  };
  return priorities[timeframe] ?? 0;
}

export function getHigherTimeframes(baseTimeframe: string): string[] {
  const basePriority = getTimeframePriority(baseTimeframe);
  const allTimeframes = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '1w', '1M'];

  return allTimeframes.filter(tf => getTimeframePriority(tf) > basePriority);
}

export function getRecommendedMTFTimeframes(baseTimeframe: string): string[] {
  const mapping: Record<string, string[]> = {
    '1m': ['5m', '15m', '1h'],
    '3m': ['15m', '1h', '4h'],
    '5m': ['15m', '1h', '4h'],
    '15m': ['1h', '4h', '1d'],
    '30m': ['4h', '1d'],
    '1h': ['4h', '1d'],
    '4h': ['1d', '1w'],
  };

  return mapping[baseTimeframe] ?? getHigherTimeframes(baseTimeframe).slice(0, 3);
}
