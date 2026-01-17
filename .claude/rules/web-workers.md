---
globs: ["src/renderer/workers/**/*.ts"]
description: "Web Worker rules for indicator calculations"
---

# Web Worker Rules

## Purpose
Indicator calculations run in Web Workers to prevent UI freezing.

## Message Protocol
```typescript
// Request from main thread
interface WorkerMessage {
  id: string;           // Unique request ID
  type: 'calculate';
  payload: {
    indicators: IndicatorConfig[];
    klines: ParsedKline[];
  };
}

// Response to main thread
interface WorkerResponse {
  id: string;           // Matches request ID
  type: 'result' | 'error';
  payload: {
    results?: Array<{ id: string; data: any[] }>;
    error?: string;
  };
}
```

## Rules
- NEVER crash on calculation failure - catch and return empty result
- Always include indicator ID in response for correlation
- Use `technicalindicators` package for standard indicators
- Custom implementations for: VWAP, Supertrend, Ichimoku, Keltner, Donchian, Volume Profile, Pivot Points
