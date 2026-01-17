/**
 * ChartCanvas
 * 
 * A reusable component for rendering a single lightweight-charts instance.
 * Handles chart lifecycle, series management, crosshair sync, and theming.
 * 
 * Features:
 * - Dynamic series management
 * - Crosshair synchronization across multiple charts
 * - Responsive resize handling
 * - External control via ref methods
 * - Dark theme optimized for trading
 */

import {
  forwardRef,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  useMemo,
} from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  DeepPartial,
  ChartOptions,
  CandlestickData,
  LineData,
  HistogramData,
  AreaData,
  ColorType,
  CrosshairMode,
  LineStyle,
  PriceScaleMode,
  Time,
  MouseEventParams,
  LogicalRange,
  SeriesType,
  LineWidth,
} from 'lightweight-charts';

// =============================================================================
// Types
// =============================================================================

/** Supported series types */
export type ChartSeriesType = 'candlestick' | 'line' | 'histogram' | 'area' | 'bar';

/** Generic series data types */
export type SeriesData = CandlestickData | LineData | HistogramData | AreaData;

/** Configuration for a single series */
export interface SeriesConfig {
  /** Unique identifier for the series */
  id: string;
  
  /** Series type */
  type: ChartSeriesType;
  
  /** Series data */
  data: SeriesData[];
  
  /** Series-specific options */
  options?: SeriesOptions;
  
  /** Price scale ID (for multiple scales) */
  priceScaleId?: string;
  
  /** Whether series is visible */
  visible?: boolean;
}

/** Series styling options */
export interface SeriesOptions {
  // Common
  color?: string;
  lineWidth?: LineWidth;
  priceLineVisible?: boolean;
  lastValueVisible?: boolean;
  
  // Candlestick specific
  upColor?: string;
  downColor?: string;
  borderUpColor?: string;
  borderDownColor?: string;
  wickUpColor?: string;
  wickDownColor?: string;
  
  // Area specific
  topColor?: string;
  bottomColor?: string;
  lineColor?: string;
  
  // Histogram specific
  base?: number;
}

/** Crosshair sync data */
export interface CrosshairSyncData {
  time: Time;
  price?: number;
  point?: { x: number; y: number };
}

/** Props for ChartCanvas */
export interface ChartCanvasProps {
  /** Primary data for main series */
  data?: SeriesData[];
  
  /** Primary series type */
  type?: ChartSeriesType;
  
  /** Chart options override */
  options?: DeepPartial<ChartOptions>;
  
  /** Multiple series configurations */
  series?: SeriesConfig[];
  
  /** Chart height in pixels */
  height?: number;
  
  /** Chart width (defaults to container width) */
  width?: number;
  
  /** CSS class name */
  className?: string;
  
  /** Crosshair move callback */
  onCrosshairMove?: (param: MouseEventParams) => void;
  
  /** Visible range change callback */
  onVisibleRangeChange?: (range: LogicalRange | null) => void;
  
  /** External crosshair position for sync */
  syncCrosshair?: CrosshairSyncData | null;
  
  /** Sync time scale with external chart */
  syncTimeScale?: LogicalRange | null;
  
  /** Show time scale (for bottom chart) */
  showTimeScale?: boolean;
  
  /** Show price scale */
  showPriceScale?: boolean;
  
  /** Price scale position */
  priceScalePosition?: 'left' | 'right' | 'none';
  
  /** Price scale mode */
  priceScaleMode?: 'normal' | 'log' | 'percentage';
  
  /** Show grid lines */
  showGrid?: boolean;
  
  /** Auto-fit content on data change */
  autoFitContent?: boolean;
  
  /** Called when chart is ready */
  onReady?: (chart: IChartApi) => void;
}

/** Methods exposed via ref */
export interface ChartCanvasRef {
  /** Get the chart instance */
  getChart: () => IChartApi | null;
  
  /** Get a series by ID */
  getSeries: (id: string) => ISeriesApi<SeriesType> | null;
  
  /** Fit all data in view */
  fitContent: () => void;
  
  /** Scroll to real-time (latest data) */
  scrollToRealTime: () => void;
  
  /** Set visible logical range */
  setVisibleRange: (range: LogicalRange) => void;
  
  /** Get current visible range */
  getVisibleRange: () => LogicalRange | null;
  
  /** Take screenshot (returns data URL) */
  takeScreenshot: () => string | null;
  
  /** Resize chart */
  resize: (width: number, height: number) => void;
  
  /** Update series data */
  updateSeriesData: (id: string, data: SeriesData[]) => void;
  
  /** Append single data point to series */
  appendData: (id: string, point: SeriesData) => void;
}

// =============================================================================
// Theme Constants
// =============================================================================

const THEME = {
  background: '#131722',
  backgroundAlt: '#1e222d',
  text: '#787b86',
  textStrong: '#d1d4dc',
  grid: '#2a2e39',
  border: '#2a2e39',
  crosshair: '#758696',
  upColor: '#26a69a',
  downColor: '#ef5350',
  volumeUp: 'rgba(38, 166, 154, 0.5)',
  volumeDown: 'rgba(239, 83, 80, 0.5)',
};

// =============================================================================
// Default Chart Options
// =============================================================================

const getDefaultOptions = (showGrid: boolean = true): DeepPartial<ChartOptions> => ({
  layout: {
    background: { type: ColorType.Solid, color: THEME.background },
    textColor: THEME.text,
    fontSize: 11,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  grid: {
    vertLines: { 
      color: showGrid ? THEME.grid : 'transparent',
      style: LineStyle.Solid,
    },
    horzLines: { 
      color: showGrid ? THEME.grid : 'transparent',
      style: LineStyle.Solid,
    },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: {
      color: THEME.crosshair,
      width: 1 as LineWidth,
      style: LineStyle.Dashed,
      labelBackgroundColor: THEME.backgroundAlt,
    },
    horzLine: {
      color: THEME.crosshair,
      width: 1 as LineWidth,
      style: LineStyle.Dashed,
      labelBackgroundColor: THEME.backgroundAlt,
    },
  },
  rightPriceScale: {
    borderColor: THEME.border,
    scaleMargins: { top: 0.1, bottom: 0.1 },
  },
  leftPriceScale: {
    borderColor: THEME.border,
    visible: false,
  },
  timeScale: {
    borderColor: THEME.border,
    timeVisible: true,
    secondsVisible: false,
    rightOffset: 5,
    barSpacing: 8,
    minBarSpacing: 2,
    fixLeftEdge: false,
    fixRightEdge: false,
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
});

// =============================================================================
// Series Factory
// =============================================================================

function createSeries(
  chart: IChartApi,
  config: SeriesConfig
): ISeriesApi<SeriesType> {
  const { type, options = {}, priceScaleId } = config;
  
  switch (type) {
    case 'candlestick': {
      const series = chart.addCandlestickSeries({
        upColor: options.upColor || THEME.upColor,
        downColor: options.downColor || THEME.downColor,
        borderUpColor: options.borderUpColor || options.upColor || THEME.upColor,
        borderDownColor: options.borderDownColor || options.downColor || THEME.downColor,
        wickUpColor: options.wickUpColor || options.upColor || THEME.upColor,
        wickDownColor: options.wickDownColor || options.downColor || THEME.downColor,
        priceScaleId,
      });
      return series;
    }
    
    case 'line': {
      const series = chart.addLineSeries({
        color: options.color || THEME.upColor,
        lineWidth: options.lineWidth || 2,
        priceLineVisible: options.priceLineVisible ?? false,
        lastValueVisible: options.lastValueVisible ?? true,
        priceScaleId,
      });
      return series;
    }
    
    case 'histogram': {
      const series = chart.addHistogramSeries({
        color: options.color || THEME.upColor,
        base: options.base ?? 0,
        priceScaleId,
      });
      return series;
    }
    
    case 'area': {
      const series = chart.addAreaSeries({
        topColor: options.topColor || 'rgba(38, 166, 154, 0.4)',
        bottomColor: options.bottomColor || 'rgba(38, 166, 154, 0.0)',
        lineColor: options.lineColor || options.color || THEME.upColor,
        lineWidth: options.lineWidth || 2,
        priceLineVisible: options.priceLineVisible ?? false,
        lastValueVisible: options.lastValueVisible ?? true,
        priceScaleId,
      });
      return series;
    }
    
    case 'bar': {
      const series = chart.addBarSeries({
        upColor: options.upColor || THEME.upColor,
        downColor: options.downColor || THEME.downColor,
        priceScaleId,
      });
      return series;
    }
    
    default:
      // Default to line series
      return chart.addLineSeries({
        color: options.color || THEME.upColor,
        priceScaleId,
      });
  }
}

// =============================================================================
// Component
// =============================================================================

export const ChartCanvas = forwardRef<ChartCanvasRef, ChartCanvasProps>((
  {
    data,
    type = 'candlestick',
    options,
    series = [],
    height = 400,
    width,
    className = '',
    onCrosshairMove,
    onVisibleRangeChange,
    syncCrosshair,
    syncTimeScale,
    showTimeScale = true,
    showPriceScale = true,
    priceScalePosition = 'right',
    priceScaleMode = 'normal',
    showGrid = true,
    autoFitContent = false,
    onReady,
  },
  ref
) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesMapRef = useRef<Map<string, ISeriesApi<SeriesType>>>(new Map());
  const mainSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isInitializedRef = useRef(false);
  
  // ==========================================================================
  // Chart Options
  // ==========================================================================
  
  const chartOptions = useMemo((): DeepPartial<ChartOptions> => {
    const defaultOpts = getDefaultOptions(showGrid);
    
    // Price scale mode
    const scaleModeMap: Record<string, PriceScaleMode> = {
      normal: PriceScaleMode.Normal,
      log: PriceScaleMode.Logarithmic,
      percentage: PriceScaleMode.Percentage,
    };
    
    const mergedOptions: DeepPartial<ChartOptions> = {
      ...defaultOpts,
      ...options,
      rightPriceScale: {
        ...defaultOpts.rightPriceScale,
        visible: showPriceScale && priceScalePosition === 'right',
        mode: scaleModeMap[priceScaleMode],
      },
      leftPriceScale: {
        ...defaultOpts.leftPriceScale,
        visible: showPriceScale && priceScalePosition === 'left',
        mode: scaleModeMap[priceScaleMode],
      },
      timeScale: {
        ...defaultOpts.timeScale,
        visible: showTimeScale,
      },
    };
    
    return mergedOptions;
  }, [options, showGrid, showTimeScale, showPriceScale, priceScalePosition, priceScaleMode]);
  
  // ==========================================================================
  // Initialize Chart
  // ==========================================================================
  
  const initializeChart = useCallback(() => {
    if (!containerRef.current || chartRef.current) return;
    
    const containerWidth = width || containerRef.current.clientWidth || 800;
    
    const chart = createChart(containerRef.current, {
      ...chartOptions,
      width: containerWidth,
      height,
    });
    
    chartRef.current = chart;
    
    // Set up crosshair move handler
    chart.subscribeCrosshairMove((param) => {
      onCrosshairMove?.(param);
    });
    
    // Set up visible range change handler
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      onVisibleRangeChange?.(range);
    });
    
    isInitializedRef.current = true;
    onReady?.(chart);
    
    return chart;
  }, [chartOptions, height, width, onCrosshairMove, onVisibleRangeChange, onReady]);
  
  // ==========================================================================
  // Create Main Series
  // ==========================================================================
  
  const createMainSeries = useCallback(() => {
    if (!chartRef.current || !data || data.length === 0) return;
    
    // Remove existing main series
    if (mainSeriesRef.current) {
      chartRef.current.removeSeries(mainSeriesRef.current);
      mainSeriesRef.current = null;
    }
    
    // Create new series
    const config: SeriesConfig = {
      id: '__main__',
      type,
      data,
    };
    
    const series = createSeries(chartRef.current, config);
    series.setData(data as CandlestickData[] | LineData[] | HistogramData[]);
    mainSeriesRef.current = series;
    
    if (autoFitContent) {
      chartRef.current.timeScale().fitContent();
    }
  }, [data, type, autoFitContent]);
  
  // ==========================================================================
  // Manage Additional Series
  // ==========================================================================
  
  const updateSeries = useCallback(() => {
    if (!chartRef.current) return;
    
    const chart = chartRef.current;
    const currentSeries = seriesMapRef.current;
    const newSeriesIds = new Set(series.map(s => s.id));
    
    // Remove series that are no longer in config
    currentSeries.forEach((seriesInstance, id) => {
      if (!newSeriesIds.has(id)) {
        chart.removeSeries(seriesInstance);
        currentSeries.delete(id);
      }
    });
    
    // Add or update series
    for (const config of series) {
      if (config.visible === false) {
        // Remove if exists but should be hidden
        const existing = currentSeries.get(config.id);
        if (existing) {
          chart.removeSeries(existing);
          currentSeries.delete(config.id);
        }
        continue;
      }
      
      let seriesInstance = currentSeries.get(config.id);
      
      if (!seriesInstance) {
        // Create new series
        seriesInstance = createSeries(chart, config);
        currentSeries.set(config.id, seriesInstance);
      }
      
      // Update data
      if (config.data && config.data.length > 0) {
        seriesInstance.setData(config.data as CandlestickData[] | LineData[] | HistogramData[]);
      }
    }
    
    if (autoFitContent && series.length > 0) {
      chart.timeScale().fitContent();
    }
  }, [series, autoFitContent]);
  
  // ==========================================================================
  // Sync Crosshair
  // ==========================================================================
  
  useEffect(() => {
    if (!chartRef.current || !syncCrosshair) return;
    
    // Note: lightweight-charts doesn't have a direct API to set crosshair position
    // The sync is typically done by sharing time scale ranges instead
    // This is a placeholder for future crosshair sync implementation
  }, [syncCrosshair]);
  
  // ==========================================================================
  // Sync Time Scale
  // ==========================================================================
  
  useEffect(() => {
    if (!chartRef.current || !syncTimeScale) return;
    
    const chart = chartRef.current;
    const timeScale = chart.timeScale();
    
    // Only sync if the range is different to avoid infinite loops
    const currentRange = timeScale.getVisibleLogicalRange();
    if (
      currentRange &&
      currentRange.from === syncTimeScale.from &&
      currentRange.to === syncTimeScale.to
    ) {
      return;
    }
    
    timeScale.setVisibleLogicalRange(syncTimeScale);
  }, [syncTimeScale]);
  
  // ==========================================================================
  // Handle Resize
  // ==========================================================================
  
  const handleResize = useCallback(() => {
    if (!containerRef.current || !chartRef.current) return;
    
    const containerWidth = width || containerRef.current.clientWidth;
    chartRef.current.applyOptions({
      width: containerWidth,
      height,
    });
  }, [width, height]);
  
  // ==========================================================================
  // Imperative Handle (Ref Methods)
  // ==========================================================================
  
  useImperativeHandle(ref, () => ({
    getChart: () => chartRef.current,
    
    getSeries: (id: string) => {
      if (id === '__main__') return mainSeriesRef.current;
      return seriesMapRef.current.get(id) || null;
    },
    
    fitContent: () => {
      chartRef.current?.timeScale().fitContent();
    },
    
    scrollToRealTime: () => {
      chartRef.current?.timeScale().scrollToRealTime();
    },
    
    setVisibleRange: (range: LogicalRange) => {
      chartRef.current?.timeScale().setVisibleLogicalRange(range);
    },
    
    getVisibleRange: () => {
      return chartRef.current?.timeScale().getVisibleLogicalRange() || null;
    },
    
    takeScreenshot: () => {
      if (!containerRef.current) return null;
      const canvas = containerRef.current.querySelector('canvas');
      return canvas?.toDataURL('image/png') || null;
    },
    
    resize: (w: number, h: number) => {
      chartRef.current?.applyOptions({ width: w, height: h });
    },
    
    updateSeriesData: (id: string, newData: SeriesData[]) => {
      const seriesInstance = id === '__main__' 
        ? mainSeriesRef.current 
        : seriesMapRef.current.get(id);
      
      if (seriesInstance) {
        seriesInstance.setData(newData as CandlestickData[] | LineData[] | HistogramData[]);
      }
    },
    
    appendData: (id: string, point: SeriesData) => {
      const seriesInstance = id === '__main__' 
        ? mainSeriesRef.current 
        : seriesMapRef.current.get(id);
      
      if (seriesInstance) {
        seriesInstance.update(point as CandlestickData | LineData | HistogramData);
      }
    },
  }), []);
  
  // ==========================================================================
  // Effects
  // ==========================================================================
  
  // Initialize chart on mount
  useEffect(() => {
    initializeChart();
    
    return () => {
      // Cleanup
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      seriesMapRef.current.clear();
      mainSeriesRef.current = null;
      isInitializedRef.current = false;
    };
  }, [initializeChart]);
  
  // Set up resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    
    resizeObserverRef.current = new ResizeObserver(handleResize);
    resizeObserverRef.current.observe(containerRef.current);
    
    // Also listen to window resize
    window.addEventListener('resize', handleResize);
    
    return () => {
      resizeObserverRef.current?.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);
  
  // Update chart options
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions(chartOptions);
  }, [chartOptions]);
  
  // Update height
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({ height });
  }, [height]);
  
  // Create/update main series when data changes
  useEffect(() => {
    if (isInitializedRef.current) {
      createMainSeries();
    }
  }, [createMainSeries]);
  
  // Update additional series
  useEffect(() => {
    if (isInitializedRef.current) {
      updateSeries();
    }
  }, [updateSeries]);
  
  // ==========================================================================
  // Render
  // ==========================================================================
  
  return (
    <div
      ref={containerRef}
      className={`chart-canvas relative ${className}`}
      style={{ height: `${height}px` }}
    />
  );
});

ChartCanvas.displayName = 'ChartCanvas';

// =============================================================================
// Exports
// =============================================================================

export { THEME as CHART_THEME };
export default ChartCanvas;
