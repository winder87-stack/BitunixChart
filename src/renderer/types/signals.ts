import type { ParsedKline } from './bitunix';
import type { QuadSignal, QuadStochasticData, ChannelBoundary } from './quadStochastic';

export type SignalAction = 'BUY' | 'SELL' | 'CLOSE_LONG' | 'CLOSE_SHORT';

export type EntryType =
  | 'MARKET'
  | 'LIMIT_PULLBACK'
  | 'STOP_ENTRY';

export type TrailingStopMethod = 'MA20' | 'ATR' | 'PERCENT' | 'SWING';

export type TargetReason =
  | 'stoch_rotation'
  | 'ma_touch'
  | 'channel_bound'
  | 'fib_level'
  | 'resistance'
  | 'support';

export interface EntryZone {
  ideal: number;
  max: number;
  min: number;
}

export interface TargetLevel {
  price: number;
  percentage: number;
  reason: TargetReason;
}

export interface TrailingStopConfig {
  enabled: boolean;
  method: TrailingStopMethod;
  value: number;
}

export interface StopLossConfig {
  initial: number;
  breakeven: number;
  trailing: TrailingStopConfig;
}

export interface SignalConfirmations {
  required: string[];
  optional: string[];
  achieved: string[];
}

export interface TradeSignal extends Omit<QuadSignal, 'stopLoss' | 'target1' | 'target2' | 'target3' | 'action' | 'entryType'> {
  action: SignalAction;
  entryType: EntryType;

  entryZone: EntryZone;

  targets: TargetLevel[];

  stopLoss: StopLossConfig;

  validUntil: number;
  maxHoldTime: number;

  confirmations: SignalConfirmations;

  candlesSinceSignal: number;
  avgCandleSize: number;
}

export interface MAData {
  ma20: number[];
  ma50: number[];
  vwap?: number[];
}

export interface SignalConfirmation {
  id: string;
  name: string;
  description: string;
  weight: number;
  check: (
    klines: ParsedKline[],
    signal: TradeSignal,
    quadData?: QuadStochasticData,
    maData?: MAData,
    channel?: ChannelBoundary | null
  ) => boolean;
}

export interface TradeSignalUpdate {
  id: string;
  status?: QuadSignal['status'];
  actualEntry?: number;
  actualExit?: number;
  entryTime?: number;
  exitTime?: number;
  pnlPercent?: number;
  pnlAmount?: number;
  notes?: string;
  candlesSinceSignal?: number;
}

export function createDefaultStopLossConfig(initialStop: number, breakevenTrigger: number): StopLossConfig {
  return {
    initial: initialStop,
    breakeven: breakevenTrigger,
    trailing: {
      enabled: false,
      method: 'PERCENT',
      value: 0.5,
    },
  };
}

export function createDefaultEntryZone(idealPrice: number, spreadPercent = 0.1): EntryZone {
  const spread = idealPrice * (spreadPercent / 100);
  return {
    ideal: idealPrice,
    max: idealPrice + spread,
    min: idealPrice - spread,
  };
}

export function isSignalExpired(signal: TradeSignal): boolean {
  return Date.now() > signal.validUntil;
}

export function isHoldTimeExceeded(signal: TradeSignal): boolean {
  if (!signal.entryTime) return false;
  return Date.now() - signal.entryTime > signal.maxHoldTime;
}

export function getConfirmationProgress(signal: TradeSignal): { achieved: number; required: number; percentage: number } {
  const achieved = signal.confirmations.achieved.filter(
    c => signal.confirmations.required.includes(c)
  ).length;
  const required = signal.confirmations.required.length;
  return {
    achieved,
    required,
    percentage: required > 0 ? (achieved / required) * 100 : 0,
  };
}

export function hasAllRequiredConfirmations(signal: TradeSignal): boolean {
  return signal.confirmations.required.every(
    req => signal.confirmations.achieved.includes(req)
  );
}
