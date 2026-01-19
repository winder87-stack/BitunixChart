import { useState } from 'react';
import { cn } from '../../lib/utils';
import { useQuadStochasticStore } from '../../stores/quadStochasticStore';
import {
  generateMockKlines,
  generateDivergencePattern,
  validateSignal,
  measurePerformance,
  generateTestScenarios,
} from '../../utils/quadStochTestUtils';
import { calculateQuadStochSignals } from '../../services/indicators/quadStochCalculator';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

export function QuadStochDebug() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const config = useQuadStochasticStore((state) => state.config);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    const results: TestResult[] = [];

    await new Promise((resolve) => setTimeout(resolve, 10));

    try {
      const mockKlines = generateMockKlines(500, 95000);
      const basicResult = calculateQuadStochSignals('TEST', mockKlines, config);
      results.push({
        name: 'Basic Calculation',
        passed: basicResult.quadData.fast.length > 0,
        details: `Generated ${basicResult.signals.length} signals, ${basicResult.quadData.fast.length} data points`,
      });
    } catch (err) {
      results.push({
        name: 'Basic Calculation',
        passed: false,
        details: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 10));

    try {
      const bullishKlines = generateDivergencePattern('BULLISH', 200);
      const bullishResult = calculateQuadStochSignals('TEST', bullishKlines, config);
      const longSignals = bullishResult.signals.filter((s) => s.type === 'LONG');
      results.push({
        name: 'Bullish Divergence Detection',
        passed: longSignals.length > 0,
        details: `Found ${longSignals.length} LONG signals from bullish pattern`,
      });
    } catch (err) {
      results.push({
        name: 'Bullish Divergence Detection',
        passed: false,
        details: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 10));

    try {
      const bearishKlines = generateDivergencePattern('BEARISH', 200);
      const bearishResult = calculateQuadStochSignals('TEST', bearishKlines, config);
      const shortSignals = bearishResult.signals.filter((s) => s.type === 'SHORT');
      results.push({
        name: 'Bearish Divergence Detection',
        passed: shortSignals.length > 0,
        details: `Found ${shortSignals.length} SHORT signals from bearish pattern`,
      });
    } catch (err) {
      results.push({
        name: 'Bearish Divergence Detection',
        passed: false,
        details: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 10));

    try {
      const validationKlines = generateMockKlines(500, 95000);
      const validationResult = calculateQuadStochSignals('TEST', validationKlines, config);
      let validationIssues: string[] = [];

      for (const signal of validationResult.signals) {
        const validation = validateSignal(signal);
        if (!validation.valid) {
          validationIssues = validationIssues.concat(validation.issues);
        }
      }

      results.push({
        name: 'Signal Validation',
        passed: validationIssues.length === 0,
        details:
          validationIssues.length === 0
            ? `All ${validationResult.signals.length} signals passed validation`
            : `Issues: ${validationIssues.slice(0, 3).join(', ')}${validationIssues.length > 3 ? '...' : ''}`,
      });
    } catch (err) {
      results.push({
        name: 'Signal Validation',
        passed: false,
        details: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 10));

    try {
      const perfKlines = generateMockKlines(500, 95000);
      const perfResult = measurePerformance(
        'Calculate Signals (500 klines)',
        () => calculateQuadStochSignals('TEST', perfKlines, config),
        10,
        100
      );

      results.push({
        name: 'Performance (500 klines)',
        passed: perfResult.passed,
        details: `Avg: ${perfResult.averageTimeMs.toFixed(2)}ms, Min: ${perfResult.minTimeMs.toFixed(2)}ms, Max: ${perfResult.maxTimeMs.toFixed(2)}ms`,
      });
    } catch (err) {
      results.push({
        name: 'Performance',
        passed: false,
        details: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 10));

    try {
      const scenarios = generateTestScenarios();
      let scenariosPassed = 0;
      const scenarioResults: string[] = [];

      for (const scenario of scenarios.slice(0, 5)) {
        const result = calculateQuadStochSignals('TEST', scenario.klines, config);
        const hasExpectedSignal =
          scenario.expectedSignalType === null ||
          result.signals.some((s) => s.type === scenario.expectedSignalType);

        if (hasExpectedSignal) {
          scenariosPassed++;
        } else {
          scenarioResults.push(scenario.name);
        }
      }

      results.push({
        name: 'Test Scenarios',
        passed: scenariosPassed >= 4,
        details:
          scenarioResults.length === 0
            ? `${scenariosPassed}/5 scenarios passed`
            : `Failed: ${scenarioResults.join(', ')}`,
      });
    } catch (err) {
      results.push({
        name: 'Test Scenarios',
        passed: false,
        details: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }

    setTestResults(results);
    setIsRunning(false);
  };

  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = testResults.length;

  return (
    <div className="p-4 bg-[#1e222d] rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#d1d4dc]">Quad Stochastic Tests</h3>
        {totalCount > 0 && (
          <span
            className={cn(
              'text-sm font-medium px-2 py-1 rounded',
              passedCount === totalCount ? 'bg-[#26a69a]/20 text-[#26a69a]' : 'bg-[#ef5350]/20 text-[#ef5350]'
            )}
          >
            {passedCount}/{totalCount} Passed
          </span>
        )}
      </div>

      <button
        onClick={runTests}
        disabled={isRunning}
        className={cn(
          'px-4 py-2 rounded font-medium transition-colors',
          isRunning
            ? 'bg-[#2962ff]/50 text-[#787b86] cursor-not-allowed'
            : 'bg-[#2962ff] hover:bg-[#2962ff]/80 text-white'
        )}
      >
        {isRunning ? 'Running...' : 'Run Tests'}
      </button>

      {testResults.length > 0 && (
        <div className="mt-4 space-y-2">
          {testResults.map((result, index) => (
            <div
              key={index}
              className={cn('p-3 rounded', result.passed ? 'bg-[#26a69a]/20' : 'bg-[#ef5350]/20')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={result.passed ? 'text-[#26a69a]' : 'text-[#ef5350]'}>
                    {result.passed ? '✓' : '✗'}
                  </span>
                  <span className="font-medium text-[#d1d4dc]">{result.name}</span>
                </div>
                <span className="text-sm text-[#787b86] max-w-[50%] text-right truncate" title={result.details}>
                  {result.details}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
