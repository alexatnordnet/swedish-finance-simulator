// ============================================================================
// TAX CALCULATOR TESTS
// Unit tests for Swedish tax calculations
// ============================================================================

import { describe, it, expect } from 'vitest';
import { taxCalculator } from '../engine/modules/TaxCalculator';
import { SWEDISH_TAX_PARAMETERS_2025 } from '../engine/swedish-parameters/TaxParameters2025';

describe('Swedish Tax Calculator', () => {
  describe('Income Tax Calculations', () => {
    it('should calculate correct municipal tax for average income', () => {
      // Test case: 45,000 kr/month = 540,000 kr/year
      const result = taxCalculator.calculateYearlyTax({
        grossSalary: 540000,
        age: 30,
        iskCapital: 0,
        kfCapital: 0
      });

      // Expected calculation:
      // Pension fee: 540,000 * 0.07 = 37,800 (simplified)
      // Basic deduction: ~45,300 (maximum for this income level)
      // Taxable income: 540,000 - 37,800 - 45,300 = 456,900
      // Municipal tax: 456,900 * 0.3241 = 148,049

      expect(result.municipalTax).toBeGreaterThan(140000);
      expect(result.municipalTax).toBeLessThan(160000);
      expect(result.stateTax).toBe(0); // Below state tax threshold
    });

    it('should calculate state tax for high income', () => {
      // Test case: 80,000 kr/month = 960,000 kr/year (above state tax threshold)
      const result = taxCalculator.calculateYearlyTax({
        grossSalary: 960000,
        age: 30,
        iskCapital: 0,
        kfCapital: 0
      });

      // Should have both municipal and state tax
      expect(result.municipalTax).toBeGreaterThan(200000);
      expect(result.stateTax).toBeGreaterThan(0);
      expect(result.totalTax).toBe(result.municipalTax + result.stateTax + result.iskTax + result.kfTax + result.capitalGainsTax);
    });

    it('should apply different state tax thresholds for different ages', () => {
      const highIncome = 800000;
      
      const youngPerson = taxCalculator.calculateYearlyTax({
        grossSalary: highIncome,
        age: 30,
        iskCapital: 0,
        kfCapital: 0
      });

      const oldPerson = taxCalculator.calculateYearlyTax({
        grossSalary: highIncome,
        age: 67,
        iskCapital: 0,
        kfCapital: 0
      });

      // Older person has higher threshold, so should pay less state tax
      expect(oldPerson.stateTax).toBeLessThan(youngPerson.stateTax);
    });

    it('should calculate net income correctly', () => {
      const grossSalary = 480000; // 40,000 kr/month
      const result = taxCalculator.calculateYearlyTax({
        grossSalary,
        age: 35,
        iskCapital: 0,
        kfCapital: 0
      });

      expect(result.netIncome).toBe(grossSalary - result.totalTax);
      expect(result.netIncome).toBeGreaterThan(0);
      expect(result.netIncome).toBeLessThan(grossSalary);
    });
  });

  describe('ISK Tax Calculations', () => {
    it('should apply tax-free amount for 2025', () => {
      // Test case: Exactly at tax-free threshold (150,000 kr)
      const result = taxCalculator.calculateYearlyTax({
        grossSalary: 400000,
        age: 30,
        iskCapital: 150000, // Exactly at 2025 tax-free amount
        kfCapital: 0
      });

      expect(result.iskTax).toBe(0);
    });

    it('should calculate ISK tax above tax-free amount', () => {
      // Test case: 200,000 kr ISK capital (50,000 kr above threshold)
      const result = taxCalculator.calculateYearlyTax({
        grossSalary: 400000,
        age: 30,
        iskCapital: 200000,
        kfCapital: 0
      });

      // Expected: (200,000 - 150,000) * 0.888% ≈ 444 kr
      expect(result.iskTax).toBeGreaterThan(400);
      expect(result.iskTax).toBeLessThan(500);
    });

    it('should use correct 2025 ISK tax rate parameters', () => {
      const params = SWEDISH_TAX_PARAMETERS_2025.iskKfParameters;
      
      // Verify 2025 parameters match specification
      expect(params.taxFreeAmount2025).toBe(150000);
      expect(params.governmentBondRate).toBe(0.0196); // 1.96%
      expect(params.supplement).toBe(0.01); // 1.00%
      expect(params.taxRate).toBe(0.30); // 30%
      
      // Calculated effective rate: (1.96% + 1.00%) * 30% = 0.888%
      const expectedEffectiveRate = (params.governmentBondRate + params.supplement) * params.taxRate;
      expect(expectedEffectiveRate).toBeCloseTo(0.00888, 5);
    });

    it('should handle large ISK amounts correctly', () => {
      // Test case: 1,000,000 kr ISK capital
      const result = taxCalculator.calculateYearlyTax({
        grossSalary: 600000,
        age: 40,
        iskCapital: 1000000,
        kfCapital: 0
      });

      // Expected: (1,000,000 - 150,000) * 0.888% = 7,548 kr
      expect(result.iskTax).toBeGreaterThan(7000);
      expect(result.iskTax).toBeLessThan(8000);
    });
  });

  describe('Capital Gains Tax', () => {
    it('should calculate 30% tax on securities capital gains', () => {
      const capitalGains = 100000;
      const result = taxCalculator.calculateYearlyTax({
        grossSalary: 500000,
        age: 35,
        iskCapital: 0,
        kfCapital: 0,
        capitalGains
      });

      expect(result.capitalGainsTax).toBe(capitalGains * 0.30);
    });

    it('should not tax negative capital gains', () => {
      const result = taxCalculator.calculateYearlyTax({
        grossSalary: 500000,
        age: 35,
        iskCapital: 0,
        kfCapital: 0,
        capitalGains: -50000 // Loss
      });

      expect(result.capitalGainsTax).toBe(0);
    });
  });

  describe('Tax Transparency and Calculations', () => {
    it('should provide detailed calculation steps', () => {
      const result = taxCalculator.calculateYearlyTax({
        grossSalary: 500000,
        age: 35,
        iskCapital: 300000,
        kfCapital: 0
      });

      // Should have income tax + ISK tax calculations (and possibly KF tax)
      expect(result.calculations.length).toBeGreaterThanOrEqual(2);
      expect(result.calculations[0].category).toBe('Inkomstskatt');
      expect(result.calculations[1].category).toBe('ISK Schablonskatt');
      
      // Each calculation should have steps
      expect(result.calculations[0].steps.length).toBeGreaterThan(0);
      expect(result.calculations[1].steps.length).toBeGreaterThan(0);
    });

    it('should provide tax summary', () => {
      const summary = taxCalculator.getTaxSummary({
        grossSalary: 600000,
        age: 40,
        iskCapital: 500000,
        kfCapital: 100000
      });

      expect(summary).toHaveLength(6); // All tax types + total
      expect(summary.find(item => item.description === 'Total skatt')).toBeDefined();
      
      // Verify amounts are reasonable
      const totalTax = summary.find(item => item.description === 'Total skatt')?.amount || 0;
      expect(totalTax).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle zero income', () => {
      const result = taxCalculator.calculateYearlyTax({
        grossSalary: 0,
        age: 25,
        iskCapital: 0,
        kfCapital: 0
      });

      expect(result.municipalTax).toBe(0);
      expect(result.stateTax).toBe(0);
      expect(result.totalTax).toBe(0);
      expect(result.netIncome).toBe(0);
    });

    it('should handle very high income', () => {
      const veryHighIncome = 5000000; // 5M kr/year
      const result = taxCalculator.calculateYearlyTax({
        grossSalary: veryHighIncome,
        age: 45,
        iskCapital: 0,
        kfCapital: 0
      });

      // Should have significant state tax
      expect(result.stateTax).toBeGreaterThan(500000);
      expect(result.totalTax).toBeLessThan(veryHighIncome); // Net income should be positive
      expect(result.netIncome).toBeGreaterThan(0);
    });

    it('should validate Swedish tax parameters are reasonable', () => {
      const params = SWEDISH_TAX_PARAMETERS_2025;
      
      // Sanity checks for 2025 parameters
      expect(params.inkomstBasbelopp).toBe(80600);
      expect(params.averageMunicipalTax).toBeCloseTo(0.3241);
      expect(params.stateTaxRate).toBe(0.20);
      expect(params.generalPensionFee).toBe(0.07);
      
      // State tax thresholds should be reasonable
      expect(params.stateTaxBreakpoint.under66).toBe(643100);
      expect(params.stateTaxBreakpoint.over66).toBe(733200);
      expect(params.stateTaxBreakpoint.over66).toBeGreaterThan(params.stateTaxBreakpoint.under66);
    });
  });

  describe('Real-world Test Cases', () => {
    it('should calculate reasonable tax for median Swedish salary', () => {
      // Median salary in Sweden ~35,000 kr/month = 420,000 kr/year
      const result = taxCalculator.calculateYearlyTax({
        grossSalary: 420000,
        age: 35,
        iskCapital: 0,
        kfCapital: 0
      });

      // Tax rate should be reasonable (20-35% effective rate)
      const effectiveTaxRate = result.totalTax / 420000;
      expect(effectiveTaxRate).toBeGreaterThan(0.15);
      expect(effectiveTaxRate).toBeLessThan(0.40);
    });

    it('should match expected tax burden for typical ISK investor', () => {
      // Typical case: 45k salary, 500k ISK savings
      const result = taxCalculator.calculateYearlyTax({
        grossSalary: 540000,
        age: 35,
        iskCapital: 500000,
        kfCapital: 0
      });

      // ISK tax should be ~3,108 kr: (500,000 - 150,000) * 0.888%
      expect(result.iskTax).toBeCloseTo(3108, -1); // Within ±10 kr
      
      // Total tax should be income tax + ISK tax
      expect(result.totalTax).toBe(result.municipalTax + result.stateTax + result.iskTax + result.kfTax + result.capitalGainsTax);
    });
  });
});
