# Bitunix Charts - OpenCode Skill

## Project Context

Building a TradingView-style desktop charting app for Ubuntu 24.04 with:
- **Stack**: Electron + React + TypeScript + Vite
- **Charting**: lightweight-charts (TradingView's library)
- **State**: Zustand
- **Styling**: Tailwind CSS + shadcn/ui
- **Data**: Bitunix exchange WebSocket + REST API
- **Indicators**: 25 technical indicators (max 10 active)
- **Output**: .deb package with desktop icon

---

## Critical Patterns

### Electron Structure
```
src/
  main/           # Node.js process - API calls, WebSocket, IPC
    main.ts
    preload.ts    # contextBridge for renderer
    ipc-handlers.ts
  renderer/       # React app - UI only, no direct Node access
    App.tsx
    components/
    stores/
    services/
    hooks/
```

### IPC Communication
```typescript
// preload.ts - expose safe APIs
contextBridge.exposeInMainWorld('bitunix', {
  getKlines: (symbol, interval) => ipcRenderer.invoke('bitunix:get-klines', symbol, interval),
  subscribe: (channel, callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  }
});

// renderer usage
const klines = await window.bitunix.getKlines('BTCUSDT', '1h');
```

### Lightweight Charts Setup
```typescript
import { createChart, ColorType } from 'lightweight-charts';

const chart = createChart(container, {
  layout: {
    background: { type: ColorType.Solid, color: '#131722' },
    textColor: '#d1d4dc',
  },
  grid: {
    vertLines: { color: '#1e222d' },
    horzLines: { color: '#1e222d' },
  },
  crosshair: { mode: 1 },
  rightPriceScale: { borderColor: '#2a2e39' },
  timeScale: { borderColor: '#2a2e39', timeVisible: true },
});

const candleSeries = chart.addCandlestickSeries({
  upColor: '#26a69a',
  downColor: '#ef5350',
  borderUpColor: '#26a69a',
  borderDownColor: '#ef5350',
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
});
```

### Zustand Store Pattern
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface IndicatorStore {
  activeIndicators: IndicatorConfig[];
  addIndicator: (type: IndicatorType) => void;
  // ...
}

export const useIndicatorStore = create<IndicatorStore>()(
  persist(
    (set, get) => ({
      activeIndicators: [],
      addIndicator: (type) => {
        const current = get().activeIndicators;
        if (current.length >= 10) return; // MAX 10
        // ...
      },
    }),
    { name: 'indicator-storage' }
  )
);
```

---

## Bitunix API Reference

### REST Endpoints
```
Base URL: https://api.bitunix.com

GET /api/v1/market/symbols          # All trading pairs
GET /api/v1/market/klines           # Candlestick data
  ?symbol=BTCUSDT
  &interval=1h                      # 1m,5m,15m,30m,1h,4h,1d,1w
  &limit=500                        # max 1000

GET /api/v1/market/ticker/24hr      # 24hr stats
  ?symbol=BTCUSDT
```

### WebSocket
```
URL: wss://ws.bitunix.com/ws

// Subscribe to klines
{
  "method": "SUBSCRIBE",
  "params": ["btcusdt@kline_1h"],
  "id": 1
}

// Kline update message
{
  "e": "kline",
  "s": "BTCUSDT",
  "k": {
    "t": 1699900800000,  // open time
    "o": "42150.00",     // open
    "h": "42200.00",     // high
    "l": "42100.00",     // low
    "c": "42175.50",     // close
    "v": "1234.56",      // volume
    "x": false           // is closed
  }
}
```

---

## Indicator Implementation

### Using technicalindicators Package
```typescript
import { SMA, EMA, RSI, MACD, BollingerBands } from 'technicalindicators';

// SMA
const smaValues = SMA.calculate({ period: 20, values: closes });

// MACD
const macdValues = MACD.calculate({
  values: closes,
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9,
  SimpleMAOscillator: false,
  SimpleMASignal: false,
});

// Bollinger
const bbValues = BollingerBands.calculate({
  period: 20,
  values: closes,
  stdDev: 2,
});
```

### Custom Implementations Needed
```typescript
// VWAP - reset daily
function calculateVWAP(klines: Kline[]): number[] {
  let cumTypicalPriceVol = 0;
  let cumVolume = 0;
  let currentDay = -1;
  
  return klines.map(k => {
    const day = new Date(k.openTime).getDate();
    if (day !== currentDay) {
      cumTypicalPriceVol = 0;
      cumVolume = 0;
      currentDay = day;
    }
    const typicalPrice = (k.high + k.low + k.close) / 3;
    cumTypicalPriceVol += typicalPrice * k.volume;
    cumVolume += k.volume;
    return cumTypicalPriceVol / cumVolume;
  });
}

// Supertrend
function calculateSupertrend(klines: Kline[], period = 10, multiplier = 3) {
  const atr = ATR.calculate({ high: highs, low: lows, close: closes, period });
  // ... implementation
}
```

---

## File Templates

### Component Template
```typescript
import { FC, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
}

export const ComponentName: FC<Props> = ({ className }) => {
  return (
    <div className={cn('', className)}>
      {/* content */}
    </div>
  );
};
```

### Store Template
```typescript
import { create } from 'zustand';

interface StoreState {
  // state
}

interface StoreActions {
  // actions
}

export const useStoreName = create<StoreState & StoreActions>((set, get) => ({
  // implementation
}));
```

---

## Color Palette

```css
--bg-primary: #131722;
--bg-secondary: #1e222d;
--bg-tertiary: #2a2e39;
--text-primary: #d1d4dc;
--text-secondary: #787b86;
--accent: #2962ff;
--success: #26a69a;
--danger: #ef5350;
--warning: #f7931a;
```

---

## Common Issues & Fixes

### Electron + Vite HMR
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
```

### Chart Resize
```typescript
useEffect(() => {
  const handleResize = () => {
    chart.applyOptions({ width: container.clientWidth });
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### WebSocket Reconnect
```typescript
const reconnect = () => {
  setTimeout(() => {
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    setTimeout(connect, delay);
  }, 0);
};
```

---

## Build Commands

```bash
# Development
npm run electron:dev

# Build for Linux
npm run electron:build:linux

# Build .deb only
npm run electron:build:deb

# The .deb will be in dist/
```
