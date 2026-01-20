import { FC, useEffect, useRef, useMemo, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, LineStyle, ColorType, Time } from 'lightweight-charts';
import { useStrategyStore } from '../../stores/strategyStore';
import { cn } from '../../lib/utils';
import type { StochasticValue } from '../../types/quadStochastic';
import { getStrategy } from '../../strategies';

interface QuadStochasticPaneProps {
  mainChart: IChartApi | null;
  height?: number;
  className?: string;
}

// Map indicator IDs to data keys
const INDICATOR_KEY_MAP: Record<string, 'fast' | 'standard' | 'medium' | 'slow'> = {
  'kqs-fast-stoch': 'fast',
  'kqs-standard-stoch': 'standard',
  'kqs-medium-stoch': 'medium',
  'kqs-slow-stoch': 'slow',
};

export const QuadStochPane: FC<QuadStochasticPaneProps> = ({ 
  mainChart, 
  height = 150, 
  className 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  
  const { activeStrategyId, activeIndicators, indicatorData, enabled } = useStrategyStore();
  const strategy = activeStrategyId ? getStrategy(activeStrategyId) : null;
  
  // Real-time values for legend
  const [currentValues, setCurrentValues] = useState<Record<string, number>>({});

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#787b86',
      },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' },
      },
      rightPriceScale: {
        scaleMargins: { top: 0.1, bottom: 0.1 },
        borderColor: '#2a2e39',
      },
      timeScale: {
        visible: false, // Synced with main chart
        borderColor: '#2a2e39',
      },
      crosshair: {
        mode: 1,
        horzLine: { color: '#787b86', style: LineStyle.Dashed },
        vertLine: { color: '#787b86', style: LineStyle.Dashed },
      },
    });

    chartRef.current = chart;

    // Add zone lines
    if (strategy?.zoneLines) {
      const refSeries = chart.addLineSeries({
        color: 'transparent',
        lineWidth: 1, // Minimum visible width, essentially invisible with transparent color
        priceLineVisible: false,
        lastValueVisible: false,
      });

      strategy.zoneLines.forEach(zone => {
        refSeries.createPriceLine({
          price: zone.value,
          color: zone.color,
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: zone.label || '',
        });
      });

      // Initialize scale with dummy data
      refSeries.setData([
        { time: (Math.floor(Date.now() / 1000) - 86400) as Time, value: 0 },
        { time: Math.floor(Date.now() / 1000) as Time, value: 100 },
      ]);
    }

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current.clear();
    };
  }, [height, strategy]);

  // Sync with main chart
  useEffect(() => {
    if (!mainChart || !chartRef.current) return;

    const handleRangeChange = (range: any) => {
      if (range && chartRef.current) {
        chartRef.current.timeScale().setVisibleLogicalRange(range);
      }
    };

    mainChart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

    // Initial sync
    const currentRange = mainChart.timeScale().getVisibleLogicalRange();
    if (currentRange) {
      chartRef.current.timeScale().setVisibleLogicalRange(currentRange);
    }

    return () => {
      mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
    };
  }, [mainChart]);

  // Create/Update Series
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !enabled || !activeIndicators) return;

    // For now, clear all and recreate to ensure correct order/params
    seriesRef.current.forEach(s => chart.removeSeries(s));
    seriesRef.current.clear();

    activeIndicators.forEach(indicator => {
      const kSeries = chart.addLineSeries({
        color: indicator.style.kLine?.color || '#2962ff',
        lineWidth: (indicator.style.kLine?.width || 1) as any,
        lineStyle: indicator.style.kLine?.dash ? LineStyle.Dashed : LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: true,
      });
      seriesRef.current.set(`${indicator.id}-k`, kSeries);

      // %D Line
      const dSeries = chart.addLineSeries({
        color: indicator.style.dLine?.color || indicator.style.kLine?.color || '#2962ff',
        lineWidth: (indicator.style.dLine?.width || 1) as any,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      seriesRef.current.set(`${indicator.id}-d`, dSeries);
    });

  }, [enabled, activeIndicators]);

  // Update Data
  useEffect(() => {
    if (!indicatorData?.quadStochastic || !enabled || !activeIndicators) return;

    const { fast, standard, medium, slow } = indicatorData.quadStochastic;
    const dataMap = { fast, standard, medium, slow };
    const nextValues: Record<string, number> = {};

    activeIndicators.forEach(indicator => {
      const key = INDICATOR_KEY_MAP[indicator.id];
      const data = dataMap[key];
      if (!data) return;

      const kSeries = seriesRef.current.get(`${indicator.id}-k`);
      const dSeries = seriesRef.current.get(`${indicator.id}-d`);

      if (kSeries && data.length > 0) {
        const kData = data.map((d: StochasticValue) => ({ time: d.time as Time, value: d.k }));
        kSeries.setData(kData);
        nextValues[key] = data[data.length - 1].k;
      }

      if (dSeries && data.length > 0) {
        const dData = data.map((d: StochasticValue) => ({ time: d.time as Time, value: d.d }));
        dSeries.setData(dData);
      }
    });

    setCurrentValues(nextValues);
  }, [indicatorData, activeIndicators, enabled]);

  // Legend Component
  const Legend = useMemo(() => {
    if (!strategy || !enabled) return null;

    const getColor = (val: number) => {
      if (val >= 80) return '#ef5350';
      if (val <= 20) return '#26a69a';
      return '#d1d4dc';
    };

    return (
      <div className="absolute top-0 left-0 z-10 flex items-center gap-4 px-2 py-1 text-[10px] font-mono pointer-events-none bg-[#131722]/80 backdrop-blur-sm rounded-br">
        <span className="text-[#f7931a] font-bold">⚡ KQS</span>
        {activeIndicators.map(ind => {
          const key = INDICATOR_KEY_MAP[ind.id];
          const val = currentValues[key];
          return (
            <div key={ind.id} className="flex items-center gap-1">
              <span style={{ color: ind.style.kLine?.color }}>{ind.shortName}:</span>
              <span style={{ color: val !== undefined ? getColor(val) : '#787b86' }}>
                {val !== undefined ? val.toFixed(1) : '--'}
              </span>
            </div>
          );
        })}
      </div>
    );
  }, [strategy, enabled, activeIndicators, currentValues]);

  if (!enabled || !strategy) return null;

  return (
    <div className={cn("relative w-full border-t border-[#2a2e39]", className)} style={{ height }}>
      {Legend}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
