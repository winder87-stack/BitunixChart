import type { ParsedKline } from '../../types/bitunix';
import type { QuadStochasticData, ChannelBoundary } from '../../types/quadStochastic';
import type { TradeSignal, SignalConfirmation, MAData } from '../../types/signals';

function safeGetLast<T>(arr: T[] | undefined, offset = 0): T | undefined {
  if (!arr || arr.length === 0) return undefined;
  const idx = arr.length - 1 - offset;
  return idx >= 0 ? arr[idx] : undefined;
}

export const CONFIRMATIONS: SignalConfirmation[] = [
  {
    id: 'stoch_cross',
    name: 'Stochastic Crossover',
    description: 'Fast %K crosses %D in signal direction',
    weight: 8,
    check: (_klines, signal, quadData) => {
      if (!quadData) return false;
      const fast = quadData.fast;
      const last = safeGetLast(fast);
      const prev = safeGetLast(fast, 1);

      if (!last || !prev || !Number.isFinite(last.k) || !Number.isFinite(prev.k)) {
        return false;
      }

      if (signal.action === 'BUY') {
        return prev.k <= prev.d && last.k > last.d;
      } else {
        return prev.k >= prev.d && last.k < last.d;
      }
    },
  },

  {
    id: 'volume_surge',
    name: 'Volume Confirmation',
    description: 'Current volume > 1.5x average',
    weight: 6,
    check: (klines, _signal) => {
      if (klines.length < 20) return false;

      const recentVolumes = klines.slice(-20).map(k => k.volume);
      const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / 20;
      const currentVolume = safeGetLast(klines)?.volume ?? 0;

      return currentVolume > avgVolume * 1.5;
    },
  },

  {
    id: 'candle_pattern',
    name: 'Bullish/Bearish Candle',
    description: 'Signal candle confirms direction',
    weight: 5,
    check: (klines, signal) => {
      const candle = safeGetLast(klines);
      if (!candle) return false;

      const body = candle.close - candle.open;
      const range = candle.high - candle.low;
      if (range === 0) return false;

      const bodyPercent = Math.abs(body) / range;

      if (signal.action === 'BUY') {
        return body > 0 && bodyPercent > 0.6;
      } else {
        return body < 0 && bodyPercent > 0.6;
      }
    },
  },

  {
    id: 'ma_alignment',
    name: 'MA Trend Alignment',
    description: 'Price and MAs aligned with signal',
    weight: 7,
    check: (klines, signal, _quadData, maData) => {
      if (!maData) return false;

      const price = safeGetLast(klines)?.close;
      const ma20 = safeGetLast(maData.ma20);
      const ma50 = safeGetLast(maData.ma50);

      if (!price || !ma20 || !ma50) return false;

      if (signal.action === 'BUY') {
        return price > ma20 && ma20 > ma50;
      } else {
        return price < ma20 && ma20 < ma50;
      }
    },
  },

  {
    id: 'no_resistance',
    name: 'Clear Path',
    description: 'No immediate resistance/support blocking',
    weight: 6,
    check: (klines, signal, _quadData, maData, channel) => {
      const price = safeGetLast(klines)?.close;
      const ma50 = maData ? safeGetLast(maData.ma50) : undefined;

      if (!price) return false;

      const threshold = 0.003;

      if (signal.action === 'BUY') {
        const resistances: number[] = [];
        if (ma50 && ma50 > price) resistances.push(ma50);
        if (channel?.upper) resistances.push(channel.upper);

        return resistances.every(r => (r - price) / price > threshold);
      } else {
        const supports: number[] = [];
        if (ma50 && ma50 < price) supports.push(ma50);
        if (channel?.lower) supports.push(channel.lower);

        return supports.every(s => (price - s) / price > threshold);
      }
    },
  },

  {
    id: 'higher_tf_trend',
    name: 'Higher TF Alignment',
    description: '15M trend supports signal direction',
    weight: 9,
    check: (_klines, signal, quadData) => {
      if (!quadData) return false;

      const slow = quadData.slow;
      const last = safeGetLast(slow);
      const prev3 = safeGetLast(slow, 3);

      if (!last || !Number.isFinite(last.k)) return false;

      if (signal.action === 'BUY') {
        const isRising = prev3 ? last.k > prev3.k : false;
        return isRising || last.k < 30;
      } else {
        const isFalling = prev3 ? last.k < prev3.k : false;
        return isFalling || last.k > 70;
      }
    },
  },

  {
    id: 'divergence_present',
    name: 'Divergence Detected',
    description: 'Price/stochastic divergence supports signal',
    weight: 7,
    check: (_klines, signal) => {
      return signal.divergence !== null;
    },
  },

  {
    id: 'not_extended',
    name: 'Not Overextended',
    description: 'Price not too far from VWAP',
    weight: 5,
    check: (klines, _signal, _quadData, maData) => {
      const price = safeGetLast(klines)?.close;
      const vwap = maData?.vwap ? safeGetLast(maData.vwap) : undefined;

      if (!price || !vwap) return true;

      const distance = Math.abs(price - vwap) / vwap;
      return distance < 0.01;
    },
  },

  {
    id: 'quad_rotation',
    name: 'Quad Band Rotation',
    description: 'All 4 stochastic bands rotating in signal direction',
    weight: 8,
    check: (_klines, signal, quadData) => {
      if (!quadData) return false;

      const bands = ['fast', 'standard', 'medium', 'slow'] as const;
      let alignedCount = 0;

      for (const bandKey of bands) {
        const band = quadData[bandKey];
        const last = safeGetLast(band);
        const prev = safeGetLast(band, 1);

        if (!last || !prev || !Number.isFinite(last.k) || !Number.isFinite(prev.k)) {
          continue;
        }

        if (signal.action === 'BUY' && last.k > prev.k) alignedCount++;
        if (signal.action === 'SELL' && last.k < prev.k) alignedCount++;
      }

      return alignedCount >= 3;
    },
  },

  {
    id: 'twenty_twenty_flag',
    name: '20/20 Flag',
    description: 'Both %K and %D in extreme zone',
    weight: 6,
    check: (_klines, signal, quadData) => {
      if (!quadData) return false;

      const fast = safeGetLast(quadData.fast);
      if (!fast || !Number.isFinite(fast.k) || !Number.isFinite(fast.d)) return false;

      if (signal.action === 'BUY') {
        return fast.k < 20 && fast.d < 20;
      } else {
        return fast.k > 80 && fast.d > 80;
      }
    },
  },
];

export function calculateConfirmationScore(
  signal: TradeSignal,
  klines: ParsedKline[],
  quadData?: QuadStochasticData,
  maData?: MAData,
  channel?: ChannelBoundary | null
): { score: number; maxScore: number; achieved: string[]; missing: string[] } {
  let score = 0;
  let maxScore = 0;
  const achieved: string[] = [];
  const missing: string[] = [];

  for (const conf of CONFIRMATIONS) {
    maxScore += conf.weight;

    try {
      if (conf.check(klines, signal, quadData, maData, channel)) {
        score += conf.weight;
        achieved.push(conf.id);
      } else {
        missing.push(conf.id);
      }
    } catch {
      missing.push(conf.id);
    }
  }

  return { score, maxScore, achieved, missing };
}

export const SIGNAL_THRESHOLDS = {
  SUPER: 0.85,
  STRONG: 0.70,
  MODERATE: 0.55,
  WEAK: 0.40,
} as const;

export function getSignalStrengthFromScore(score: number, maxScore: number): 'SUPER' | 'STRONG' | 'MODERATE' | 'WEAK' | null {
  if (maxScore === 0) return null;

  const ratio = score / maxScore;

  if (ratio >= SIGNAL_THRESHOLDS.SUPER) return 'SUPER';
  if (ratio >= SIGNAL_THRESHOLDS.STRONG) return 'STRONG';
  if (ratio >= SIGNAL_THRESHOLDS.MODERATE) return 'MODERATE';
  if (ratio >= SIGNAL_THRESHOLDS.WEAK) return 'WEAK';

  return null;
}

export function getConfirmationById(id: string): SignalConfirmation | undefined {
  return CONFIRMATIONS.find(c => c.id === id);
}

export function getRequiredConfirmations(): SignalConfirmation[] {
  return CONFIRMATIONS.filter(c => c.weight >= 7);
}

export function getOptionalConfirmations(): SignalConfirmation[] {
  return CONFIRMATIONS.filter(c => c.weight < 7);
}
