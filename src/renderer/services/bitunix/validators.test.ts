import { describe, it, expect } from 'vitest';
import {
  validateKline,
  validateRawKlineArray,
  validateSymbol,
  validateTicker,
  validateWebSocketMessage
} from './validators';
import { ParsedKline, BitunixTicker24h, SymbolStatus } from '../../types/bitunix';

describe('Validators', () => {
  describe('validateKline', () => {
    it('should return valid kline', () => {
      const kline: ParsedKline = {
        time: 1625097600,
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        volume: 1000
      };
      expect(validateKline(kline)).toEqual(kline);
    });

    it('should return null for invalid types', () => {
      expect(validateKline(null)).toBeNull();
      expect(validateKline({})).toBeNull();
      expect(validateKline({ time: 'string' })).toBeNull();
    });

    it('should return null for negative volume', () => {
      const kline: ParsedKline = {
        time: 1625097600,
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        volume: -1
      };
      expect(validateKline(kline)).toBeNull();
    });

    it('should return null if high < low', () => {
      const kline: ParsedKline = {
        time: 1625097600,
        open: 100,
        high: 80,
        low: 90,
        close: 105,
        volume: 1000
      };
      expect(validateKline(kline)).toBeNull();
    });

    it('should return null for invalid array', () => {
      expect(validateRawKlineArray([])).toBeNull();
      expect(validateRawKlineArray([123])).toBeNull();
      expect(validateRawKlineArray('not-array')).toBeNull();
    });
  });

  describe('validateRawKlineArray', () => {
    it('should return valid array', () => {
      const raw = [1625097600000, '100', '110', '90', '105', '1000'];
      expect(validateRawKlineArray(raw)).toEqual(raw);
    });

    it('should return null for invalid array', () => {
      expect(validateRawKlineArray([])).toBeNull();
      expect(validateRawKlineArray([123])).toBeNull(); // Too short
      expect(validateRawKlineArray('not-array')).toBeNull();
    });

    it('should return null for invalid values inside array', () => {
      expect(validateRawKlineArray([NaN, '100', '110', '90', '105', '1000'])).toBeNull();
      expect(validateRawKlineArray([1625097600000, 'invalid', '110', '90', '105', '1000'])).toBeNull();
    });
  });

  describe('validateSymbol', () => {
    const validSymbol = {
      symbol: 'BTCUSDT',
      baseAsset: 'BTC',
      quoteAsset: 'USDT',
      pricePrecision: 2,
      quantityPrecision: 4,
      tickSize: '0.01',
      minQty: '0.0001',
      maxQty: '1000',
      minNotional: '10',
      status: 'TRADING' as SymbolStatus
    };

    it('should return valid symbol', () => {
      expect(validateSymbol(validSymbol)).toEqual(validSymbol);
    });

    it('should return null for missing required fields', () => {
      const invalid = { ...validSymbol, symbol: undefined };
      expect(validateSymbol(invalid)).toBeNull();
    });

    it('should return null for invalid number strings', () => {
      const invalid = { ...validSymbol, tickSize: 'invalid' };
      expect(validateSymbol(invalid)).toBeNull();
    });
  });

  describe('validateTicker', () => {
    const validTicker = {
      symbol: 'BTCUSDT',
      lastPrice: '50000',
      openPrice: '49000',
      highPrice: '51000',
      lowPrice: '48000',
      volume: '1000',
      quoteVolume: '50000000'
    } as BitunixTicker24h;

    it('should return valid ticker', () => {
      expect(validateTicker(validTicker)).toEqual(validTicker);
    });

    it('should return null for invalid numeric strings', () => {
      const invalid = { ...validTicker, lastPrice: 'nan' };
      expect(validateTicker(invalid)).toBeNull();
    });

    it('should return null if high < low', () => {
      const invalid = { ...validTicker, highPrice: '100', lowPrice: '200' };
      expect(validateTicker(invalid)).toBeNull();
    });
  });

  describe('validateWebSocketMessage', () => {
    it('should validate kline message', () => {
      const msg = {
        e: 'kline',
        k: { o: '100', c: '105', h: '110', l: '90', v: '1000' }
      };
      expect(validateWebSocketMessage(msg)).toEqual(msg);
    });

    it('should return null for invalid kline message', () => {
      const msg = {
        e: 'kline',
        k: { o: 'invalid', c: '105', h: '110', l: '90', v: '1000' }
      };
      expect(validateWebSocketMessage(msg)).toBeNull();
    });

    it('should pass through system messages', () => {
      const msg = { id: 1, result: null };
      expect(validateWebSocketMessage(msg)).toEqual(msg);
    });
  });
});
