import type { ParsedKline } from '../../types/bitunix';
import {
  type DivergenceType,
  type DivergenceDetails,
  type StochasticBandKey,
  type StochasticValue,
  type SignalConfig,
  DEFAULT_SIGNAL_CONFIG,
} from '../../types/quadStochastic';

interface PivotPoint {
  index: number;
  price: number;
  stochK: number;
  time: number;
}

export function findPivotLows(
  klines: ParsedKline[],
  stochValues: StochasticValue[],
  lookback: number = 5
): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  
  for (let i = lookback; i < klines.length - lookback; i++) {
    const stochVal = stochValues[i];
    if (isNaN(stochVal?.k)) continue;
    
    let isPricePivot = true;
    let isStochPivot = true;
    
    for (let j = 1; j <= lookback; j++) {
      if (klines[i].low >= klines[i - j].low || klines[i].low >= klines[i + j].low) {
        isPricePivot = false;
      }
      const leftStoch = stochValues[i - j];
      const rightStoch = stochValues[i + j];
      if (!leftStoch || !rightStoch || isNaN(leftStoch.k) || isNaN(rightStoch.k)) {
        isStochPivot = false;
      } else if (stochVal.k >= leftStoch.k || stochVal.k >= rightStoch.k) {
        isStochPivot = false;
      }
    }
    
    if (isPricePivot || isStochPivot) {
      pivots.push({
        index: i,
        price: klines[i].low,
        stochK: stochVal.k,
        time: klines[i].time,
      });
    }
  }
  
  return pivots;
}

export function findPivotHighs(
  klines: ParsedKline[],
  stochValues: StochasticValue[],
  lookback: number = 5
): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  
  for (let i = lookback; i < klines.length - lookback; i++) {
    const stochVal = stochValues[i];
    if (isNaN(stochVal?.k)) continue;
    
    let isPricePivot = true;
    let isStochPivot = true;
    
    for (let j = 1; j <= lookback; j++) {
      if (klines[i].high <= klines[i - j].high || klines[i].high <= klines[i + j].high) {
        isPricePivot = false;
      }
      const leftStoch = stochValues[i - j];
      const rightStoch = stochValues[i + j];
      if (!leftStoch || !rightStoch || isNaN(leftStoch.k) || isNaN(rightStoch.k)) {
        isStochPivot = false;
      } else if (stochVal.k <= leftStoch.k || stochVal.k <= rightStoch.k) {
        isStochPivot = false;
      }
    }
    
    if (isPricePivot || isStochPivot) {
      pivots.push({
        index: i,
        price: klines[i].high,
        stochK: stochVal.k,
        time: klines[i].time,
      });
    }
  }
  
  return pivots;
}

function calculateDivergenceAngle(
  point1: PivotPoint,
  point2: PivotPoint,
  priceDelta: number,
  stochDelta: number,
  priceRange: number
): number {
  const normalizedPriceDelta = priceDelta / priceRange;
  const normalizedStochDelta = stochDelta / 100;
  const candleSpan = point2.index - point1.index;
  
  const priceSlope = normalizedPriceDelta / candleSpan;
  const stochSlope = normalizedStochDelta / candleSpan;
  
  const slopeDiff = Math.abs(priceSlope - stochSlope);
  return Math.atan(slopeDiff * 10) * (180 / Math.PI);
}

export function detectDivergence(
  klines: ParsedKline[],
  stochValues: StochasticValue[],
  band: StochasticBandKey,
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): DivergenceDetails | null {
  if (klines.length < config.lookbackPeriod) {
    return null;
  }

  const recentKlines = klines.slice(-config.lookbackPeriod);
  const recentStoch = stochValues.slice(-config.lookbackPeriod);

  let priceMin = Infinity, priceMax = -Infinity;
  for (const k of recentKlines) {
    if (k.low < priceMin) priceMin = k.low;
    if (k.high > priceMax) priceMax = k.high;
  }
  const priceRange = priceMax - priceMin;
  if (priceRange === 0) return null;

  const pivotLows = findPivotLows(recentKlines, recentStoch, 3);
  const pivotHighs = findPivotHighs(recentKlines, recentStoch, 3);

  for (let i = pivotLows.length - 1; i >= 1; i--) {
    const recent = pivotLows[i];
    const earlier = pivotLows[i - 1];
    
    if (recent.index - earlier.index < config.minDivergenceSpan) continue;
    
    if (recent.price < earlier.price && recent.stochK > earlier.stochK) {
      const angle = calculateDivergenceAngle(
        earlier, recent,
        recent.price - earlier.price,
        recent.stochK - earlier.stochK,
        priceRange
      );
      
      if (angle >= config.minDivergenceAngle) {
        return {
          type: 'BULLISH',
          angle,
          pricePoints: [earlier.price, recent.price],
          stochPoints: [earlier.stochK, recent.stochK],
          candleSpan: recent.index - earlier.index,
          band,
        };
      }
    }
    
    if (recent.price > earlier.price && recent.stochK < earlier.stochK) {
      const angle = calculateDivergenceAngle(
        earlier, recent,
        recent.price - earlier.price,
        recent.stochK - earlier.stochK,
        priceRange
      );
      
      if (angle >= config.minDivergenceAngle) {
        return {
          type: 'HIDDEN_BULLISH',
          angle,
          pricePoints: [earlier.price, recent.price],
          stochPoints: [earlier.stochK, recent.stochK],
          candleSpan: recent.index - earlier.index,
          band,
        };
      }
    }
  }

  for (let i = pivotHighs.length - 1; i >= 1; i--) {
    const recent = pivotHighs[i];
    const earlier = pivotHighs[i - 1];
    
    if (recent.index - earlier.index < config.minDivergenceSpan) continue;
    
    if (recent.price > earlier.price && recent.stochK < earlier.stochK) {
      const angle = calculateDivergenceAngle(
        earlier, recent,
        recent.price - earlier.price,
        recent.stochK - earlier.stochK,
        priceRange
      );
      
      if (angle >= config.minDivergenceAngle) {
        return {
          type: 'BEARISH',
          angle,
          pricePoints: [earlier.price, recent.price],
          stochPoints: [earlier.stochK, recent.stochK],
          candleSpan: recent.index - earlier.index,
          band,
        };
      }
    }
    
    if (recent.price < earlier.price && recent.stochK > earlier.stochK) {
      const angle = calculateDivergenceAngle(
        earlier, recent,
        recent.price - earlier.price,
        recent.stochK - earlier.stochK,
        priceRange
      );
      
      if (angle >= config.minDivergenceAngle) {
        return {
          type: 'HIDDEN_BEARISH',
          angle,
          pricePoints: [earlier.price, recent.price],
          stochPoints: [earlier.stochK, recent.stochK],
          candleSpan: recent.index - earlier.index,
          band,
        };
      }
    }
  }

  return null;
}

export function detectAllDivergences(
  klines: ParsedKline[],
  quadData: {
    fast: StochasticValue[];
    standard: StochasticValue[];
    medium: StochasticValue[];
    slow: StochasticValue[];
  },
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): DivergenceDetails[] {
  const divergences: DivergenceDetails[] = [];
  
  const bandMap: [StochasticBandKey, StochasticValue[]][] = [
    ['FAST', quadData.fast],
    ['STANDARD', quadData.standard],
    ['MEDIUM', quadData.medium],
    ['SLOW', quadData.slow],
  ];
  
  for (const [bandKey, stochValues] of bandMap) {
    const div = detectDivergence(klines, stochValues, bandKey, config);
    if (div) {
      divergences.push(div);
    }
  }
  
  return divergences;
}

export function isDivergenceBullish(type: DivergenceType): boolean {
  return type === 'BULLISH' || type === 'HIDDEN_BULLISH';
}

export function isDivergenceBearish(type: DivergenceType): boolean {
  return type === 'BEARISH' || type === 'HIDDEN_BEARISH';
}

export function getDivergenceStrengthBonus(divergence: DivergenceDetails | null): number {
  if (!divergence) return 0;
  
  let bonus = 1;
  
  if (divergence.angle >= 15) bonus += 1;
  if (divergence.angle >= 25) bonus += 1;
  
  if (divergence.band === 'SLOW' || divergence.band === 'MEDIUM') {
    bonus += 1;
  }
  
  if (divergence.candleSpan >= 10) bonus += 1;
  
  return Math.min(bonus, 3);
}
