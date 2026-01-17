import type { ParsedKline } from '@/types/bitunix';

export function createMockKlines(count: number, startTime = 1700000000): ParsedKline[] {
  const klines: ParsedKline[] = [];
  let price = 50000;

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 1000;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 200;
    const low = Math.min(open, close) - Math.random() * 200;
    const volume = 100 + Math.random() * 500;

    klines.push({
      time: startTime + i * 3600,
      open,
      high,
      low,
      close,
      volume,
    });

    price = close;
  }

  return klines;
}

export function createKlinesWithTrend(
  count: number,
  direction: 'up' | 'down' | 'sideways',
  startPrice = 50000,
  startTime = 1700000000
): ParsedKline[] {
  const klines: ParsedKline[] = [];
  let price = startPrice;

  for (let i = 0; i < count; i++) {
    let change: number;
    switch (direction) {
      case 'up':
        change = Math.random() * 100 + 50;
        break;
      case 'down':
        change = -(Math.random() * 100 + 50);
        break;
      case 'sideways':
        change = (Math.random() - 0.5) * 50;
        break;
    }

    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 50;
    const low = Math.min(open, close) - Math.random() * 50;
    const volume = 100 + Math.random() * 500;

    klines.push({
      time: startTime + i * 3600,
      open,
      high,
      low,
      close,
      volume,
    });

    price = close;
  }

  return klines;
}

export function createStableKlines(
  count: number,
  basePrice = 50000,
  startTime = 1700000000
): ParsedKline[] {
  return Array.from({ length: count }, (_, i) => ({
    time: startTime + i * 3600,
    open: basePrice,
    high: basePrice + 10,
    low: basePrice - 10,
    close: basePrice,
    volume: 100,
  }));
}
