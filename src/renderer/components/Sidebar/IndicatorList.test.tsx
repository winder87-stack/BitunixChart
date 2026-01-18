import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IndicatorList } from './IndicatorList';
import { useIndicatorStore } from '../../stores/indicatorStore';

// Mock store
vi.mock('../../stores/indicatorStore');

describe('IndicatorList', () => {
  const mockAddIndicator = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useIndicatorStore as unknown as { mockReturnValue: (val: any) => void }).mockReturnValue({
      activeIndicators: [],
      addIndicator: mockAddIndicator,
      canAddMore: () => true,
      toggleIndicatorVisibility: vi.fn(),
      selectIndicator: vi.fn(),
      removeIndicator: vi.fn(),
      reorderIndicators: vi.fn(),
    });
  });

  it('renders indicator categories', () => {
    render(<IndicatorList />);
    expect(screen.getByText('trend')).toBeInTheDocument();
    expect(screen.getByText('momentum')).toBeInTheDocument();
  });

  it('adds indicator on click', () => {
    render(<IndicatorList />);
    
    const sma = screen.getByText('Simple Moving Average');
    fireEvent.click(sma);
    expect(mockAddIndicator).toHaveBeenCalledWith('SMA');
  });

  it('filters indicators on search', () => {
    render(<IndicatorList />);
    const searchInput = screen.getByPlaceholderText('Search indicators...');
    fireEvent.change(searchInput, { target: { value: 'RSI' } });
    
    expect(screen.getByText('Relative Strength Index')).toBeInTheDocument();
    expect(screen.queryByText('Simple Moving Average')).not.toBeInTheDocument();
  });
});
