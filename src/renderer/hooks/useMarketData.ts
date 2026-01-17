/**
 * Market Data Hook
 * 
 * Fetches and caches symbol list and 24hr ticker data.
 */

import { useState, useEffect, useCallback } from 'react';
// bitunixApi import removed as we use window.bitunix directly
import type { BitunixTicker24h, SymbolInfo } from '../types/bitunix';
import { extractSymbolInfo } from '../types/bitunix';

interface MarketData {
  symbols: SymbolInfo[];
  tickers: Record<string, BitunixTicker24h>;
  isLoading: boolean;
  error: string | null;
}

export function useMarketData() {
  const [data, setData] = useState<MarketData>({
    symbols: [],
    tickers: {},
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    try {
      // Fetch symbols and tickers in parallel
      // Note: In a real app, we might want to use React Query for caching
      // but for now we'll do manual fetching
      
      // We need to use window.bitunix for IPC calls in renderer
      if (typeof window === 'undefined' || !window.bitunix) {
        return;
      }

      const [symbolsResponse, tickersResponse] = await Promise.all([
        window.bitunix.getSymbols(),
        window.bitunix.getAllTickers(),
      ]);

      if (!symbolsResponse.success || !tickersResponse.success) {
        throw new Error('Failed to fetch market data');
      }

      const rawSymbols = symbolsResponse.data as any[];
      const rawTickers = tickersResponse.data as BitunixTicker24h[];

      // Process symbols
      const symbols = rawSymbols.map(extractSymbolInfo);
      
      // Process tickers map
      const tickers: Record<string, BitunixTicker24h> = {};
      rawTickers.forEach(t => {
        tickers[t.symbol] = t;
      });

      setData({
        symbols,
        tickers,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Market data fetch error:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: (error as Error).message,
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Poll for ticker updates every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return data;
}
