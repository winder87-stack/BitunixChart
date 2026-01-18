import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DrawingToolbar } from './DrawingToolbar';
import { useDrawingStore } from '../../stores/drawingStore';
import { TooltipProvider } from '../ui/tooltip';

describe('DrawingToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDrawingStore.setState({
      activeTool: null,
      selectedDrawingId: null,
      drawingsBySymbol: {},
    });
  });

  it('renders drawing tools', () => {
    render(
      <TooltipProvider>
        <DrawingToolbar />
      </TooltipProvider>
    );
    expect(screen.getByRole('button', { name: /Trendline/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Horizontal Line/i })).toBeInTheDocument();
  });

  it('activates tool on click', () => {
    const mockSetActiveTool = vi.fn();
    const originalSetActiveTool = useDrawingStore.getState().setActiveTool;
    useDrawingStore.setState({ setActiveTool: mockSetActiveTool });

    render(
      <TooltipProvider>
        <DrawingToolbar />
      </TooltipProvider>
    );
    const trendlineBtn = screen.getByRole('button', { name: /Trendline/i });
    fireEvent.click(trendlineBtn);
    expect(mockSetActiveTool).toHaveBeenCalledWith('trendline');
    
    useDrawingStore.setState({ setActiveTool: originalSetActiveTool });
  });

  it('shows active state', () => {
    useDrawingStore.setState({ activeTool: 'trendline' });

    render(
      <TooltipProvider>
        <DrawingToolbar />
      </TooltipProvider>
    );
    const trendlineBtn = screen.getByRole('button', { name: /Trendline/i });
    expect(trendlineBtn.className).toContain('bg-accent');
  });
});
