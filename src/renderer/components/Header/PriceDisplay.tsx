/**
 * Price Display Component
 * 
 * Shows real-time price with flash animations and 24hr statistics.
 */

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

// =============================================================================
// Types
// =============================================================================

interface PriceDisplayProps {
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatPrice(price: number): string {
  if (!price && price !== 0) return '--';
  
  // Determine precision based on price magnitude
  let decimals = 2;
  if (price < 0.00001) decimals = 8;
  else if (price < 0.001) decimals = 6;
  else if (price < 1) decimals = 4;
  else if (price < 10) decimals = 3;
  else if (price < 1000) decimals = 2;
  else decimals = 2;

  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatVolume(volume: number): string {
  if (!volume && volume !== 0) return '--';
  
  if (volume >= 1_000_000_000) return (volume / 1_000_000_000).toFixed(2) + 'B';
  if (volume >= 1_000_000) return (volume / 1_000_000).toFixed(2) + 'M';
  if (volume >= 1_000) return (volume / 1_000).toFixed(2) + 'K';
  
  return volume.toFixed(2);
}

function formatPercent(percent: number): string {
  if (!percent && percent !== 0) return '--%';
  return `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`;
}

// =============================================================================
// Component
// =============================================================================

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  change24h,
  changePercent24h,
  high24h,
  low24h,
  volume24h,
  className,
}) => {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef(price);
  
  // Handle price flash animation
  useEffect(() => {
    if (price === prevPriceRef.current) return;
    
    if (price > prevPriceRef.current) {
      setFlash('up');
    } else if (price < prevPriceRef.current) {
      setFlash('down');
    }
    
    prevPriceRef.current = price;
    
    const timer = setTimeout(() => {
      setFlash(null);
    }, 600); // 600ms flash duration
    
    return () => clearTimeout(timer);
  }, [price]);

  const isPositive = changePercent24h >= 0;
  const colorClass = isPositive ? 'text-[#22c55e]' : 'text-[#ef4444]';
  const flashClass = flash === 'up' 
    ? 'text-[#22c55e] bg-[#22c55e]/10 transition-colors duration-300' 
    : flash === 'down'
      ? 'text-[#ef4444] bg-[#ef4444]/10 transition-colors duration-300'
      : '';

  return (
    <div className={cn("flex flex-col justify-center", className)}>
      {/* Price and Change Row */}
      <div className="flex items-baseline gap-3">
        {/* Current Price */}
        <div 
          className={cn(
            "text-lg font-mono font-bold px-1.5 rounded transition-all duration-300",
            flash ? flashClass : colorClass
          )}
        >
          {formatPrice(price)}
        </div>
        
        {/* 24h Change */}
        <div className={cn("flex items-center text-xs font-medium", colorClass)}>
          <span className="mr-1">
            {formatPrice(change24h)}
          </span>
          <span className="opacity-80">
            ({formatPercent(changePercent24h)})
          </span>
        </div>
      </div>
      
      {/* Stats Row */}
      <div className="hidden md:flex items-center gap-3 text-[10px] text-[#787b86] font-medium mt-0.5">
        <div className="flex items-center gap-1">
          <span>H:</span>
          <span className="text-[#d1d4dc]">{formatPrice(high24h)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>L:</span>
          <span className="text-[#d1d4dc]">{formatPrice(low24h)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Vol:</span>
          <span className="text-[#d1d4dc]">{formatVolume(volume24h)}</span>
        </div>
      </div>
    </div>
  );
};

export default PriceDisplay;
