// ============================================================================
// SIMULATION ENGINE TESTS
// Unit tests for the core simulation calculations
// ============================================================================

import { describe, it, expect } from 'vitest';
import { simulationEngine } from '../engine/core/SimulationEngine';
import { MVPSimulationInputs } from '../types';

describe('Simulation Engine', () => {
  const basicInputs: MVPSimulationInputs = {
    profile: {
      currentAge: 30,
      gender: 'kvinna',
      desiredRetirementAge: 65
    },
    income: {
      monthlySalary: 45000,
      realSalaryGrowth: 0.016
    },
    expenses: {
      monthlyLiving: 25000
    },
    assets: {
      liquidSavings: 100000,
      iskAccount: 200000
    },
    investments: {
      liquidSavingsRate: 0.005,
      iskAccountRate: 0.035
    }
  };

  describe('Input Validation', () => {
    it('should validate correct inputs', () => {
      const validation = simulationEngine.validateInputs(basicInputs);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid ages', () => {
      const invalidInputs = {
        ...basicInputs,
        profile: { ...basicInputs.profile, currentAge: 15 }
      };
      const validation = simulationEngine.validateInputs(invalidInputs);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should warn about retirement age conflicts', () => {
      const problematicInputs = {
        ...basicInputs,
        profile: { 
          ...basicInputs.profile, 
          currentAge: 30,
          desiredRetirementAge: 25 // Invalid: retirement before current age
        }
      };
      const validation = simulationEngine.validateInputs(problematicInputs);
      expect(validation.isValid).toBe(false);
    });

    it('should warn about high expenses relative to income', () => {
      const highExpenseInputs = {
        ...basicInputs,
        expenses: { monthlyLiving: 50000 } // Higher than income
      };
      const validation = simulationEngine.validateInputs(highExpenseInputs);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Simulation Calculations', () => {
    it('should run simulation for full lifetime', () => {
      const projections = simulationEngine.runSimulation(basicInputs);
      
      // Should have projections from age 30 to life expectancy (~85)
      expect(projections.length).toBeGreaterThan(50);
      expect(projections[0].age).toBe(30);
      expect(projections[0].year).toBe(0);
      
      // Last projection should be near life expectancy
      const lastProjection = projections[projections.length - 1];
      expect(lastProjection.age).toBeGreaterThan(80);
    });

    it('should show salary growth over time', () => {
      const projections = simulationEngine.runSimulation(basicInputs);
      
      // Salary should grow with real salary growth rate
      const firstYear = projections[0];
      const tenthYear = projections[9]; // 10 years later
      
      expect(tenthYear.salary).toBeGreaterThan(firstYear.salary);
      
      // Should grow reasonably (allow for some variation in implementation)
      const actualGrowth = tenthYear.salary / firstYear.salary;
      expect(actualGrowth).toBeGreaterThan(1.10); // At least 10% growth over 10 years
      expect(actualGrowth).toBeLessThan(1.25); // Less than 25% growth over 10 years
    });

    it('should stop salary income at retirement age', () => {
      const projections = simulationEngine.runSimulation(basicInputs);
      
      const preRetirement = projections.find(p => p.age === basicInputs.profile.desiredRetirementAge - 1);
      const postRetirement = projections.find(p => p.age === basicInputs.profile.desiredRetirementAge);
      
      expect(preRetirement?.salary).toBeGreaterThan(0);
      expect(postRetirement?.salary).toBe(0);
    });

    it('should calculate realistic net worth progression', () => {
      const projections = simulationEngine.runSimulation(basicInputs);
      
      // Net worth should generally increase over time (given positive savings)
      const firstYear = projections[0];
      const midCareer = projections[20]; // 20 years later
      
      expect(midCareer.netWorth).toBeGreaterThan(firstYear.netWorth);
      
      // Net worth should be reasonable (not billions)
      expect(midCareer.netWorth).toBeLessThan(50000000); // Less than 50M kr
    });

    it('should include ISK tax in calculations', () => {
      const projections = simulationEngine.runSimulation(basicInputs);
      
      // Should have ISK tax calculated for each year
      const firstYear = projections[0];
      expect(firstYear.calculations.iskTax).toBeGreaterThan(0); // Has 200k ISK, should have some tax
      expect(firstYear.calculations.iskTax).toBeLessThan(5000); // But not excessive
    });
  });

  describe('Pension Estimation', () => {
    it('should estimate reasonable pension amounts', () => {
      const pension = simulationEngine.estimatePension(basicInputs);
      
      expect(pension.monthlyPension).toBeGreaterThan(0);
      expect(pension.monthlyPension).toBeLessThan(basicInputs.income.monthlySalary); // Less than current salary
      expect(pension.compensationRatio).toBeGreaterThan(0.3); // At least 30%
      expect(pension.compensationRatio).toBeLessThan(1.0); // Less than 100%
    });
  });

  describe('Capital Duration Analysis', () => {
    it('should analyze how long capital lasts in retirement', () => {
      const projections = simulationEngine.runSimulation(basicInputs);
      const duration = simulationEngine.analyzeCapitalDuration(
        projections, 
        basicInputs.profile.desiredRetirementAge
      );
      
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(50); // Should be reasonable number of years
    });
  });

  describe('Summary Generation', () => {
    it('should generate comprehensive summary', () => {
      const projections = simulationEngine.runSimulation(basicInputs);
      const summary = simulationEngine.generateSummary(projections, basicInputs);
      
      expect(summary.expectedMonthlyPension).toBeGreaterThan(0);
      expect(summary.pensionCompensationRatio).toBeGreaterThan(0);
      expect(summary.capitalDurationYears).toBeGreaterThan(0);
      expect(summary.finalNetWorth).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero assets', () => {
      const zeroAssetsInputs = {
        ...basicInputs,
        assets: { liquidSavings: 0, iskAccount: 0 }
      };
      
      const projections = simulationEngine.runSimulation(zeroAssetsInputs);
      expect(projections.length).toBeGreaterThan(0);
      expect(projections[0].calculations.iskTax).toBe(0); // No ISK tax with zero ISK
    });

    it('should handle very high income', () => {
      const highIncomeInputs = {
        ...basicInputs,
        income: { ...basicInputs.income, monthlySalary: 100000 }
      };
      
      const projections = simulationEngine.runSimulation(highIncomeInputs);
      const firstYear = projections[0];
      
      // Should have state tax with high income
      expect(firstYear.calculations.stateTax).toBeGreaterThan(0);
      expect(firstYear.calculations.netIncome).toBeLessThan(firstYear.calculations.grossIncome);
    });

    it('should handle very low income', () => {
      const lowIncomeInputs = {
        ...basicInputs,
        income: { ...basicInputs.income, monthlySalary: 15000 },
        expenses: { monthlyLiving: 12000 }
      };
      
      const validation = simulationEngine.validateInputs(lowIncomeInputs);
      expect(validation.warnings.length).toBeGreaterThan(0); // Should warn about low income
      
      const projections = simulationEngine.runSimulation(lowIncomeInputs);
      expect(projections.length).toBeGreaterThan(0); // Should still run
    });

    it('should handle negative cash flow scenarios', () => {
      const negativeFlowInputs = {
        ...basicInputs,
        expenses: { monthlyLiving: 50000 } // Expenses higher than income
      };
      
      const projections = simulationEngine.runSimulation(negativeFlowInputs);
      const firstYear = projections[0];
      
      expect(firstYear.calculations.cashFlow).toBeLessThan(0);
      // Net worth should decrease when cash flow is negative
    });
  });

  describe('Realistic Scenarios', () => {
    it('should produce reasonable results for typical Swedish worker', () => {
      const typicalSwede: MVPSimulationInputs = {
        profile: {
          currentAge: 35,
          gender: 'man',
          desiredRetirementAge: 67
        },
        income: {
          monthlySalary: 35000, // Median Swedish salary
          realSalaryGrowth: 0.015
        },
        expenses: {
          monthlyLiving: 22000
        },
        assets: {
          liquidSavings: 50000,
          iskAccount: 150000
        },
        investments: {
          liquidSavingsRate: 0.005,
          iskAccountRate: 0.035
        }
      };
      
      const projections = simulationEngine.runSimulation(typicalSwede);
      const summary = simulationEngine.generateSummary(projections, typicalSwede);
      
      // Should have reasonable pension replacement ratio
      expect(summary.pensionCompensationRatio).toBeGreaterThan(0.4);
      expect(summary.pensionCompensationRatio).toBeLessThan(0.8);
      
      // Should accumulate reasonable wealth by retirement
      expect(summary.finalNetWorth).toBeGreaterThan(200000); // At least 200k kr
      expect(summary.finalNetWorth).toBeLessThan(5000000); // Less than 5M kr
    });

    it('should handle early retirement scenario', () => {
      const earlyRetirementInputs = {
        ...basicInputs,
        profile: { ...basicInputs.profile, desiredRetirementAge: 55 },
        income: { ...basicInputs.income, monthlySalary: 60000 }, // Higher income
        expenses: { monthlyLiving: 20000 } // Lower expenses
      };
      
      const validation = simulationEngine.validateInputs(earlyRetirementInputs);
      expect(validation.warnings.length).toBeGreaterThan(0); // Should warn about early retirement
      
      const projections = simulationEngine.runSimulation(earlyRetirementInputs);
      const earlyRetiree = projections.find(p => p.age === 55);
      expect(earlyRetiree?.salary).toBe(0); // No salary at retirement
    });
  });
});
