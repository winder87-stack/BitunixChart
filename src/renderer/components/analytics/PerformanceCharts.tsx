import { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { useAnalyticsStore } from '../../stores/analyticsStore';

export function PerformanceCharts() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const metrics = useAnalyticsStore(state => state.metrics);
  const equityCurve = metrics.equityCurve;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#787b86',
      },
      grid: {
        vertLines: { color: '#2a2e39' },
        horzLines: { color: '#2a2e39' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 200,
      rightPriceScale: {
        borderColor: '#2a2e39',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
      },
    });

    const areaSeries = chart.addAreaSeries({
      lineColor: '#2962ff',
      topColor: 'rgba(41, 98, 255, 0.4)',
      bottomColor: 'rgba(41, 98, 255, 0.0)',
      lineWidth: 2,
    });

    // Format data for lightweight-charts
    // Note: lightweight-charts expects time in seconds, we have ms
    const data = equityCurve.map(point => ({
      time: point.time / 1000 as any,
      value: point.value,
    }));

    // Ensure data is sorted by time
    data.sort((a, b) => (a.time as number) - (b.time as number));

    // Deduplicate timestamps (keep last value)
    const uniqueData: { time: any; value: number }[] = [];
    data.forEach(point => {
      if (uniqueData.length === 0 || uniqueData[uniqueData.length - 1].time !== point.time) {
        uniqueData.push(point);
      } else {
        uniqueData[uniqueData.length - 1] = point;
      }
    });

    if (uniqueData.length > 0) {
      areaSeries.setData(uniqueData);
      chart.timeScale().fitContent();
    }

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [equityCurve]);

  return (
    <div className="flex flex-col bg-[#131722] border border-[#2a2e39] rounded-lg overflow-hidden mt-4">
      <div className="p-3 border-b border-[#2a2e39] bg-[#1e222d]">
        <h2 className="text-sm font-semibold text-[#d1d4dc]">Equity Curve</h2>
      </div>
      <div className="p-3 relative">
        <div ref={chartContainerRef} className="w-full h-[200px]" />
        {equityCurve.length <= 1 && (
          <div className="absolute inset-0 flex items-center justify-center text-[#787b86] text-xs bg-[#131722]/80 z-10">
            Not enough data to display chart
          </div>
        )}
      </div>
    </div>
  );
}
