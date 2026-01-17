/**
 * Symbol Search Component
 * 
 * Searchable dropdown for selecting trading pairs.
 * Supports filtering, favorites, and recent symbols.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useChartStore } from '../../stores/chartStore';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { useMarketData } from '../../hooks/useMarketData';
import { cn } from '../../lib/utils';

// =============================================================================
// Icons
// =============================================================================

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg 
    className={cn("w-3.5 h-3.5 transition-colors", filled ? "text-warning fill-warning" : "text-text-secondary hover:text-text-primary")} 
    fill={filled ? "currentColor" : "none"} 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

// ChevronDownIcon unused in SymbolSearch
// const ChevronDownIcon = () => (
//   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//   </svg>
// );

// =============================================================================
// Types
// =============================================================================

interface SymbolSearchProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

// =============================================================================
// Component
// =============================================================================

export const SymbolSearch: React.FC<SymbolSearchProps> = ({
  isOpen,
  onClose,
  triggerRef,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'USDT' | 'FAV'>('ALL');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { symbol, setSymbol } = useChartStore();
  const { toggleFavorite, isFavorite, addRecent } = useFavoritesStore();
  const { symbols, tickers, isLoading } = useMarketData();

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  // Handle symbol selection
  const handleSelect = (sym: string) => {
    setSymbol(sym);
    addRecent(sym);
    onClose();
  };

  // Filter symbols
  const filteredSymbols = useMemo(() => {
    if (isLoading) return [];

    let filtered = symbols;

    // Filter by category
    if (selectedCategory === 'FAV') {
      filtered = filtered.filter(s => isFavorite(s.symbol));
    } else if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(s => s.quoteAsset === selectedCategory);
    }

    // Filter by search
    if (search.trim()) {
      const term = search.toUpperCase().trim();
      filtered = filtered.filter(s => 
        s.symbol.includes(term) || 
        s.baseAsset.includes(term) || 
        s.quoteAsset.includes(term)
      );
    }

    // Sort: Favorites first, then volume descending
    return filtered.sort((a, b) => {
      const aFav = isFavorite(a.symbol);
      const bFav = isFavorite(b.symbol);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      
      const aVol = parseFloat(tickers[a.symbol]?.quoteVolume || '0');
      const bVol = parseFloat(tickers[b.symbol]?.quoteVolume || '0');
      return bVol - aVol;
    });
  }, [symbols, tickers, search, selectedCategory, isFavorite, isLoading]);

  if (!isOpen) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute top-12 left-4 w-[360px] bg-surface border border-border rounded shadow-xl z-50 flex flex-col max-h-[500px]"
    >
      {/* Search Header */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
            <SearchIcon />
          </div>
          <input
            ref={inputRef}
            type="text"
            className="block w-full pl-10 pr-3 py-2 bg-background border border-border rounded text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary transition-colors"
            placeholder="Search symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {/* Categories */}
        <div className="flex gap-2 mt-3">
          {['ALL', 'USDT', 'FAV'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as 'ALL' | 'USDT' | 'FAV')}
              className={cn(
                "px-3 py-1 text-xs rounded-full transition-colors",
                selectedCategory === cat 
                  ? "bg-primary text-white" 
                  : "bg-border text-text-secondary hover:text-text-primary"
              )}
            >
              {cat === 'FAV' ? 'Favorites' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Header Row */}
      <div className="grid grid-cols-[1.5fr_1fr_1fr_24px] gap-2 px-4 py-2 bg-background text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
        <div>Symbol</div>
        <div className="text-right">Price</div>
        <div className="text-right">Change</div>
        <div></div>
      </div>

      {/* Symbol List */}
      <div className="overflow-y-auto custom-scrollbar flex-1 min-h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-text-secondary text-xs">
            Loading market data...
          </div>
        ) : filteredSymbols.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-secondary text-xs">
            No symbols found
          </div>
        ) : (
          filteredSymbols.map(s => {
            const ticker = tickers[s.symbol];
            const price = ticker ? parseFloat(ticker.lastPrice) : 0;
            const change = ticker ? parseFloat(ticker.priceChangePercent) : 0;
            const isUp = change >= 0;
            
            return (
              <div 
                key={s.symbol}
                className={cn(
                  "grid grid-cols-[1.5fr_1fr_1fr_24px] gap-2 px-4 py-2 hover:bg-accent cursor-pointer transition-colors items-center group",
                  symbol === s.symbol && "bg-accent"
                )}
                onClick={() => handleSelect(s.symbol)}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-text-primary group-hover:text-white">
                    {s.baseAsset}
                    <span className="text-text-secondary text-[10px] ml-1">/{s.quoteAsset}</span>
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    Vol {ticker ? formatVolume(ticker.quoteVolume) : '--'}
                  </span>
                </div>
                
                <div className="text-right text-xs font-mono text-text-primary">
                  {price || '--'}
                </div>
                
                <div className={cn(
                  "text-right text-xs font-mono",
                  isUp ? "text-success" : "text-danger"
                )}>
                  {change > 0 ? '+' : ''}{change.toFixed(2)}%
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(s.symbol);
                    }}
                    className="p-1 rounded hover:bg-border"
                  >
                    <StarIcon filled={isFavorite(s.symbol)} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// Format volume (e.g., 1.2M, 500K)
function formatVolume(val: string): string {
  const v = parseFloat(val);
  if (v >= 1000000) return (v / 1000000).toFixed(2) + 'M';
  if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
  return v.toFixed(0);
}

export default SymbolSearch;
