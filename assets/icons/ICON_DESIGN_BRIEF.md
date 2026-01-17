# Bitunix Charts App Icon Design Brief

## Brand Identity
- **App Name**: Bitunix Charts
- **Purpose**: Professional cryptocurrency trading charts desktop application
- **Platform**: Ubuntu/Linux desktop (.deb package)
- **Primary Brand Color**: #2962ff (TradingView Blue)
- **Secondary Colors**: 
  - Success/Up: #26a69a (Green)
  - Danger/Down: #ef5350 (Red)
  - Background: #131722 (Dark)

---

## Design Requirements

### Concept Direction
The icon should communicate:
1. **Trading/Finance** - Professional financial tool
2. **Charts/Data** - Visual data representation
3. **Cryptocurrency** - Modern digital asset focus
4. **Reliability** - Trustworthy, stable application

### Suggested Visual Concepts (Pick One)

#### Concept A: Candlestick Chart (Recommended)
- Stylized candlestick bars rising upward
- 2-3 candles with wicks
- Green and red colors for up/down
- Clean geometric shapes

#### Concept B: Line Graph with B
- Upward trending line graph
- Integrated "B" letterform for Bitunix
- Dynamic movement suggestion

#### Concept C: Abstract Chart
- Simplified ascending bars or waves
- Modern gradient treatment
- Tech-forward aesthetic

---

## Technical Specifications

### Size Requirements
| Size | Usage |
|------|-------|
| 16x16 | Taskbar, small contexts |
| 24x24 | System tray |
| 32x32 | Windows taskbar |
| 48x48 | Application menu |
| 64x64 | Dock icons |
| 128x128 | About dialogs |
| 256x256 | High-DPI displays |
| 512x512 | Source/master size |

### Format Requirements
| Format | Platform | Notes |
|--------|----------|-------|
| .svg | Source | Master vector file |
| .png | Linux/All | Multiple sizes (16-512) |
| .ico | Windows | Multi-resolution container |
| .icns | macOS | Apple icon format |

### Design Constraints
1. **Scalability**: Must be recognizable at 16x16
2. **Simplicity**: No fine details that disappear at small sizes
3. **Contrast**: Works on light AND dark backgrounds
4. **Shape**: Rounded square base (radius ~20% of size)
5. **Safe Zone**: Keep important elements within 80% of canvas

---

## Color Palette

### Primary Palette
```
Background:     #131722 (Dark navy)
Primary:        #2962ff (TradingView blue)
Success:        #26a69a (Teal green)
Danger:         #ef5350 (Coral red)
White:          #ffffff
```

### Gradient Options
```
Blue Gradient:  #2962ff → #1e88e5
Dark Gradient:  #1e222d → #131722
```

---

## Current Placeholder Icon

The placeholder icon (`assets/icons/icon.svg`) features:
- 512x512 rounded rectangle background (#131722)
- Stylized candlestick chart in center
- Three candles: one red (down), two green (up)
- Rising trend visual
- Accent ring using brand blue (#2962ff)

---

## File Locations

```
assets/icons/
├── icon.svg          # Master vector (512x512)
├── icon.png          # Main PNG (512x512)
├── icon.ico          # Windows multi-res
├── icon.icns         # macOS format
├── 16x16.png         # Linux sizes
├── 32x32.png
├── 48x48.png
├── 64x64.png
├── 128x128.png
├── 256x256.png
└── 512x512.png
```

---

## Build Integration

Icons are generated via npm script:
```bash
npm run icons:generate
```

This uses sharp to convert the master SVG to all required formats.

---

## Approval Checklist

- [ ] Icon is recognizable at 16x16
- [ ] Works on dark Ubuntu desktop
- [ ] Works on light backgrounds
- [ ] Communicates "trading charts" at a glance
- [ ] Uses brand colors correctly
- [ ] All required sizes generated
- [ ] Tested in Electron app
- [ ] Tested in .deb package installation
