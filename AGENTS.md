---
description: Bitunix crypto charting app patterns, API reference, and code templates
---

# Bitunix Charts - Project Rules

This is a TradingView-style desktop charting app for Ubuntu 24.04.

## Stack
- Electron + React + TypeScript + Vite
- lightweight-charts (TradingView's library)
- Zustand for state management
- Tailwind CSS + shadcn/ui
- Bitunix exchange REST + WebSocket API

## Architecture
- `src/main/` = Electron main process (Node.js - API calls, WebSocket, IPC)
- `src/renderer/` = React app (UI only, no direct Node access)
- NEVER import Node modules directly in renderer
- Use contextBridge in preload.ts for IPC

## Code Style
- Functional components with TypeScript
- Zustand for global state, React state for local UI only
- Max 10 active indicators (enforced in store)
- Dark theme only: bg #131722, surface #1e222d, text #d1d4dc
- Green #26a69a for up, Red #ef5350 for down

## Key Constraints
- Use `technicalindicators` npm package where possible
- Calculate indicators in Web Worker
- Throttle WebSocket updates to 4/sec for UI
- Build output: .deb package with desktop icon

---

# Bitunix Charts Skill

## Electron IPC Pattern
```typescript
// preload.ts
contextBridge.exposeInMainWorld('bitunix', {
  getKlines: (symbol, interval) => ipcRenderer.invoke('bitunix:get-klines', symbol, interval),
  subscribe: (channel, callback) => {
    const sub = (_event, data) => callback(data);
    ipcRenderer.on(channel, sub);
    return () => ipcRenderer.removeListener(channel, sub);
  }
});
```

## Lightweight Charts Setup
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
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
});
```

## Zustand Store Pattern
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useIndicatorStore = create()(
  persist(
    (set, get) => ({
      activeIndicators: [],
      addIndicator: (type) => {
        if (get().activeIndicators.length >= 10) return;
        // add logic
      },
    }),
    { name: 'indicator-storage' }
  )
);
```

## Bitunix API
```
REST Base: https://api.bitunix.com
GET /api/v1/market/symbols
GET /api/v1/market/klines?symbol=BTCUSDT&interval=1h&limit=500
GET /api/v1/market/ticker/24hr?symbol=BTCUSDT

WebSocket: wss://ws.bitunix.com/ws
Subscribe: {"method": "SUBSCRIBE", "params": ["btcusdt@kline_1h"], "id": 1}
```

## Indicator Imports
```typescript
import { SMA, EMA, RSI, MACD, BollingerBands, Stochastic, ATR, OBV } from 'technicalindicators';
```

## Color Palette
```css
--bg-primary: #131722;
--bg-secondary: #1e222d;
--text-primary: #d1d4dc;
--text-secondary: #787b86;
--accent: #2962ff;
--success: #26a69a;
--danger: #ef5350;
```