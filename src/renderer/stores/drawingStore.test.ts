import { describe, it, expect, beforeEach } from 'vitest';
import { useDrawingStore } from './drawingStore';
import { createDrawingConfig } from '../types/drawings';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('drawingStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useDrawingStore.setState({
      drawingsBySymbol: {},
      activeTool: null,
      creatingDrawing: null,
      creationPoints: [],
      selectedDrawingId: null,
      isDrawingMode: false,
    });
  });

  it('should activate drawing tool', () => {
    useDrawingStore.getState().setActiveTool('trendline');
    const state = useDrawingStore.getState();
    expect(state.activeTool).toBe('trendline');
    expect(state.isDrawingMode).toBe(true);
    expect(state.selectedDrawingId).toBeNull();
  });

  it('should clear active tool', () => {
    useDrawingStore.getState().setActiveTool('trendline');
    useDrawingStore.getState().clearActiveTool();
    const state = useDrawingStore.getState();
    expect(state.activeTool).toBeNull();
    expect(state.isDrawingMode).toBe(false);
  });

  it('should add drawing', () => {
    const drawing = createDrawingConfig('trendline', 'BTCUSDT');
    useDrawingStore.getState().addDrawing(drawing);
    
    const state = useDrawingStore.getState();
    const drawings = state.getDrawingsForSymbol('BTCUSDT');
    expect(drawings).toHaveLength(1);
    expect(drawings[0].id).toBe(drawing.id);
  });

  it('should remove drawing', () => {
    const drawing = createDrawingConfig('trendline', 'BTCUSDT');
    useDrawingStore.getState().addDrawing(drawing);
    useDrawingStore.getState().removeDrawing(drawing.id);
    
    const drawings = useDrawingStore.getState().getDrawingsForSymbol('BTCUSDT');
    expect(drawings).toHaveLength(0);
  });

  it('should select drawing', () => {
    const drawing = createDrawingConfig('trendline', 'BTCUSDT');
    useDrawingStore.getState().addDrawing(drawing);
    useDrawingStore.getState().selectDrawing(drawing.id);
    
    const state = useDrawingStore.getState();
    expect(state.selectedDrawingId).toBe(drawing.id);
    expect(state.getDrawingsForSymbol('BTCUSDT')[0].selected).toBe(true);
  });

  it('should update drawing style', () => {
    const drawing = createDrawingConfig('trendline', 'BTCUSDT');
    useDrawingStore.getState().addDrawing(drawing);
    
    useDrawingStore.getState().updateDrawingStyle(drawing.id, { color: '#ff0000' });
    
    const updated = useDrawingStore.getState().getDrawing(drawing.id);
    expect(updated?.style.color).toBe('#ff0000');
  });

  it('should handle creation lifecycle', () => {
    useDrawingStore.getState().setActiveTool('trendline');
    const startPoint = { time: 1000, price: 50000 };
    
    // Start creation
    useDrawingStore.getState().startCreation('BTCUSDT', startPoint);
    let state = useDrawingStore.getState();
    expect(state.creatingDrawing).toBeTruthy();
    expect(state.creationPoints).toHaveLength(1);
    
    const movePoint = { time: 2000, price: 51000 };
    useDrawingStore.getState().updateCreationPreview(movePoint);
    
    state = useDrawingStore.getState();
    expect(state.creatingDrawing?.data.type).toBe('trendline');
    
    useDrawingStore.getState().addCreationPoint(movePoint);
    
    const id = useDrawingStore.getState().completeCreation();
    expect(id).toBeTruthy();
    
    state = useDrawingStore.getState();
    expect(state.creatingDrawing).toBeNull();
    expect(state.isDrawingMode).toBe(false);
    expect(state.getDrawingsForSymbol('BTCUSDT')).toHaveLength(1);
  });

  it('should handle fibonacci creation', () => {
    useDrawingStore.getState().setActiveTool('fibonacciRetracement');
    const startPoint = { time: 1000, price: 50000 };
    
    useDrawingStore.getState().startCreation('BTCUSDT', startPoint);
    let state = useDrawingStore.getState();
    expect(state.creatingDrawing?.data.type).toBe('fibonacciRetracement');
    
    const movePoint = { time: 2000, price: 55000 };
    useDrawingStore.getState().updateCreationPreview(movePoint);
    useDrawingStore.getState().addCreationPoint(movePoint);
    
    const id = useDrawingStore.getState().completeCreation();
    
    expect(id).toBeTruthy();
    const drawing = useDrawingStore.getState().getDrawing(id!);
    expect(drawing?.data.type).toBe('fibonacciRetracement');
    expect((drawing?.data as any).endPoint).toEqual(movePoint);
  });
});
