import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  describe('basic class merging', () => {
    it('should return empty string for no inputs', () => {
      expect(cn()).toBe('');
    });

    it('should return single class unchanged', () => {
      expect(cn('text-red-500')).toBe('text-red-500');
    });

    it('should merge multiple classes', () => {
      expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
    });

    it('should handle array of classes', () => {
      expect(cn(['text-red-500', 'bg-blue-500'])).toBe('text-red-500 bg-blue-500');
    });
  });

  describe('conditional classes', () => {
    it('should filter out falsy values', () => {
      expect(cn('text-red-500', false, 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
      expect(cn('text-red-500', null, 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
      expect(cn('text-red-500', undefined, 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
      expect(cn('text-red-500', '', 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
    });

    it('should handle boolean conditionals', () => {
      const isActive = true;
      const isDisabled = false;
      expect(cn(
        'base-class',
        isActive && 'active-class',
        isDisabled && 'disabled-class'
      )).toBe('base-class active-class');
    });

    it('should handle object syntax', () => {
      expect(cn({
        'text-red-500': true,
        'bg-blue-500': false,
        'font-bold': true,
      })).toBe('text-red-500 font-bold');
    });
  });

  describe('tailwind class conflict resolution', () => {
    it('should resolve conflicting padding classes', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2');
    });

    it('should resolve conflicting margin classes', () => {
      expect(cn('m-4', 'm-8')).toBe('m-8');
    });

    it('should resolve conflicting text color classes', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('should resolve conflicting background classes', () => {
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    });

    it('should keep non-conflicting classes', () => {
      expect(cn('p-4', 'text-red-500', 'p-2', 'font-bold')).toBe('text-red-500 p-2 font-bold');
    });

    it('should resolve conflicting width classes', () => {
      expect(cn('w-full', 'w-1/2')).toBe('w-1/2');
    });

    it('should resolve conflicting flex classes', () => {
      expect(cn('flex-row', 'flex-col')).toBe('flex-col');
    });
  });

  describe('complex usage patterns', () => {
    it('should handle component variant pattern', () => {
      const variant = 'primary';
      const size = 'lg';
      
      const baseClasses = 'rounded font-medium';
      const variantClasses = {
        primary: 'bg-blue-500 text-white',
        secondary: 'bg-gray-500 text-white',
      };
      const sizeClasses = {
        sm: 'px-2 py-1 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
      };

      expect(cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size]
      )).toBe('rounded font-medium bg-blue-500 text-white px-6 py-3 text-lg');
    });

    it('should handle override pattern', () => {
      const defaultClasses = 'p-4 bg-gray-100 text-gray-900';
      const overrideClasses = 'bg-blue-500 text-white';
      
      expect(cn(defaultClasses, overrideClasses)).toBe('p-4 bg-blue-500 text-white');
    });

    it('should handle dark theme classes from project', () => {
      const chartClasses = cn(
        'bg-[#131722]',
        'text-[#d1d4dc]',
        'border-[#1e222d]'
      );
      expect(chartClasses).toBe('bg-[#131722] text-[#d1d4dc] border-[#1e222d]');
    });

    it('should handle trading color classes', () => {
      const isUp = true;
      const priceClasses = cn(
        'font-mono',
        isUp ? 'text-[#26a69a]' : 'text-[#ef5350]'
      );
      expect(priceClasses).toBe('font-mono text-[#26a69a]');
    });
  });

  describe('edge cases', () => {
    it('should handle deeply nested arrays', () => {
      expect(cn(['a', ['b', ['c']]])).toBe('a b c');
    });

    it('should handle mixed input types', () => {
      expect(cn(
        'base',
        ['array-class'],
        { 'object-class': true },
        false,
        null,
        undefined,
        'final'
      )).toBe('base array-class object-class final');
    });

    it('should handle whitespace in class names', () => {
      expect(cn('  text-red-500  ', '  bg-blue-500  ')).toBe('text-red-500 bg-blue-500');
    });

    it('should handle duplicate classes', () => {
      expect(cn('text-red-500', 'text-red-500')).toBe('text-red-500');
    });
  });
});
