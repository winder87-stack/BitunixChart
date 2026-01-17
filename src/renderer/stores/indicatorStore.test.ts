import { describe, it, expect, beforeEach } from 'vitest';
import { useIndicatorStore, MAX_INDICATORS } from './indicatorStore';
import type { IndicatorType } from '../types/indicators';

describe('indicatorStore', () => {
  beforeEach(() => {
    useIndicatorStore.setState({
      activeIndicators: [],
      indicatorResults: {},
      selectedIndicatorId: null,
      isCalculating: false,
      errors: {},
    });
  });

  describe('addIndicator', () => {
    it('should add an indicator and return its ID', () => {
      const store = useIndicatorStore.getState();
      const id = store.addIndicator('SMA');

      expect(id).toBeTruthy();
      expect(store.activeIndicators).toHaveLength(0);

      const updatedStore = useIndicatorStore.getState();
      expect(updatedStore.activeIndicators).toHaveLength(1);
      expect(updatedStore.activeIndicators[0].type).toBe('SMA');
    });

    it('should auto-select newly added indicator', () => {
      const store = useIndicatorStore.getState();
      const id = store.addIndicator('EMA');

      const updatedStore = useIndicatorStore.getState();
      expect(updatedStore.selectedIndicatorId).toBe(id);
    });

    it('should respect MAX_INDICATORS limit', () => {
      const store = useIndicatorStore.getState();
      const indicators: IndicatorType[] = ['SMA', 'EMA', 'RSI', 'MACD', 'BB', 'ATR', 'STOCH', 'CCI', 'WILLR', 'ROC'];

      indicators.forEach((type) => store.addIndicator(type));

      const storeAfter10 = useIndicatorStore.getState();
      expect(storeAfter10.activeIndicators).toHaveLength(MAX_INDICATORS);

      const eleventhId = storeAfter10.addIndicator('OBV');
      expect(eleventhId).toBeNull();

      const finalStore = useIndicatorStore.getState();
      expect(finalStore.activeIndicators).toHaveLength(MAX_INDICATORS);
    });

    it('should assign different colors to each indicator', () => {
      const store = useIndicatorStore.getState();
      store.addIndicator('SMA');
      store.addIndicator('EMA');
      store.addIndicator('RSI');

      const updatedStore = useIndicatorStore.getState();
      const colors = updatedStore.activeIndicators.map((ind) => ind.style.color);
      const uniqueColors = new Set(colors);

      expect(uniqueColors.size).toBe(3);
    });
  });

  describe('removeIndicator', () => {
    it('should remove an indicator by ID', () => {
      const store = useIndicatorStore.getState();
      const id = store.addIndicator('SMA');

      expect(useIndicatorStore.getState().activeIndicators).toHaveLength(1);

      useIndicatorStore.getState().removeIndicator(id!);

      expect(useIndicatorStore.getState().activeIndicators).toHaveLength(0);
    });

    it('should clear results when indicator is removed', () => {
      const store = useIndicatorStore.getState();
      const id = store.addIndicator('SMA');

      store.setIndicatorResults(id!, [{ time: 1, values: { sma: 100 } }]);
      expect(useIndicatorStore.getState().indicatorResults[id!]).toBeDefined();

      useIndicatorStore.getState().removeIndicator(id!);
      expect(useIndicatorStore.getState().indicatorResults[id!]).toBeUndefined();
    });

    it('should deselect if removed indicator was selected', () => {
      const store = useIndicatorStore.getState();
      const id = store.addIndicator('SMA');

      expect(useIndicatorStore.getState().selectedIndicatorId).toBe(id);

      useIndicatorStore.getState().removeIndicator(id!);

      expect(useIndicatorStore.getState().selectedIndicatorId).toBeNull();
    });
  });

  describe('updateIndicatorParams', () => {
    it('should update indicator parameters', () => {
      const store = useIndicatorStore.getState();
      const id = store.addIndicator('SMA');

      useIndicatorStore.getState().updateIndicatorParams(id!, { period: 50 });

      const indicator = useIndicatorStore.getState().activeIndicators[0];
      expect(indicator.params.period).toBe(50);
    });

    it('should update updatedAt timestamp', () => {
      const store = useIndicatorStore.getState();
      const id = store.addIndicator('SMA');

      const originalTimestamp = useIndicatorStore.getState().activeIndicators[0].updatedAt;

      useIndicatorStore.getState().updateIndicatorParams(id!, { period: 50 });

      const newTimestamp = useIndicatorStore.getState().activeIndicators[0].updatedAt;
      expect(newTimestamp).toBeGreaterThanOrEqual(originalTimestamp);
    });

    it('should clear previous results to trigger recalculation', () => {
      const store = useIndicatorStore.getState();
      const id = store.addIndicator('SMA');

      store.setIndicatorResults(id!, [{ time: 1, values: { sma: 100 } }]);
      expect(useIndicatorStore.getState().indicatorResults[id!]).toBeDefined();

      useIndicatorStore.getState().updateIndicatorParams(id!, { period: 50 });

      expect(useIndicatorStore.getState().indicatorResults[id!]).toBeUndefined();
    });
  });

  describe('updateIndicatorStyle', () => {
    it('should update indicator style', () => {
      const store = useIndicatorStore.getState();
      const id = store.addIndicator('SMA');

      useIndicatorStore.getState().updateIndicatorStyle(id!, { color: '#ff0000', lineWidth: 3 });

      const indicator = useIndicatorStore.getState().activeIndicators[0];
      expect(indicator.style.color).toBe('#ff0000');
      expect(indicator.style.lineWidth).toBe(3);
    });
  });

  describe('toggleIndicatorVisibility', () => {
    it('should toggle visibility', () => {
      const store = useIndicatorStore.getState();
      const id = store.addIndicator('SMA');

      expect(useIndicatorStore.getState().activeIndicators[0].visible).toBe(true);

      useIndicatorStore.getState().toggleIndicatorVisibility(id!);

      expect(useIndicatorStore.getState().activeIndicators[0].visible).toBe(false);

      useIndicatorStore.getState().toggleIndicatorVisibility(id!);

      expect(useIndicatorStore.getState().activeIndicators[0].visible).toBe(true);
    });
  });

  describe('toggleIndicatorEnabled', () => {
    it('should toggle enabled state', () => {
      const store = useIndicatorStore.getState();
      const id = store.addIndicator('SMA');

      expect(useIndicatorStore.getState().activeIndicators[0].enabled).toBe(true);

      useIndicatorStore.getState().toggleIndicatorEnabled(id!);

      expect(useIndicatorStore.getState().activeIndicators[0].enabled).toBe(false);
    });

    it('should clear results when disabled', () => {
      const store = useIndicatorStore.getState();
      const id = store.addIndicator('SMA');

      store.setIndicatorResults(id!, [{ time: 1, values: { sma: 100 } }]);

      useIndicatorStore.getState().toggleIndicatorEnabled(id!);

      expect(useIndicatorStore.getState().indicatorResults[id!]).toBeUndefined();
    });
  });

  describe('setIndicatorResults', () => {
    it('should store indicator results', () => {
      const store = useIndicatorStore.getState();
      const id = store.addIndicator('SMA');

      const results = [
        { time: 1, values: { sma: 100 } },
        { time: 2, values: { sma: 101 } },
      ];

      useIndicatorStore.getState().setIndicatorResults(id!, results);

      expect(useIndicatorStore.getState().indicatorResults[id!]).toEqual(results);
    });
  });

  describe('selectIndicator', () => {
    it('should select an indicator', () => {
      const store = useIndicatorStore.getState();
      const id1 = store.addIndicator('SMA');
      const id2 = store.addIndicator('EMA');

      useIndicatorStore.getState().selectIndicator(id1);
      expect(useIndicatorStore.getState().selectedIndicatorId).toBe(id1);

      useIndicatorStore.getState().selectIndicator(id2);
      expect(useIndicatorStore.getState().selectedIndicatorId).toBe(id2);
    });

    it('should allow deselecting', () => {
      const store = useIndicatorStore.getState();
      store.addIndicator('SMA');

      useIndicatorStore.getState().selectIndicator(null);
      expect(useIndicatorStore.getState().selectedIndicatorId).toBeNull();
    });
  });

  describe('duplicateIndicator', () => {
    it('should duplicate an indicator with new ID and color', () => {
      const store = useIndicatorStore.getState();
      const originalId = store.addIndicator('SMA');

      useIndicatorStore.getState().updateIndicatorParams(originalId!, { period: 50 });

      const duplicateId = useIndicatorStore.getState().duplicateIndicator(originalId!);

      expect(duplicateId).not.toBe(originalId);

      const indicators = useIndicatorStore.getState().activeIndicators;
      expect(indicators).toHaveLength(2);

      const duplicate = indicators.find((ind) => ind.id === duplicateId);
      expect(duplicate?.params.period).toBe(50);
      expect(duplicate?.style.color).not.toBe(indicators[0].style.color);
    });

    it('should return null if MAX_INDICATORS reached', () => {
      const store = useIndicatorStore.getState();
      const indicators: IndicatorType[] = ['SMA', 'EMA', 'RSI', 'MACD', 'BB', 'ATR', 'STOCH', 'CCI', 'WILLR', 'ROC'];

      indicators.forEach((type) => store.addIndicator(type));

      const firstId = useIndicatorStore.getState().activeIndicators[0].id;
      const duplicateId = useIndicatorStore.getState().duplicateIndicator(firstId);

      expect(duplicateId).toBeNull();
    });
  });

  describe('clearAllIndicators', () => {
    it('should remove all indicators', () => {
      const store = useIndicatorStore.getState();
      store.addIndicator('SMA');
      store.addIndicator('EMA');
      store.addIndicator('RSI');

      useIndicatorStore.getState().clearAllIndicators();

      const finalStore = useIndicatorStore.getState();
      expect(finalStore.activeIndicators).toHaveLength(0);
      expect(Object.keys(finalStore.indicatorResults)).toHaveLength(0);
      expect(finalStore.selectedIndicatorId).toBeNull();
    });
  });

  describe('computed values', () => {
    it('canAddMore should return false when at limit', () => {
      const store = useIndicatorStore.getState();
      const indicators: IndicatorType[] = ['SMA', 'EMA', 'RSI', 'MACD', 'BB', 'ATR', 'STOCH', 'CCI', 'WILLR', 'ROC'];

      indicators.forEach((type) => store.addIndicator(type));

      expect(useIndicatorStore.getState().canAddMore()).toBe(false);
    });

    it('indicatorCount should return correct count', () => {
      const store = useIndicatorStore.getState();
      expect(store.indicatorCount()).toBe(0);

      store.addIndicator('SMA');
      expect(useIndicatorStore.getState().indicatorCount()).toBe(1);

      useIndicatorStore.getState().addIndicator('EMA');
      expect(useIndicatorStore.getState().indicatorCount()).toBe(2);
    });

    it('hasIndicatorType should check if type exists', () => {
      const store = useIndicatorStore.getState();
      store.addIndicator('SMA');

      expect(useIndicatorStore.getState().hasIndicatorType('SMA')).toBe(true);
      expect(useIndicatorStore.getState().hasIndicatorType('EMA')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should set and clear errors', () => {
      const store = useIndicatorStore.getState();
      const id = store.addIndicator('SMA');

      useIndicatorStore.getState().setError(id!, 'Calculation failed');
      expect(useIndicatorStore.getState().errors[id!]).toBe('Calculation failed');

      useIndicatorStore.getState().setError(id!, null);
      expect(useIndicatorStore.getState().errors[id!]).toBeUndefined();
    });

    it('should clear all errors', () => {
      const store = useIndicatorStore.getState();
      const id1 = store.addIndicator('SMA');
      const id2 = store.addIndicator('EMA');

      store.setError(id1!, 'Error 1');
      store.setError(id2!, 'Error 2');

      useIndicatorStore.getState().clearErrors();

      expect(Object.keys(useIndicatorStore.getState().errors)).toHaveLength(0);
    });
  });
});
