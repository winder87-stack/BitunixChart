/**
 * ChartContainer
 * 
 * Primary chart component that orchestrates:
 * - Main candlestick/line/area chart with overlay indicators
 * - Separate indicator panes (RSI, MACD, etc.)
 * - Volume histogram
 * - Synced crosshair across all panes
 * - Responsive resizing
 * 
 * Uses lightweight-charts for high-performance rendering.
 */

import React, {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  HistogramData,
  ColorType,
  CrosshairMode,
  LineStyle,
  PriceScaleMode,
  Time,
} from 'lightweight-charts';

import { useChartStore, selectKlines, selectShowVolume } from '../../stores/chartStore';
import { useIndicatorStore, selectVisibleOverlayIndicators, selectVisibleSeparateIndicators } from '../../stores/indicatorStore';
import { getIndicatorDefinition } from '../../services/indicators/definitions';
import { normalizeKline, NormalizedKline } from '../../utils/klineUtils';
import { useRealtimeKlines } from '../../hooks/useRealtimeKlines';
import { DrawingOverlay } from './DrawingOverlay';

// =============================================================================
// Types
// =============================================================================

interface ChartContainerProps {
  className?: string;
  height?: number;
  onReady?: () => void;
}

interface IndicatorSeries {
  indicatorId: string;
  outputKey: string;
  series: ISeriesApi<'Line'> | ISeriesApi<'Histogram'>;
}

interface SeparatePane {
  indicatorId: string;
  type: string;
  chart: IChartApi;
  series: Map<string, ISeriesApi<'Line'> | ISeriesApi<'Histogram'>>;
  container: HTMLDivElement;
  height: number;
}

// =============================================================================
// Theme Configuration
// =============================================================================

const CHART_COLORS = {
  background: '#131722',
  backgroundSecondary: '#1e222d',
  text: '#d1d4dc',
  textSecondary: '#787b86',
  grid: '#2a2e39',
  border: '#2a2e39',
  crosshair: '#758696',
  upColor: '#26a69a',
  downColor: '#ef5350',
  volumeUp: 'rgba(38, 166, 154, 0.5)',
  volumeDown: 'rgba(239, 83, 80, 0.5)',
};

const CHART_OPTIONS = {
  layout: {
    background: { type: ColorType.Solid, color: CHART_COLORS.background },
    textColor: CHART_COLORS.text,
    fontSize: 12,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  grid: {
    vertLines: { color: CHART_COLORS.grid, style: LineStyle.Solid },
    horzLines: { color: CHART_COLORS.grid, style: LineStyle.Solid },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: {
      color: CHART_COLORS.crosshair,
      width: 1 as const,
      style: LineStyle.Dashed,
      labelBackgroundColor: CHART_COLORS.backgroundSecondary,
    },
    horzLine: {
      color: CHART_COLORS.crosshair,
      width: 1 as const,
      style: LineStyle.Dashed,
      labelBackgroundColor: CHART_COLORS.backgroundSecondary,
    },
  },
  rightPriceScale: {
    borderColor: CHART_COLORS.border,
    scaleMargins: { top: 0.1, bottom: 0.2 },
  },
  timeScale: {
    borderColor: CHART_COLORS.border,
    timeVisible: true,
    secondsVisible: false,
    rightOffset: 5,
    barSpacing: 8,
    minBarSpacing: 2,
  },
  handleScroll: {
    mouseWheel: true,
    pressedMouseMove: true,
    horzTouchDrag: true,
    vertTouchDrag: true,
  },
  handleScale: {
    axisPressedMouseMove: true,
    mouseWheel: true,
    pinch: true,
  },
};

// =============================================================================
// Pane Configuration
// =============================================================================

// Pane height is adjustable - minimum threshold
const DEFAULT_PANE_HEIGHT = 120;
const VOLUME_PANE_HEIGHT = 80;

// =============================================================================
// Component
// =============================================================================

export const ChartContainer: React.FC<ChartContainerProps> = ({
  className = '',
  height: containerHeight,
  onReady,
}) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const mainChartRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const overlaySeriesRef = useRef<Map<string, IndicatorSeries>>(new Map());
  const separatePanesRef = useRef<Map<string, SeparatePane>>(new Map());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  
  // Local state
  const [isInitialized, setIsInitialized] = useState(false);
  const [mainChartHeight, setMainChartHeight] = useState(400);
  const lastCandleTimeRef = useRef<number>(0);
  const hasInitialFitRef = useRef(false);
  const dataLoadedForRef = useRef<string | null>(null);
  const updateCountRef = useRef(0);
  const lastUpdateTimeRef = useRef(Date.now());
  
  // Store subscriptions
  const klines = useChartStore(selectKlines);
  const symbol = useChartStore(state => state.symbol);
  const timeframe = useChartStore(state => state.timeframe);
  const chartType = useChartStore(state => state.chartType);
  const priceScale = useChartStore(state => state.priceScale);
  const showGrid = useChartStore(state => state.showGrid);
  const showVolume = useChartStore(selectShowVolume);
  const setCrosshair = useChartStore(state => state.setCrosshair);
  
  const overlayIndicators = useIndicatorStore(selectVisibleOverlayIndicators);
  const separateIndicators = useIndicatorStore(selectVisibleSeparateIndicators);
  const indicatorResults = useIndicatorStore(state => state.indicatorResults);
  
  // ==========================================================================
  // Chart Initialization
  // ==========================================================================
  
  const initializeChart = useCallback(() => {
    if (!mainChartRef.current || chartRef.current) return;
    
    console.log('Initializing main chart...');
    
    const chart = createChart(mainChartRef.current, {
      ...CHART_OPTIONS,
      width: mainChartRef.current.clientWidth,
      height: 400,
    });
    
    chartRef.current = chart;
    
    // Create candlestick series (default)
    const candleSeries = chart.addCandlestickSeries({
      upColor: CHART_COLORS.upColor,
      downColor: CHART_COLORS.downColor,
      borderUpColor: CHART_COLORS.upColor,
      borderDownColor: CHART_COLORS.downColor,
      wickUpColor: CHART_COLORS.upColor,
      wickDownColor: CHART_COLORS.downColor,
    });

    candleSeriesRef.current = candleSeries;
    
    // Create line series (hidden by default)
    const lineSeries = chart.addLineSeries({
      color: CHART_COLORS.upColor,
      lineWidth: 2,
      visible: false,
    });
    lineSeriesRef.current = lineSeries;
    
    // Create area series (hidden by default)
    const areaSeries = chart.addAreaSeries({
      topColor: 'rgba(34, 197, 94, 0.4)',
      bottomColor: 'rgba(34, 197, 94, 0.0)',
      lineColor: CHART_COLORS.upColor,
      lineWidth: 2,
      visible: false,
    });
    areaSeriesRef.current = areaSeries;
    
    // Create volume series
    const volumeSeries = chart.addHistogramSeries({
      color: CHART_COLORS.volumeUp,
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    
    volumeSeriesRef.current = volumeSeries;
    
    // Set up crosshair handler
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setCrosshair(null);
        return;
      }
      
      const price = param.seriesData.get(candleSeries);
      if (price && 'close' in price) {
        setCrosshair({
          time: param.time as number,
          price: price.close,
          x: param.point.x,
          y: param.point.y,
        });
      }
    });
    
    // Double-click to reset view
    const handleDblClick = () => {
      chart.timeScale().fitContent();
    };

    mainChartRef.current.addEventListener('dblclick', handleDblClick);
    
    setIsInitialized(true);
    onReady?.();
    
    console.log('Main chart initialized');
    
    return () => {
      chart.remove();
      mainChartRef.current?.removeEventListener('dblclick', handleDblClick);
      chartRef.current = null;
      candleSeriesRef.current = null;
      lineSeriesRef.current = null;
      areaSeriesRef.current = null;
      volumeSeriesRef.current = null;
      resizeObserverRef.current?.disconnect();
    };
  }, [onReady, setCrosshair]);
  
  // ==========================================================================
  // Update Chart Type
  // ==========================================================================
  
  const updateChartType = useCallback(() => {
    if (!candleSeriesRef.current || !lineSeriesRef.current || !areaSeriesRef.current) return;
    
    candleSeriesRef.current.applyOptions({ visible: chartType === 'candles' });
    lineSeriesRef.current.applyOptions({ visible: chartType === 'line' });
    areaSeriesRef.current.applyOptions({ visible: chartType === 'area' });
  }, [chartType]);
  
  // ==========================================================================
  // Update Price Scale
  // ==========================================================================
  
  const updatePriceScale = useCallback(() => {
    if (!chartRef.current) return;
    
    const scaleMode = priceScale === 'log' 
      ? PriceScaleMode.Logarithmic 
      : priceScale === 'percentage'
        ? PriceScaleMode.Percentage
        : PriceScaleMode.Normal;
    
    chartRef.current.priceScale('right').applyOptions({ mode: scaleMode });
  }, [priceScale]);
  
  // ==========================================================================
  // Update Grid
  // ==========================================================================
  
  const updateGrid = useCallback(() => {
    if (!chartRef.current) return;
    
    chartRef.current.applyOptions({
      grid: {
        vertLines: { visible: showGrid, color: CHART_COLORS.grid },
        horzLines: { visible: showGrid, color: CHART_COLORS.grid },
      },
    });
  }, [showGrid]);
  
  // ==========================================================================
  // Update Volume Visibility
  // ==========================================================================
  
  const updateVolumeVisibility = useCallback(() => {
    if (!volumeSeriesRef.current) return;
    volumeSeriesRef.current.applyOptions({ visible: showVolume });
  }, [showVolume]);
  
  useEffect(() => {
    if (!isInitialized || !candleSeriesRef.current || klines.length === 0) return;
    
    // Prevent redundant setData calls
    const key = `${symbol}-${timeframe}-${klines[0].time}`;
    if (dataLoadedForRef.current === key) return;
    
    const normalizedData = klines.map(k => normalizeKline(k, false));
    
    const candleData: CandlestickData[] = normalizedData.map(k => ({
      time: k.time as Time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    }));
    
    const lineData: LineData[] = normalizedData.map(k => ({
      time: k.time as Time,
      value: k.close,
    }));
    
    const volumeData: HistogramData[] = normalizedData.map(k => ({
      time: k.time as Time,
      value: k.volume || 0,
      color: k.close >= k.open ? CHART_COLORS.volumeUp : CHART_COLORS.volumeDown,
    }));
    
    candleSeriesRef.current?.setData(candleData);
    lineSeriesRef.current?.setData(lineData);
    areaSeriesRef.current?.setData(lineData);
    volumeSeriesRef.current?.setData(volumeData);
    
    // Detect if this is a new symbol/timeframe (not just initial load)
    const isNewData = dataLoadedForRef.current !== null && 
      !dataLoadedForRef.current.startsWith(`${symbol}-${timeframe}-`);
    
    console.log('Price scale reset check:', { 
      isNewData, 
      hasInitialFit: hasInitialFitRef.current,
      prevKey: dataLoadedForRef.current,
      newKey: key 
    });
    
    if (!hasInitialFitRef.current || isNewData) {
      hasInitialFitRef.current = true;
      
      // Fit time scale
      chartRef.current?.timeScale().fitContent();
      
      // Force price scale to recalculate by toggling autoScale
      if (candleSeriesRef.current) {
        const priceScale = candleSeriesRef.current.priceScale();
        priceScale.applyOptions({ autoScale: false });
        setTimeout(() => {
          priceScale.applyOptions({ autoScale: true });
          chartRef.current?.timeScale().fitContent();
        }, 50);
      }
      
      console.log('Price scale reset triggered for', symbol);
    }
    
    dataLoadedForRef.current = key;
    console.log('Data loaded:', normalizedData.length, 'candles for', symbol, timeframe);
  }, [isInitialized, klines.length === 0 ? 0 : klines[0].time, symbol, timeframe]);
  
  // Expose debug state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__CHART_DEBUG__ = {
        getCandles: () => klines,
        getSeries: () => candleSeriesRef.current,
        getLastCandle: () => klines[klines.length - 1],
        getCandleCount: () => klines.length,
        isInitialized: () => isInitialized,
        triggerUpdate: (candle: NormalizedKline) => {
          if (candleSeriesRef.current) {
            const time = candle.time as Time;
            candleSeriesRef.current.update({
              time,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
            });
          }
        },
        forceSetData: () => {
          if (candleSeriesRef.current && klines.length > 0) {
            const normalizedData = klines.map(k => normalizeKline(k, false));
            const candleData: CandlestickData[] = normalizedData.map(k => ({
              time: k.time as Time,
              open: k.open,
              high: k.high,
              low: k.low,
              close: k.close,
            }));
            candleSeriesRef.current.setData(candleData);
            console.log('Force setData called');
          }
        }
      };
    }
  }, [isInitialized, klines]);
  
  const debugUpdate = useCallback((series: ISeriesApi<any>, data: any) => {
    updateCountRef.current++;
    const now = Date.now();
    const delta = now - lastUpdateTimeRef.current;
    lastUpdateTimeRef.current = now;
    
    console.log(`Update #${updateCountRef.current} (+${delta}ms):`, {
      time: data.time,
      type: typeof data.open,
      o: data.open,
      h: data.high,
      l: data.low,
      c: data.close,
    });
    
    if (typeof data.open === 'string') console.error('OPEN IS STRING!');
    if (data.high < data.low) console.error('HIGH < LOW!');
    if (data.time < 1600000000) console.error('TIME TOO SMALL - needs to be in seconds!');
    
    series.update(data);
  }, []);

  const handleRealtimeUpdate = useCallback((kline: NormalizedKline) => {
    if (!candleSeriesRef.current) return;
    
    const time = kline.time as Time;
    
    const candlePoint: CandlestickData = {
      time,
      open: kline.open,
      high: kline.high,
      low: kline.low,
      close: kline.close,
    };
    
    const linePoint: LineData = {
      time,
      value: kline.close,
    };
    
    const volumePoint: HistogramData = {
      time,
      value: kline.volume || 0,
      color: kline.close >= kline.open ? CHART_COLORS.volumeUp : CHART_COLORS.volumeDown,
    };
    
    if (candleSeriesRef.current) debugUpdate(candleSeriesRef.current, candlePoint);
    if (lineSeriesRef.current) debugUpdate(lineSeriesRef.current, linePoint);
    if (areaSeriesRef.current) debugUpdate(areaSeriesRef.current, linePoint);
    if (volumeSeriesRef.current) debugUpdate(volumeSeriesRef.current, volumePoint);
  }, [debugUpdate]);

  useRealtimeKlines(symbol, timeframe, handleRealtimeUpdate);
  
  // ==========================================================================
  // Update Overlay Indicators
  // ==========================================================================
  
  const updateOverlayIndicators = useCallback(() => {
    if (!chartRef.current || !isInitialized) return;
    
    const chart = chartRef.current;
    const currentSeries = overlaySeriesRef.current;
    const activeIds = new Set(overlayIndicators.map(ind => ind.id));
    
    // Remove series for indicators no longer active
    currentSeries.forEach((seriesInfo, key) => {
      if (!activeIds.has(seriesInfo.indicatorId)) {
        chart.removeSeries(seriesInfo.series);
        currentSeries.delete(key);
      }
    });
    
    // Add/update series for active indicators
    for (const indicator of overlayIndicators) {
      const results = indicatorResults[indicator.id];
      if (!results || results.length === 0) continue;
      
      const definition = getIndicatorDefinition(indicator.type);
      if (!definition) continue;
      
      // Get output definitions
      const outputs = definition.outputDefinitions || 
        definition.outputs.map(key => ({ key, name: key, type: 'line' as const, color: indicator.style.color }));
      
      for (const output of outputs) {
        const seriesKey = `${indicator.id}:${output.key}`;
        let seriesInfo = currentSeries.get(seriesKey);
        
        // Create series if it doesn't exist
        if (!seriesInfo) {
          const color = output.color || indicator.style.color;
          const lineWidth = ('lineWidth' in output ? output.lineWidth : undefined) || indicator.style.lineWidth || 2;
          
          if (output.type === 'dots') {
            // PSAR dots - use line series with circle markers
            const series = chart.addLineSeries({
              color,
              lineWidth: 1 as const,
              lastValueVisible: false,
              priceLineVisible: false,
              crosshairMarkerVisible: true,
              crosshairMarkerRadius: 4,
            });
            seriesInfo = { indicatorId: indicator.id, outputKey: output.key, series };
          } else if (output.type === 'band' || output.type === 'cloud') {
            // Bands/clouds - use line series with transparency
            const series = chart.addLineSeries({
              color,
              lineWidth: (lineWidth || 1) as 1 | 2 | 3 | 4,
              lastValueVisible: false,
              priceLineVisible: false,
            });
            seriesInfo = { indicatorId: indicator.id, outputKey: output.key, series };
          } else {
            // Default: line series
            const series = chart.addLineSeries({
              color,
              lineWidth: (lineWidth || 2) as 1 | 2 | 3 | 4,
              lastValueVisible: true,
              priceLineVisible: false,
            });
            seriesInfo = { indicatorId: indicator.id, outputKey: output.key, series };
          }
          
          currentSeries.set(seriesKey, seriesInfo);
        }
        
        // Update series data
        const lineData: LineData[] = results
          .filter(r => r.values[output.key] !== null && r.values[output.key] !== undefined)
          .map(r => ({
            time: r.time as Time,
            value: r.values[output.key] as number,
          }));
        
        (seriesInfo.series as ISeriesApi<'Line'>).setData(lineData);
      }
    }
  }, [isInitialized, overlayIndicators, indicatorResults]);
  
  // ==========================================================================
  // Recalculate Pane Heights
  // ==========================================================================
  
  const recalculateHeights = useCallback(() => {
    if (!containerRef.current) return;
    
    const totalHeight = containerRef.current.clientHeight;
    const numPanes = separatePanesRef.current.size;
    const volumeHeight = showVolume ? VOLUME_PANE_HEIGHT : 0;
    const paneHeightsTotal = numPanes * DEFAULT_PANE_HEIGHT;
    
    // Calculate main chart height
    const newMainHeight = Math.max(
      200,
      totalHeight - paneHeightsTotal - volumeHeight - 20
    );
    
    setMainChartHeight(newMainHeight);
    
    if (chartRef.current) {
      chartRef.current.applyOptions({ height: newMainHeight });
    }
  }, [showVolume]);

  // ==========================================================================
  // Update Separate Indicator Panes
  // ==========================================================================
  
  const updateSeparatePanes = useCallback(() => {
    if (!containerRef.current || !isInitialized) return;
    
    const currentPanes = separatePanesRef.current;
    const activeIds = new Set(separateIndicators.map(ind => ind.id));
    
    // Remove panes for indicators no longer active
    currentPanes.forEach((pane, id) => {
      if (!activeIds.has(id)) {
        pane.chart.remove();
        pane.container.remove();
        currentPanes.delete(id);
      }
    });
    
    // Add/update panes for active indicators
    for (const indicator of separateIndicators) {
      const results = indicatorResults[indicator.id];
      if (!results || results.length === 0) continue;
      
      const definition = getIndicatorDefinition(indicator.type);
      if (!definition) continue;
      
      let pane = currentPanes.get(indicator.id);
      
      // Create pane if it doesn't exist
      if (!pane) {
        const paneContainer = document.createElement('div');
        paneContainer.className = 'indicator-pane';
        paneContainer.style.height = `${DEFAULT_PANE_HEIGHT}px`;
        paneContainer.style.borderTop = `1px solid ${CHART_COLORS.border}`;
        containerRef.current.appendChild(paneContainer);
        
        const paneChart = createChart(paneContainer, {
          ...CHART_OPTIONS,
          width: paneContainer.clientWidth,
          height: DEFAULT_PANE_HEIGHT,
          rightPriceScale: {
            ...CHART_OPTIONS.rightPriceScale,
            scaleMargins: { top: 0.1, bottom: 0.1 },
          },
          timeScale: {
            ...CHART_OPTIONS.timeScale,
            visible: false, // Hide time scale on sub-panes
          },
        });
        
        // Sync time scale with main chart
        if (chartRef.current) {
          const mainTimeScale = chartRef.current.timeScale();
          
          paneChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range) {
              mainTimeScale.setVisibleLogicalRange(range);
            }
          });
          
          mainTimeScale.subscribeVisibleLogicalRangeChange((range) => {
            if (range) {
              paneChart.timeScale().setVisibleLogicalRange(range);
            }
          });
        }
        
        pane = {
          indicatorId: indicator.id,
          type: indicator.type,
          chart: paneChart,
          series: new Map(),
          container: paneContainer,
          height: DEFAULT_PANE_HEIGHT,
        };
        
        currentPanes.set(indicator.id, pane);
      }
      
      // Get output definitions
      const outputs = definition.outputDefinitions || 
        definition.outputs.map(key => ({ key, name: key, type: 'line' as const, color: indicator.style.color }));
      
      // Add/update series for each output
      for (const output of outputs) {
        let series = pane.series.get(output.key);
        const lineWidth = ('lineWidth' in output ? output.lineWidth : undefined) || indicator.style.lineWidth || 2;
        
        if (!series) {
          const color = output.color || indicator.style.color;
          
          if (output.type === 'histogram') {
            series = pane.chart.addHistogramSeries({
              color,
              priceFormat: { type: 'price', precision: 2 },
              lastValueVisible: true,
            });
          } else {
            series = pane.chart.addLineSeries({
              color,
              lineWidth: (lineWidth || 2) as 1 | 2 | 3 | 4,
              lastValueVisible: true,
              priceLineVisible: false,
            });
          }
          
          pane.series.set(output.key, series);
        }
        
        // Update series data
        const data = results
          .filter(r => r.values[output.key] !== null && r.values[output.key] !== undefined)
          .map(r => ({
            time: r.time as Time,
            value: r.values[output.key] as number,
            ...(output.type === 'histogram' ? {
              color: (r.values[output.key] as number) >= 0 
                ? CHART_COLORS.upColor 
                : CHART_COLORS.downColor,
            } : {}),
          }));
        
        if (output.type === 'histogram') {
          (series as ISeriesApi<'Histogram'>).setData(data as HistogramData[]);
        } else {
          (series as ISeriesApi<'Line'>).setData(data as LineData[]);
        }
      }
      
      // Add reference lines for oscillators (overbought/oversold)
      if (indicator.params.overbought !== undefined) {
        // TODO: Add horizontal price lines
      }
    }
    
    // Recalculate heights
    recalculateHeights();
  }, [isInitialized, separateIndicators, indicatorResults, recalculateHeights]);
  
  // ==========================================================================
  // Handle Resize
  // ==========================================================================
  
  const handleResize = useCallback(() => {
    if (!containerRef.current) return;
    
    const width = containerRef.current.clientWidth;
    
    // Resize main chart
    if (chartRef.current) {
      chartRef.current.applyOptions({ width });
    }
    
    // Resize separate panes
    separatePanesRef.current.forEach(pane => {
      pane.chart.applyOptions({ width });
    });
    
    recalculateHeights();
  }, [recalculateHeights]);
  
  // ==========================================================================
  // Effects
  // ==========================================================================
  
  // Initialize chart
  useEffect(() => {
    initializeChart();
    
    const separatePanes = separatePanesRef.current;
    const overlaySeries = overlaySeriesRef.current;
    
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      
      separatePanes.forEach(pane => {
        pane.chart.remove();
        pane.container.remove();
      });
      separatePanes.clear();
      overlaySeries.clear();
    };
  }, [initializeChart]);
  
  // Set up resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    
    resizeObserverRef.current = new ResizeObserver(handleResize);
    resizeObserverRef.current.observe(containerRef.current);
    
    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [handleResize]);
  
  // Update chart type
  useEffect(() => {
    updateChartType();
  }, [updateChartType]);
  
  // Update price scale
  useEffect(() => {
    updatePriceScale();
  }, [updatePriceScale]);
  
  // Update grid
  useEffect(() => {
    updateGrid();
  }, [updateGrid]);
  
  // Update volume visibility
  useEffect(() => {
    updateVolumeVisibility();
  }, [updateVolumeVisibility]);
  
  // Reset tracking refs when klines are cleared (symbol/timeframe change)
  useEffect(() => {
    if (klines.length === 0) {
      lastCandleTimeRef.current = 0;
      hasInitialFitRef.current = false;
    }
  }, [klines.length]);
  
  // Update overlay indicators
  useEffect(() => {
    updateOverlayIndicators();
  }, [updateOverlayIndicators]);
  
  // Update separate panes
  useEffect(() => {
    updateSeparatePanes();
  }, [updateSeparatePanes]);
  
  // ==========================================================================
  // Render
  // ==========================================================================
  
  const containerStyle = useMemo(() => ({
    height: containerHeight ? `${containerHeight}px` : '100%',
  }), [containerHeight]);
  
  return (
    <div
      ref={containerRef}
      className={`chart-container relative flex flex-col bg-background ${className}`}
      style={containerStyle}
    >
      {/* Main Chart */}
      <div
        ref={mainChartRef}
        className="main-chart flex-shrink-0 relative"
        style={{ height: `${mainChartHeight}px` }}
      >
        {/* Drawing Overlay */}
        {isInitialized && (
          <DrawingOverlay
            chart={chartRef.current}
            series={candleSeriesRef.current}
            containerRef={mainChartRef}
          />
        )}
      </div>
      
      {/* Separate indicator panes are added dynamically via DOM */}
      
      {/* Loading overlay */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-text-secondary text-sm">Loading chart...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartContainer;
