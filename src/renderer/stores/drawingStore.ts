import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type {
  DrawingToolType,
  DrawingConfig,
  DrawingData,
  DrawingStyle,
  ChartPoint,
} from '../types/drawings';

import {
  createDrawingConfig,
  DRAWING_DEFINITIONS,
} from '../types/drawings';

const MAX_DRAWINGS_PER_SYMBOL = 100;

interface DrawingState {
  drawingsBySymbol: Record<string, DrawingConfig[]>;
  activeTool: DrawingToolType | null;
  creatingDrawing: DrawingConfig | null;
  creationPoints: ChartPoint[];
  selectedDrawingId: string | null;
  isDrawingMode: boolean;
}

interface DrawingActions {
  setActiveTool: (tool: DrawingToolType | null) => void;
  clearActiveTool: () => void;

  addDrawing: (drawing: DrawingConfig) => void;
  updateDrawing: (id: string, updates: Partial<DrawingConfig>) => void;
  updateDrawingData: <T extends DrawingData>(id: string, data: Partial<T>) => void;
  updateDrawingStyle: (id: string, style: Partial<DrawingStyle>) => void;
  removeDrawing: (id: string) => void;
  removeAllDrawings: (symbol?: string) => void;

  selectDrawing: (id: string | null) => void;
  clearSelection: () => void;

  startCreation: (symbol: string, point: ChartPoint) => void;
  updateCreationPreview: (point: ChartPoint) => void;
  addCreationPoint: (point: ChartPoint) => void;
  completeCreation: () => string | null;
  cancelCreation: () => void;

  toggleDrawingVisibility: (id: string) => void;
  toggleDrawingLock: (id: string) => void;

  getDrawingsForSymbol: (symbol: string) => DrawingConfig[];
  getDrawing: (id: string) => DrawingConfig | undefined;
  getVisibleDrawings: (symbol: string) => DrawingConfig[];
  getDrawingCount: (symbol: string) => number;
}

export type DrawingStore = DrawingState & DrawingActions;

function getSymbolKey(symbol: string): string {
  return symbol.toUpperCase();
}

export const useDrawingStore = create<DrawingStore>()(
  persist(
    immer((set, get) => ({
      drawingsBySymbol: {},
      activeTool: null,
      creatingDrawing: null,
      creationPoints: [],
      selectedDrawingId: null,
      isDrawingMode: false,

      setActiveTool: (tool) => {
        set(draft => {
          draft.activeTool = tool;
          draft.isDrawingMode = tool !== null;
          if (tool !== null) {
            draft.selectedDrawingId = null;
          }
        });
      },

      clearActiveTool: () => {
        set(draft => {
          draft.activeTool = null;
          draft.isDrawingMode = false;
          draft.creatingDrawing = null;
          draft.creationPoints = [];
        });
      },

      addDrawing: (drawing) => {
        const key = getSymbolKey(drawing.symbol);

        set(draft => {
          if (!draft.drawingsBySymbol[key]) {
            draft.drawingsBySymbol[key] = [];
          }

          if (draft.drawingsBySymbol[key].length >= MAX_DRAWINGS_PER_SYMBOL) {
            console.warn(`Max drawings (${MAX_DRAWINGS_PER_SYMBOL}) reached for ${key}`);
            return;
          }

          draft.drawingsBySymbol[key].push(drawing);
        });
      },

      updateDrawing: (id, updates) => {
        set(draft => {
          for (const key of Object.keys(draft.drawingsBySymbol)) {
            const drawings = draft.drawingsBySymbol[key];
            const index = drawings.findIndex(d => d.id === id);
            if (index !== -1) {
              drawings[index] = {
                ...drawings[index],
                ...updates,
                updatedAt: Date.now(),
              };
              break;
            }
          }
        });
      },

      updateDrawingData: (id, data) => {
        set(draft => {
          for (const key of Object.keys(draft.drawingsBySymbol)) {
            const drawing = draft.drawingsBySymbol[key].find(d => d.id === id);
            if (drawing) {
              drawing.data = { ...drawing.data, ...data } as DrawingData;
              drawing.updatedAt = Date.now();
              break;
            }
          }
        });
      },

      updateDrawingStyle: (id, style) => {
        set(draft => {
          for (const key of Object.keys(draft.drawingsBySymbol)) {
            const drawing = draft.drawingsBySymbol[key].find(d => d.id === id);
            if (drawing) {
              drawing.style = { ...drawing.style, ...style };
              drawing.updatedAt = Date.now();
              break;
            }
          }
        });
      },

      removeDrawing: (id) => {
        set(draft => {
          for (const key of Object.keys(draft.drawingsBySymbol)) {
            const index = draft.drawingsBySymbol[key].findIndex(d => d.id === id);
            if (index !== -1) {
              draft.drawingsBySymbol[key].splice(index, 1);
              if (draft.selectedDrawingId === id) {
                draft.selectedDrawingId = null;
              }
              break;
            }
          }
        });
      },

      removeAllDrawings: (symbol) => {
        set(draft => {
          if (symbol) {
            const key = getSymbolKey(symbol);
            draft.drawingsBySymbol[key] = [];
          } else {
            draft.drawingsBySymbol = {};
          }
          draft.selectedDrawingId = null;
        });
      },

      selectDrawing: (id) => {
        set(draft => {
          for (const key of Object.keys(draft.drawingsBySymbol)) {
            for (const drawing of draft.drawingsBySymbol[key]) {
              drawing.selected = drawing.id === id && !drawing.locked;
            }
          }

          draft.selectedDrawingId = id;
          draft.activeTool = null;
          draft.isDrawingMode = false;
        });
      },

      clearSelection: () => {
        set(draft => {
          for (const key of Object.keys(draft.drawingsBySymbol)) {
            for (const drawing of draft.drawingsBySymbol[key]) {
              drawing.selected = false;
            }
          }
          draft.selectedDrawingId = null;
        });
      },

      startCreation: (symbol, point) => {
        const state = get();
        const tool = state.activeTool;
        if (!tool) return;

        const colorIndex = state.getDrawingCount(symbol);
        const drawing = createDrawingConfig(tool, symbol, colorIndex);

        if (drawing.data.type === 'horizontalLine') {
          drawing.data.price = point.price;
        } else if (
          drawing.data.type === 'trendline' ||
          drawing.data.type === 'fibonacciRetracement'
        ) {
          drawing.data.startPoint = point;
          drawing.data.endPoint = point;
        } else if (drawing.data.type === 'rectangle') {
          drawing.data.topLeft = point;
          drawing.data.bottomRight = point;
        }

        set(draft => {
          draft.creatingDrawing = drawing;
          draft.creationPoints = [point];
        });
      },

      updateCreationPreview: (point) => {
        const state = get();
        if (!state.creatingDrawing) return;

        set(draft => {
          if (!draft.creatingDrawing) return;

          const data = draft.creatingDrawing.data;

          if (data.type === 'horizontalLine') {
            data.price = point.price;
          } else if (
            data.type === 'trendline' ||
            data.type === 'fibonacciRetracement'
          ) {
            data.endPoint = point;
          } else if (data.type === 'rectangle') {
            data.bottomRight = point;
          }
        });
      },

      addCreationPoint: (point) => {
        set(draft => {
          draft.creationPoints.push(point);
        });
      },

      completeCreation: () => {
        const state = get();
        const drawing = state.creatingDrawing;
        if (!drawing) return null;

        const definition = DRAWING_DEFINITIONS[drawing.toolType];
        if (state.creationPoints.length < definition.requiredClicks) {
          return null;
        }

        const finalDrawing: DrawingConfig = {
          ...drawing,
          selected: false,
        };

        get().addDrawing(finalDrawing);

        set(draft => {
          draft.creatingDrawing = null;
          draft.creationPoints = [];
          draft.activeTool = null;
          draft.isDrawingMode = false;
        });

        return finalDrawing.id;
      },

      cancelCreation: () => {
        set(draft => {
          draft.creatingDrawing = null;
          draft.creationPoints = [];
        });
      },

      toggleDrawingVisibility: (id) => {
        set(draft => {
          for (const key of Object.keys(draft.drawingsBySymbol)) {
            const drawing = draft.drawingsBySymbol[key].find(d => d.id === id);
            if (drawing) {
              drawing.visible = !drawing.visible;
              drawing.updatedAt = Date.now();
              break;
            }
          }
        });
      },

      toggleDrawingLock: (id) => {
        set(draft => {
          for (const key of Object.keys(draft.drawingsBySymbol)) {
            const drawing = draft.drawingsBySymbol[key].find(d => d.id === id);
            if (drawing) {
              drawing.locked = !drawing.locked;
              if (drawing.locked) {
                drawing.selected = false;
              }
              drawing.updatedAt = Date.now();
              break;
            }
          }
        });
      },

      getDrawingsForSymbol: (symbol) => {
        const key = getSymbolKey(symbol);
        return get().drawingsBySymbol[key] || [];
      },

      getDrawing: (id) => {
        const state = get();
        for (const key of Object.keys(state.drawingsBySymbol)) {
          const drawing = state.drawingsBySymbol[key].find(d => d.id === id);
          if (drawing) return drawing;
        }
        return undefined;
      },

      getVisibleDrawings: (symbol) => {
        return get()
          .getDrawingsForSymbol(symbol)
          .filter(d => d.visible)
          .sort((a, b) => a.zIndex - b.zIndex);
      },

      getDrawingCount: (symbol) => {
        return get().getDrawingsForSymbol(symbol).length;
      },
    })),
    {
      name: 'bitunix-drawings',
      storage: createJSONStorage(() => localStorage),

      partialize: (state) => ({
        drawingsBySymbol: state.drawingsBySymbol,
      }),

      onRehydrateStorage: () => (state) => {
        if (state) {
          state.activeTool = null;
          state.creatingDrawing = null;
          state.creationPoints = [];
          state.selectedDrawingId = null;
          state.isDrawingMode = false;
        }
      },
    }
  )
);

export const selectActiveTool = (state: DrawingStore) => state.activeTool;
export const selectIsDrawingMode = (state: DrawingStore) => state.isDrawingMode;
export const selectSelectedDrawingId = (state: DrawingStore) => state.selectedDrawingId;
export const selectCreatingDrawing = (state: DrawingStore) => state.creatingDrawing;

export const selectDrawingsForSymbol = (symbol: string) =>
  (state: DrawingStore) => state.getDrawingsForSymbol(symbol);

export const selectVisibleDrawings = (symbol: string) =>
  (state: DrawingStore) => state.getVisibleDrawings(symbol);

export default useDrawingStore;
