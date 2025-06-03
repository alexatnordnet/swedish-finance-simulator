// ============================================================================
// UTILITY FUNCTIONS TESTS
// Unit tests for formatting and calculation utilities
// ============================================================================

import { describe, it, expect } from 'vitest';
import { 
  formatCurrency, 
  formatPercentage, 
  calculateCompoundGrowth,
  safeParseNumber,
  clamp,
  isReasonableSEKAmount
} from '../utils/formatters';

describe('Utility Functions', () => {
  describe('formatCurrency', () => {
    it('should format Swedish currency correctly', () => {
      expect(formatCurrency(45000)).toBe('45\u00A0000\u00A0kr'); // Non-breaking spaces
      expect(formatCurrency(1500000)).toBe('1\u00A0500\u00A0000\u00A0kr');
    });

    it('should format with compact notation for large amounts', () => {
      expect(formatCurrency(1500000, { compact: true })).toBe('1.5 Mkr');
      expect(formatCurrency(45000, { compact: true })).toBe('45 tkr');
      expect(formatCurrency(500, { compact: true })).toBe('500\u00A0kr');
    });

    it('should handle decimal places correctly', () => {
      const result = formatCurrency(1234.56, { maximumFractionDigits: 2 });
      expect(result).toContain('1\u00A0234'); // Should contain formatted number
      expect(result).toContain('kr'); // Should contain currency
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages correctly', () => {
      expect(formatPercentage(0.035, 1)).toBe('3,5\u00A0%'); // Swedish uses comma for decimal
      expect(formatPercentage(0.1234, 2)).toBe('12,34\u00A0%');
      expect(formatPercentage(1.5, 0)).toBe('150\u00A0%');
    });
  });

  describe('calculateCompoundGrowth', () => {
    it('should calculate compound growth correctly', () => {
      // 100,000 kr at 3.5% for 10 years should be ~141,060 kr
      const result = calculateCompoundGrowth(100000, 0.035, 10);
      expect(result).toBeCloseTo(141060, -2); // Within ±100 kr
    });

    it('should handle zero growth rate', () => {
      const result = calculateCompoundGrowth(100000, 0, 10);
      expect(result).toBe(100000);
    });

    it('should handle monthly compounding', () => {
      // Monthly compounding should give slightly higher result
      const annual = calculateCompoundGrowth(100000, 0.12, 1, 1);
      const monthly = calculateCompoundGrowth(100000, 0.12, 1, 12);
      expect(monthly).toBeGreaterThan(annual);
    });
  });

  describe('safeParseNumber', () => {
    it('should parse valid numbers', () => {
      expect(safeParseNumber('123.45')).toBe(123.45);
      expect(safeParseNumber(456)).toBe(456);
      expect(safeParseNumber('1,500')).toBe(1); // Stops at comma
    });

    it('should return fallback for invalid input', () => {
      expect(safeParseNumber('invalid', 100)).toBe(100);
      expect(safeParseNumber('', 0)).toBe(0);
      expect(safeParseNumber(NaN, 42)).toBe(42);
    });
  });

  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('isReasonableSEKAmount', () => {
    it('should validate reasonable Swedish krona amounts', () => {
      expect(isReasonableSEKAmount(45000)).toBe(true);
      expect(isReasonableSEKAmount(1500000)).toBe(true);
      expect(isReasonableSEKAmount(-1000)).toBe(false);
      expect(isReasonableSEKAmount(200000000)).toBe(false); // Too high
    });
  });
});
