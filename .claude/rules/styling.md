---
globs: ["src/renderer/components/**/*.tsx"]
description: "React component styling rules"
---

# Component Styling Rules

## Dark Theme Only - TradingView Style
All components must use this exact color palette:

| Token | Hex | Usage |
|-------|-----|-------|
| bg-primary | #131722 | Main background |
| bg-secondary | #1e222d | Surface/cards |
| border | #2a2e39 | Borders, grid lines |
| text-primary | #d1d4dc | Main text |
| text-secondary | #787b86 | Muted text |
| accent | #2962ff | Interactive elements |
| success | #26a69a | Bullish/up/positive |
| danger | #ef5350 | Bearish/down/negative |
| warning | #f7931a | Warnings |

## Tailwind Classes
Use custom theme classes defined in tailwind.config.js:
- `bg-chart-bg` for #131722
- `bg-chart-surface` for #1e222d
- `border-chart-border` for #2a2e39
- `text-chart-text` for #d1d4dc
- `text-chart-muted` for #787b86

## Chart Colors - CRITICAL
- Green `#26a69a` = UP/bullish/positive ONLY
- Red `#ef5350` = DOWN/bearish/negative ONLY
- Never swap these - traders rely on color consistency
