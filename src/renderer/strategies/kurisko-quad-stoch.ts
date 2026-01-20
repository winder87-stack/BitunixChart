import { Strategy, StrategyConfig, StrategyInfo } from '../types/strategy';
import { TradeSignal } from '../types/signals';
import { ParsedKline as Kline } from '../types/bitunix';
import { calculateQuadStochSignals, calculateQuadStochastic } from '../services/indicators/quadStochCalculator';

// ============================================
// KURISKO QUAD STOCHASTIC STRATEGY
// "The $20 Trade" - Momentum Divergence Scalping
// ============================================

export const KURISKO_STRATEGY_INFO: StrategyInfo = {
  id: 'kurisko-quad-stoch',
  name: 'Kurisko Quad Stochastic',
  shortName: 'KQS',
  description: `
    The "$20 Trade" strategy by Kurisko. Uses 4 overlaid Stochastic Oscillators 
    to identify momentum exhaustion before price reversal. Primary signals come 
    from divergences on the Fast stochastic, with Quad Rotation being the 
    highest probability "Super Signal".
    
    Best used on 1-5 minute charts for scalping. Ideal for ranging/channeling 
    markets. Avoid during strong trend days unless Quad Rotation is present.
  `.trim(),
  author: 'Kurisko (adapted)',
  version: '1.0.0',
  category: 'momentum',
  timeframes: ['1m', '3m', '5m', '15m'],
  markets: ['crypto'],
  riskLevel: 'medium',
  icon: '⚡',
  color: '#f7931a',
  tags: ['stochastic', 'divergence', 'scalping', 'momentum', 'quad-rotation'],
};

// Indicator Definitions
export const KURISKO_INDICATORS = [
  {
    id: 'kqs-fast-stoch',
    name: 'Fast Stochastic (9,3,3)',
    shortName: 'Fast %K',
    type: 'stochastic',
    pane: 'quad-stoch', // All 4 share same pane
    params: { kPeriod: 9, dPeriod: 3, smooth: 3 },
    style: {
      kLine: { color: '#2962ff', width: 2 },      // Blue - PRIMARY
      dLine: { color: '#2962ff', width: 1, dash: [4, 2] },
    },
    isPrimary: true, // Primary signal source
  },
  {
    id: 'kqs-standard-stoch',
    name: 'Standard Stochastic (14,3,3)',
    shortName: 'Std %K',
    type: 'stochastic',
    pane: 'quad-stoch',
    params: { kPeriod: 14, dPeriod: 3, smooth: 3 },
    style: {
      kLine: { color: '#00bcd4', width: 1.5 },    // Cyan
      dLine: { color: '#00bcd4', width: 1, dash: [4, 2] },
    },
  },
  {
    id: 'kqs-medium-stoch',
    name: 'Medium Stochastic (44,3,3)',
    shortName: 'Med %K',
    type: 'stochastic',
    pane: 'quad-stoch',
    params: { kPeriod: 44, dPeriod: 3, smooth: 3 },
    style: {
      kLine: { color: '#ff9800', width: 1.5 },    // Orange
      dLine: { color: '#ff9800', width: 1, dash: [4, 2] },
    },
  },
  {
    id: 'kqs-slow-stoch',
    name: 'Slow Stochastic (60,10) - 5M Proxy',
    shortName: 'Slow %K',
    type: 'stochastic',
    pane: 'quad-stoch',
    params: { kPeriod: 60, dPeriod: 10, smooth: 10 },
    style: {
      kLine: { color: '#e91e63', width: 1.5 },    // Pink
      dLine: { color: '#e91e63', width: 1, dash: [4, 2] },
    },
    isHTFProxy: true, // Higher timeframe proxy
  },
];

// Zone lines for the pane
export const KURISKO_ZONE_LINES = [
  { value: 80, color: '#ef5350', dash: [2, 2], label: 'Overbought' },
  { value: 50, color: '#787b86', dash: [2, 2], label: 'Mid' },
  { value: 20, color: '#26a69a', dash: [2, 2], label: 'Oversold' },
];

// Default configuration
export const KURISKO_DEFAULT_CONFIG: StrategyConfig = {
  indicators: {
    // The 4 Stochastic Bands
    stochastic: {
      fast: { kPeriod: 9, dPeriod: 3, smooth: 3 },
      standard: { kPeriod: 14, dPeriod: 3, smooth: 3 },
      medium: { kPeriod: 44, dPeriod: 3, smooth: 3 },
      slow: { kPeriod: 60, dPeriod: 10, smooth: 10 },
    },
    // Zones
    oversoldLevel: 20,
    overboughtLevel: 80,
    // Divergence
    minDivergenceAngle: 7,
    divergenceLookback: 50,
    // Moving Averages
    ma20Period: 20,
    ma50Period: 50,
    // ATR for stops
    atrPeriod: 14,
  },
  
  signalRules: {
    minConfirmationScore: 55,
    minStrength: 'MODERATE',
    requireMTFAlignment: false,
    maxSignalsPerSymbol: 3,
  },
  
  risk: {
    riskPerTrade: 1,           // 1% risk per trade
    maxDailyLoss: 5,           // 5% max daily loss
    maxOpenTrades: 3,
    defaultStopMethod: 'SWING',
    stopMultiplier: 1.0,       // 1x swing low/high
  },
  
  targets: {
    target1RR: 1.5,            // 1.5R first target
    target1ExitPercent: 70,    // Exit 70% at T1
    target2RR: 2.5,            // 2.5R second target
    target2ExitPercent: 20,    // Exit 20% at T2
    useTrailingStop: true,
    trailingMethod: 'MA20',    // Trail with 20 MA
  },
  
  filters: {
    minVolume24h: 1000000,     // $1M minimum volume
    maxSpread: 0.1,            // 0.1% max spread
    avoidNews: false,
  },
};

// Timeframe-specific overrides
export const KURISKO_TIMEFRAME_CONFIGS: Record<string, Partial<StrategyConfig>> = {
  '1m': {
    indicators: {
      stochastic: {
        fast: { kPeriod: 9, dPeriod: 3, smooth: 3 },
        standard: { kPeriod: 14, dPeriod: 3, smooth: 3 },
        medium: { kPeriod: 44, dPeriod: 3, smooth: 3 },
        slow: { kPeriod: 60, dPeriod: 10, smooth: 10 },
      },
    },
    targets: {
      target1RR: 1.2,
      target1ExitPercent: 80,
      target2RR: 2.5,
      target2ExitPercent: 20,
      useTrailingStop: false,
      trailingMethod: 'MA20',
    },
  },
  '3m': {
    indicators: {
      stochastic: {
        fast: { kPeriod: 5, dPeriod: 2, smooth: 2 },
        standard: { kPeriod: 7, dPeriod: 3, smooth: 3 },
        medium: { kPeriod: 15, dPeriod: 3, smooth: 3 },
        slow: { kPeriod: 20, dPeriod: 5, smooth: 5 },
      },
    },
    signalRules: {
      minConfirmationScore: 60,
      minStrength: 'MODERATE',
      requireMTFAlignment: false,
      maxSignalsPerSymbol: 3,
    },
  },
  '5m': {
    indicators: {
      stochastic: {
        fast: { kPeriod: 5, dPeriod: 2, smooth: 2 },
        standard: { kPeriod: 9, dPeriod: 3, smooth: 3 },
        medium: { kPeriod: 14, dPeriod: 3, smooth: 3 },
        slow: { kPeriod: 26, dPeriod: 5, smooth: 5 },
      },
    },
    targets: {
      target1RR: 2.0,
      target1ExitPercent: 70,
      target2RR: 3.0,
      target2ExitPercent: 30,
      useTrailingStop: true,
      trailingMethod: 'MA20',
    },
  },
  '15m': {
    indicators: {
      stochastic: {
        fast: { kPeriod: 5, dPeriod: 2, smooth: 2 },
        standard: { kPeriod: 9, dPeriod: 3, smooth: 3 },
        medium: { kPeriod: 14, dPeriod: 3, smooth: 3 },
        slow: { kPeriod: 20, dPeriod: 5, smooth: 5 },
      },
      minDivergenceAngle: 10,
    },
    targets: {
      target1RR: 2.5,
      target1ExitPercent: 50,
      target2RR: 4.0,
      target2ExitPercent: 50,
      useTrailingStop: true,
      trailingMethod: 'MA20',
    },
    signalRules: {
      minConfirmationScore: 55,
      minStrength: 'MODERATE',
      requireMTFAlignment: true,
      maxSignalsPerSymbol: 3,
    },
  },
};

// Main strategy implementation
export const KuriskoQuadStochStrategy: Strategy = {
  info: KURISKO_STRATEGY_INFO,
  defaultConfig: KURISKO_DEFAULT_CONFIG,
  timeframeConfigs: KURISKO_TIMEFRAME_CONFIGS,
  indicators: KURISKO_INDICATORS,
  zoneLines: KURISKO_ZONE_LINES,
  
  calculateSignals(klines: Kline[], config: StrategyConfig): TradeSignal[] {
    const result = calculateQuadStochSignals('UNKNOWN', klines, config as any); 
    return result.signals;
  },
  
  getIndicatorData(klines: Kline[], _config: StrategyConfig) {
    // Determine interval from klines if possible, or default to 1m
    // Since klines don't carry interval info directly usually, we might need to rely on store context or just calc
    // The calculator handles alignment.
    return {
      quadStochastic: calculateQuadStochastic(klines)
    };
  },
  
  validateConfig(config: StrategyConfig) {
    const errors: string[] = [];
    
    if (config.indicators.oversoldLevel >= config.indicators.overboughtLevel) {
      errors.push('Oversold level must be less than overbought level');
    }
    if (config.risk.riskPerTrade > 5) {
      errors.push('Risk per trade should not exceed 5%');
    }
    if (config.targets.target1RR < 1) {
      errors.push('Target 1 R:R should be at least 1.0');
    }
    
    return { valid: errors.length === 0, errors };
  },
};

export default KuriskoQuadStochStrategy;
