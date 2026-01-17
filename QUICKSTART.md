# Bitunix Charts - Quick Start Guide

## 🚀 Quick Start

### 1. Install Dependencies (Already Done!)
```bash
npm install
```

### 2. Run in Development Mode
```bash
npm run electron:dev
```

This will:
- Start the Vite development server on port 5173
- Launch the Electron window automatically
- Enable hot-reload for instant updates
- Open DevTools for debugging

### 3. Build for Production

#### Build .deb package for Ubuntu:
```bash
npm run electron:build:deb
```

The package will be in `release/bitunix-charts_0.0.1_amd64.deb`

#### Install on Ubuntu:
```bash
sudo dpkg -i release/bitunix-charts_0.0.1_amd64.deb
```

---

## 📁 Project Structure Overview

```
bitunix-charts/
├── src/
│   ├── main/                      # Electron Main Process (Node.js)
│   │   ├── main.ts                # App entry point, window management
│   │   ├── preload.ts             # IPC bridge (contextBridge)
│   │   └── ipc-handlers.ts        # API handlers for REST & WebSocket
│   │
│   └── renderer/                  # React App (Browser)
│       ├── App.tsx                # Main React component
│       ├── main.tsx               # React entry point
│       ├── App.css                # Global styles
│       ├── components/            # React components (charts, UI)
│       ├── stores/                # Zustand state management
│       │   └── useChartStore.ts   # Chart state (symbol, interval, indicators)
│       ├── services/              # API wrappers
│       │   └── marketDataService.ts
│       ├── types/                 # TypeScript definitions
│       │   └── index.ts           # Kline, Symbol, Indicator types
│       ├── hooks/                 # Custom React hooks
│       └── lib/                   # Utilities
│           └── utils.ts           # cn() for Tailwind
│
├── assets/icons/                  # App icons
├── index.html                     # HTML entry point
├── electron-builder.json          # Build configuration
├── vite.config.ts                 # Vite + Electron plugins
├── tailwind.config.js             # Tailwind theme (dark mode)
└── package.json                   # Dependencies & scripts
```

---

## 🎯 Current Status

✅ **Completed:**
- [x] Electron + React + TypeScript + Vite setup
- [x] Main process with IPC handlers
- [x] Preload script with contextBridge API
- [x] React renderer with Tailwind dark theme
- [x] Zustand store for chart state
- [x] Market data service wrapper
- [x] Type definitions for API data
- [x] Electron-builder for .deb packaging
- [x] Basic placeholder UI showing "Bitunix Charts"

🔨 **Next Steps:**
1. **Implement Chart Component** (using lightweight-charts)
   - Create `src/renderer/components/Chart.tsx`
   - Set up candlestick series
   - Add volume bars
   - Handle resize events

2. **Implement WebSocket Connection** (in main process)
   - Create `src/main/websocket-manager.ts`
   - Connect to `wss://ws.bitunix.com/ws`
   - Handle subscriptions and reconnection
   - Send updates to renderer via IPC

3. **Add Symbol Selector**
   - Create `src/renderer/components/SymbolSelector.tsx`
   - Fetch symbols from API
   - Update chart when symbol changes

4. **Add Interval Selector**
   - Create `src/renderer/components/IntervalSelector.tsx`
   - Support: 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w

5. **Implement Technical Indicators**
   - Create `src/renderer/components/IndicatorPanel.tsx`
   - Add indicators to chart (max 10 active)
   - Calculate using `technicalindicators` package

---

## 🔑 Key Concepts

### IPC Communication Flow
```
Renderer (React)          Main Process (Node.js)
     │                           │
     ├─── window.bitunix.getKlines() ───►
     │                           │
     │                      Fetch from API
     │                           │
     ◄─── Return data ───────────┤
```

### Zustand Store Usage
```typescript
import { useChartStore } from '@/stores/useChartStore';

function MyComponent() {
  const symbol = useChartStore((state) => state.symbol);
  const setSymbol = useChartStore((state) => state.setSymbol);
  
  return <button onClick={() => setSymbol('ETHUSDT')}>ETH/USDT</button>;
}
```

### Adding a Chart Indicator
```typescript
const addIndicator = useChartStore((state) => state.addIndicator);

addIndicator({
  id: crypto.randomUUID(),
  type: 'RSI',
  params: { period: 14 },
  color: '#6366f1',
  enabled: true,
});
```

---

## 🎨 Theme Colors (Tailwind)

```typescript
bg-background-primary    // #0a0a0f (darkest)
bg-surface-primary       // #1e1e2e (surfaces)
text-text-primary        // #f8fafc (white text)
text-text-secondary      // #94a3b8 (gray text)
accent-primary           // #6366f1 (indigo accent)
chart-up                 // #22c55e (green candles)
chart-down               // #ef4444 (red candles)
```

---

## 🐛 Debugging

### Open DevTools
- Press `Ctrl+Shift+I` in the app
- Or set `mainWindow.webContents.openDevTools()` in `main.ts`

### Check Main Process Logs
```bash
npm run electron:dev
# Logs appear in terminal
```

### Check IPC Communication
```typescript
// In renderer:
console.log(await window.bitunix.getSymbols());
```

---

## 📚 Documentation Links

- [Lightweight Charts Docs](https://tradingview.github.io/lightweight-charts/)
- [Electron IPC](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Zustand Guide](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Bitunix API](https://api.bitunix.com) (Base URL)

---

## 🚨 Common Issues

### Port 5173 already in use
```bash
# Kill the process using the port
lsof -ti:5173 | xargs kill -9
```

### Electron window doesn't open
- Check that `dist/main/main.cjs` exists
- Run `npm run build` first
- Check terminal for errors

### Icons missing in build
- Convert `assets/icons/icon.svg` to PNG
- Use ImageMagick: `convert icon.svg -resize 512x512 icon.png`
- Or use an online converter

---

Happy coding! 🚀
