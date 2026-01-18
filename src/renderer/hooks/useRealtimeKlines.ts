import { useEffect, useRef } from 'react';
import { Timeframe } from '../types/bitunix';
import { NormalizedKline, normalizeKline, isValidKline } from '../utils/klineUtils';
import { createKlineSubscription } from '../services/bitunix/websocket';

const THROTTLE_MS = 250; // Max 4 updates per second

export function useRealtimeKlines(
  symbol: string,
  timeframe: Timeframe,
  onUpdate: (kline: NormalizedKline) => void
) {
  const lastUpdateRef = useRef<number>(0);
  const pendingKlineRef = useRef<NormalizedKline | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastCandleTimeRef = useRef<number>(0);
  const lastPriceRef = useRef<number>(0);
  
  // Store onUpdate in a ref to avoid stale closure issues
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!symbol || !timeframe) return;

    // Reset refs on symbol/timeframe change
    lastUpdateRef.current = 0;
    pendingKlineRef.current = null;
    lastCandleTimeRef.current = 0;
    lastPriceRef.current = 0;
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const processUpdate = () => {
      if (pendingKlineRef.current) {
        onUpdateRef.current(pendingKlineRef.current);
        pendingKlineRef.current = null;
      }
      rafIdRef.current = null;
    };

    const handleWebSocketMessage = (rawKline: unknown) => {
      const kline = normalizeKline(rawKline, false);
      
      console.log('Parsed kline:', {
        time: kline.time,
        timeDate: new Date((kline.time as number) * 1000).toISOString(),
        open: kline.open,
        high: kline.high,
        low: kline.low,
        close: kline.close,
      });

      if (!isValidKline(kline)) {
        console.warn('Invalid kline received:', kline);
        return;
      }
      
      if (kline.close !== lastPriceRef.current) {
        console.log(`PRICE CHANGE: ${lastPriceRef.current} -> ${kline.close}`);
        lastPriceRef.current = kline.close;
      }

      if ((kline.time as number) < lastCandleTimeRef.current) {
        console.error('TIMESTAMP GOING BACKWARDS!', { new: kline.time, last: lastCandleTimeRef.current });
        return; 
      }
      
      if ((kline.time as number) > lastCandleTimeRef.current) {
        lastCandleTimeRef.current = kline.time as number;
      }

      const now = Date.now();
      pendingKlineRef.current = kline;

      if (now - lastUpdateRef.current >= THROTTLE_MS) {
        lastUpdateRef.current = now;

        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(processUpdate);
        }
      }
    };

    console.log(`Subscribing to WS with throttling for ${symbol} ${timeframe}`);
    const cleanup = createKlineSubscription(symbol, timeframe, handleWebSocketMessage);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      cleanup().catch(console.error);
    };
  }, [symbol, timeframe]); // No callback dependencies - using refs instead
}
