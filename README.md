# Bitunix Charts

Professional cryptocurrency trading charts desktop application for Ubuntu.

## Features

- 📊 **Advanced Charting**: Powered by TradingView's lightweight-charts library
- 📈 **25 Technical Indicators**: Including SMA, EMA, RSI, MACD, Bollinger Bands, and more
- ⚡ **Real-time Data**: Live market data via Bitunix WebSocket API
- 🎨 **Dark Theme**: Beautiful dark theme optimized for trading
- 🖥️ **Desktop App**: Native Ubuntu application built with Electron

## Tech Stack

- **Framework**: Electron + React + TypeScript
- **Bundler**: Vite
- **Charting**: lightweight-charts (TradingView)
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Data Sources**: Bitunix Exchange API & WebSocket
- **Indicators**: technicalindicators package

## Development

### Prerequisites

- Node.js 20+ 
- npm or yarn

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run electron:dev
```

This will start the Vite dev server and launch the Electron app with hot reload enabled.

### Build for Production

#### Linux

```bash
npm run build:linux        # Build deb + AppImage
npm run build:linux:deb    # Build .deb only
npm run build:linux:appimage  # Build AppImage only
```

#### macOS

```bash
npm run build:mac          # Build dmg + zip
```

#### Windows

```bash
npm run build:win          # Build NSIS installer + portable
```

#### All Platforms

```bash
npm run build:all          # Build for Linux, macOS, and Windows
```

Build artifacts are output to the `dist/` directory.

## Project Structure

```
bitunix-charts/
├── src/
│   ├── main/              # Electron main process
│   │   ├── main.ts        # Main entry point
│   │   ├── preload.ts     # Preload script (contextBridge)
│   │   └── ipc-handlers.ts # IPC communication handlers
│   └── renderer/          # React app (renderer process)
│       ├── components/    # React components
│       ├── stores/        # Zustand stores
│       ├── services/      # API services
│       ├── hooks/         # Custom React hooks
│       ├── types/         # TypeScript type definitions
│       ├── App.tsx        # Main React component
│       ├── App.css        # Global styles
│       └── main.tsx       # React entry point
├── assets/
│   └── icons/            # Application icons
├── index.html            # HTML template
├── electron-builder.yml  # Electron builder config
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind CSS config
└── tsconfig.json        # TypeScript config
```

## Available Scripts

- `npm run electron:dev` - Start development mode
- `npm run build` - Build the app
- `npm run electron:build` - Build Electron app with builder
- `npm run electron:build:linux` - Build for Linux (AppImage + deb)
- `npm run electron:build:deb` - Build .deb package only
- `npm run lint` - Run ESLint

## Configuration

### Bitunix API

The app connects to:
- **REST API**: `https://api.bitunix.com`
- **WebSocket**: `wss://ws.bitunix.com/ws`

### Supported Indicators (Max 10 active)

SMA, EMA, RSI, MACD, Bollinger Bands, Stochastic, ATR, VWAP, Parabolic SAR, ADX, CCI, MFI, OBV, Williams %R, ROC, Stochastic RSI, TRIX, Ultimate Oscillator, Awesome Oscillator, Chaikin Money Flow, PSAR, Supertrend, Ichimoku Cloud, VWMA, HMA

## License

MIT
