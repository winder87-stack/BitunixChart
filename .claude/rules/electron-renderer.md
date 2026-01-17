---
globs: ["src/renderer/**/*.ts", "src/renderer/**/*.tsx"]
description: "Electron renderer process rules"
---

# Electron Renderer Process Rules

You are in the Electron RENDERER PROCESS (browser context).

## Critical Rules - NEVER VIOLATE
- **NEVER** import Node.js modules (fs, path, os, child_process, etc.)
- **NEVER** import 'electron' directly - use window.bitunix API
- All Node APIs accessed via `window.bitunix.*` (exposed by preload.ts)
- This is a browser environment - only browser APIs available

## Correct Patterns
```typescript
// CORRECT - use exposed API
const klines = await window.bitunix.getKlines('BTCUSDT', '1h');
const cleanup = window.bitunix.onKlineUpdate((data) => { ... });

// WRONG - never do this in renderer
import fs from 'fs';  // ❌ FORBIDDEN
import { ipcRenderer } from 'electron';  // ❌ FORBIDDEN
```

## State Management
- Zustand for global state (chart data, indicators, settings)
- React useState for local UI state only
- Persist user preferences with `persist` middleware
- Max 10 active indicators (enforced in indicatorStore)

## Component Patterns
- Functional components with TypeScript
- Use `cn()` utility for conditional classes
- Props interfaces named `{ComponentName}Props`
