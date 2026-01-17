import React from 'react';
import {
  Minus,
  TrendingUp,
  GitBranch,
  Square,
  Trash2,
  MousePointer2,
} from 'lucide-react';

import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useDrawingStore } from '../../stores/drawingStore';
import { useChartStore } from '../../stores/chartStore';
import type { DrawingToolType } from '../../types/drawings';
import { cn } from '../../lib/utils';

const TOOL_ICONS: Record<DrawingToolType, React.ReactNode> = {
  horizontalLine: <Minus className="w-4 h-4" />,
  trendline: <TrendingUp className="w-4 h-4" />,
  fibonacciRetracement: <GitBranch className="w-4 h-4" />,
  rectangle: <Square className="w-4 h-4" />,
};

const TOOL_LABELS: Record<DrawingToolType, string> = {
  horizontalLine: 'Horizontal Line',
  trendline: 'Trendline',
  fibonacciRetracement: 'Fibonacci',
  rectangle: 'Rectangle',
};

export const DrawingToolbar: React.FC = () => {
  const activeTool = useDrawingStore(state => state.activeTool);
  const setActiveTool = useDrawingStore(state => state.setActiveTool);
  const clearActiveTool = useDrawingStore(state => state.clearActiveTool);
  const removeAllDrawings = useDrawingStore(state => state.removeAllDrawings);
  const symbol = useChartStore(state => state.symbol);
  const drawingCount = useDrawingStore(state => state.getDrawingCount(symbol));

  const handleToolClick = (tool: DrawingToolType) => {
    if (activeTool === tool) {
      clearActiveTool();
    } else {
      setActiveTool(tool);
    }
  };

  const handleSelectMode = () => {
    clearActiveTool();
  };

  const handleClearAll = () => {
    if (drawingCount > 0 && window.confirm(`Delete all ${drawingCount} drawings for ${symbol}?`)) {
      removeAllDrawings(symbol);
    }
  };

  const tools: DrawingToolType[] = [
    'horizontalLine',
    'trendline',
    'fibonacciRetracement',
    'rectangle',
  ];

  return (
    <div className="flex items-center gap-1 border-l border-border pl-2 ml-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7',
              !activeTool && 'bg-surface text-primary'
            )}
            onClick={handleSelectMode}
          >
            <MousePointer2 className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Select Mode</TooltipContent>
      </Tooltip>

      {tools.map(tool => (
        <Tooltip key={tool}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7',
                activeTool === tool && 'bg-surface text-primary'
              )}
              onClick={() => handleToolClick(tool)}
            >
              {TOOL_ICONS[tool]}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{TOOL_LABELS[tool]}</TooltipContent>
        </Tooltip>
      ))}

      {drawingCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-text-secondary hover:text-danger"
              onClick={handleClearAll}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear All ({drawingCount})</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};

export default DrawingToolbar;
