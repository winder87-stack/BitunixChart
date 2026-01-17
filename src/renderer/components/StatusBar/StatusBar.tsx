import React, { useEffect, useState, useMemo } from 'react';
import { useChartStore, selectIsSubscribed, selectLastUpdate, selectCrosshair, selectKlines } from '../../stores/chartStore';
import { useIndicatorStore, selectIndicatorCount, MAX_INDICATORS } from '../../stores/indicatorStore';
import { cn } from '../../lib/utils';

// Helper to format prices intelligently based on magnitude
const formatPrice = (price: number) => {
  if (price === undefined || price === null) return '--';
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  if (price > 0) return price.toFixed(6);
  return price.toString();
};

// Helper to format time ago
const formatTimeAgo = (timestamp: number) => {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
};

export const StatusBar: React.FC = () => {
  // Store selections
  const isSubscribed = useChartStore(selectIsSubscribed);
  const lastUpdate = useChartStore(selectLastUpdate);
  const crosshair = useChartStore(selectCrosshair);
  const klines = useChartStore(selectKlines);
  const indicatorCount = useIndicatorStore(selectIndicatorCount);

  // Local state for time update
  const [timeAgo, setTimeAgo] = useState<string>('');

  // Update "time ago" every second
  useEffect(() => {
    const updateTime = () => {
      if (!lastUpdate) {
        setTimeAgo('');
        return;
      }
      setTimeAgo(formatTimeAgo(lastUpdate));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  // Find the candle corresponding to the crosshair position
  const activeCandle = useMemo(() => {
    if (!crosshair || !crosshair.time || klines.length === 0) return null;
    // Find candle matching the crosshair time
    // Note: klines are sorted, so we could optimize, but find is sufficient for typical array sizes (<2000)
    return klines.find(k => k.time === crosshair.time);
  }, [crosshair, klines]);

  // Determine colors for OHLC values based on candle direction
  const isUp = activeCandle ? activeCandle.close >= activeCandle.open : true;
  const valueColor = isUp ? "text-[#26a69a]" : "text-[#ef5350]";

  return (
    <div className="h-7 w-full bg-[#1a1e2e] border-t border-[#2a2e39] flex items-center justify-between px-3 text-[11px] text-[#787b86] select-none font-medium overflow-hidden">
      
      {/* Left Section: Connection Status & Update Time */}
      <div className="flex items-center gap-4 min-w-[200px]">
        {/* Connection Status */}
        <div className="flex items-center gap-1.5">
          <div className={cn("w-2 h-2 rounded-full transition-colors duration-300", isSubscribed ? "bg-[#26a69a]" : "bg-[#ef5350]")} />
          <span className={cn("transition-colors duration-300", isSubscribed ? "text-[#26a69a]" : "text-[#ef5350]")}>
            {isSubscribed ? "Connected" : "Disconnected"}
          </span>
        </div>
        
        {/* Last Update Time */}
        {lastUpdate > 0 && (
          <div className="flex items-center gap-1">
            <span>Last update:</span>
            <span className="text-[#d1d4dc] min-w-[40px]">{timeAgo}</span>
          </div>
        )}
      </div>

      {/* Center Section: Crosshair OHLC Info */}
      <div className="flex items-center justify-center flex-1 gap-4 font-mono">
        {activeCandle ? (
          <>
            <div className="flex gap-1">
              <span>O:</span>
              <span className={valueColor}>{formatPrice(activeCandle.open)}</span>
            </div>
            <div className="flex gap-1">
              <span>H:</span>
              <span className={valueColor}>{formatPrice(activeCandle.high)}</span>
            </div>
            <div className="flex gap-1">
              <span>L:</span>
              <span className={valueColor}>{formatPrice(activeCandle.low)}</span>
            </div>
            <div className="flex gap-1">
              <span>C:</span>
              <span className={valueColor}>{formatPrice(activeCandle.close)}</span>
            </div>
          </>
        ) : (
          /* Empty space to maintain layout when no crosshair */
          <div className="opacity-0">
             <span>O: 00000.00</span>
          </div>
        )}
      </div>

      {/* Right Section: System Stats */}
      <div className="flex items-center gap-4 min-w-[200px] justify-end">
        {/* Indicators Count */}
        <div className="flex items-center gap-1">
           <span className="text-[#d1d4dc]">{indicatorCount}</span>
           <span>/</span>
           <span>{MAX_INDICATORS} indicators</span>
        </div>
        
        {/* Candles Loaded */}
        <div className="flex items-center gap-1">
           <span className="text-[#d1d4dc]">{klines.length}</span>
           <span>candles</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
