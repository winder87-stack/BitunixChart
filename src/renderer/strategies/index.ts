import { Strategy } from '../types/strategy';
import KuriskoQuadStochStrategy from './kurisko-quad-stoch';

// ============================================
// STRATEGY REGISTRY
// Add new strategies here
// ============================================

export const STRATEGIES: Record<string, Strategy> = {
  'kurisko-quad-stoch': KuriskoQuadStochStrategy,
  // Future strategies:
  // 'ema-crossover': EmaCrossoverStrategy,
  // 'rsi-divergence': RsiDivergenceStrategy,
  // 'breakout-retest': BreakoutRetestStrategy,
};

// Get strategy by ID
export function getStrategy(id: string): Strategy | undefined {
  return STRATEGIES[id];
}

// Get all strategies
export function getAllStrategies(): Strategy[] {
  return Object.values(STRATEGIES);
}

// Get strategies by category
export function getStrategiesByCategory(category: string): Strategy[] {
  return Object.values(STRATEGIES).filter(s => s.info.category === category);
}

// Get strategies for timeframe
export function getStrategiesForTimeframe(timeframe: string): Strategy[] {
  return Object.values(STRATEGIES).filter(s => 
    s.info.timeframes.includes(timeframe)
  );
}

// Default strategy
export const DEFAULT_STRATEGY_ID = 'kurisko-quad-stoch';
export const DEFAULT_STRATEGY = KuriskoQuadStochStrategy;

export { KuriskoQuadStochStrategy };
