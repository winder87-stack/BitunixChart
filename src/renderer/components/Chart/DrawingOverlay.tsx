import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';

import { useDrawingStore } from '../../stores/drawingStore';
import { useChartStore } from '../../stores/chartStore';
import type {
  DrawingConfig,
  ChartPoint,
  DrawingStyle,
  HorizontalLineData,
  TrendlineData,
  FibonacciRetracementData,
  RectangleData,
} from '../../types/drawings';
import { DRAWING_DEFINITIONS, DEFAULT_FIB_LEVELS } from '../../types/drawings';

interface DrawingOverlayProps {
  chart: IChartApi | null;
  series: ISeriesApi<'Candlestick'> | null;
  containerRef: React.RefObject<HTMLDivElement>;
}

const FIB_COLORS = [
  '#787b86',
  '#f7525f',
  '#22ab94',
  '#ff9800',
  '#2962ff',
  '#9c27b0',
  '#787b86',
];

export const DrawingOverlay: React.FC<DrawingOverlayProps> = ({
  chart,
  series,
  containerRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredDrawingId, setHoveredDrawingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [initialData, setInitialData] = useState<any>(null);

  const symbol = useChartStore(state => state.symbol);
  const activeTool = useDrawingStore(state => state.activeTool);
  const creatingDrawing = useDrawingStore(state => state.creatingDrawing);
  const isDrawingMode = useDrawingStore(state => state.isDrawingMode);

  const {
    getVisibleDrawings,
    startCreation,
    updateCreationPreview,
    completeCreation,
    cancelCreation,
    clearSelection,
    removeDrawing,
    updateDrawingData,
    selectDrawing,
    getDrawing,
  } = useDrawingStore();

  const visibleDrawings = getVisibleDrawings(symbol);

  const chartToPixel = useCallback(
    (point: ChartPoint): { x: number; y: number } | null => {
      if (!chart || !series) return null;

      const x = chart.timeScale().timeToCoordinate(point.time as Time);
      const y = series.priceToCoordinate(point.price);

      if (x === null || y === null) return null;
      return { x, y };
    },
    [chart, series]
  );

  const pixelToChart = useCallback(
    (x: number, y: number): ChartPoint | null => {
      if (!chart || !series) return null;

      const time = chart.timeScale().coordinateToTime(x);
      const price = series.coordinateToPrice(y);

      if (time === null || price === null) return null;
      return { time: time as number, price };
    },
    [chart, series]
  );

  // Helper: Calculate distance from point to line segment
  // Necessary for trendline hit testing math
  const getDistanceToLine = (x: number, y: number, x1: number, y1: number, x2: number, y2: number) => {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) // in case of 0 length line
        param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const hitTest = useCallback((x: number, y: number): string | null => {
    if (!chart || !series) return null;

    // Check in reverse order (topmost first)
    // Necessary to select the drawing drawn last (on top)
    for (let i = visibleDrawings.length - 1; i >= 0; i--) {
      const drawing = visibleDrawings[i];
      const threshold = 10; // Pixel threshold

      if (drawing.data.type === 'horizontalLine') {
        const lineY = series.priceToCoordinate(drawing.data.price);
        if (lineY !== null && Math.abs(y - lineY) < threshold) {
          return drawing.id;
        }
      } else if (drawing.data.type === 'trendline') {
        const start = chartToPixel(drawing.data.startPoint);
        const end = chartToPixel(drawing.data.endPoint);
        if (start && end) {
          const dist = getDistanceToLine(x, y, start.x, start.y, end.x, end.y);
          if (dist < threshold) return drawing.id;
        }
      } else if (drawing.data.type === 'fibonacciRetracement') {
        // Hit test main line
        const start = chartToPixel(drawing.data.startPoint);
        const end = chartToPixel(drawing.data.endPoint);
        if (start && end) {
          const dist = getDistanceToLine(x, y, start.x, start.y, end.x, end.y);
          if (dist < threshold) return drawing.id;
        }
      } else if (drawing.data.type === 'rectangle') {
        const p1 = chartToPixel(drawing.data.topLeft);
        const p2 = chartToPixel(drawing.data.bottomRight);
        if (p1 && p2) {
          const minX = Math.min(p1.x, p2.x);
          const maxX = Math.max(p1.x, p2.x);
          const minY = Math.min(p1.y, p2.y);
          const maxY = Math.max(p1.y, p2.y);
          
          // Check borders
          if (
            (Math.abs(x - minX) < threshold && y >= minY && y <= maxY) ||
            (Math.abs(x - maxX) < threshold && y >= minY && y <= maxY) ||
            (Math.abs(y - minY) < threshold && x >= minX && x <= maxX) ||
            (Math.abs(y - maxY) < threshold && x >= minX && x <= maxX)
          ) {
            return drawing.id;
          }
        }
      }
    }
    return null;
  }, [visibleDrawings, chart, series, chartToPixel]);

  const applyLineStyle = useCallback(
    (ctx: CanvasRenderingContext2D, style: DrawingStyle) => {
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.lineWidth;

      if (style.lineStyle === 'dashed') {
        ctx.setLineDash([8, 4]);
      } else if (style.lineStyle === 'dotted') {
        ctx.setLineDash([2, 4]);
      } else {
        ctx.setLineDash([]);
      }
    },
    []
  );

  const renderHorizontalLine = useCallback(
    (ctx: CanvasRenderingContext2D, drawing: DrawingConfig<HorizontalLineData>) => {
      const y = series?.priceToCoordinate(drawing.data.price);
      if (y === null || y === undefined) return;

      applyLineStyle(ctx, drawing.style);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dimensions.width, y);
      ctx.stroke();

      if (drawing.style.showLabel) {
        const price = drawing.data.price;
        const label = price.toFixed(2);
        ctx.font = '11px Inter, sans-serif';
        ctx.fillStyle = drawing.style.color;
        ctx.textAlign = 'right';
        ctx.fillText(label, dimensions.width - 5, y - 5);
      }

      if (drawing.selected) {
        renderHandle(ctx, dimensions.width / 2, y, drawing.style.color);
      }
    },
    [series, dimensions, applyLineStyle]
  );

  const renderTrendline = useCallback(
    (ctx: CanvasRenderingContext2D, drawing: DrawingConfig<TrendlineData>) => {
      const start = chartToPixel(drawing.data.startPoint);
      const end = chartToPixel(drawing.data.endPoint);

      if (!start || !end) return;

      applyLineStyle(ctx, drawing.style);
      ctx.beginPath();

      if (drawing.style.extend !== 'none') {
        const dx = end.x - start.x;
        const dy = end.y - start.y;

        let extStart = { ...start };
        let extEnd = { ...end };

        if (dx !== 0) {
          const slope = dy / dx;

          if (drawing.style.extend === 'both' || drawing.style.extend === 'left') {
            extStart = {
              x: 0,
              y: start.y - start.x * slope,
            };
          }

          if (drawing.style.extend === 'both' || drawing.style.extend === 'right') {
            extEnd = {
              x: dimensions.width,
              y: start.y + (dimensions.width - start.x) * slope,
            };
          }
        }

        ctx.moveTo(extStart.x, extStart.y);
        ctx.lineTo(extEnd.x, extEnd.y);
      } else {
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
      }

      ctx.stroke();

      if (drawing.selected) {
        renderHandle(ctx, start.x, start.y, drawing.style.color);
        renderHandle(ctx, end.x, end.y, drawing.style.color);
      }
    },
    [chartToPixel, dimensions, applyLineStyle]
  );

  const renderFibonacci = useCallback(
    (ctx: CanvasRenderingContext2D, drawing: DrawingConfig<FibonacciRetracementData>) => {
      const start = chartToPixel(drawing.data.startPoint);
      const end = chartToPixel(drawing.data.endPoint);

      if (!start || !end) return;

      const priceDiff = drawing.data.endPoint.price - drawing.data.startPoint.price;
      const levels = drawing.data.levels || DEFAULT_FIB_LEVELS;

      levels.forEach((level, index) => {
        const levelPrice = drawing.data.startPoint.price + priceDiff * level;
        const y = series?.priceToCoordinate(levelPrice);

        if (y === null || y === undefined) return;

        const color = FIB_COLORS[index % FIB_COLORS.length];

        ctx.strokeStyle = color;
        ctx.lineWidth = drawing.style.lineWidth;
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(Math.min(start.x, end.x), y);
        ctx.lineTo(Math.max(start.x, end.x), y);
        ctx.stroke();

        if (drawing.style.showLabel) {
          ctx.font = '10px Inter, sans-serif';
          ctx.fillStyle = color;
          ctx.textAlign = 'left';
          ctx.fillText(
            `${(level * 100).toFixed(1)}% (${levelPrice.toFixed(2)})`,
            Math.max(start.x, end.x) + 5,
            y + 4
          );
        }

        if (drawing.style.fillOpacity > 0 && index < levels.length - 1) {
          const nextLevel = levels[index + 1];
          const nextPrice = drawing.data.startPoint.price + priceDiff * nextLevel;
          const nextY = series?.priceToCoordinate(nextPrice);

          if (nextY !== null && nextY !== undefined) {
            ctx.globalAlpha = drawing.style.fillOpacity;
            ctx.fillStyle = color;
            ctx.fillRect(
              Math.min(start.x, end.x),
              Math.min(y, nextY),
              Math.abs(end.x - start.x),
              Math.abs(nextY - y)
            );
            ctx.globalAlpha = 1;
          }
        }
      });

      if (drawing.selected) {
        renderHandle(ctx, start.x, start.y, drawing.style.color);
        renderHandle(ctx, end.x, end.y, drawing.style.color);
      }
    },
    [chartToPixel, series]
  );

  const renderRectangle = useCallback(
    (ctx: CanvasRenderingContext2D, drawing: DrawingConfig<RectangleData>) => {
      const topLeft = chartToPixel(drawing.data.topLeft);
      const bottomRight = chartToPixel(drawing.data.bottomRight);

      if (!topLeft || !bottomRight) return;

      const x = Math.min(topLeft.x, bottomRight.x);
      const y = Math.min(topLeft.y, bottomRight.y);
      const width = Math.abs(bottomRight.x - topLeft.x);
      const height = Math.abs(bottomRight.y - topLeft.y);

      if (drawing.style.fillOpacity > 0) {
        ctx.globalAlpha = drawing.style.fillOpacity;
        ctx.fillStyle = drawing.style.color;
        ctx.fillRect(x, y, width, height);
        ctx.globalAlpha = 1;
      }

      applyLineStyle(ctx, drawing.style);
      ctx.strokeRect(x, y, width, height);

      if (drawing.selected) {
        renderHandle(ctx, topLeft.x, topLeft.y, drawing.style.color);
        renderHandle(ctx, bottomRight.x, topLeft.y, drawing.style.color);
        renderHandle(ctx, topLeft.x, bottomRight.y, drawing.style.color);
        renderHandle(ctx, bottomRight.x, bottomRight.y, drawing.style.color);
      }
    },
    [chartToPixel, applyLineStyle]
  );

  const renderHandle = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string
  ) => {
    const size = 6;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.rect(x - size / 2, y - size / 2, size, size);
    ctx.fill();
    ctx.stroke();
  };

  const renderDrawing = useCallback(
    (ctx: CanvasRenderingContext2D, drawing: DrawingConfig) => {
      ctx.save();

      switch (drawing.data.type) {
        case 'horizontalLine':
          renderHorizontalLine(ctx, drawing as DrawingConfig<HorizontalLineData>);
          break;
        case 'trendline':
          renderTrendline(ctx, drawing as DrawingConfig<TrendlineData>);
          break;
        case 'fibonacciRetracement':
          renderFibonacci(ctx, drawing as DrawingConfig<FibonacciRetracementData>);
          break;
        case 'rectangle':
          renderRectangle(ctx, drawing as DrawingConfig<RectangleData>);
          break;
      }

      ctx.restore();
    },
    [renderHorizontalLine, renderTrendline, renderFibonacci, renderRectangle]
  );

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !chart || !series) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas!.width, canvas!.height);
    ctx.scale(dpr, dpr);

    visibleDrawings.forEach(drawing => {
      renderDrawing(ctx, drawing);
    });

    if (creatingDrawing) {
      renderDrawing(ctx, creatingDrawing);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [chart, series, visibleDrawings, creatingDrawing, renderDrawing]);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };

    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [containerRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    redrawCanvas();
  }, [dimensions, redrawCanvas]);

  useEffect(() => {
    if (!chart) return;

    const handleRangeChange = () => {
      redrawCanvas();
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
    };
  }, [chart, redrawCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [visibleDrawings, creatingDrawing, redrawCanvas]);

  useEffect(() => {
    if (creatingDrawing && creatingDrawing.symbol !== symbol) {
      cancelCreation();
    }
  }, [symbol, creatingDrawing, cancelCreation]);

  // Handle global mouse move for hover detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDrawingMode || draggingId) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const hitId = hitTest(x, y);
      setHoveredDrawingId(hitId);
    };

    const handleGlobalMouseUp = () => {
      if (draggingId) {
        setDraggingId(null);
        setDragStart(null);
        setInitialData(null);
      }
    };

    container.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      container.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [containerRef, isDrawingMode, draggingId, hitTest]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!chart || !series) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const point = pixelToChart(x, y);

      if (!point) return;

      if (activeTool) {
        if (!creatingDrawing) {
          startCreation(symbol, point);

          const definition = DRAWING_DEFINITIONS[activeTool];
          if (definition.requiredClicks === 1) {
            setTimeout(() => completeCreation(), 0);
          }
        } else {
          const definition = DRAWING_DEFINITIONS[creatingDrawing.toolType];
          const store = useDrawingStore.getState();
          store.addCreationPoint(point);

          if (store.creationPoints.length + 1 >= definition.requiredClicks) {
            completeCreation();
          }
        }
      } else {
        const hitId = hitTest(x, y);
        
        if (hitId) {
          selectDrawing(hitId);
          setDraggingId(hitId);
          setDragStart({ x, y });
          const drawing = getDrawing(hitId);
          if (drawing) {
            setInitialData(drawing.data);
          }
        } else {
          clearSelection();
        }
      }
    },
    [
      chart,
      series,
      activeTool,
      creatingDrawing,
      symbol,
      startCreation,
      completeCreation,
      clearSelection,
      pixelToChart,
      hitTest,
      selectDrawing,
      getDrawing
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || !chart || !series) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const point = pixelToChart(x, y);

      if (creatingDrawing && point) {
        updateCreationPreview(point);
      } else if (draggingId && dragStart && initialData && point) {
        // Handle dragging
        const drawing = getDrawing(draggingId);
        if (!drawing) return;

        if (drawing.data.type === 'horizontalLine') {
          // Horizontal line: just update price
          updateDrawingData(draggingId, { price: point.price });
        } else if (drawing.data.type === 'trendline') {
          // Trendline: delta update
          const startChart = pixelToChart(dragStart.x, dragStart.y);
          if (startChart) {
            const priceDelta = point.price - startChart.price;
            const timeDelta = point.time - startChart.time;
            
            const newStart = {
              price: initialData.startPoint.price + priceDelta,
              time: initialData.startPoint.time + timeDelta,
            };
            const newEnd = {
              price: initialData.endPoint.price + priceDelta,
              time: initialData.endPoint.time + timeDelta,
            };
            
            updateDrawingData(draggingId, { startPoint: newStart, endPoint: newEnd });
          }
        } else if (drawing.data.type === 'rectangle') {
           const startChart = pixelToChart(dragStart.x, dragStart.y);
           if (startChart) {
             const priceDelta = point.price - startChart.price;
             const timeDelta = point.time - startChart.time;
             
             const newTopLeft = {
               price: initialData.topLeft.price + priceDelta,
               time: initialData.topLeft.time + timeDelta,
             };
             const newBottomRight = {
               price: initialData.bottomRight.price + priceDelta,
               time: initialData.bottomRight.time + timeDelta,
             };
             
             updateDrawingData(draggingId, { topLeft: newTopLeft, bottomRight: newBottomRight });
           }
        }
      }
    },
    [creatingDrawing, draggingId, dragStart, initialData, chart, series, updateCreationPreview, pixelToChart, getDrawing, updateDrawingData]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (creatingDrawing) {
          cancelCreation();
        } else {
          clearSelection();
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedId = useDrawingStore.getState().selectedDrawingId;
        if (selectedId) {
          removeDrawing(selectedId);
        }
      }
    },
    [creatingDrawing, cancelCreation, clearSelection, removeDrawing]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const cursorStyle = isDrawingMode ? 'crosshair' : (hoveredDrawingId || draggingId ? 'move' : 'default');

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-10"
      style={{
        cursor: cursorStyle,
        pointerEvents: (isDrawingMode || hoveredDrawingId || draggingId) ? 'auto' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
    />
  );
};

export default DrawingOverlay;
