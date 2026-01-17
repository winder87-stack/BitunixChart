---
globs: ["src/renderer/components/Chart/**/*.tsx"]
description: "Lightweight Charts patterns"
---

# Lightweight Charts Rules

## Chart Initialization
```typescript
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

const chart = createChart(container, {
  layout: {
    background: { type: ColorType.Solid, color: '#131722' },
    textColor: '#d1d4dc',
  },
  grid: {
    vertLines: { color: '#1e222d' },
    horzLines: { color: '#1e222d' },
  },
  crosshair: { mode: CrosshairMode.Normal },
  rightPriceScale: { borderColor: '#2a2e39' },
  timeScale: { borderColor: '#2a2e39', timeVisible: true },
});
```

## Candlestick Series - CRITICAL COLORS
```typescript
const candleSeries = chart.addCandlestickSeries({
  upColor: '#26a69a',      // Green for UP
  downColor: '#ef5350',    // Red for DOWN
  borderUpColor: '#26a69a',
  borderDownColor: '#ef5350',
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
});
```

## Performance Rules
- Use `requestAnimationFrame` for updates
- Limit stored candles to 2000 maximum
- Throttle real-time updates to 4/sec
- Clean up chart on component unmount: `chart.remove()`
- Handle resize with ResizeObserver
