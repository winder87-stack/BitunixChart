import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, IChartApi, LineStyle, ColorType } from 'lightweight-charts';
import { useSignalStore } from '../../stores/signalStore';
import { cn } from '../../lib/utils';
import type { StochasticValue, StochasticBandKey } from '../../types/quadStochastic';

interface QuadStochPaneProps {
  mainChart: IChartApi | null;
  height?: number;
  className?: string;
}

const COLORS = {
  FAST: '#2962ff',     // Blue - primary
  STANDARD: '#00bcd4', // Cyan
  MEDIUM: '#ff9800',   // Orange  
  SLOW: '#e91e63',     // Pink - 5min proxy
};

export const QuadStochPane: React.FC<QuadStochPaneProps> = ({ 
  mainChart, 
  height = 150, 
  className 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { quadData } = useSignalStore();

  const seriesRef = useRef<{
    fastK: any; fastD: any;
    stdK: any; stdD: any;
    medK: any; medD: any;
    slowK: any; slowD: any;
  } | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' },
      },
      width: containerRef.current.clientWidth,
      height: height,
      timeScale: {
        visible: false, // Hide time scale (synced with main)
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      crosshair: {
        mode: 1, // CrosshairMode.Normal
      },
    });

    chartRef.current = chart;

    // Create Series
    // FAST (Primary)
    const fastK = chart.addLineSeries({
      color: COLORS.FAST,
      lineWidth: 2,
      priceScaleId: 'right',
      title: 'FAST %K',
    });
    const fastD = chart.addLineSeries({
      color: COLORS.FAST,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceScaleId: 'right',
      title: 'FAST %D',
    });

    // STANDARD
    const stdK = chart.addLineSeries({
      color: COLORS.STANDARD,
      lineWidth: 1,
      priceScaleId: 'right',
      title: 'STD %K',
    });
    const stdD = chart.addLineSeries({
      color: COLORS.STANDARD,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceScaleId: 'right',
      visible: false, // Hide D line for noise reduction
    });

    // MEDIUM
    const medK = chart.addLineSeries({
      color: COLORS.MEDIUM,
      lineWidth: 1,
      priceScaleId: 'right',
      title: 'MED %K',
    });
    const medD = chart.addLineSeries({
      color: COLORS.MEDIUM,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceScaleId: 'right',
      visible: false,
    });

    // SLOW
    const slowK = chart.addLineSeries({
      color: COLORS.SLOW,
      lineWidth: 1,
      priceScaleId: 'right',
      title: 'SLOW %K',
    });
    const slowD = chart.addLineSeries({
      color: COLORS.SLOW,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceScaleId: 'right',
      visible: false,
    });

    seriesRef.current = { fastK, fastD, stdK, stdD, medK, medD, slowK, slowD };

    // Reference Lines (using createPriceLine on one of the series)
    // We add them to fastK as an anchor
    fastK.createPriceLine({
      price: 80,
      color: '#ef5350',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: false,
      title: 'OB',
    });
    fastK.createPriceLine({
      price: 50,
      color: '#787b86',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: false,
      title: 'Mid',
    });
    fastK.createPriceLine({
      price: 20,
      color: '#26a69a',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: false,
      title: 'OS',
    });

    // Handle Resize
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
    };
  }, [height]);

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

  // Update Data
  useEffect(() => {
    if (!quadData || !seriesRef.current) return;

    const formatData = (data: StochasticValue[], key: 'k' | 'd') => {
      return data
        .filter(d => !isNaN(d[key]))
        .map(d => ({ time: d.time, value: d[key] }));
    };

    seriesRef.current.fastK.setData(formatData(quadData.fast, 'k'));
    seriesRef.current.fastD.setData(formatData(quadData.fast, 'd'));
    
    seriesRef.current.stdK.setData(formatData(quadData.standard, 'k'));
    seriesRef.current.stdD.setData(formatData(quadData.standard, 'd'));
    
    seriesRef.current.medK.setData(formatData(quadData.medium, 'k'));
    seriesRef.current.medD.setData(formatData(quadData.medium, 'd'));
    
    seriesRef.current.slowK.setData(formatData(quadData.slow, 'k'));
    seriesRef.current.slowD.setData(formatData(quadData.slow, 'd'));

  }, [quadData]);

  // Legend Component
  const Legend = useMemo(() => {
    if (!quadData) return null;
    
    // Get latest valid values
    const getLatest = (band: StochasticValue[]) => {
      for (let i = band.length - 1; i >= 0; i--) {
        if (!isNaN(band[i].k)) return band[i];
      }
      return { k: 0, d: 0 };
    };

    const fast = getLatest(quadData.fast);
    const std = getLatest(quadData.standard);
    const med = getLatest(quadData.medium);
    const slow = getLatest(quadData.slow);

    const bands: { label: string; value: number; color: string; key: StochasticBandKey }[] = [
      { label: 'FAST', value: fast.k, color: COLORS.FAST, key: 'FAST' },
      { label: 'STD', value: std.k, color: COLORS.STANDARD, key: 'STANDARD' },
      { label: 'MED', value: med.k, color: COLORS.MEDIUM, key: 'MEDIUM' },
      { label: 'SLOW', value: slow.k, color: COLORS.SLOW, key: 'SLOW' },
    ];

    return (
      <div className="absolute top-1 left-2 flex gap-3 text-xs font-mono bg-[#131722]/80 p-1 rounded z-10 pointer-events-none">
        {bands.map(b => (
          <div key={b.key} style={{ color: b.color }}>
            {b.label}: {b.value.toFixed(1)}
          </div>
        ))}
      </div>
    );
  }, [quadData]);

  return (
    <div className={cn("relative w-full border-t border-[#2a2e39]", className)} style={{ height }}>
      {Legend}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
