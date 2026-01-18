import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from './TopBar';
import { useChartStore } from '../../stores/chartStore';
import { useMarketData } from '../../hooks/useMarketData';

// Mock hooks (except chartStore)
vi.mock('../../hooks/useMarketData');
vi.mock('../../components/Sidebar/SymbolSearch', () => ({
  SymbolSearch: () => <div data-testid="symbol-search">Symbol Search Mock</div>,
}));
vi.mock('./DrawingToolbar', () => ({
  DrawingToolbar: () => <div data-testid="drawing-toolbar">Drawing Toolbar Mock</div>,
}));
vi.mock('./PriceDisplay', () => ({
  PriceDisplay: ({ price }: { price: number }) => <div data-testid="price-display">{price}</div>,
}));

describe('TopBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset store
    useChartStore.setState({
      symbol: 'BTCUSDT',
      timeframe: '1h',
      chartType: 'candles',
      isSubscribed: true,
      showVolume: true,
      showGrid: true,
      priceScale: 'normal',
    });

    (useMarketData as unknown as { mockReturnValue: (val: any) => void }).mockReturnValue({
      tickers: {
        'BTCUSDT': {
          lastPrice: '50000',
          priceChange: '100',
          priceChangePercent: '0.2',
          highPrice: '51000',
          lowPrice: '49000',
          quoteVolume: '1000000',
        },
      },
    });
  });

  it('renders symbol and timeframe', () => {
    render(<TopBar />);
    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    expect(screen.getByText('1H')).toBeInTheDocument();
  });

  it('handles timeframe change', () => {
    render(<TopBar />);
    
    // We spy on the store action indirectly or check state change
    const originalSetTimeframe = useChartStore.getState().setTimeframe;
    const mockSetTimeframe = vi.fn();
    useChartStore.setState({ setTimeframe: mockSetTimeframe });

    const button = screen.getByText('4H');
    fireEvent.click(button);
    expect(mockSetTimeframe).toHaveBeenCalledWith('4h');
    
    // Restore
    useChartStore.setState({ setTimeframe: originalSetTimeframe });
  });

  it('handles chart type change', () => {
    render(<TopBar />);
    
    const originalSetChartType = useChartStore.getState().setChartType;
    const mockSetChartType = vi.fn();
    useChartStore.setState({ setChartType: mockSetChartType });

    const lineButton = screen.getByTitle('Line Chart');
    fireEvent.click(lineButton);
    expect(mockSetChartType).toHaveBeenCalledWith('line');
    
    useChartStore.setState({ setChartType: originalSetChartType });
  });

  it('displays connection status', () => {
    render(<TopBar />);
    const statusDot = screen.getByTitle('Connected');
    expect(statusDot).toHaveClass('bg-success');
  });
});
