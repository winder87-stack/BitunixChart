import type { ParsedKline as Kline } from './bitunix';
import type { TradeSignal } from './signals';
import type { SignalStrength } from './quadStochastic';

export interface StrategyInfo {
  id: string;
  name: string;
  shortName: string;
  description: string;
  author: string;
  version: string;
  category: 'momentum' | 'trend' | 'reversal' | 'scalping' | 'swing';
  timeframes: string[];
  markets: string[];
  riskLevel: 'low' | 'medium' | 'high';
  icon: string;
  color: string;
  tags: string[];
}

export interface StrategyConfig {
  indicators: Record<string, any>;
  
  signalRules: {
    minConfirmationScore: number;
    minStrength: SignalStrength;
    requireMTFAlignment: boolean;
    maxSignalsPerSymbol: number;
  };
  
  risk: {
    riskPerTrade: number;
    maxDailyLoss: number;
    maxOpenTrades: number;
    defaultStopMethod: 'ATR' | 'SWING' | 'PERCENT' | 'FIXED';
    stopMultiplier: number;
  };
  
  targets: {
    target1RR: number;
    target1ExitPercent: number;
    target2RR: number;
    target2ExitPercent: number;
    useTrailingStop: boolean;
    trailingMethod: 'MA20' | 'ATR' | 'PERCENT';
  };
  
  filters: {
    minVolume24h: number;
    maxSpread: number;
    tradingHours?: { start: number; end: number };
    avoidNews: boolean;
  };
}

export interface StrategyIndicator {
  id: string;
  name: string;
  shortName: string;
  type: string;
  pane: string;           // 'main' for overlay, custom name for separate pane
  params: Record<string, any>;
  style: {
    kLine?: { color: string; width: number; dash?: number[] };
    dLine?: { color: string; width: number; dash?: number[] };
    color?: string;
    width?: number;
  };
  isPrimary?: boolean;
  isHTFProxy?: boolean;
}

export interface Strategy {
  info: StrategyInfo;
  defaultConfig: StrategyConfig;
  timeframeConfigs: Record<string, Partial<StrategyConfig>>;
  indicators: StrategyIndicator[];
  zoneLines?: Array<{ value: number; color: string; dash?: number[]; label?: string }>;
  
  calculateSignals: (klines: Kline[], config: StrategyConfig) => TradeSignal[];
  getIndicatorData: (klines: Kline[], config: StrategyConfig) => any;
  validateConfig: (config: StrategyConfig) => { valid: boolean; errors: string[] };
}

export interface StrategyPreset {
  id: string;
  strategyId: string;
  name: string;
  config: Partial<StrategyConfig>;
  createdAt: number;
  updatedAt: number;
}

export interface ActiveStrategy {
  strategy: Strategy;
  config: StrategyConfig;
  preset?: StrategyPreset;
  enabled: boolean;
  lastSignal?: TradeSignal;
  stats: {
    signalsGenerated: number;
    signalsToday: number;
    lastCalculation: number;
  };
}
