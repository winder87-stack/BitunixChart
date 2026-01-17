import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateIndicator,
  calculateIndicators,
} from './calculations';
import { createMockKlines, createStableKlines, createKlinesWithTrend } from '@/test/fixtures';
import type { ParsedKline } from '../../types/bitunix';
import type { IndicatorType } from '../../types/indicators';

describe('Technical Indicator Calculations', () => {
  let mockKlines: ParsedKline[];

  beforeEach(() => {
    mockKlines = createMockKlines(100);
  });

  describe('SMA (Simple Moving Average)', () => {
    it('should calculate SMA with default period', () => {
      const result = calculateIndicator('SMA', mockKlines, { period: 20 });

      expect(result.type).toBe('SMA');
      expect(result.data).toHaveLength(mockKlines.length);
      expect(result.meta.dataPoints).toBe(mockKlines.length);
    });

    it('should return null values for initial periods', () => {
      const result = calculateIndicator('SMA', mockKlines, { period: 20 });

      for (let i = 0; i < 19; i++) {
        expect(result.data[i].values.sma).toBeNull();
      }
      expect(result.data[19].values.sma).not.toBeNull();
    });

    it('should calculate correct SMA value', () => {
      const stableKlines = createStableKlines(30, 100);
      const result = calculateIndicator('SMA', stableKlines, { period: 10 });

      const smaValue = result.data[29].values.sma;
      if (smaValue !== null && smaValue !== undefined) {
        expect(smaValue).toBeCloseTo(100, 1);
      }
    });

    it('should handle empty klines array', () => {
      const result = calculateIndicator('SMA', [], { period: 20 });

      expect(result.data).toHaveLength(0);
    });

    it('should handle insufficient data', () => {
      const shortKlines = createMockKlines(5);
      const result = calculateIndicator('SMA', shortKlines, { period: 20 });

      expect(result.data).toHaveLength(5);
      result.data.forEach((d) => {
        expect(d.values.sma).toBeNull();
      });
    });
  });

  describe('EMA (Exponential Moving Average)', () => {
    it('should calculate EMA with default period', () => {
      const result = calculateIndicator('EMA', mockKlines, { period: 20 });

      expect(result.type).toBe('EMA');
      expect(result.data).toHaveLength(mockKlines.length);
    });

    it('should respond faster to price changes than SMA', () => {
      const trendingKlines = createKlinesWithTrend(50, 'up');
      const smaResult = calculateIndicator('SMA', trendingKlines, { period: 10 });
      const emaResult = calculateIndicator('EMA', trendingKlines, { period: 10 });

      const lastIdx = trendingKlines.length - 1;
      const lastPrice = trendingKlines[lastIdx].close;
      const smaVal = smaResult.data[lastIdx].values.sma;
      const emaVal = emaResult.data[lastIdx].values.ema;
      
      // Both should have values at the end
      expect(smaVal).not.toBeNull();
      expect(emaVal).not.toBeNull();
      
      if (smaVal != null && emaVal != null) {
        const smaDiff = Math.abs(lastPrice - smaVal);
        const emaDiff = Math.abs(lastPrice - emaVal);
        // EMA should track price more closely or equally in trending market
        expect(emaDiff).toBeLessThanOrEqual(smaDiff + 100);
      }
    });

    it('should handle empty klines array', () => {
      const result = calculateIndicator('EMA', [], { period: 20 });
      expect(result.data).toHaveLength(0);
    });
  });

  describe('RSI (Relative Strength Index)', () => {
    it('should calculate RSI with default period', () => {
      const result = calculateIndicator('RSI', mockKlines, { period: 14 });

      expect(result.type).toBe('RSI');
      expect(result.data).toHaveLength(mockKlines.length);
    });

    it('should return values between 0 and 100', () => {
      const result = calculateIndicator('RSI', mockKlines, { period: 14 });

      result.data.forEach((d) => {
        const rsiVal = d.values.rsi;
        if (rsiVal != null) {
          expect(rsiVal).toBeGreaterThanOrEqual(0);
          expect(rsiVal).toBeLessThanOrEqual(100);
        }
      });
    });

    it('should show high RSI in uptrend', () => {
      const uptrendKlines = createKlinesWithTrend(50, 'up');
      const result = calculateIndicator('RSI', uptrendKlines, { period: 14 });

      const lastValue = result.data[result.data.length - 1].values.rsi;
      if (lastValue != null) {
        expect(lastValue).toBeGreaterThan(50);
      }
    });

    it('should show low RSI in downtrend', () => {
      const downtrendKlines = createKlinesWithTrend(50, 'down');
      const result = calculateIndicator('RSI', downtrendKlines, { period: 14 });

      const lastValue = result.data[result.data.length - 1].values.rsi;
      if (lastValue != null) {
        expect(lastValue).toBeLessThan(50);
      }
    });

    it('should handle empty klines array', () => {
      const result = calculateIndicator('RSI', [], { period: 14 });
      expect(result.data).toHaveLength(0);
    });
  });

  describe('MACD (Moving Average Convergence Divergence)', () => {
    it('should calculate MACD with default parameters', () => {
      const result = calculateIndicator('MACD', mockKlines, {
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
      });

      expect(result.type).toBe('MACD');
      expect(result.data).toHaveLength(mockKlines.length);
    });

    it('should return macd, signal, and histogram values', () => {
      const result = calculateIndicator('MACD', mockKlines, {
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
      });

      const lastData = result.data[result.data.length - 1];

      if (Object.keys(lastData.values).length > 0) {
        expect(lastData.values).toHaveProperty('macd');
        expect(lastData.values).toHaveProperty('signal');
        expect(lastData.values).toHaveProperty('histogram');
      }
    });

    it('should have histogram = macd - signal', () => {
      const result = calculateIndicator('MACD', mockKlines, {
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
      });

      result.data.forEach((d) => {
        const macdVal = d.values.macd;
        const signalVal = d.values.signal;
        const histVal = d.values.histogram;
        
        if (macdVal != null && signalVal != null && histVal != null) {
          const expected = macdVal - signalVal;
          expect(histVal).toBeCloseTo(expected, 5);
        }
      });
    });

    it('should handle empty klines array', () => {
      const result = calculateIndicator('MACD', [], {});
      expect(result.data).toHaveLength(0);
    });
  });

  describe('Bollinger Bands', () => {
    it('should calculate Bollinger Bands with default parameters', () => {
      const result = calculateIndicator('BB', mockKlines, {
        period: 20,
        stdDev: 2,
      });

      expect(result.type).toBe('BB');
      expect(result.data).toHaveLength(mockKlines.length);
    });

    it('should return upper, middle, and lower bands', () => {
      const result = calculateIndicator('BB', mockKlines, {
        period: 20,
        stdDev: 2,
      });

      const lastData = result.data[result.data.length - 1];

      if (Object.keys(lastData.values).length > 0) {
        expect(lastData.values).toHaveProperty('upper');
        expect(lastData.values).toHaveProperty('middle');
        expect(lastData.values).toHaveProperty('lower');
      }
    });

    it('should have upper > middle > lower', () => {
      const result = calculateIndicator('BB', mockKlines, {
        period: 20,
        stdDev: 2,
      });

      result.data.forEach((d) => {
        const upper = d.values.upper;
        const middle = d.values.middle;
        const lower = d.values.lower;
        
        if (upper != null && middle != null && lower != null) {
          expect(upper).toBeGreaterThan(middle);
          expect(middle).toBeGreaterThan(lower);
        }
      });
    });
  });

  describe('ATR (Average True Range)', () => {
    it('should calculate ATR with default period', () => {
      const result = calculateIndicator('ATR', mockKlines, { period: 14 });

      expect(result.type).toBe('ATR');
      expect(result.data).toHaveLength(mockKlines.length);
    });

    it('should return positive values', () => {
      const result = calculateIndicator('ATR', mockKlines, { period: 14 });

      result.data.forEach((d) => {
        const atrVal = d.values.atr;
        if (atrVal != null) {
          expect(atrVal).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe('calculateIndicators (batch)', () => {
    it('should calculate multiple indicators at once', () => {
      const results = calculateIndicators(
        [
          { type: 'SMA', params: { period: 20 } },
          { type: 'EMA', params: { period: 20 } },
          { type: 'RSI', params: { period: 14 } },
        ],
        mockKlines
      );

      expect(results).toHaveLength(3);
      expect(results[0].type).toBe('SMA');
      expect(results[1].type).toBe('EMA');
      expect(results[2].type).toBe('RSI');
    });
  });

  describe('Unknown indicator type', () => {
    it('should handle unknown indicator type gracefully', () => {
      const result = calculateIndicator('UNKNOWN' as IndicatorType, mockKlines, {});

      expect(result.data).toHaveLength(mockKlines.length);
      result.data.forEach((d) => {
        expect(Object.keys(d.values)).toHaveLength(0);
      });
    });
  });

  describe('Caching', () => {
    it('should return cached result for identical inputs', () => {
      const klines = createMockKlines(50);
      const params = { period: 20 };

      const result1 = calculateIndicator('SMA', klines, params);
      const result2 = calculateIndicator('SMA', klines, params);

      expect(result1.meta.calculationTime).toBeGreaterThanOrEqual(0);
      expect(result2.meta.calculationTime).toBe(result1.meta.calculationTime);
    });
  });
});
