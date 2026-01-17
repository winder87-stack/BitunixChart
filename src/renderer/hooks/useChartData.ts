/**
 * Chart Data Hook
 * 
 * Manages fetching historical data and handling real-time updates for the chart.
 * Orchestrates the ChartStore and WebSocket connections.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useChartStore } from '../stores/chartStore';
import type { Timeframe, ParsedKline } from '../types/bitunix';

// =============================================================================
// Types
// =============================================================================

interface UseChartDataReturn {
  klines: ParsedKline[];
  isLoading: boolean;
  error: string | null;
  loadMoreHistory: () => Promise<void>;
  refetch: () => Promise<void>;
  isSubscribed: boolean;
}

// =============================================================================
// Hook
// =============================================================================

export function useChartData(symbol: string, timeframe: Timeframe): UseChartDataReturn {
  // Store state
  const klines = useChartStore(state => state.klines);
  const isLoading = useChartStore(state => state.isLoading);
  const error = useChartStore(state => state.error);
  const isSubscribed = useChartStore(state => state.isSubscribed);
  
  // Store actions
  const setSymbolAndTimeframe = useChartStore(state => state.setSymbolAndTimeframe);
  
  // Refs for pagination
  const isLoadingHistoryRef = useRef(false);
  const hasMoreHistoryRef = useRef(true);
  
  // ==========================================================================
  // Lifecycle: Symbol/Timeframe Changes
  // ==========================================================================
  
  useEffect(() => {
    // This triggers the store to fetch initial data and subscribe
    setSymbolAndTimeframe(symbol, timeframe);
    
    // Reset history flags
    hasMoreHistoryRef.current = true;
    isLoadingHistoryRef.current = false;
    
  }, [symbol, timeframe, setSymbolAndTimeframe]);
  
  // ==========================================================================
  // Pagination: Load More History
  // ==========================================================================
  
  const loadMoreHistory = useCallback(async () => {
    if (isLoadingHistoryRef.current || !hasMoreHistoryRef.current || klines.length === 0) {
      return;
    }
    
    isLoadingHistoryRef.current = true;
    
    try {
      // Placeholder for pagination logic
      // const oldestKline = klines[0];
      
      // We need to use the API directly or via IPC
      if (typeof window !== 'undefined' && window.bitunix) {
        // We need a specific method for pagination that accepts endTime
        // The basic getKlines usually gets latest. 
        // Assuming we might need to extend the API service or use a specific param
        
        // Note: The current preload/IPC structure passes 'limit' but maybe not 'endTime'.
        // Let's check api.ts/preload.ts capabilities.
        // For now, I'll assume we can pass an object or query params if I updated the API.
        // But checking `ipc-handlers.ts`, `getKlines` takes (symbol, interval, limit).
        // It doesn't seem to support `endTime`.
        
        // If the API doesn't support pagination yet, we'll mark as no more history
        console.warn('Pagination not fully implemented in IPC backend');
        hasMoreHistoryRef.current = false;
        
        // Placeholder for when backend supports it:
        /*
        const response = await window.bitunix.getKlines(symbol, timeframe, 500, endTime);
        if (response.success && response.data.length > 0) {
           const newKlines = response.data.map(parseKline);
           // Prepend
           setKlines([...newKlines, ...klines]);
        } else {
           hasMoreHistoryRef.current = false;
        }
        */
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      isLoadingHistoryRef.current = false;
    }
  }, [klines]);
  
  // ==========================================================================
  // Manual Refetch
  // ==========================================================================
  
  const refetch = useCallback(async () => {
    // Force re-fetch via store
    setSymbolAndTimeframe(symbol, timeframe);
  }, [symbol, timeframe, setSymbolAndTimeframe]);
  
  return {
    klines,
    isLoading,
    error,
    loadMoreHistory,
    refetch,
    isSubscribed,
  };
}

export default useChartData;
