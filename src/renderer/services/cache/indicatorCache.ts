import type { ParsedKline } from '../../types/bitunix';
import type { QuadStochasticData } from '../../types/quadStochastic';
import { calculateQuadStochastic } from '../quadStochastic/calculator';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hash: string;
}

class IndicatorCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxAge: number = 60000; // 1 minute
  private maxSize: number = 100;

  // Generate hash that doesn't change on every tick
  private generateStableHash(klines: ParsedKline[]): string {
    if (klines.length === 0) return 'empty';

    const first = klines[0];
    const secondToLast = klines[klines.length - 2]; // Exclude current candle

    return `${klines.length}-${first.time}-${secondToLast?.time || 0}`;
  }

  get<T>(key: string, klines: ParsedKline[]): T | null {
    const hash = this.generateStableHash(klines);
    const cacheKey = `${key}-${hash}`;
    const entry = this.cache.get(cacheKey);

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, klines: ParsedKline[], data: T): void {
    const hash = this.generateStableHash(klines);
    const cacheKey = `${key}-${hash}`;

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = [...this.cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) this.cache.delete(oldest[0]);
    }

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      hash,
    });
  }

  invalidate(key?: string): void {
    if (key) {
      // Invalidate all entries starting with key
      for (const k of this.cache.keys()) {
        if (k.startsWith(key)) {
          this.cache.delete(k);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Implement hit tracking if needed
    };
  }
}

export const indicatorCache = new IndicatorCache();

// Usage in calculator
export function calculateQuadStochasticCached(klines: ParsedKline[], interval = '1m'): QuadStochasticData {
  const cacheKey = `quadStoch-${interval}`;
  const cached = indicatorCache.get<QuadStochasticData>(cacheKey, klines);
  if (cached) return cached;

  const result = calculateQuadStochastic(klines, interval);
  indicatorCache.set(cacheKey, klines, result);

  return result;
}
