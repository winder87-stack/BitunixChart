/**
 * Top Bar Header
 * 
 * Main application header containing:
 * - Symbol selector with search
 * - Timeframe controls
 * - Chart type controls
 * - Market status/price info
 */

import React, { useRef, useState } from 'react';
import { useChartStore, selectSymbolTimeframe, selectChartSettings, selectIsSubscribed } from '../../stores/chartStore';
import { useMarketData } from '../../hooks/useMarketData';
import { SymbolSearch } from '../Sidebar/SymbolSearch';
import { PriceDisplay } from './PriceDisplay';
import { DrawingToolbar } from './DrawingToolbar';
import { cn } from '../../lib/utils';
import type { Timeframe } from '../../types/bitunix';

// =============================================================================
// Icons
// =============================================================================

const ChevronDownIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const CandlesIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 4h2v16H6zM10 8h2v8h-2zM16 6h2v12h-2z" />
  </svg>
);

const LineIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12l6 6 6-12 4 6" />
  </svg>
);

const AreaIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path fillOpacity="0.5" d="M4 12l6 6 6-12 4 6v8H4z" />
    <path fill="none" stroke="currentColor" strokeWidth={2} d="M4 12l6 6 6-12 4 6" />
  </svg>
);

const IndicatorsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const FullscreenIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);

// =============================================================================
// Constants
// =============================================================================

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];
const EXTRA_TIMEFRAMES: Timeframe[] = ['3m', '30m', '2h', '6h', '12h', '1M'];

// =============================================================================
// Component
// =============================================================================

export const TopBar: React.FC = () => {
  // State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // Unused state for dropdown menu toggle, using CSS hover for now
  // const [isTimeframeMenuOpen, setIsTimeframeMenuOpen] = useState(false);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  
  // Store
  const { symbol, timeframe } = useChartStore(selectSymbolTimeframe);
  const { chartType } = useChartStore(selectChartSettings);
  const isSubscribed = useChartStore(selectIsSubscribed);
  const { setTimeframe, setChartType } = useChartStore();
  
  // Market data
  const { tickers } = useMarketData();
  const ticker = tickers[symbol];
  
  // Computed values
  const price = ticker ? parseFloat(ticker.lastPrice) : 0;
  const change = ticker ? parseFloat(ticker.priceChange) : 0;
  const changePercent = ticker ? parseFloat(ticker.priceChangePercent) : 0;
  const high = ticker ? parseFloat(ticker.highPrice) : 0;
  const low = ticker ? parseFloat(ticker.lowPrice) : 0;
  const volume = ticker ? parseFloat(ticker.quoteVolume) : 0;
  const isUp = changePercent >= 0;
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="h-12 bg-surface border-b border-border flex items-center px-4 justify-between select-none relative z-40">
      {/* Left Section: Symbol, Timeframe */}
      <div className="flex items-center gap-4 h-full">
        
        {/* Symbol Selector */}
        <div className="relative">
          <button
            ref={searchTriggerRef}
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="flex items-center gap-2 hover:bg-accent py-1.5 px-2 rounded transition-colors group"
          >
            <span className="font-bold text-text-primary text-sm group-hover:text-white">
              {symbol}
            </span>
            <div className={`p-0.5 rounded-full ${isUp ? 'bg-success' : 'bg-danger'} text-white text-[9px] font-bold px-1.5`}>
              {changePercent > 0 ? '+' : ''}{changePercent.toFixed(2)}%
            </div>
            <span className="text-text-secondary">
              <ChevronDownIcon />
            </span>
          </button>
          
          {/* Symbol Search Dropdown */}
          <SymbolSearch 
            isOpen={isSearchOpen} 
            onClose={() => setIsSearchOpen(false)}
            triggerRef={searchTriggerRef}
          />
        </div>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        {/* Timeframe Selector */}
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded transition-colors",
                timeframe === tf 
                  ? "text-primary bg-primary/10" 
                  : "text-text-secondary hover:text-text-primary hover:bg-accent"
              )}
            >
              {tf.toUpperCase()}
            </button>
          ))}
          
          {/* More Timeframes Dropdown Trigger */}
          <div className="relative group">
            <button className="px-2 py-1 text-text-secondary hover:text-text-primary rounded transition-colors flex items-center">
              <ChevronDownIcon />
            </button>
            
            {/* Dropdown Menu */}
            <div className="absolute top-full left-0 mt-1 w-32 bg-surface border border-border rounded shadow-xl hidden group-hover:block z-50 py-1">
              {EXTRA_TIMEFRAMES.map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    "w-full text-left px-4 py-2 text-xs hover:bg-accent transition-colors",
                    timeframe === tf ? "text-primary" : "text-text-primary"
                  )}
                >
                  {tf === '1M' ? '1 Month' : tf.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Center Section: Price Info */}
      <div className="flex items-center gap-6">
        {ticker && (
          <PriceDisplay 
            price={price}
            change24h={change}
            changePercent24h={changePercent}
            high24h={high}
            low24h={low}
            volume24h={volume}
          />
        )}
      </div>
      
      {/* Right Section: Controls */}
      <div className="flex items-center gap-3">
        {/* Chart Type */}
        <div className="flex items-center bg-background rounded p-0.5 border border-border">
          <button
            onClick={() => setChartType('candles')}
            className={cn(
              "p-1.5 rounded transition-colors",
              chartType === 'candles' ? "bg-accent text-text-primary" : "text-text-secondary hover:text-text-primary"
            )}
            title="Candlesticks"
          >
            <CandlesIcon />
          </button>
          <button
            onClick={() => setChartType('line')}
            className={cn(
              "p-1.5 rounded transition-colors",
              chartType === 'line' ? "bg-accent text-text-primary" : "text-text-secondary hover:text-text-primary"
            )}
            title="Line Chart"
          >
            <LineIcon />
          </button>
          <button
            onClick={() => setChartType('area')}
            className={cn(
              "p-1.5 rounded transition-colors",
              chartType === 'area' ? "bg-accent text-text-primary" : "text-text-secondary hover:text-text-primary"
            )}
            title="Area Chart"
          >
            <AreaIcon />
          </button>
        </div>
        
        {/* Drawing Tools */}
        <DrawingToolbar />
        
        <div className="w-px h-6 bg-border" />
        
        <button className="text-text-secondary hover:text-text-primary transition-colors" title="Indicators">
          <IndicatorsIcon />
        </button>
        
        <button className="text-text-secondary hover:text-text-primary transition-colors" title="Settings">
          <SettingsIcon />
        </button>
        
        <button onClick={toggleFullscreen} className="text-text-secondary hover:text-text-primary transition-colors" title="Fullscreen">
          <FullscreenIcon />
        </button>
        
        {/* Connection Status Dot */}
        <div 
          className={cn(
            "w-2 h-2 rounded-full",
            isSubscribed ? "bg-success" : "bg-danger"
          )}
          title={isSubscribed ? "Connected" : "Disconnected"}
        />
      </div>
    </div>
  );
};

// Format volume helper removed as it's now handled in PriceDisplay
export default TopBar;
