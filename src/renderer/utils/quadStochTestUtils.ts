/**
 * Quad Stochastic Test Utilities
 * 
 * Mock data generators and validators for testing the Quad Stochastic Signal System
 */

import type { ParsedKline } from '../types/bitunix';
import type { QuadSignal, DivergenceType } from '../types/quadStochastic';

// =============================================================================
// Mock Kline Generation
// =============================================================================

/**
 * Generate realistic mock klines for testing
 * 
 * @param count - Number of klines to generate
 * @param startPrice - Starting price for the simulation
 * @param volatility - Price volatility factor (0.02 = 2% moves)
 * @returns Array of ParsedKline objects
 */
export function generateMockKlines(
  count: number,
  startPrice: number,
  volatility: number = 0.02
): ParsedKline[] {
  const klines: ParsedKline[] = [];
  let price = startPrice;
  let time = Math.floor((Date.now() - count * 60000) / 1000); // seconds for lightweight-charts

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 2 * volatility * price;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * price * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * price * 0.5;
    const volume = 100 + Math.random() * 900;

    klines.push({
      time,
      open,
      high,
      low,
      close,
      volume,
    });

    price = close;
    time += 60; // 1 minute intervals (in seconds)
  }

  return klines;
}

/**
 * Generate klines with a specific trend direction
 * 
 * @param direction - 'up' or 'down' trend
 * @param count - Number of klines
 * @param startPrice - Starting price
 * @param trendStrength - Strength of trend (0.001 = 0.1% per candle)
 */
export function generateTrendingKlines(
  direction: 'up' | 'down',
  count: number,
  startPrice: number,
  trendStrength: number = 0.001
): ParsedKline[] {
  const klines: ParsedKline[] = [];
  let price = startPrice;
  let time = Math.floor((Date.now() - count * 60000) / 1000);
  const multiplier = direction === 'up' ? 1 : -1;

  for (let i = 0; i < count; i++) {
    const trendMove = multiplier * trendStrength * price;
    const noise = (Math.random() - 0.5) * 0.01 * price;
    
    const open = price;
    const close = price + trendMove + noise;
    const high = Math.max(open, close) + Math.random() * 0.005 * price;
    const low = Math.min(open, close) - Math.random() * 0.005 * price;
    const volume = 100 + Math.random() * 900;

    klines.push({ time, open, high, low, close, volume });

    price = close;
    time += 60;
  }

  return klines;
}

/**
 * Generate klines with a clear divergence pattern
 * 
 * @param type - 'BULLISH' or 'BEARISH' divergence
 * @param count - Total klines (divergence will be in the last portion)
 * @returns Klines with embedded divergence pattern
 */
export function generateDivergencePattern(
  type: 'BULLISH' | 'BEARISH',
  count: number = 100
): ParsedKline[] {
  const klines: ParsedKline[] = [];
  let price = 95000;
  let time = Math.floor((Date.now() - count * 60000) / 1000);

  // Phase 1: Initial trend (first 40% of data)
  const phase1End = Math.floor(count * 0.4);
  const phase1Direction = type === 'BULLISH' ? -1 : 1;
  
  for (let i = 0; i < phase1End; i++) {
    const trendMove = phase1Direction * 0.002 * price;
    const noise = (Math.random() - 0.5) * 0.005 * price;
    
    const open = price;
    const close = price + trendMove + noise;
    const high = Math.max(open, close) + Math.random() * 0.003 * price;
    const low = Math.min(open, close) - Math.random() * 0.003 * price;
    const volume = 100 + Math.random() * 900;

    klines.push({ time, open, high, low, close, volume });
    price = close;
    time += 60;
  }

  // Phase 2: Small retracement (next 20%)
  const phase2End = Math.floor(count * 0.6);
  const phase2Direction = type === 'BULLISH' ? 1 : -1;
  
  for (let i = phase1End; i < phase2End; i++) {
    const trendMove = phase2Direction * 0.001 * price;
    const noise = (Math.random() - 0.5) * 0.003 * price;
    
    const open = price;
    const close = price + trendMove + noise;
    const high = Math.max(open, close) + Math.random() * 0.002 * price;
    const low = Math.min(open, close) - Math.random() * 0.002 * price;
    const volume = 100 + Math.random() * 900;

    klines.push({ time, open, high, low, close, volume });
    price = close;
    time += 60;
  }

  // Phase 3: Continue original trend but WEAKER (creates divergence)
  // Price makes new extreme but momentum (stoch) doesn't
  const phase3Direction = type === 'BULLISH' ? -1 : 1;
  
  for (let i = phase2End; i < count; i++) {
    // Make price go past first swing, but with smaller candles (less momentum)
    const trendMove = phase3Direction * 0.0015 * price;
    const noise = (Math.random() - 0.5) * 0.002 * price;
    
    const open = price;
    const close = price + trendMove + noise;
    // Smaller wicks = less volatility = stoch won't reach as extreme
    const high = Math.max(open, close) + Math.random() * 0.001 * price;
    const low = Math.min(open, close) - Math.random() * 0.001 * price;
    // Lower volume also suggests weakening
    const volume = 50 + Math.random() * 400;

    klines.push({ time, open, high, low, close, volume });
    price = close;
    time += 60;
  }

  return klines;
}

/**
 * Generate klines that create oversold/overbought conditions
 */
export function generateExtremeCondition(
  condition: 'oversold' | 'overbought',
  count: number = 100
): ParsedKline[] {
  const klines: ParsedKline[] = [];
  let price = 95000;
  let time = Math.floor((Date.now() - count * 60000) / 1000);
  
  const direction = condition === 'oversold' ? -1 : 1;

  // Strong trend to push into extreme
  for (let i = 0; i < count; i++) {
    const intensity = i < count * 0.7 ? 0.003 : 0.001; // Slow down at end
    const trendMove = direction * intensity * price;
    const noise = (Math.random() - 0.5) * 0.002 * price;
    
    const open = price;
    const close = price + trendMove + noise;
    const high = Math.max(open, close) + Math.random() * 0.002 * price;
    const low = Math.min(open, close) - Math.random() * 0.002 * price;
    const volume = 100 + Math.random() * 900;

    klines.push({ time, open, high, low, close, volume });
    price = close;
    time += 60;
  }

  return klines;
}

/**
 * Generate klines within a channel range (for channel detection testing)
 */
export function generateChannelKlines(
  count: number,
  centerPrice: number,
  channelHeightPercent: number = 3
): ParsedKline[] {
  const klines: ParsedKline[] = [];
  let time = Math.floor((Date.now() - count * 60000) / 1000);
  
  const channelHeight = centerPrice * (channelHeightPercent / 100);
  const upperBound = centerPrice + channelHeight / 2;
  const lowerBound = centerPrice - channelHeight / 2;
  
  let price = centerPrice;
  let direction = 1;

  for (let i = 0; i < count; i++) {
    // Bounce off channel boundaries
    if (price >= upperBound * 0.99) direction = -1;
    if (price <= lowerBound * 1.01) direction = 1;

    const move = direction * (Math.random() * 0.003 * price);
    const noise = (Math.random() - 0.5) * 0.002 * price;
    
    const open = price;
    const close = Math.max(lowerBound, Math.min(upperBound, price + move + noise));
    const high = Math.min(upperBound, Math.max(open, close) + Math.random() * 0.001 * price);
    const low = Math.max(lowerBound, Math.min(open, close) - Math.random() * 0.001 * price);
    const volume = 100 + Math.random() * 900;

    klines.push({ time, open, high, low, close, volume });
    price = close;
    time += 60;
  }

  return klines;
}

// =============================================================================
// Signal Validation
// =============================================================================

export interface SignalValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
}

/**
 * Validate a QuadSignal for correctness and quality
 */
export function validateSignal(signal: QuadSignal): SignalValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Required field checks
  if (!signal.id || signal.id.length === 0) {
    issues.push('Missing or empty ID');
  }

  if (!signal.symbol || signal.symbol.length === 0) {
    issues.push('Missing or empty symbol');
  }

  if (!signal.timestamp || signal.timestamp <= 0) {
    issues.push('Invalid timestamp');
  }

  if (signal.type !== 'LONG' && signal.type !== 'SHORT') {
    issues.push(`Invalid signal type: ${signal.type}`);
  }

  // Price level validation for LONG
  if (signal.type === 'LONG') {
    if (signal.stopLoss >= signal.entryPrice) {
      issues.push('Stop loss at or above entry for LONG signal');
    }
    if (signal.target1 <= signal.entryPrice) {
      issues.push('Target1 at or below entry for LONG signal');
    }
    if (signal.target2 <= signal.target1) {
      issues.push('Target2 at or below Target1 for LONG signal');
    }
    if (signal.target3 <= signal.target2) {
      issues.push('Target3 at or below Target2 for LONG signal');
    }
  }

  // Price level validation for SHORT
  if (signal.type === 'SHORT') {
    if (signal.stopLoss <= signal.entryPrice) {
      issues.push('Stop loss at or below entry for SHORT signal');
    }
    if (signal.target1 >= signal.entryPrice) {
      issues.push('Target1 at or above entry for SHORT signal');
    }
    if (signal.target2 >= signal.target1) {
      issues.push('Target2 at or above Target1 for SHORT signal');
    }
    if (signal.target3 >= signal.target2) {
      issues.push('Target3 at or above Target2 for SHORT signal');
    }
  }

  // Risk/Reward validation
  if (signal.riskRewardRatio < 1) {
    issues.push(`Risk/Reward ratio below 1: ${signal.riskRewardRatio.toFixed(2)}`);
  } else if (signal.riskRewardRatio < 1.5) {
    warnings.push(`Low Risk/Reward ratio: ${signal.riskRewardRatio.toFixed(2)}`);
  }

  // Position size validation
  if (signal.positionSize <= 0) {
    issues.push('Position size must be positive');
  } else if (signal.positionSize > 10) {
    warnings.push(`High position size: ${signal.positionSize}%`);
  }

  // Confluence score validation
  if (signal.confluenceScore < 0) {
    issues.push('Confluence score cannot be negative');
  }

  // Stochastic values validation
  const bands = ['fast', 'standard', 'medium', 'slow'] as const;
  for (const band of bands) {
    const state = signal.stochStates[band];
    if (!state) {
      issues.push(`Missing stoch state for ${band} band`);
      continue;
    }
    if (state.k < 0 || state.k > 100) {
      issues.push(`Invalid ${band} K value: ${state.k}`);
    }
    if (state.d < 0 || state.d > 100) {
      issues.push(`Invalid ${band} D value: ${state.d}`);
    }
  }

  // Signal strength validation
  const validStrengths = ['WEAK', 'MODERATE', 'STRONG', 'SUPER'];
  if (!validStrengths.includes(signal.strength)) {
    issues.push(`Invalid signal strength: ${signal.strength}`);
  }

  // Status validation
  const validStatuses = [
    'PENDING', 'ACTIVE', 'PARTIAL',
    'TARGET1_HIT', 'TARGET2_HIT', 'TARGET3_HIT',
    'STOPPED', 'EXPIRED'
  ];
  if (!validStatuses.includes(signal.status)) {
    issues.push(`Invalid signal status: ${signal.status}`);
  }

  // Divergence validation (if present)
  if (signal.divergence) {
    const validDivTypes: DivergenceType[] = ['BULLISH', 'BEARISH', 'HIDDEN_BULLISH', 'HIDDEN_BEARISH'];
    if (!validDivTypes.includes(signal.divergence.type)) {
      issues.push(`Invalid divergence type: ${signal.divergence.type}`);
    }
    if (signal.divergence.angle < 0 || signal.divergence.angle > 90) {
      warnings.push(`Unusual divergence angle: ${signal.divergence.angle}`);
    }
    if (signal.divergence.candleSpan < 3) {
      warnings.push(`Very short divergence span: ${signal.divergence.candleSpan} candles`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
  };
}

/**
 * Batch validate multiple signals
 */
export function validateSignals(signals: QuadSignal[]): {
  totalSignals: number;
  validSignals: number;
  invalidSignals: number;
  results: Array<{ signal: QuadSignal; validation: SignalValidationResult }>;
} {
  const results = signals.map(signal => ({
    signal,
    validation: validateSignal(signal),
  }));

  return {
    totalSignals: signals.length,
    validSignals: results.filter(r => r.validation.valid).length,
    invalidSignals: results.filter(r => !r.validation.valid).length,
    results,
  };
}

// =============================================================================
// Performance Testing
// =============================================================================

export interface PerformanceResult {
  operationName: string;
  iterations: number;
  totalTimeMs: number;
  averageTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  passed: boolean;
  threshold: number;
}

/**
 * Measure performance of an operation
 */
export function measurePerformance<T>(
  operationName: string,
  operation: () => T,
  iterations: number = 10,
  thresholdMs: number = 100
): PerformanceResult {
  const times: number[] = [];

  // Warmup run
  operation();

  // Measured runs
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    operation();
    const end = performance.now();
    times.push(end - start);
  }

  const totalTimeMs = times.reduce((a, b) => a + b, 0);
  const averageTimeMs = totalTimeMs / iterations;
  const minTimeMs = Math.min(...times);
  const maxTimeMs = Math.max(...times);

  return {
    operationName,
    iterations,
    totalTimeMs,
    averageTimeMs,
    minTimeMs,
    maxTimeMs,
    passed: averageTimeMs < thresholdMs,
    threshold: thresholdMs,
  };
}

// =============================================================================
// Test Scenario Generators
// =============================================================================

export interface TestScenario {
  name: string;
  description: string;
  klines: ParsedKline[];
  expectedSignalType?: 'LONG' | 'SHORT' | null;
  expectedMinStrength?: 'WEAK' | 'MODERATE' | 'STRONG' | 'SUPER';
}

/**
 * Generate a suite of test scenarios
 */
export function generateTestScenarios(): TestScenario[] {
  return [
    {
      name: 'Random Walk',
      description: 'Random price movement - may or may not generate signals',
      klines: generateMockKlines(500, 95000, 0.02),
      expectedSignalType: null,
    },
    {
      name: 'Strong Uptrend',
      description: 'Clear upward trend - should not generate LONG at top',
      klines: generateTrendingKlines('up', 500, 90000, 0.002),
      expectedSignalType: null,
    },
    {
      name: 'Strong Downtrend',
      description: 'Clear downward trend - should not generate SHORT at bottom',
      klines: generateTrendingKlines('down', 500, 100000, 0.002),
      expectedSignalType: null,
    },
    {
      name: 'Bullish Divergence',
      description: 'Price lower low, stoch higher low - expect LONG signal',
      klines: generateDivergencePattern('BULLISH', 200),
      expectedSignalType: 'LONG',
    },
    {
      name: 'Bearish Divergence',
      description: 'Price higher high, stoch lower high - expect SHORT signal',
      klines: generateDivergencePattern('BEARISH', 200),
      expectedSignalType: 'SHORT',
    },
    {
      name: 'Oversold Condition',
      description: 'Strong selloff pushing stochastics oversold',
      klines: generateExtremeCondition('oversold', 150),
      expectedSignalType: 'LONG',
    },
    {
      name: 'Overbought Condition',
      description: 'Strong rally pushing stochastics overbought',
      klines: generateExtremeCondition('overbought', 150),
      expectedSignalType: 'SHORT',
    },
    {
      name: 'Channel Bound',
      description: 'Price oscillating in clear channel',
      klines: generateChannelKlines(300, 95000, 3),
      expectedSignalType: null,
    },
    {
      name: 'Minimal Data',
      description: 'Insufficient data for calculation',
      klines: generateMockKlines(50, 95000),
      expectedSignalType: null,
    },
  ];
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format a performance result for display
 */
export function formatPerformanceResult(result: PerformanceResult): string {
  const status = result.passed ? 'PASS' : 'FAIL';
  return `[${status}] ${result.operationName}: avg=${result.averageTimeMs.toFixed(2)}ms, min=${result.minTimeMs.toFixed(2)}ms, max=${result.maxTimeMs.toFixed(2)}ms (threshold: ${result.threshold}ms)`;
}

/**
 * Create a mock signal for testing UI components
 */
export function createMockSignal(overrides: Partial<QuadSignal> = {}): QuadSignal {
  const now = Date.now();
  const entryPrice = 95000;
  const isLong = overrides.type !== 'SHORT';

  return {
    id: `mock_${now}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: now,
    symbol: 'BTCUSDT',
    type: isLong ? 'LONG' : 'SHORT',
    strength: 'MODERATE',
    entryPrice,
    stopLoss: isLong ? entryPrice * 0.99 : entryPrice * 1.01,
    target1: isLong ? entryPrice * 1.005 : entryPrice * 0.995,
    target2: isLong ? entryPrice * 1.01 : entryPrice * 0.99,
    target3: isLong ? entryPrice * 1.02 : entryPrice * 0.98,
    divergence: null,
    confluence: {
      quadRotation: false,
      channelExtreme: false,
      twentyTwentyFlag: false,
      vwapConfluence: true,
      maConfluence: true,
      volumeSpike: false,
      htfAlignment: true,
    },
    confluenceScore: 3,
    stochStates: {
      fast: { k: 25, d: 22 },
      standard: { k: 30, d: 28 },
      medium: { k: 35, d: 33 },
      slow: { k: 40, d: 38 },
    },
    status: 'PENDING',
    riskRewardRatio: 2.0,
    positionSize: 2.0,
    pnlPercent: 0,
    pnlAmount: 0,
    actualEntry: null,
    actualExit: null,
    entryTime: null,
    exitTime: null,
    notes: 'Mock signal for testing',
    ...overrides,
  };
}
