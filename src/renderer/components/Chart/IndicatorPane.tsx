/**
 * IndicatorPane
 * 
 * A separate chart pane for oscillator-type indicators like RSI, MACD, etc.
 * Features a header with controls, resizable height, and synced crosshair.
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  HistogramData,
  ColorType,
  LineStyle,
  CrosshairMode,
  Time,
  LogicalRange,
  LineWidth,
} from 'lightweight-charts';

import { useIndicatorStore } from '../../stores/indicatorStore';
import { getIndicatorDefinition } from '../../services/indicators/definitions';
import type { IndicatorConfig, IndicatorResult } from '../../types/indicators';
import { CHART_THEME } from './ChartCanvas';

// =============================================================================
// Types
// =============================================================================

export interface CrosshairData {
  time: number;
  price?: number;
  x?: number;
  y?: number;
}

export interface IndicatorPaneProps {
  /** Indicator configuration */
  indicator: IndicatorConfig;
  
  /** Calculated results */
  results: IndicatorResult[];
  
  /** Pane height in pixels */
  height: number;
  
  /** Callback when height changes via resize */
  onResize?: (newHeight: number) => void;
  
  /** External crosshair position for sync */
  syncCrosshair?: CrosshairData | null;
  
  /** External time scale range for sync */
  syncTimeScale?: LogicalRange | null;
  
  /** Callback when time scale changes */
  onTimeScaleChange?: (range: LogicalRange | null) => void;
  
  /** Callback when crosshair moves */
  onCrosshairMove?: (data: CrosshairData | null) => void;
  
  /** Whether this is the last pane (shows time scale) */
  isLastPane?: boolean;
  
  /** CSS class name */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const MIN_HEIGHT = 60;
const MAX_HEIGHT = 300;
const DEFAULT_HEIGHT = 120;

// Reference line configurations for different indicators
const REFERENCE_LINES: Record<string, Array<{ value: number; color: string; label?: string }>> = {
  RSI: [
    { value: 70, color: 'rgba(239, 68, 68, 0.5)', label: '70' },
    { value: 50, color: 'rgba(120, 123, 134, 0.3)', label: '50' },
    { value: 30, color: 'rgba(34, 197, 94, 0.5)', label: '30' },
  ],
  STOCH: [
    { value: 80, color: 'rgba(239, 68, 68, 0.5)', label: '80' },
    { value: 50, color: 'rgba(120, 123, 134, 0.3)', label: '50' },
    { value: 20, color: 'rgba(34, 197, 94, 0.5)', label: '20' },
  ],
  STOCHRSI: [
    { value: 80, color: 'rgba(239, 68, 68, 0.5)', label: '80' },
    { value: 20, color: 'rgba(34, 197, 94, 0.5)', label: '20' },
  ],
  MFI: [
    { value: 80, color: 'rgba(239, 68, 68, 0.5)', label: '80' },
    { value: 20, color: 'rgba(34, 197, 94, 0.5)', label: '20' },
  ],
  WILLR: [
    { value: -20, color: 'rgba(239, 68, 68, 0.5)', label: '-20' },
    { value: -80, color: 'rgba(34, 197, 94, 0.5)', label: '-80' },
  ],
  CCI: [
    { value: 100, color: 'rgba(239, 68, 68, 0.5)', label: '100' },
    { value: 0, color: 'rgba(120, 123, 134, 0.3)', label: '0' },
    { value: -100, color: 'rgba(34, 197, 94, 0.5)', label: '-100' },
  ],
  MACD: [
    { value: 0, color: 'rgba(120, 123, 134, 0.5)', label: '0' },
  ],
  ROC: [
    { value: 0, color: 'rgba(120, 123, 134, 0.5)', label: '0' },
  ],
  MOM: [
    { value: 0, color: 'rgba(120, 123, 134, 0.5)', label: '0' },
  ],
  AO: [
    { value: 0, color: 'rgba(120, 123, 134, 0.5)', label: '0' },
  ],
  CMF: [
    { value: 0, color: 'rgba(120, 123, 134, 0.5)', label: '0' },
  ],
  ADX: [
    { value: 25, color: 'rgba(255, 193, 7, 0.5)', label: '25' },
  ],
};

// =============================================================================
// Icons
// =============================================================================

const SettingsIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeIcon = ({ visible }: { visible: boolean }) => (
  visible ? (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
);

const CloseIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DragIcon = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 6a2 2 0 11-4 0 2 2 0 014 0zM8 12a2 2 0 11-4 0 2 2 0 014 0zM8 18a2 2 0 11-4 0 2 2 0 014 0zM14 6a2 2 0 11-4 0 2 2 0 014 0zM14 12a2 2 0 11-4 0 2 2 0 014 0zM14 18a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format indicator value for display
 */
function formatValue(value: number | null, type: string): string {
  if (value === null || value === undefined || isNaN(value)) return '--';
  
  // RSI, Stochastic, MFI - percentage-like values
  if (['RSI', 'STOCH', 'STOCHRSI', 'MFI', 'ADX'].includes(type)) {
    return value.toFixed(2);
  }
  
  // Williams %R
  if (type === 'WILLR') {
    return value.toFixed(2);
  }
  
  // CCI, ROC, Momentum - can have larger values
  if (['CCI', 'ROC', 'MOM'].includes(type)) {
    return value.toFixed(2);
  }
  
  // MACD, CMF - small decimal values
  if (['MACD', 'CMF', 'AO', 'UO'].includes(type)) {
    return value.toFixed(4);
  }
  
  // ATR, OBV - price/volume based
  if (['ATR', 'OBV', 'AD'].includes(type)) {
    if (Math.abs(value) >= 1000000) {
      return (value / 1000000).toFixed(2) + 'M';
    }
    if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(2) + 'K';
    }
    return value.toFixed(2);
  }
  
  return value.toFixed(2);
}

/**
 * Get label for indicator display
 */
function getIndicatorLabel(indicator: IndicatorConfig): string {
  const def = getIndicatorDefinition(indicator.type);
  const shortName = def?.shortName || indicator.type;
  
  // Add period to label if exists
  const period = indicator.params.period;
  if (period !== undefined) {
    return `${shortName}(${period})`;
  }
  
  // Special cases
  if (indicator.type === 'MACD') {
    return `MACD(${indicator.params.fastPeriod},${indicator.params.slowPeriod},${indicator.params.signalPeriod})`;
  }
  
  if (indicator.type === 'STOCH') {
    return `Stoch(${indicator.params.kPeriod},${indicator.params.dPeriod})`;
  }
  
  return shortName;
}

// =============================================================================
// Component
// =============================================================================

export const IndicatorPane: React.FC<IndicatorPaneProps> = ({
  indicator,
  results,
  height = DEFAULT_HEIGHT,
  onResize,
  // syncCrosshair, // Not fully implemented yet
  syncTimeScale,
  onTimeScaleChange,
  onCrosshairMove,
  isLastPane = false,
  className = '',
}) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesMapRef = useRef<Map<string, ISeriesApi<'Line'> | ISeriesApi<'Histogram'>>>(new Map());
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  
  // State
  const [isResizing, setIsResizing] = useState(false);
  const [currentHeight, setCurrentHeight] = useState(height);
  const [hoveredValue, setHoveredValue] = useState<Record<string, number | null> | null>(null);
  
  // Store actions
  const { toggleIndicatorVisibility, removeIndicator, selectIndicator } = useIndicatorStore();
  
  // Get indicator definition
  const definition = useMemo(() => getIndicatorDefinition(indicator.type), [indicator.type]);
  
  // Get current values (last result)
  const currentValues = useMemo(() => {
    if (!results || results.length === 0) return null;
    return results[results.length - 1].values;
  }, [results]);
  
  // Get display values (hovered or current)
  const displayValues = hoveredValue || currentValues;
  
  // Get reference lines for this indicator
  const referenceLines = useMemo(() => {
    return REFERENCE_LINES[indicator.type] || [];
  }, [indicator.type]);
  
  // ==========================================================================
  // Chart Initialization
  // ==========================================================================
  
  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current || chartRef.current) return;
    
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: currentHeight - 28, // Subtract header height
      layout: {
        background: { type: ColorType.Solid, color: CHART_THEME.background },
        textColor: CHART_THEME.text,
        fontSize: 10,
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: CHART_THEME.grid, style: LineStyle.Solid },
        horzLines: { color: CHART_THEME.grid, style: LineStyle.Solid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: CHART_THEME.crosshair,
          width: 1 as LineWidth,
          style: LineStyle.Dashed,
          labelVisible: false,
        },
        horzLine: {
          color: CHART_THEME.crosshair,
          width: 1 as LineWidth,
          style: LineStyle.Dashed,
          labelBackgroundColor: CHART_THEME.backgroundAlt,
        },
      },
      rightPriceScale: {
        borderColor: CHART_THEME.border,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: CHART_THEME.border,
        visible: isLastPane,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
      },
    });
    
    chartRef.current = chart;
    
    // Subscribe to crosshair move
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        setHoveredValue(null);
        onCrosshairMove?.(null);
        return;
      }
      
      // Get values at crosshair position
      const values: Record<string, number | null> = {};
      seriesMapRef.current.forEach((series, key) => {
        const data = param.seriesData.get(series);
        if (data && 'value' in data) {
          values[key] = data.value;
        }
      });
      
      if (Object.keys(values).length > 0) {
        setHoveredValue(values);
      }
      
      onCrosshairMove?.({
        time: param.time as number,
        x: param.point?.x,
        y: param.point?.y,
      });
    });
    
    // Subscribe to time scale changes
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      onTimeScaleChange?.(range);
    });
    
  }, [currentHeight, isLastPane, onCrosshairMove, onTimeScaleChange]);
  
  // ==========================================================================
  // Update Series
  // ==========================================================================
  
  const updateSeries = useCallback(() => {
    if (!chartRef.current || !definition || !results || results.length === 0) return;
    
    const chart = chartRef.current;
    const outputs = definition.outputDefinitions || 
      definition.outputs.map(key => ({ 
        key, 
        name: key, 
        type: 'line' as const, 
        color: indicator.style.color 
      }));
    
    for (const output of outputs) {
      let series = seriesMapRef.current.get(output.key);
      const color = output.color || indicator.style.color;
      const lineWidth = ('lineWidth' in output ? output.lineWidth : undefined) || indicator.style.lineWidth || 2;
      
      if (!series) {
        if (output.type === 'histogram') {
          series = chart.addHistogramSeries({
            color,
            priceFormat: { type: 'price', precision: 4, minMove: 0.0001 },
            lastValueVisible: false,
          });
        } else {
          series = chart.addLineSeries({
            color,
            lineWidth: (lineWidth || 2) as LineWidth,
            lastValueVisible: false,
            priceLineVisible: false,
          });
        }
        seriesMapRef.current.set(output.key, series);
      }
      
      // Prepare data
      const data = results
        .filter(r => r.values[output.key] !== null && r.values[output.key] !== undefined)
        .map(r => ({
          time: r.time as Time,
          value: r.values[output.key] as number,
          ...(output.type === 'histogram' ? {
            color: (r.values[output.key] as number) >= 0 
              ? CHART_THEME.upColor 
              : CHART_THEME.downColor,
          } : {}),
        }));
      
      if (output.type === 'histogram') {
        (series as ISeriesApi<'Histogram'>).setData(data as HistogramData[]);
      } else {
        (series as ISeriesApi<'Line'>).setData(data as LineData[]);
      }
    }
    
    // Fit content
    chart.timeScale().fitContent();
  }, [definition, results, indicator.style]);
  
  // ==========================================================================
  // Add Reference Lines
  // ==========================================================================
  
  const addReferenceLines = useCallback(() => {
    if (!chartRef.current || referenceLines.length === 0) return;
    
    // Note: lightweight-charts doesn't have native horizontal line support
    // We would need to use a workaround like adding line series with constant values
    // For now, this is handled via CSS overlays or series markers
  }, [referenceLines]);
  
  // ==========================================================================
  // Sync Crosshair
  // ==========================================================================
  
  /* 
  useEffect(() => {
    if (!chartRef.current || !syncCrosshair) return;
    // Implementation for future crosshair sync
  }, [syncCrosshair]);
  */

  // ==========================================================================
  // Sync Time Scale
  // ==========================================================================
  
  useEffect(() => {
    if (!chartRef.current || !syncTimeScale) return;
    
    const timeScale = chartRef.current.timeScale();
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
  
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startY = e.clientY;
    const startHeight = currentHeight;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + deltaY));
      setCurrentHeight(newHeight);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      onResize?.(currentHeight);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [currentHeight, onResize]);
  
  // ==========================================================================
  // Handle Window Resize
  // ==========================================================================
  
  useEffect(() => {
    const handleWindowResize = () => {
      if (!chartContainerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: currentHeight - 28,
      });
    };
    
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [currentHeight]);
  
  // ==========================================================================
  // Effects
  // ==========================================================================
  
  // Initialize chart
  useEffect(() => {
    initializeChart();
    
    const seriesMap = seriesMapRef.current;
    
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      seriesMap.clear();
    };
  }, [initializeChart]);
  
  // Update series when results change
  useEffect(() => {
    updateSeries();
  }, [updateSeries]);
  
  // Add reference lines
  useEffect(() => {
    addReferenceLines();
  }, [addReferenceLines]);
  
  // Update height when prop changes
  useEffect(() => {
    setCurrentHeight(height);
  }, [height]);
  
  // Update chart height
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({ height: currentHeight - 28 });
  }, [currentHeight]);
  
  // ==========================================================================
  // Render
  // ==========================================================================
  
  const indicatorLabel = getIndicatorLabel(indicator);
  
  return (
    <div
      ref={containerRef}
      className={`indicator-pane relative flex flex-col border-t border-[#2a2e39] ${className}`}
      style={{ height: `${currentHeight}px` }}
    >
      {/* Header */}
      <div className="indicator-pane-header flex items-center justify-between h-7 px-2 bg-[#131722] border-b border-[#1e222d] select-none">
        {/* Left side: Drag handle + Name + Values */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Drag handle */}
          <div className="drag-handle cursor-grab text-[#787b86] hover:text-[#d1d4dc] opacity-50 hover:opacity-100">
            <DragIcon />
          </div>
          
          {/* Indicator name */}
          <span className="text-xs font-medium text-[#d1d4dc] whitespace-nowrap">
            {indicatorLabel}
          </span>
          
          {/* Current values */}
          {displayValues && definition && (
            <div className="flex items-center gap-2 text-xs overflow-hidden">
              {definition.outputs.slice(0, 3).map((outputKey) => {
                const value = displayValues[outputKey];
                const outputDef = definition.outputDefinitions?.find(o => o.key === outputKey);
                const color = outputDef?.color || indicator.style.color;
                
                return (
                  <span key={outputKey} className="flex items-center gap-1 whitespace-nowrap">
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[#787b86]">
                      {outputDef?.name || outputKey}:
                    </span>
                    <span className="text-[#d1d4dc] font-mono">
                      {formatValue(value, indicator.type)}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Right side: Controls */}
        <div className="flex items-center gap-1">
          {/* Settings button */}
          <button
            onClick={() => selectIndicator(indicator.id)}
            className="p-1 text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded transition-colors"
            title="Settings"
          >
            <SettingsIcon />
          </button>
          
          {/* Visibility toggle */}
          <button
            onClick={() => toggleIndicatorVisibility(indicator.id)}
            className="p-1 text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded transition-colors"
            title={indicator.visible ? 'Hide' : 'Show'}
          >
            <EyeIcon visible={indicator.visible} />
          </button>
          
          {/* Remove button */}
          <button
            onClick={() => removeIndicator(indicator.id)}
            className="p-1 text-[#787b86] hover:text-[#ef4444] hover:bg-[#2a2e39] rounded transition-colors"
            title="Remove"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
      
      {/* Chart area */}
      <div 
        ref={chartContainerRef} 
        className="flex-1 relative"
      >
        {/* Reference lines overlay */}
        {referenceLines.map((line, index) => (
          <div
            key={index}
            className="absolute left-0 right-10 h-px pointer-events-none z-10"
            style={{
              backgroundColor: line.color,
              top: `${((1 - (line.value - getMinValue()) / (getMaxValue() - getMinValue())) * 100)}%`,
            }}
          >
            {line.label && (
              <span className="absolute right-0 -top-2.5 text-[9px] text-[#787b86] opacity-50">
                {line.label}
              </span>
            )}
          </div>
        ))}
      </div>
      
      {/* Resize handle */}
      <div
        ref={resizeHandleRef}
        className={`absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize group ${
          isResizing ? 'bg-[#6366f1]' : 'hover:bg-[#6366f1]/50'
        }`}
        onMouseDown={handleResizeStart}
      >
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-[#787b86]/30 group-hover:bg-[#787b86]/50" />
      </div>
    </div>
  );
  
  // Helper functions for reference line positioning
  function getMinValue(): number {
    if (indicator.type === 'RSI' || indicator.type === 'STOCH' || indicator.type === 'STOCHRSI' || indicator.type === 'MFI') return 0;
    if (indicator.type === 'WILLR') return -100;
    if (indicator.type === 'ADX') return 0;
    return -100;
  }
  
  function getMaxValue(): number {
    if (indicator.type === 'RSI' || indicator.type === 'STOCH' || indicator.type === 'STOCHRSI' || indicator.type === 'MFI') return 100;
    if (indicator.type === 'WILLR') return 0;
    if (indicator.type === 'ADX') return 100;
    return 100;
  }
};

export default IndicatorPane;
