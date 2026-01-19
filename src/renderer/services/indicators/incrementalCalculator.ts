import type { ParsedKline } from '../../types/bitunix';
import type { StochasticValue } from '../../types/quadStochastic';

export class IncrementalSMA {
  private period: number;
  private values: number[] = [];
  private sum: number = 0;

  constructor(period: number) {
    this.period = period;
  }

  // Initialize with historical data
  initialize(values: number[]): number[] {
    this.values = [...values];
    this.sum = 0;
    const results: number[] = [];

    for (let i = 0; i < values.length; i++) {
      if (i < this.period - 1) {
        results.push(NaN);
        this.sum += values[i];
      } else if (i === this.period - 1) {
        this.sum += values[i];
        results.push(this.sum / this.period);
      } else {
        this.sum = this.sum - values[i - this.period] + values[i];
        results.push(this.sum / this.period);
      }
    }

    return results;
  }

  update(newValue: number, isNewCandle: boolean): number {
    if (this.values.length === 0) {
      this.values.push(newValue);
      this.sum = newValue;
      return NaN;
    }

    if (isNewCandle) {
      if (this.values.length >= this.period) {
        this.sum -= this.values[this.values.length - this.period];
      }
      this.values.push(newValue);
      this.sum += newValue;
    } else {
      const lastVal = this.values[this.values.length - 1];
      this.sum -= lastVal;
      this.values[this.values.length - 1] = newValue;
      this.sum += newValue;
    }

    if (this.values.length < this.period) return NaN;
    return this.sum / this.period;
  }
}

export class IncrementalStochastic {
  private kPeriod: number;
  private dPeriod: number;
  private smooth: number;
  
  private highs: number[] = [];
  private lows: number[] = [];
  private closes: number[] = [];
  
  private rawKValues: number[] = [];
  private smoothedKValues: number[] = [];
  
  private smoothSMA: IncrementalSMA;
  private dSMA: IncrementalSMA;

  constructor(kPeriod: number, dPeriod: number, smooth: number) {
    this.kPeriod = kPeriod;
    this.dPeriod = dPeriod;
    this.smooth = smooth;
    
    this.smoothSMA = new IncrementalSMA(smooth);
    this.dSMA = new IncrementalSMA(dPeriod);
  }

  initialize(klines: ParsedKline[]): StochasticValue[] {
    this.highs = klines.map(k => k.high);
    this.lows = klines.map(k => k.low);
    this.closes = klines.map(k => k.close);
    
    const results: StochasticValue[] = [];
    this.rawKValues = [];
    this.smoothedKValues = [];
    
    this.smoothSMA = new IncrementalSMA(this.smooth);
    this.dSMA = new IncrementalSMA(this.dPeriod);
    
    for (let i = 0; i < klines.length; i++) {
      const result = this.calculateAtIndex(i, klines[i].time);
      results.push(result);
    }
    
    return results;
  }
  
  private calculateAtIndex(index: number, time: number): StochasticValue {
    if (index < this.kPeriod - 1) {
      this.rawKValues.push(50);
      this.smoothSMA.update(50, true);
      this.dSMA.update(50, true);
      return { time, k: NaN, d: NaN };
    }
    
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    for (let j = 0; j < this.kPeriod; j++) {
      const idx = index - j;
      if (this.highs[idx] > highestHigh) highestHigh = this.highs[idx];
      if (this.lows[idx] < lowestLow) lowestLow = this.lows[idx];
    }
    
    const currentClose = this.closes[index];
    const range = highestHigh - lowestLow;
    const rawK = range === 0 ? 50 : ((currentClose - lowestLow) / range) * 100;
    
    this.rawKValues.push(rawK);
    
    const k = this.smoothSMA.update(rawK, true);
    this.smoothedKValues.push(k);
    
    const d = this.dSMA.update(k, true);
    
    return { time, k, d };
  }

  update(kline: ParsedKline, isNewCandle: boolean): StochasticValue {
    if (isNewCandle) {
      this.highs.push(kline.high);
      this.lows.push(kline.low);
      this.closes.push(kline.close);
      
      const maxHistory = Math.max(this.kPeriod, this.smooth * 2, this.dPeriod * 2) + 100;
      if (this.highs.length > maxHistory) {
        this.highs.shift();
        this.lows.shift();
        this.closes.shift();
      }
    } else {
      const lastIdx = this.highs.length - 1;
      this.highs[lastIdx] = Math.max(this.highs[lastIdx], kline.high);
      this.lows[lastIdx] = Math.min(this.lows[lastIdx], kline.low);
      this.closes[lastIdx] = kline.close;
    }
    
    const index = this.highs.length - 1;
    
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    const startIdx = Math.max(0, index - this.kPeriod + 1);
    for (let i = index; i >= startIdx; i--) {
      if (this.highs[i] > highestHigh) highestHigh = this.highs[i];
      if (this.lows[i] < lowestLow) lowestLow = this.lows[i];
    }
    
    const currentClose = this.closes[index];
    const range = highestHigh - lowestLow;
    const rawK = range === 0 ? 50 : ((currentClose - lowestLow) / range) * 100;
    
    const k = this.smoothSMA.update(rawK, isNewCandle);
    const d = this.dSMA.update(k, isNewCandle);
    
    return { 
      time: kline.time, 
      k: k || 0, 
      d: d || 0 
    };
  }
}
