# Bitunix Charts - Coding Rules

You are building a TradingView-style desktop charting application.

## Project: bitunix-charts
- **Platform**: Ubuntu 24.04 desktop app (.deb)
- **Framework**: Electron 28+ with React 18+ and TypeScript 5+
- **Bundler**: Vite
- **Charting**: lightweight-charts (TradingView's library)
- **State**: Zustand with persist middleware
- **Styling**: Tailwind CSS + shadcn/ui components
- **Data**: Bitunix exchange REST API + WebSocket

## Architecture Rules

### Electron Process Separation
- `src/main/` = Node.js main process (API calls, WebSocket, system access)
- `src/renderer/` = React app (UI only, no direct Node access)
- All Node APIs accessed via IPC through preload script
- NEVER import Node modules directly in renderer

### File Organization
```
src/renderer/
  components/     # React components, grouped by feature
  hooks/          # Custom React hooks
  stores/         # Zustand stores
  services/       # API clients, WebSocket, calculations
  types/          # TypeScript interfaces/types
  utils/          # Helper functions
```

### Component Patterns
- Functional components with TypeScript
- Props interface defined above component
- Use `cn()` utility for conditional classes
- Colocate component-specific types in same file

### State Management
- Zustand for global state (chart data, indicators, settings)
- React state for local UI state only
- Persist user preferences to localStorage
- Max 10 active indicators enforced at store level

### Styling
- Tailwind utility classes, no custom CSS unless necessary
- Dark theme only (TradingView style)
- Colors: bg #131722, surface #1e222d, text #d1d4dc
- Green #26a69a for up/positive, Red #ef5350 for down/negative

## Code Style

### TypeScript
- Strict mode enabled
- Explicit return types on functions
- Interface over type for object shapes
- Enums for fixed sets (IndicatorType, Timeframe)

### Naming
- Components: PascalCase (ChartContainer.tsx)
- Hooks: camelCase with 'use' prefix (useWebSocket.ts)
- Stores: camelCase with 'Store' suffix (indicatorStore.ts)
- Types: PascalCase (IndicatorConfig)
- Constants: SCREAMING_SNAKE_CASE

### Imports
- Absolute imports with @/ alias for src/renderer
- Group: React, external libs, internal modules, types, styles

## Technical Indicators

25 indicators total, categorized:
- **Trend (overlay)**: SMA, EMA, WMA, VWAP, Ichimoku, Parabolic SAR, Supertrend
- **Momentum (separate pane)**: RSI, MACD, Stochastic, StochRSI, CCI, Williams %R, ROC, MFI
- **Volatility**: Bollinger Bands (overlay), ATR, Keltner, Donchian (overlay), StdDev
- **Volume (separate pane)**: OBV, Volume Profile (overlay), CMF, A/D Line
- **Custom**: Pivot Points (overlay)

Use `technicalindicators` npm package where possible. Implement custom calculations for: VWAP, Supertrend, Ichimoku, Keltner, Donchian, Volume Profile, Pivot Points.

## API Integration

### Bitunix REST
- Base: https://api.bitunix.com
- Endpoints: /api/v1/market/symbols, /api/v1/market/klines, /api/v1/market/ticker/24hr
- Use axios with retry logic and rate limit awareness

### Bitunix WebSocket
- URL: wss://ws.bitunix.com/ws
- Subscribe format: {"method": "SUBSCRIBE", "params": ["btcusdt@kline_1h"]}
- Implement reconnect with exponential backoff
- Handle heartbeat/ping-pong

## Performance

- Calculate indicators in Web Worker to avoid blocking UI
- Throttle WebSocket updates to ~4/second for rendering
- Limit stored candles to 2000 max
- Use requestAnimationFrame for chart updates
- Lazy load indicator calculation modules

## Error Handling

- Try/catch around all API calls
- Graceful WebSocket reconnection
- Toast notifications for user-facing errors
- Error boundaries around major components
- Never crash on indicator calculation failure

## Build Output

- electron-builder for packaging
- Target: .deb for Ubuntu (x64, arm64)
- Include proper desktop file with icon
- App icon at assets/icons/ in all required sizes
