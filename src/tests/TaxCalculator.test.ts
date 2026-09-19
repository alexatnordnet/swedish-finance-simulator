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
      // Grundavdrag at 540,000 kr FI is at the minimum, 17,300 kr
      // Taxable income: 540,000 - 17,300 = 522,700
      // Municipal tax: 522,700 * 0.3241 = 169,407

      expect(result.municipalTax).toBeGreaterThan(160000);
      expect(result.municipalTax).toBeLessThan(180000);
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
      expect(result.totalTax).toBeCloseTo(
        result.municipalTax +
          result.stateTax +
          result.pensionFee -
          result.pensionFeeCredit -
          result.earnedIncomeTaxCredit +
          result.iskTax +
          result.kfTax +
          result.capitalGainsTax,
        6
      );
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
      expect(result.calculations[1].category).toBe('ISK/KF Schablonskatt');
      
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

      expect(summary).toHaveLength(9); // All tax types, credits and total
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
      expect(result.totalTax).toBeCloseTo(
        result.municipalTax +
          result.stateTax +
          result.pensionFee -
          result.pensionFeeCredit -
          result.earnedIncomeTaxCredit +
          result.iskTax +
          result.kfTax +
          result.capitalGainsTax,
        6
      );
    });
  });

  // ==========================================================================
  // REGRESSION TESTS
  // These pin behaviour that was previously wrong. See the notes on each.
  // ==========================================================================
  describe('Regression: grundavdrag is continuous', () => {
    it('should never let a raise reduce net income', () => {
      // The old implementation used a 3-step staircase, which created cliffs
      // where earning 200 kr more made you ~6,700 kr richer (and vice versa).
      let previousNet = -Infinity;
      for (let gross = 1000; gross <= 1_200_000; gross += 1000) {
        const result = taxCalculator.calculateYearlyTax({
          grossSalary: gross,
          age: 40,
          iskCapital: 0,
          kfCapital: 0,
        });
        expect(result.netIncome).toBeGreaterThanOrEqual(previousNet);
        previousNet = result.netIncome;
      }
    });

    it('should hit the statutory grundavdrag amounts for 2025', () => {
      const at = (gross: number, age = 40) =>
        taxCalculator.calculateYearlyTax({
          grossSalary: gross,
          age,
          iskCapital: 0,
          kfCapital: 0,
        }).grundavdrag;

      // Maximum 45,300 kr on the plateau between 2.72 and 3.11 pbb
      expect(at(170_000)).toBeCloseTo(45_300, 0);
      // Minimum 17,300 kr above 7.88 pbb (463,344 kr)
      expect(at(600_000)).toBeCloseTo(17_300, 0);
      // Base amount 24,900 kr at low incomes
      expect(at(50_000)).toBeCloseTo(24_900, 0);
    });

    it('should never exceed the income it is deducted from', () => {
      for (const gross of [1000, 5000, 15_000, 24_000]) {
        const result = taxCalculator.calculateYearlyTax({
          grossSalary: gross,
          age: 40,
          iskCapital: 0,
          kfCapital: 0,
        });
        expect(result.grundavdrag).toBeLessThanOrEqual(gross);
        expect(result.totalTax).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Regression: state tax uses skiktgräns, not brytpunkt', () => {
    it('should start charging state tax at the published brytpunkt', () => {
      // Brytpunkt 2025 is 643,100 kr of gross salary. The old code compared
      // post-grundavdrag income against it, pushing the onset to ~780,000 kr.
      const below = taxCalculator.calculateYearlyTax({
        grossSalary: 640_000,
        age: 40,
        iskCapital: 0,
        kfCapital: 0,
      });
      const above = taxCalculator.calculateYearlyTax({
        grossSalary: 650_000,
        age: 40,
        iskCapital: 0,
        kfCapital: 0,
      });

      expect(below.stateTax).toBe(0);
      expect(above.stateTax).toBeGreaterThan(0);

      // The exact onset should land within rounding distance of the brytpunkt
      let onset = 0;
      for (let gross = 640_000; gross <= 646_000; gross += 1) {
        const result = taxCalculator.calculateYearlyTax({
          grossSalary: gross,
          age: 40,
          iskCapital: 0,
          kfCapital: 0,
        });
        if (result.stateTax > 0) {
          onset = gross;
          break;
        }
      }
      expect(onset).toBeGreaterThan(642_000);
      expect(onset).toBeLessThan(644_000);
    });

    it('should charge 20% on the amount above the skiktgräns', () => {
      const result = taxCalculator.calculateYearlyTax({
        grossSalary: 800_000,
        age: 40,
        iskCapital: 0,
        kfCapital: 0,
      });
      const expected =
        (800_000 - result.grundavdrag - 625_800) * 0.2;
      expect(result.stateTax).toBeCloseTo(expected, 6);
    });
  });

  describe('Regression: jobbskatteavdrag', () => {
    it('should give a typical earner a meaningful credit', () => {
      // 45,000 kr/month. Without jobbskatteavdrag the old model overstated
      // tax by roughly 1,500 kr/month.
      const result = taxCalculator.calculateYearlyTax({
        grossSalary: 540_000,
        age: 40,
        iskCapital: 0,
        kfCapital: 0,
      });

      expect(result.earnedIncomeTaxCredit).toBeGreaterThan(30_000);
      expect(result.earnedIncomeTaxCredit).toBeLessThan(45_000);

      // Resulting net should be in the right ballpark for sv-SE 2025
      const monthlyNet = result.netIncome / 12;
      expect(monthlyNet).toBeGreaterThan(32_000);
      expect(monthlyNet).toBeLessThan(36_000);
    });

    it('should not grant the credit on pension income', () => {
      const pension = taxCalculator.calculateYearlyTax({
        grossSalary: 0,
        pensionIncome: 300_000,
        age: 67,
        iskCapital: 0,
        kfCapital: 0,
      });

      expect(pension.earnedIncomeTaxCredit).toBe(0);
    });

    it('should never exceed the municipal tax it offsets', () => {
      for (const gross of [30_000, 80_000, 150_000, 300_000]) {
        const result = taxCalculator.calculateYearlyTax({
          grossSalary: gross,
          age: 40,
          iskCapital: 0,
          kfCapital: 0,
        });
        expect(result.earnedIncomeTaxCredit).toBeLessThanOrEqual(
          result.municipalTax + 1e-9
        );
      }
    });
  });

  describe('Regression: pension income is not pensionsgrundande', () => {
    it('should not charge allmän pensionsavgift on pension payouts', () => {
      const result = taxCalculator.calculateYearlyTax({
        grossSalary: 0,
        pensionIncome: 300_000,
        age: 67,
        iskCapital: 0,
        kfCapital: 0,
      });

      expect(result.pensionFee).toBe(0);
    });

    it('should charge the fee on salary only when both are present', () => {
      const result = taxCalculator.calculateYearlyTax({
        grossSalary: 200_000,
        pensionIncome: 100_000,
        age: 67,
        iskCapital: 0,
        kfCapital: 0,
      });

      expect(result.pensionFee).toBeCloseTo(200_000 * 0.07, 6);
    });

    it('should tax salary and pension alike once credits are accounted for', () => {
      // The fee is fully offset by skattereduktion, so at an age where neither
      // qualifies for jobbskatteavdrag the two income types cost the same.
      const salary = taxCalculator.calculateYearlyTax({
        grossSalary: 300_000,
        age: 67,
        iskCapital: 0,
        kfCapital: 0,
      });
      const pension = taxCalculator.calculateYearlyTax({
        grossSalary: 0,
        pensionIncome: 300_000,
        age: 67,
        iskCapital: 0,
        kfCapital: 0,
      });

      expect(salary.netIncome).toBeCloseTo(pension.netIncome, 6);
    });
  });

  describe('Regression: ISK and KF share one fribelopp', () => {
    it('should not grant a separate allowance to each account type', () => {
      const pooled = taxCalculator.calculateYearlyTax({
        grossSalary: 0,
        age: 40,
        iskCapital: 300_000,
        kfCapital: 0,
      });
      const split = taxCalculator.calculateYearlyTax({
        grossSalary: 0,
        age: 40,
        iskCapital: 150_000,
        kfCapital: 150_000,
      });

      // Splitting capital across ISK and KF must not reduce the tax
      expect(split.iskTax + split.kfTax).toBeCloseTo(
        pooled.iskTax + pooled.kfTax,
        6
      );
      expect(split.iskTax + split.kfTax).toBeGreaterThan(0);
    });

    it('should split the tax proportionally between ISK and KF', () => {
      const result = taxCalculator.calculateYearlyTax({
        grossSalary: 0,
        age: 40,
        iskCapital: 450_000,
        kfCapital: 150_000,
      });

      // 600,000 - 150,000 = 450,000 taxable, at 0.888%
      expect(result.iskTax + result.kfTax).toBeCloseTo(450_000 * 0.00888, 6);
      // ISK holds 75% of the capital, so it carries 75% of the tax
      expect(result.iskTax).toBeCloseTo(
        (result.iskTax + result.kfTax) * 0.75,
        6
      );
    });
  });
});
