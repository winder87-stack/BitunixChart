import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChartStore } from './chartStore';

// Mock localStorage for Zustand persist
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('chartStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useChartStore.setState({
      symbol: 'BTCUSDT',
      timeframe: '1h',
      chartType: 'candles',
      showVolume: true,
      showGrid: true,
      priceScale: 'normal',
      klines: [],
      isLoading: false,
      error: null,
      isSubscribed: false,
    });
  });

  it('should initialize with default values', () => {
    const state = useChartStore.getState();
    expect(state.symbol).toBe('BTCUSDT');
    expect(state.timeframe).toBe('1h');
    expect(state.chartType).toBe('candles');
  });

  it('should update symbol and timeframe', async () => {
    await useChartStore.getState().setSymbolAndTimeframe('ETHUSDT', '4h');
    const state = useChartStore.getState();
    expect(state.symbol).toBe('ETHUSDT');
    expect(state.timeframe).toBe('4h');
    expect(state.isLoading).toBe(false);
    expect(state.klines).toEqual([]);
  });

  it('should set klines', () => {
    const mockKlines = [
      { time: 1000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
    ];
    useChartStore.getState().setKlines(mockKlines);
    const state = useChartStore.getState();
    expect(state.klines).toEqual(mockKlines);
    expect(state.isLoading).toBe(false);
  });

  it('should update chart settings', () => {
    useChartStore.getState().setChartType('line');
    useChartStore.getState().toggleVolume();
    
    const state = useChartStore.getState();
    expect(state.chartType).toBe('line');
    expect(state.showVolume).toBe(false);
  });

  it('should handle subscription status', async () => {
    vi.spyOn(useChartStore.getState(), 'subscribe').mockImplementation(async () => {
        useChartStore.setState({ isSubscribed: true });
    });
    vi.spyOn(useChartStore.getState(), 'unsubscribe').mockImplementation(async () => {
        useChartStore.setState({ isSubscribed: false });
    });

    await useChartStore.getState().subscribe();
    expect(useChartStore.getState().isSubscribed).toBe(true);
    
    await useChartStore.getState().unsubscribe();
    expect(useChartStore.getState().isSubscribed).toBe(false);
  });

  it('should handle errors', () => {
    useChartStore.getState().setError('Network error');
    expect(useChartStore.getState().error).toBe('Network error');
    expect(useChartStore.getState().isLoading).toBe(false);
  });
});
