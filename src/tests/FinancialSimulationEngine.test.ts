// ============================================================================
// UNIFIED SIMULATION ENGINE TESTS
// Unit tests for the consolidated simulation engine
// ============================================================================

import { describe, it, expect } from "vitest";
import { financialSimulationEngine } from "../engine/core/FinancialSimulationEngine";
import { MVPSimulationInputs } from "../types";
import {
  EnhancedSimulationInputs,
  DEFAULT_PENSION_SETTINGS,
} from "../types/pension";

describe("Financial Simulation Engine", () => {
  const basicInputs: MVPSimulationInputs = {
    profile: {
      currentAge: 30,
      gender: "kvinna",
      desiredRetirementAge: 65,
    },
    income: {
      monthlySalary: 45000,
      realSalaryGrowth: 0.016,
    },
    expenses: {
      monthlyLiving: 25000,
    },
    assets: {
      liquidSavings: 100000,
      iskAccount: 200000,
    },
    investments: {
      liquidSavingsRate: 0.005,
      iskAccountRate: 0.035,
    },
  };

  const enhancedInputs: EnhancedSimulationInputs = {
    ...basicInputs,
    pensions: {
      ...DEFAULT_PENSION_SETTINGS,
      generalPension: {
        currentInkomstpension: 500000,
        currentPremiepension: 100000,
        estimatedMonthlyAmount: 15000,
        withdrawalStartAge: 65,
      },
    },
  };

  describe("MVP Mode - Input Validation", () => {
    const mvpConfig = {
      includePensions: false,
      useCustomInvestmentRates: false,
      enableTransparency: false,
    };

    it("should validate correct MVP inputs", () => {
      const validation = financialSimulationEngine.validateInputs(
        basicInputs,
        mvpConfig
      );
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should reject invalid ages", () => {
      const invalidInputs = {
        ...basicInputs,
        profile: { ...basicInputs.profile, currentAge: 15 },
      };
      const validation = financialSimulationEngine.validateInputs(
        invalidInputs,
        mvpConfig
      );
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it("should warn about retirement age conflicts", () => {
      const problematicInputs = {
        ...basicInputs,
        profile: {
          ...basicInputs.profile,
          currentAge: 30,
          desiredRetirementAge: 25, // Invalid: retirement before current age
        },
      };
      const validation = financialSimulationEngine.validateInputs(
        problematicInputs,
        mvpConfig
      );
      expect(validation.isValid).toBe(false);
    });

    it("should warn about high expenses relative to income", () => {
      const highExpenseInputs = {
        ...basicInputs,
        expenses: { monthlyLiving: 50000 }, // Higher than income
      };
      const validation = financialSimulationEngine.validateInputs(
        highExpenseInputs,
        mvpConfig
      );
      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("Enhanced Mode - Input Validation", () => {
    const enhancedConfig = {
      includePensions: true,
      useCustomInvestmentRates: true,
      enableTransparency: false,
    };

    it("should validate correct enhanced inputs", () => {
      const validation = financialSimulationEngine.validateInputs(
        enhancedInputs,
        enhancedConfig
      );
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should validate pension withdrawal ages", () => {
      const invalidPensionInputs = {
        ...enhancedInputs,
        pensions: {
          ...enhancedInputs.pensions,
          generalPension: {
            ...enhancedInputs.pensions.generalPension,
            withdrawalStartAge: 60, // Too early
          },
        },
      };
      const validation = financialSimulationEngine.validateInputs(
        invalidPensionInputs,
        enhancedConfig
      );
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes("62 års ålder"))).toBe(
        true
      );
    });

    it("should validate investment rates - direct method test", () => {
      // Test the validation method directly
      const testRates = {
        liquidSavingsRate: -0.8, // Should trigger warning
        iskAccountRate: 2.0, // Should trigger error (> 0.5)
      };

      const errors: string[] = [];
      const warnings: string[] = [];

      // Access the private method via type assertion for testing
      (financialSimulationEngine as any).validateInvestmentRates(
        testRates,
        errors,
        warnings
      );

      expect(errors.length).toBeGreaterThan(0);
      expect(warnings.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("ISK-konto"))).toBe(true);
    });

    it("should validate investment rates - simple test", () => {
      // Simple test case with definitely invalid rates
      const simpleInvalidInputs = {
        profile: {
          currentAge: 30,
          gender: "kvinna" as const,
          desiredRetirementAge: 65,
        },
        income: { monthlySalary: 45000, realSalaryGrowth: 0.016 },
        expenses: { monthlyLiving: 25000 },
        assets: { liquidSavings: 100000, iskAccount: 200000 },
        investments: {
          liquidSavingsRate: -0.8, // Definitely invalid: -80%
          iskAccountRate: 2.0, // Definitely invalid: 200%
        },
        pensions: DEFAULT_PENSION_SETTINGS,
      };

      const validation = financialSimulationEngine.validateInputs(
        simpleInvalidInputs,
        enhancedConfig
      );
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.isValid).toBe(false);
    });

    it("should validate investment rates", () => {
      const extremeRatesInputs = {
        ...enhancedInputs,
        investments: {
          liquidSavingsRate: 1.0, // 100% return - unrealistic
          iskAccountRate: -0.8, // -80% return - too extreme
        },
      };
      const validation = financialSimulationEngine.validateInputs(
        extremeRatesInputs,
        enhancedConfig
      );
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some((e) => e.includes("ISK-konto"))).toBe(true);
    });
  });

  describe("MVP Mode - Simulation Calculations", () => {
    const mvpConfig = {
      includePensions: false,
      useCustomInvestmentRates: false,
      enableTransparency: false,
    };

    it("should run MVP simulation for full lifetime", () => {
      const projections = financialSimulationEngine.runSimulation(
        basicInputs,
        mvpConfig
      );

      // Should have projections from age 30 to life expectancy (~85)
      expect(projections.length).toBeGreaterThan(50);
      expect(projections[0].age).toBe(30);
      expect(projections[0].year).toBe(0);

      // Last projection should be near life expectancy
      const lastProjection = projections[projections.length - 1];
      expect(lastProjection.age).toBeGreaterThan(80);

      // MVP projections should not have pension data
      expect(projections[0].pensionIncome).toBeUndefined();
      expect(projections[0].pensionCapital).toBeUndefined();
    });

    it("should show salary growth over time", () => {
      const projections = financialSimulationEngine.runSimulation(
        basicInputs,
        mvpConfig
      );

      // Salary should grow with real salary growth rate
      const firstYear = projections[0];
      const tenthYear = projections[9]; // 10 years later

      expect(tenthYear.salary).toBeGreaterThan(firstYear.salary);

      // Should grow reasonably (allow for some variation in implementation)
      const actualGrowth = tenthYear.salary / firstYear.salary;
      expect(actualGrowth).toBeGreaterThan(1.1); // At least 10% growth over 10 years
      expect(actualGrowth).toBeLessThan(1.25); // Less than 25% growth over 10 years
    });

    it("should stop salary income at retirement age", () => {
      const projections = financialSimulationEngine.runSimulation(
        basicInputs,
        mvpConfig
      );

      const preRetirement = projections.find(
        (p) => p.age === basicInputs.profile.desiredRetirementAge - 1
      );
      const postRetirement = projections.find(
        (p) => p.age === basicInputs.profile.desiredRetirementAge
      );

      expect(preRetirement?.salary).toBeGreaterThan(0);
      expect(postRetirement?.salary).toBe(0);
    });
  });

  describe("Enhanced Mode - Simulation Calculations", () => {
    const enhancedConfig = {
      includePensions: true,
      useCustomInvestmentRates: true,
      enableTransparency: false,
    };

    it("should run enhanced simulation with pension data", () => {
      const projections = financialSimulationEngine.runSimulation(
        enhancedInputs,
        enhancedConfig
      );

      // Should have projections with pension data
      expect(projections.length).toBeGreaterThan(50);

      // Enhanced projections should have pension data
      expect(projections[0].pensionIncome).toBeDefined();
      expect(projections[0].pensionCapital).toBeDefined();

      // Find projection at retirement age
      const retirementProjection = projections.find(
        (p) => p.age === enhancedInputs.profile.desiredRetirementAge
      );
      expect(retirementProjection).toBeDefined();
      expect(retirementProjection!.pensionIncome!.total).toBeGreaterThan(0);
    });

    it("should calculate pension income correctly", () => {
      const projections = financialSimulationEngine.runSimulation(
        enhancedInputs,
        enhancedConfig
      );

      // Find projections before and at retirement
      const preRetirement = projections.find(
        (p) => p.age === enhancedInputs.profile.desiredRetirementAge - 1
      );
      const atRetirement = projections.find(
        (p) => p.age === enhancedInputs.profile.desiredRetirementAge
      );

      // Before retirement: no pension income
      expect(preRetirement!.pensionIncome!.total).toBe(0);

      // At retirement: should have pension income
      expect(atRetirement!.pensionIncome!.total).toBeGreaterThan(0);
      expect(atRetirement!.pensionIncome!.generalPension).toBeGreaterThan(0);
    });

    it("should handle custom investment rates", () => {
      const customRates = {
        liquidSavingsRate: 0.02, // 2%
        iskAccountRate: 0.08, // 8%
      };

      const projections = financialSimulationEngine.runSimulation(
        enhancedInputs,
        enhancedConfig,
        customRates
      );

      expect(projections.length).toBeGreaterThan(50);
      // Should use custom rates instead of defaults
      // This is hard to test directly, but the simulation should complete successfully
    });
  });

  describe("Summary Generation", () => {
    it("should generate comprehensive MVP summary", () => {
      const mvpConfig = {
        includePensions: false,
        useCustomInvestmentRates: false,
        enableTransparency: false,
      };
      const projections = financialSimulationEngine.runSimulation(
        basicInputs,
        mvpConfig
      );
      const summary = financialSimulationEngine.generateSummary(
        projections,
        basicInputs,
        mvpConfig
      );

      expect(summary.expectedMonthlyPension).toBeGreaterThan(0);
      expect(summary.pensionCompensationRatio).toBeGreaterThan(0);
      expect(summary.capitalDurationYears).toBeGreaterThan(0);
      expect(summary.retirementNetWorth).toBeGreaterThan(0);

      // MVP summary should not have enhanced pension metrics
      expect(summary.totalPensionCapital).toBe(0);
    });

    it("should generate comprehensive enhanced summary", () => {
      const enhancedConfig = {
        includePensions: true,
        useCustomInvestmentRates: true,
        enableTransparency: false,
      };
      const projections = financialSimulationEngine.runSimulation(
        enhancedInputs,
        enhancedConfig
      );
      const summary = financialSimulationEngine.generateSummary(
        projections,
        enhancedInputs,
        enhancedConfig
      );

      expect(summary.expectedMonthlyPension).toBeGreaterThan(0);
      expect(summary.pensionCompensationRatio).toBeGreaterThan(0);
      expect(summary.capitalDurationYears).toBeGreaterThan(0);
      expect(summary.retirementNetWorth).toBeGreaterThan(0);

      // Enhanced summary should have enhanced pension metrics
      expect(summary.totalPensionCapital).toBeGreaterThan(0);
      expect(summary.averageMonthlyPension).toBeGreaterThan(0);
      expect(summary.pensionDuration).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero assets", () => {
      const zeroAssetsInputs = {
        ...basicInputs,
        assets: { liquidSavings: 0, iskAccount: 0 },
      };
      const mvpConfig = {
        includePensions: false,
        useCustomInvestmentRates: false,
        enableTransparency: false,
      };

      const projections = financialSimulationEngine.runSimulation(
        zeroAssetsInputs,
        mvpConfig
      );
      expect(projections.length).toBeGreaterThan(0);
      expect(projections[0].calculations.iskTax).toBe(0); // No ISK tax with zero ISK
    });

    it("should handle very high income", () => {
      const highIncomeInputs = {
        ...basicInputs,
        income: { ...basicInputs.income, monthlySalary: 100000 },
      };
      const mvpConfig = {
        includePensions: false,
        useCustomInvestmentRates: false,
        enableTransparency: false,
      };

      const projections = financialSimulationEngine.runSimulation(
        highIncomeInputs,
        mvpConfig
      );
      const firstYear = projections[0];

      // Should have state tax with high income
      expect(firstYear.calculations.stateTax).toBeGreaterThan(0);
      expect(firstYear.calculations.netIncome).toBeLessThan(
        firstYear.calculations.grossIncome
      );
    });

    it("should handle negative cash flow scenarios", () => {
      const negativeFlowInputs = {
        ...basicInputs,
        expenses: { monthlyLiving: 50000 }, // Expenses higher than income
      };
      const mvpConfig = {
        includePensions: false,
        useCustomInvestmentRates: false,
        enableTransparency: false,
      };

      const projections = financialSimulationEngine.runSimulation(
        negativeFlowInputs,
        mvpConfig
      );
      const firstYear = projections[0];

      expect(firstYear.calculations.cashFlow).toBeLessThan(0);
      // Should handle negative cash flow gracefully
    });

    it("should handle empty pension settings", () => {
      const emptyPensionInputs = {
        ...enhancedInputs,
        pensions: {
          ...DEFAULT_PENSION_SETTINGS,
          generalPension: {
            currentInkomstpension: 0,
            currentPremiepension: 0,
            estimatedMonthlyAmount: 0,
            withdrawalStartAge: 65,
          },
        },
      };
      const enhancedConfig = {
        includePensions: true,
        useCustomInvestmentRates: false,
        enableTransparency: false,
      };

      const projections = financialSimulationEngine.runSimulation(
        emptyPensionInputs,
        enhancedConfig
      );
      expect(projections.length).toBeGreaterThan(0);

      // Should still have pension structure but with zero values
      const retirementProjection = projections.find(
        (p) => p.age === emptyPensionInputs.profile.desiredRetirementAge
      );
      expect(retirementProjection!.pensionIncome!.total).toBe(0);
    });
  });

  describe("Configuration Flexibility", () => {
    it("should work with different configurations", () => {
      const configs = [
        {
          includePensions: false,
          useCustomInvestmentRates: false,
          enableTransparency: false,
        },
        {
          includePensions: false,
          useCustomInvestmentRates: true,
          enableTransparency: false,
        },
        {
          includePensions: true,
          useCustomInvestmentRates: false,
          enableTransparency: false,
        },
        {
          includePensions: true,
          useCustomInvestmentRates: true,
          enableTransparency: false,
        },
        {
          includePensions: true,
          useCustomInvestmentRates: true,
          enableTransparency: true,
        },
      ];

      configs.forEach((config) => {
        const inputsToUse = config.includePensions
          ? enhancedInputs
          : basicInputs;
        const projections = financialSimulationEngine.runSimulation(
          inputsToUse,
          config
        );

        expect(projections.length).toBeGreaterThan(0);

        if (config.includePensions) {
          expect(projections[0].pensionIncome).toBeDefined();
          expect(projections[0].pensionCapital).toBeDefined();
        } else {
          expect(projections[0].pensionIncome).toBeUndefined();
          expect(projections[0].pensionCapital).toBeUndefined();
        }
      });
    });
  });

  describe("Realistic Scenarios", () => {
    it("should produce reasonable results for typical Swedish worker", () => {
      const typicalSwede: MVPSimulationInputs = {
        profile: {
          currentAge: 35,
          gender: "man",
          desiredRetirementAge: 67,
        },
        income: {
          monthlySalary: 35000, // Median Swedish salary
          realSalaryGrowth: 0.015,
        },
        expenses: {
          monthlyLiving: 22000,
        },
        assets: {
          liquidSavings: 50000,
          iskAccount: 150000,
        },
        investments: {
          liquidSavingsRate: 0.005,
          iskAccountRate: 0.035,
        },
      };

      const mvpConfig = {
        includePensions: false,
        useCustomInvestmentRates: false,
        enableTransparency: false,
      };
      const projections = financialSimulationEngine.runSimulation(
        typicalSwede,
        mvpConfig
      );
      const summary = financialSimulationEngine.generateSummary(
        projections,
        typicalSwede,
        mvpConfig
      );

      // Should have reasonable pension replacement ratio
      expect(summary.pensionCompensationRatio).toBeGreaterThan(0.4);
      expect(summary.pensionCompensationRatio).toBeLessThan(0.8);

      // Should accumulate reasonable wealth by retirement
      expect(summary.retirementNetWorth).toBeGreaterThan(200000); // At least 200k kr
      expect(summary.retirementNetWorth).toBeLessThan(5000000); // Less than 5M kr
    });
  });
});
