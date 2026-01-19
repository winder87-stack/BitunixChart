import { useState, useEffect, useCallback, useRef } from 'react';
import type { ParsedKline, Timeframe, RawKlineArray } from '../types/bitunix';
import { analyzeMTF, getRecommendedMTFTimeframes } from '../services/signals/multiTimeframe';
import type { MTFAnalysis } from '../services/signals/multiTimeframe';

interface UseMTFOptions {
  symbol: string;
  baseTimeframe: Timeframe;
  higherTimeframes?: Timeframe[];
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseMTFResult {
  mtfData: Record<string, ParsedKline[]>;
  analysis: MTFAnalysis | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdate: number | null;
}

function parseToChartFormat(raw: RawKlineArray): ParsedKline {
  return {
    time: Math.floor(raw[0] / 1000),
    open: parseFloat(raw[1]),
    high: parseFloat(raw[2]),
    low: parseFloat(raw[3]),
    close: parseFloat(raw[4]),
    volume: parseFloat(raw[5]),
  };
}

export function useMultiTimeframe(options: UseMTFOptions): UseMTFResult {
  const {
    symbol,
    baseTimeframe,
    higherTimeframes,
    refreshInterval = 60000,
    enabled = true,
  } = options;

  const [mtfData, setMtfData] = useState<Record<string, ParsedKline[]>>({});
  const [analysis, setAnalysis] = useState<MTFAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  const isMountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const timeframesToFetch = higherTimeframes ?? (getRecommendedMTFTimeframes(baseTimeframe) as Timeframe[]);
  const allTimeframes = [baseTimeframe, ...timeframesToFetch];

  const fetchTimeframeData = useCallback(async (tf: Timeframe): Promise<ParsedKline[]> => {
    const response = await window.bitunix.getKlines(symbol, tf, 200);

    if (!response.success || !response.data) {
      throw new Error(response.error ?? `Failed to fetch ${tf} klines`);
    }

    const rawData = response.data as unknown as RawKlineArray[];
    return rawData.map(parseToChartFormat);
  }, [symbol]);

  const refreshAllTimeframes = useCallback(async () => {
    if (!enabled || !isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const results: Record<string, ParsedKline[]> = {};

      const fetchPromises = allTimeframes.map(async (tf) => {
        try {
          results[tf] = await fetchTimeframeData(tf);
        } catch (err) {
          results[tf] = [];
        }
      });

      await Promise.all(fetchPromises);

      if (!isMountedRef.current) return;

      setMtfData(results);

      const hasData = Object.values(results).some(arr => arr.length > 0);
      if (hasData) {
        const mtfAnalysis = analyzeMTF(results);
        setAnalysis(mtfAnalysis);
      }

      setLastUpdate(Date.now());
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch MTF data');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, allTimeframes, fetchTimeframeData]);

  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      refreshAllTimeframes();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [symbol, baseTimeframe, enabled]);

  useEffect(() => {
    if (!enabled) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      refreshAllTimeframes();
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, refreshInterval, refreshAllTimeframes]);

  return {
    mtfData,
    analysis,
    loading,
    error,
    refresh: refreshAllTimeframes,
    lastUpdate,
  };
}

export function useMTFTradeBias(
  symbol: string,
  baseTimeframe: Timeframe
): {
  bias: MTFAnalysis['tradeBias'] | null;
  recommendation: string | null;
  loading: boolean;
} {
  const { analysis, loading } = useMultiTimeframe({
    symbol,
    baseTimeframe,
    refreshInterval: 120000,
  });

  return {
    bias: analysis?.tradeBias ?? null,
    recommendation: analysis?.recommendation ?? null,
    loading,
  };
}
