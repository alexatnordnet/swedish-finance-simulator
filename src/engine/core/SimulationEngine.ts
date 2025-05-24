// ============================================================================
// CORE SIMULATION ENGINE
// The main engine that orchestrates the yearly financial simulation
// ============================================================================

import { 
  MVPSimulationInputs, 
  MVPYearProjection,
  SimulationResults 
} from '../../types';
import { taxCalculator } from '../modules/TaxCalculator';
import { MACROECONOMIC_ASSUMPTIONS } from '../swedish-parameters/TaxParameters2025';

export class SimulationEngine {
  private readonly assumptions = MACROECONOMIC_ASSUMPTIONS;

  /**
   * Run the complete simulation from current age to life expectancy
   */
  runSimulation(inputs: MVPSimulationInputs): MVPYearProjection[] {
    const results: MVPYearProjection[] = [];
    const lifeExpectancy = this.assumptions.lifeExpectancy[
      inputs.profile.gender === 'man' ? 'male' : 'female'
    ];
    
    // Initialize state variables
    let currentSalary = inputs.income.monthlySalary * 12; // Annual salary
    let liquidAssets = inputs.assets.liquidSavings;
    let iskAccount = inputs.assets.iskAccount;
    
    // Run simulation year by year
    for (let year = 0; year <= lifeExpectancy - inputs.profile.currentAge; year++) {
      const age = inputs.profile.currentAge + year;
      const isRetired = age >= inputs.profile.desiredRetirementAge;
      
      const yearProjection = this.simulateYear({
        year,
        age,
        isRetired,
        currentSalary: isRetired ? 0 : currentSalary,
        liquidAssets,
        iskAccount,
        monthlyExpenses: inputs.expenses.monthlyLiving
      });
      
      results.push(yearProjection);
      
      // Update state for next year
      liquidAssets = yearProjection.calculations.cashFlow > 0 ? 
        liquidAssets + yearProjection.calculations.cashFlow : 
        Math.max(0, liquidAssets + yearProjection.calculations.cashFlow);
      
      // ISK grows with real return assumption
      iskAccount *= (1 + this.assumptions.realReturnOnInvestments.mixedPortfolio);
      
      // Salary grows with real salary growth (if not retired)
      if (!isRetired) {
        currentSalary *= (1 + inputs.income.realSalaryGrowth);
      }
    }
    
    return results;
  }

  /**
   * Simulate a single year's financial situation
   */
  private simulateYear(yearInputs: {
    year: number;
    age: number;
    isRetired: boolean;
    currentSalary: number;
    liquidAssets: number;
    iskAccount: number;
    monthlyExpenses: number;
  }): MVPYearProjection {
    
    const { year, age, isRetired, currentSalary, liquidAssets, iskAccount, monthlyExpenses } = yearInputs;
    
    // Calculate taxes and net income
    const taxResult = taxCalculator.calculateYearlyTax({
      grossSalary: currentSalary,
      age,
      iskCapital: iskAccount,
      kfCapital: 0, // Not included in MVP
    });
    
    // Calculate yearly expenses
    const yearlyExpenses = monthlyExpenses * 12;
    
    // Calculate cash flow
    const cashFlow = taxResult.netIncome - yearlyExpenses;
    
    // Calculate net worth
    const netWorth = liquidAssets + iskAccount + cashFlow;
    
    return {
      year,
      age,
      salary: currentSalary,
      expenses: yearlyExpenses,
      savings: cashFlow,
      netWorth: Math.max(0, netWorth),
      calculations: {
        grossIncome: currentSalary,
        pensionFee: currentSalary * 0.07, // Simplified
        municipalTax: taxResult.municipalTax,
        stateTax: taxResult.stateTax,
        iskTax: taxResult.iskTax,
        totalTax: taxResult.totalTax,
        netIncome: taxResult.netIncome,
        cashFlow
      }
    };
  }

  /**
   * Calculate pension estimates (simplified for MVP)
   */
  estimatePension(inputs: MVPSimulationInputs): {
    monthlyPension: number;
    compensationRatio: number;
  } {
    // Very simplified pension calculation for MVP
    const workingYears = inputs.profile.desiredRetirementAge - inputs.profile.currentAge;
    const avgSalary = inputs.income.monthlySalary;
    
    // Rough estimate: 60% of final salary from all pension sources
    const estimatedMonthlyPension = avgSalary * 0.6;
    const compensationRatio = 0.6; // 60%
    
    return {
      monthlyPension: estimatedMonthlyPension,
      compensationRatio
    };
  }

  /**
   * Analyze how long capital will last in retirement
   */
  analyzeCapitalDuration(projections: MVPYearProjection[], retirementAge: number): number {
    const retirementYear = projections.findIndex(p => p.age === retirementAge);
    if (retirementYear === -1) return 0;
    
    // Find when net worth reaches zero after retirement
    for (let i = retirementYear; i < projections.length; i++) {
      if (projections[i].netWorth <= 0) {
        return projections[i].age - retirementAge;
      }
    }
    
    // Capital lasts until death
    const lastProjection = projections[projections.length - 1];
    return lastProjection.age - retirementAge;
  }

  /**
   * Generate summary statistics
   */
  generateSummary(
    projections: MVPYearProjection[], 
    inputs: MVPSimulationInputs
  ): SimulationResults['summary'] {
    const pension = this.estimatePension(inputs);
    const capitalDuration = this.analyzeCapitalDuration(projections, inputs.profile.desiredRetirementAge);
    const finalProjection = projections[projections.length - 1];
    
    return {
      expectedMonthlyPension: pension.monthlyPension,
      pensionCompensationRatio: pension.compensationRatio,
      capitalDurationYears: capitalDuration,
      finalNetWorth: finalProjection.netWorth
    };
  }

  /**
   * Validate inputs and provide warnings
   */
  validateInputs(inputs: MVPSimulationInputs): { 
    isValid: boolean; 
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Age validations
    if (inputs.profile.currentAge < 16 || inputs.profile.currentAge > 80) {
      errors.push("Ålder måste vara mellan 16 och 80 år");
    }
    
    if (inputs.profile.desiredRetirementAge <= inputs.profile.currentAge) {
      errors.push("Pensionsålder måste vara högre än nuvarande ålder");
    }
    
    if (inputs.profile.desiredRetirementAge < 61) {
      warnings.push("Pensionsålder under 61 år kan begränsa pensionsutbetalningar");
    }
    
    // Income validations
    if (inputs.income.monthlySalary < 10000) {
      warnings.push("Låg månadsLön kan påverka pensionsintjänandet");
    }
    
    if (inputs.income.monthlySalary > 100000) {
      warnings.push("Hög lön över pensionstak - begränsad pensionsintjäning på överskjutande del");
    }
    
    // Expense validations
    if (inputs.expenses.monthlyLiving >= inputs.income.monthlySalary) {
      warnings.push("Utgifter är lika med eller högre än inkomst - inget sparande");
    }
    
    if (inputs.expenses.monthlyLiving < 15000) {
      warnings.push("Mycket låga levnadskostnader - kontrollera att alla utgifter är inkluderade");
    }
    
    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }
}

// Export singleton instance
export const simulationEngine = new SimulationEngine();
