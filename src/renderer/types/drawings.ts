/**
 * Drawing Tools Type Definitions
 * 
 * Complete type system for chart drawing tools including:
 * - Tool types and categories
 * - Drawing configurations
 * - Style definitions
 * - Serialization types
 */

// =============================================================================
// Drawing Tool Types
// =============================================================================

/**
 * All available drawing tool types
 */
export type DrawingToolType =
  | 'horizontalLine'
  | 'trendline'
  | 'fibonacciRetracement'
  | 'rectangle';

/**
 * Drawing tool category for grouping in UI
 */
export type DrawingCategory = 'lines' | 'fibonacci' | 'shapes';

/**
 * Line style options
 */
export type DrawingLineStyle = 'solid' | 'dashed' | 'dotted';

// =============================================================================
// Point & Coordinate Types
// =============================================================================

/**
 * Chart coordinate (price/time space)
 */
export interface ChartPoint {
  /** Price value (y-axis) */
  price: number;
  /** Unix timestamp in seconds (x-axis) */
  time: number;
}

/**
 * Pixel coordinate (screen space)
 */
export interface PixelPoint {
  x: number;
  y: number;
}

// =============================================================================
// Drawing Style Configuration
// =============================================================================

/**
 * Visual style for a drawing
 */
export interface DrawingStyle {
  /** Primary line/stroke color (hex) */
  color: string;
  /** Line width in pixels */
  lineWidth: 1 | 2 | 3 | 4;
  /** Line style */
  lineStyle: DrawingLineStyle;
  /** Show price label */
  showLabel: boolean;
  /** Extend line to edges (for lines) */
  extend: 'none' | 'left' | 'right' | 'both';
  /** Fill opacity for shapes (0-1) */
  fillOpacity: number;
}

/**
 * Default styles per tool type
 */
export const DEFAULT_DRAWING_STYLES: Record<DrawingToolType, DrawingStyle> = {
  horizontalLine: {
    color: '#2962ff',
    lineWidth: 2,
    lineStyle: 'solid',
    showLabel: true,
    extend: 'both',
    fillOpacity: 0,
  },
  trendline: {
    color: '#ff9800',
    lineWidth: 2,
    lineStyle: 'solid',
    showLabel: false,
    extend: 'right',
    fillOpacity: 0,
  },
  fibonacciRetracement: {
    color: '#9c27b0',
    lineWidth: 1,
    lineStyle: 'solid',
    showLabel: true,
    extend: 'both',
    fillOpacity: 0.05,
  },
  rectangle: {
    color: '#00bcd4',
    lineWidth: 2,
    lineStyle: 'solid',
    showLabel: false,
    extend: 'none',
    fillOpacity: 0.1,
  },
};

// =============================================================================
// Tool-Specific Data (Discriminated Unions)
// =============================================================================

/**
 * Horizontal line specific data
 */
export interface HorizontalLineData {
  type: 'horizontalLine';
  price: number;
}

/**
 * Trendline specific data
 */
export interface TrendlineData {
  type: 'trendline';
  startPoint: ChartPoint;
  endPoint: ChartPoint;
}

/**
 * Fibonacci retracement specific data
 */
export interface FibonacciRetracementData {
  type: 'fibonacciRetracement';
  startPoint: ChartPoint;
  endPoint: ChartPoint;
  /** Fibonacci levels to display */
  levels: number[];
}

/**
 * Rectangle specific data
 */
export interface RectangleData {
  type: 'rectangle';
  topLeft: ChartPoint;
  bottomRight: ChartPoint;
}

/**
 * Union of all tool-specific data
 */
export type DrawingData =
  | HorizontalLineData
  | TrendlineData
  | FibonacciRetracementData
  | RectangleData;

// =============================================================================
// Drawing Configuration
// =============================================================================

/**
 * Complete drawing instance
 */
export interface DrawingConfig<T extends DrawingData = DrawingData> {
  /** Unique identifier */
  id: string;
  /** Tool type */
  toolType: DrawingToolType;
  /** Symbol this drawing belongs to */
  symbol: string;
  /** Whether drawing is visible */
  visible: boolean;
  /** Whether drawing is locked (prevents editing) */
  locked: boolean;
  /** Whether drawing is selected */
  selected: boolean;
  /** Tool-specific data */
  data: T;
  /** Visual style */
  style: DrawingStyle;
  /** Optional custom label */
  label?: string;
  /** Z-index for layering */
  zIndex: number;
  /** Creation timestamp */
  createdAt: number;
  /** Last modification timestamp */
  updatedAt: number;
}

// =============================================================================
// Drawing Definition (Metadata for UI)
// =============================================================================

/**
 * Metadata definition for a drawing tool
 */
export interface DrawingToolDefinition {
  type: DrawingToolType;
  name: string;
  shortName: string;
  category: DrawingCategory;
  description: string;
  icon: string; // Lucide icon name
  /** Number of clicks required to complete drawing */
  requiredClicks: number;
}

/**
 * All drawing tool definitions
 */
export const DRAWING_DEFINITIONS: Record<DrawingToolType, DrawingToolDefinition> = {
  horizontalLine: {
    type: 'horizontalLine',
    name: 'Horizontal Line',
    shortName: 'H-Line',
    category: 'lines',
    description: 'Draw a horizontal price level line',
    icon: 'Minus',
    requiredClicks: 1,
  },
  trendline: {
    type: 'trendline',
    name: 'Trendline',
    shortName: 'Trend',
    category: 'lines',
    description: 'Draw a diagonal trend line between two points',
    icon: 'TrendingUp',
    requiredClicks: 2,
  },
  fibonacciRetracement: {
    type: 'fibonacciRetracement',
    name: 'Fibonacci Retracement',
    shortName: 'Fib',
    category: 'fibonacci',
    description: 'Draw Fibonacci retracement levels between two points',
    icon: 'GitBranch',
    requiredClicks: 2,
  },
  rectangle: {
    type: 'rectangle',
    name: 'Rectangle',
    shortName: 'Rect',
    category: 'shapes',
    description: 'Draw a rectangular zone on the chart',
    icon: 'Square',
    requiredClicks: 2,
  },
};

/**
 * Default Fibonacci levels
 */
export const DEFAULT_FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

// =============================================================================
// Color Palette
// =============================================================================

/**
 * Color palette for automatic drawing colors
 */
export const DRAWING_COLOR_PALETTE = [
  '#2962ff', // Blue
  '#ff6d00', // Orange
  '#00bfa5', // Teal
  '#9c27b0', // Purple
  '#00c853', // Green
  '#ff1744', // Red
  '#ffd600', // Yellow
  '#00b8d4', // Cyan
];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate unique drawing ID
 */
export function generateDrawingId(): string {
  return `drw_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Get drawing definition by type
 */
export function getDrawingDefinition(type: DrawingToolType): DrawingToolDefinition {
  return DRAWING_DEFINITIONS[type];
}

/**
 * Get default style for a drawing type
 */
export function getDefaultDrawingStyle(type: DrawingToolType): DrawingStyle {
  return { ...DEFAULT_DRAWING_STYLES[type] };
}

/**
 * Create default drawing data for a tool type
 */
export function createDefaultDrawingData(type: DrawingToolType): DrawingData {
  switch (type) {
    case 'horizontalLine':
      return { type: 'horizontalLine', price: 0 };
    case 'trendline':
      return {
        type: 'trendline',
        startPoint: { price: 0, time: 0 },
        endPoint: { price: 0, time: 0 },
      };
    case 'fibonacciRetracement':
      return {
        type: 'fibonacciRetracement',
        startPoint: { price: 0, time: 0 },
        endPoint: { price: 0, time: 0 },
        levels: [...DEFAULT_FIB_LEVELS],
      };
    case 'rectangle':
      return {
        type: 'rectangle',
        topLeft: { price: 0, time: 0 },
        bottomRight: { price: 0, time: 0 },
      };
  }
}

/**
 * Create new drawing configuration
 */
export function createDrawingConfig(
  type: DrawingToolType,
  symbol: string,
  colorIndex: number = 0
): DrawingConfig {
  const color = DRAWING_COLOR_PALETTE[colorIndex % DRAWING_COLOR_PALETTE.length];
  const defaultStyle = getDefaultDrawingStyle(type);

  return {
    id: generateDrawingId(),
    toolType: type,
    symbol,
    visible: true,
    locked: false,
    selected: false,
    data: createDefaultDrawingData(type),
    style: { ...defaultStyle, color },
    zIndex: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
