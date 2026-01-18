import type { ParsedKline } from '../../types/bitunix';
import {
  type QuadSignal,
  type SignalType,
  type SignalStrength,
  type ConfluenceFlags,
  type SignalConfig,
  DEFAULT_SIGNAL_CONFIG,
} from '../../types/quadStochastic';
import {
  analyzeQuadStochastic,
  checkTwentyTwentyFlag,
  checkHTFAlignment,
  type QuadStochasticAnalysis,
} from './calculator';
import {
  detectAllDivergences,
  isDivergenceBullish,
  isDivergenceBearish,
  getDivergenceStrengthBonus,
} from './divergence';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function determineStrength(confluenceScore: number): SignalStrength {
  if (confluenceScore >= 7) return 'SUPER';
  if (confluenceScore >= 5) return 'STRONG';
  if (confluenceScore >= 3) return 'MODERATE';
  return 'WEAK';
}

function calculatePriceLevels(
  klines: ParsedKline[],
  direction: SignalType,
  config: SignalConfig
): { entry: number; stop: number; target1: number; target2: number; target3: number } {
  const latest = klines[klines.length - 1];
  const entry = latest.close;
  
  let recentLow = Infinity;
  let recentHigh = -Infinity;
  const lookback = Math.min(20, klines.length);
  
  for (let i = klines.length - lookback; i < klines.length; i++) {
    if (klines[i].low < recentLow) recentLow = klines[i].low;
    if (klines[i].high > recentHigh) recentHigh = klines[i].high;
  }
  
  if (direction === 'LONG') {
    const stopDistance = entry - recentLow;
    const bufferedStop = recentLow - (entry * config.stopLossBuffer / 100);
    const stop = Math.min(entry * 0.99, bufferedStop, recentLow - stopDistance * 0.1);
    
    return {
      entry,
      stop,
      target1: entry * (1 + config.target1Percent / 100),
      target2: entry * (1 + config.target2Percent / 100),
      target3: entry * (1 + config.target3Percent / 100),
    };
  } else {
    const stopDistance = recentHigh - entry;
    const bufferedStop = recentHigh + (entry * config.stopLossBuffer / 100);
    const stop = Math.max(entry * 1.01, bufferedStop, recentHigh + stopDistance * 0.1);
    
    return {
      entry,
      stop,
      target1: entry * (1 - config.target1Percent / 100),
      target2: entry * (1 - config.target2Percent / 100),
      target3: entry * (1 - config.target3Percent / 100),
    };
  }
}

function checkChannelExtreme(
  klines: ParsedKline[],
  direction: SignalType
): boolean {
  if (klines.length < 20) return false;
  
  const period = 20;
  const stdDevMultiplier = 2;
  
  const closes = klines.slice(-period).map(k => k.close);
  const sum = closes.reduce((a, b) => a + b, 0);
  const mean = sum / period;
  
  const squaredDiffs = closes.map(c => Math.pow(c - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const stdDev = Math.sqrt(variance);
  
  const upperBand = mean + stdDevMultiplier * stdDev;
  const lowerBand = mean - stdDevMultiplier * stdDev;
  
  const currentClose = klines[klines.length - 1].close;
  
  if (direction === 'LONG') {
    return currentClose <= lowerBand;
  } else {
    return currentClose >= upperBand;
  }
}

function checkVWAPConfluence(
  klines: ParsedKline[],
  direction: SignalType
): boolean {
  if (klines.length < 10) return false;
  
  let cumTypicalPriceVol = 0;
  let cumVolume = 0;
  
  for (const k of klines) {
    const typicalPrice = (k.high + k.low + k.close) / 3;
    cumTypicalPriceVol += typicalPrice * k.volume;
    cumVolume += k.volume;
  }
  
  if (cumVolume === 0) return false;
  
  const vwap = cumTypicalPriceVol / cumVolume;
  const currentClose = klines[klines.length - 1].close;
  
  if (direction === 'LONG') {
    return currentClose < vwap;
  } else {
    return currentClose > vwap;
  }
}

function checkMAConfluence(
  klines: ParsedKline[],
  direction: SignalType
): boolean {
  if (klines.length < 50) return false;
  
  const calcSMA = (data: number[], period: number): number => {
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  };
  
  const closes = klines.map(k => k.close);
  const sma20 = calcSMA(closes, 20);
  const sma50 = calcSMA(closes, 50);
  const currentClose = closes[closes.length - 1];
  
  if (direction === 'LONG') {
    return sma20 > sma50 || currentClose > sma20;
  } else {
    return sma20 < sma50 || currentClose < sma20;
  }
}

function checkVolumeSpike(klines: ParsedKline[]): boolean {
  if (klines.length < 21) return false;
  
  const recentVolumes = klines.slice(-21, -1).map(k => k.volume);
  const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / 20;
  const currentVolume = klines[klines.length - 1].volume;
  
  return currentVolume > avgVolume * 1.5;
}

export function evaluateSignalOpportunity(
  klines: ParsedKline[],
  symbol: string,
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): QuadSignal | null {
  const analysis = analyzeQuadStochastic(klines, config);
  if (!analysis) return null;

  const { snapshot, overall, data } = analysis;
  
  let direction: SignalType | null = null;
  
  if (overall.oversoldCount >= 2 && overall.bullishCount >= 2) {
    direction = 'LONG';
  } else if (overall.overboughtCount >= 2 && overall.bearishCount >= 2) {
    direction = 'SHORT';
  }
  
  const divergences = detectAllDivergences(klines, data, config);
  const bullishDiv = divergences.find(d => isDivergenceBullish(d.type));
  const bearishDiv = divergences.find(d => isDivergenceBearish(d.type));
  
  if (bullishDiv && !direction) {
    direction = 'LONG';
  } else if (bearishDiv && !direction) {
    direction = 'SHORT';
  }
  
  if (!direction) return null;
  
  if (!config.allowCounterTrend) {
    const htfAligned = checkHTFAlignment(analysis, direction);
    if (!htfAligned && overall.bearishCount > 2 && direction === 'LONG') {
      return null;
    }
    if (!htfAligned && overall.bullishCount > 2 && direction === 'SHORT') {
      return null;
    }
  }
  
  const confluence: ConfluenceFlags = {
    quadRotation: overall.isQuadRotating && 
      ((direction === 'LONG' && overall.rotationDirection === 1) ||
       (direction === 'SHORT' && overall.rotationDirection === -1)),
    channelExtreme: checkChannelExtreme(klines, direction),
    twentyTwentyFlag: checkTwentyTwentyFlag(snapshot, direction, config),
    vwapConfluence: checkVWAPConfluence(klines, direction),
    maConfluence: checkMAConfluence(klines, direction),
    volumeSpike: checkVolumeSpike(klines),
    htfAlignment: checkHTFAlignment(analysis, direction),
  };
  
  let confluenceScore = 0;
  if (confluence.quadRotation) confluenceScore += 2;
  if (confluence.channelExtreme) confluenceScore += 1;
  if (confluence.twentyTwentyFlag) confluenceScore += 1;
  if (confluence.vwapConfluence) confluenceScore += 1;
  if (confluence.maConfluence) confluenceScore += 1;
  if (confluence.volumeSpike) confluenceScore += 1;
  if (confluence.htfAlignment) confluenceScore += 1;
  
  const primaryDiv = direction === 'LONG' ? bullishDiv : bearishDiv;
  confluenceScore += getDivergenceStrengthBonus(primaryDiv ?? null);
  
  const strength = determineStrength(confluenceScore);
  
  if (strength === 'WEAK' && config.minNotificationStrength !== 'WEAK') {
    return null;
  }
  
  const levels = calculatePriceLevels(klines, direction, config);
  
  const riskAmount = Math.abs(levels.entry - levels.stop);
  const rewardAmount = Math.abs(levels.target1 - levels.entry);
  const riskRewardRatio = riskAmount > 0 ? rewardAmount / riskAmount : 0;
  
  let positionSize = config.defaultPositionSize;
  if (strength === 'SUPER') {
    positionSize = config.maxPositionSize;
  } else if (strength === 'STRONG') {
    positionSize = config.defaultPositionSize * 1.5;
  }
  positionSize = Math.min(positionSize, config.maxPositionSize);
  
  const signal: QuadSignal = {
    id: generateUUID(),
    timestamp: Date.now(),
    symbol,
    type: direction,
    strength,
    entryPrice: levels.entry,
    stopLoss: levels.stop,
    target1: levels.target1,
    target2: levels.target2,
    target3: levels.target3,
    divergence: primaryDiv ?? null,
    confluence,
    confluenceScore,
    stochStates: snapshot,
    status: 'PENDING',
    riskRewardRatio,
    positionSize,
    pnlPercent: 0,
    pnlAmount: 0,
    actualEntry: null,
    actualExit: null,
    entryTime: null,
    exitTime: null,
    notes: '',
  };
  
  return signal;
}

export function shouldGenerateSignal(
  analysis: QuadStochasticAnalysis,
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): { should: boolean; direction: SignalType | null; reason: string } {
  const { overall, snapshot } = analysis;
  
  if (overall.isQuadAligned && overall.oversoldCount >= 3) {
    if (overall.alignmentDirection === 1 && overall.rotationDirection === 1) {
      return {
        should: true,
        direction: 'LONG',
        reason: 'Quad bullish alignment with oversold rotation',
      };
    }
  }
  
  if (overall.isQuadAligned && overall.overboughtCount >= 3) {
    if (overall.alignmentDirection === -1 && overall.rotationDirection === -1) {
      return {
        should: true,
        direction: 'SHORT',
        reason: 'Quad bearish alignment with overbought rotation',
      };
    }
  }
  
  if (snapshot.fast.k <= config.oversoldLevel && 
      snapshot.standard.k <= config.oversoldLevel &&
      overall.rotationDirection === 1) {
    return {
      should: true,
      direction: 'LONG',
      reason: 'FAST and STANDARD oversold with upward rotation',
    };
  }
  
  if (snapshot.fast.k >= config.overboughtLevel && 
      snapshot.standard.k >= config.overboughtLevel &&
      overall.rotationDirection === -1) {
    return {
      should: true,
      direction: 'SHORT',
      reason: 'FAST and STANDARD overbought with downward rotation',
    };
  }
  
  return { should: false, direction: null, reason: 'No signal conditions met' };
}

export function formatSignalSummary(signal: QuadSignal): string {
  const lines = [
    `${signal.type} ${signal.symbol} [${signal.strength}]`,
    `Entry: ${signal.entryPrice.toFixed(4)}`,
    `Stop: ${signal.stopLoss.toFixed(4)} | T1: ${signal.target1.toFixed(4)}`,
    `R:R = 1:${signal.riskRewardRatio.toFixed(2)}`,
    `Confluence: ${signal.confluenceScore}/10`,
  ];
  
  if (signal.divergence) {
    lines.push(`Divergence: ${signal.divergence.type} on ${signal.divergence.band}`);
  }
  
  return lines.join('\n');
}

export {
  generateUUID,
  determineStrength,
  calculatePriceLevels,
  checkChannelExtreme,
  checkVWAPConfluence,
  checkMAConfluence,
  checkVolumeSpike,
};
