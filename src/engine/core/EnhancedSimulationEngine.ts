// ============================================================================
// ENHANCED SIMULATION ENGINE WITH PENSION SUPPORT
// Extended engine that handles comprehensive pension calculations
// ============================================================================

import { 
  PensionSettings, 
  PensionAccount,
  EnhancedSimulationInputs,
  EnhancedYearProjection 
} from '../../types/pension';
import { taxCalculator } from '../modules/TaxCalculator';
import { MACROECONOMIC_ASSUMPTIONS } from '../swedish-parameters/TaxParameters2025';

export class EnhancedSimulationEngine {
  private readonly assumptions = MACROECONOMIC_ASSUMPTIONS;

  /**
   * Run the complete simulation with pension support
   */
  runEnhancedSimulation(inputs: EnhancedSimulationInputs): EnhancedYearProjection[] {
    const results: EnhancedYearProjection[] = [];
    const lifeExpectancy = this.assumptions.lifeExpectancy[
      inputs.profile.gender === 'man' ? 'male' : 'female'
    ];
    
    // Initialize state variables with proper validation
    let currentSalary = this.safeNumber(inputs.income.monthlySalary * 12);
    let liquidAssets = this.safeNumber(inputs.assets.liquidSavings);
    let iskAccount = this.safeNumber(inputs.assets.iskAccount);
    
    // Initialize pension capitals (they grow until withdrawal)
    let generalPensionCapital = this.safeNumber(
      inputs.pensions.generalPension.currentInkomstpension + 
      inputs.pensions.generalPension.currentPremiepension
    );
    let pensionAccounts = [...inputs.pensions.accounts];
    
    // Run simulation year by year
    for (let year = 0; year <= lifeExpectancy - inputs.profile.currentAge; year++) {
      const age = inputs.profile.currentAge + year;
      const isRetired = age >= inputs.profile.desiredRetirementAge;
      
      const yearProjection = this.simulateEnhancedYear({
        year,
        age,
        isRetired,
        currentSalary: isRetired ? 0 : currentSalary,
        liquidAssets,
        iskAccount,
        monthlyExpenses: this.safeNumber(inputs.expenses.monthlyLiving),
        generalPensionCapital,
        pensionAccounts,
        pensionSettings: inputs.pensions
      });
      
      results.push(yearProjection);
      
      // Update state for next year with safe math
      liquidAssets = Math.max(0, this.safeNumber(liquidAssets + yearProjection.calculations.cashFlow));
      iskAccount = this.safeNumber(iskAccount * (1 + this.assumptions.realReturnOnInvestments.mixedPortfolio));
      
      // Update pension capitals
      generalPensionCapital = this.safeNumber(yearProjection.pensionCapital.general);
      pensionAccounts = this.updatePensionAccounts(pensionAccounts, age);
      
      // Salary grows with real salary growth (if not retired)
      if (!isRetired) {
        currentSalary = this.safeNumber(currentSalary * (1 + inputs.income.realSalaryGrowth));
      }
    }
    
    return results;
  }

  /**
   * Simulate a single year with pension calculations
   */
  private simulateEnhancedYear(yearInputs: {
    year: number;
    age: number;
    isRetired: boolean;
    currentSalary: number;
    liquidAssets: number;
    iskAccount: number;
    monthlyExpenses: number;
    generalPensionCapital: number;
    pensionAccounts: PensionAccount[];
    pensionSettings: PensionSettings;
  }): EnhancedYearProjection {
    
    const { 
    year, age, currentSalary, liquidAssets, iskAccount, 
    monthlyExpenses, generalPensionCapital, pensionAccounts, pensionSettings 
    } = yearInputs;
    
    // Calculate pension income for this year
    const pensionIncome = this.calculatePensionIncome(
      age, 
      generalPensionCapital, 
      pensionAccounts, 
      pensionSettings
    );
    
    // Total income includes salary + pension
    const salaryIncome = this.safeNumber(currentSalary);
    const pensionYearlyIncome = this.safeNumber(pensionIncome.total * 12);
    const totalGrossIncome = salaryIncome + pensionYearlyIncome;
    
    // Calculate taxes on total income
    const taxResult = taxCalculator.calculateYearlyTax({
      grossSalary: totalGrossIncome,
      age,
      iskCapital: this.safeNumber(iskAccount),
      kfCapital: 0,
    });
    
    // Calculate yearly expenses
    const yearlyExpenses = this.safeNumber(monthlyExpenses * 12);
    
    // Calculate cash flow
    const netIncome = this.safeNumber(taxResult.netIncome);
    const cashFlow = netIncome - yearlyExpenses;
    
    // Update pension capital (subtract withdrawals, add growth if not withdrawing)
    const updatedPensionCapital = this.updatePensionCapital(
      age,
      generalPensionCapital,
      pensionAccounts,
      pensionSettings,
      pensionIncome
    );
    
    // Calculate net worth with safe math
    const totalPensionCapital = this.safeNumber(
      updatedPensionCapital.general + 
      updatedPensionCapital.occupational + 
      updatedPensionCapital.private
    );
    
    const netWorth = Math.max(0, 
      this.safeNumber(liquidAssets) + 
      this.safeNumber(iskAccount) + 
      totalPensionCapital + 
      this.safeNumber(cashFlow)
    );
    
    return {
      year,
      age,
      salary: salaryIncome,
      expenses: yearlyExpenses,
      savings: cashFlow,
      netWorth: this.safeNumber(netWorth),
      calculations: {
        grossIncome: totalGrossIncome,
        pensionFee: this.safeNumber(salaryIncome * 0.07), // Only on salary
        municipalTax: this.safeNumber(taxResult.municipalTax),
        stateTax: this.safeNumber(taxResult.stateTax),
        iskTax: this.safeNumber(taxResult.iskTax),
        totalTax: this.safeNumber(taxResult.totalTax),
        netIncome,
        cashFlow
      },
      pensionIncome,
      pensionCapital: {
        general: this.safeNumber(updatedPensionCapital.general),
        occupational: this.safeNumber(updatedPensionCapital.occupational),
        private: this.safeNumber(updatedPensionCapital.private),
        total: totalPensionCapital
      }
    };
  }

  /**
   * Calculate pension income for a given year
   */
  private calculatePensionIncome(
    age: number,
    generalPensionCapital: number,
    pensionAccounts: PensionAccount[],
    pensionSettings: PensionSettings
  ): EnhancedYearProjection['pensionIncome'] {
    
    let generalPension = 0;
    let occupationalPension = 0;
    let privatePension = 0;

    // General pension
    if (age >= pensionSettings.generalPension.withdrawalStartAge) {
      if (pensionSettings.generalPension.estimatedMonthlyAmount > 0) {
        generalPension = this.safeNumber(pensionSettings.generalPension.estimatedMonthlyAmount);
      } else {
        // Estimate based on capital and life expectancy
        const genderKey = age >= 65 ? 'female' : 'male';
        const remainingYears = Math.max(1, this.assumptions.lifeExpectancy[genderKey] - age);
        generalPension = this.safeNumber(generalPensionCapital / (remainingYears * 12));
      }
    }

    // Occupational and private pensions
    pensionAccounts.forEach(account => {
      if (age >= account.withdrawalSettings.startAge) {
        const monthlyAmount = this.safeNumber(this.calculateAccountPension(account, age));
        
        if (account.type === 'tjänste') {
          occupationalPension += monthlyAmount;
        } else if (account.type === 'privat') {
          privatePension += monthlyAmount;
        }
      }
    });

    return {
      generalPension,
      occupationalPension,
      privatePension,
      total: generalPension + occupationalPension + privatePension
    };
  }

  /**
   * Calculate monthly pension from a specific account
   */
  private calculateAccountPension(account: PensionAccount, currentAge: number): number {
    if (currentAge < account.withdrawalSettings.startAge) {
      return 0;
    }

    // Use specified monthly amount if set
    if (account.withdrawalSettings.monthlyAmount > 0) {
      return this.safeNumber(account.withdrawalSettings.monthlyAmount);
    }

    // Use expected monthly pension if available
    if (account.expectedMonthlyPension && account.expectedMonthlyPension > 0) {
      return this.safeNumber(account.expectedMonthlyPension);
    }

    // Calculate based on capital and withdrawal strategy
    const currentValue = this.safeNumber(account.currentValue);
    
    if (account.withdrawalSettings.isLifelong) {
      // Lifelong pension - calculate based on life expectancy
      const genderKey = currentAge >= 65 ? 'female' : 'male';
      const lifeExpectancy = this.assumptions.lifeExpectancy[genderKey];
      const remainingYears = Math.max(1, lifeExpectancy - currentAge);
      return currentValue / (remainingYears * 12);
    } else {
      // Until capital depleted - use 4% rule as default
      return (currentValue * 0.04) / 12;
    }
  }

  /**
   * Update pension capital values
   */
  private updatePensionCapital(
    age: number,
    generalPensionCapital: number,
    pensionAccounts: PensionAccount[],
    pensionSettings: PensionSettings,
    pensionIncome: EnhancedYearProjection['pensionIncome']
  ) {
    // General pension capital
    let updatedGeneralCapital = this.safeNumber(generalPensionCapital);
    if (age >= pensionSettings.generalPension.withdrawalStartAge) {
      // If withdrawing, reduce capital
      const withdrawal = this.safeNumber(pensionIncome.generalPension * 12);
      updatedGeneralCapital = Math.max(0, updatedGeneralCapital - withdrawal);
    } else {
      // If not withdrawing, grow with conservative return
      updatedGeneralCapital = this.safeNumber(
        updatedGeneralCapital * (1 + this.assumptions.realReturnOnInvestments.bonds)
      );
    }

    // Occupational and private pension capital
    let occupationalCapital = 0;
    let privateCapital = 0;

    pensionAccounts.forEach(account => {
      if (age >= account.withdrawalSettings.startAge) {
        // Withdrawing from this account
        const annualWithdrawal = this.safeNumber(this.calculateAccountPension(account, age) * 12);
        account.currentValue = Math.max(0, this.safeNumber(account.currentValue) - annualWithdrawal);
      } else {
        // Not withdrawing yet, grow the capital
        account.currentValue = this.safeNumber(
          account.currentValue * (1 + this.assumptions.realReturnOnInvestments.mixedPortfolio)
        );
      }

      if (account.type === 'tjänste') {
        occupationalCapital += this.safeNumber(account.currentValue);
      } else if (account.type === 'privat') {
        privateCapital += this.safeNumber(account.currentValue);
      }
    });

    return {
      general: updatedGeneralCapital,
      occupational: occupationalCapital,
      private: privateCapital,
      total: updatedGeneralCapital + occupationalCapital + privateCapital
    };
  }

  /**
   * Utility method to ensure a number is valid and not NaN
   */
  private safeNumber(value: number | undefined | null): number {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
      return 0;
    }
    return value;
  }

  /**
   * Update pension accounts array
   */
  private updatePensionAccounts(
    accounts: PensionAccount[],
    age: number
  ): PensionAccount[] {
    return accounts.map(account => {
      if (age >= account.withdrawalSettings.startAge) {
        const monthlyWithdrawal = this.safeNumber(this.calculateAccountPension(account, age));
        const annualWithdrawal = monthlyWithdrawal * 12;
        
        return {
          ...account,
          currentValue: Math.max(0, this.safeNumber(account.currentValue) - annualWithdrawal)
        };
      } else {
        // Grow the capital
        return {
          ...account,
          currentValue: this.safeNumber(
            account.currentValue * (1 + this.assumptions.realReturnOnInvestments.mixedPortfolio)
          )
        };
      }
    });
  }

  /**
   * Validate enhanced inputs including pension data
   */
  validateEnhancedInputs(inputs: EnhancedSimulationInputs): { 
    isValid: boolean; 
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Basic validation (reuse from base engine)
    // Age validations
    if (inputs.profile.currentAge < 16 || inputs.profile.currentAge > 80) {
      errors.push("Ålder måste vara mellan 16 och 80 år");
    }
    
    if (inputs.profile.desiredRetirementAge <= inputs.profile.currentAge) {
      errors.push("Pensionsålder måste vara högre än nuvarande ålder");
    }

    // Pension-specific validations
    if (inputs.pensions.generalPension.withdrawalStartAge < 62) {
      errors.push("Allmän pension kan tidigast tas ut vid 62 års ålder");
    }

    if (inputs.pensions.generalPension.withdrawalStartAge > 70) {
      warnings.push("Allmän pension bör tas ut senast vid 70 års ålder");
    }

    // Validate pension accounts
    inputs.pensions.accounts.forEach((account) => {
      if (account.withdrawalSettings.startAge < account.earliestWithdrawalAge) {
        errors.push(`${account.name}: Uttagsålder för tidigt (minimum ${account.earliestWithdrawalAge} år)`);
      }
      
      if (account.withdrawalSettings.startAge > account.latestWithdrawalAge) {
        warnings.push(`${account.name}: Sent uttag kan reducera total pension`);
      }

      if (account.currentValue === 0 && !account.expectedMonthlyPension) {
        warnings.push(`${account.name}: Inget värde angivet - kontrollera uppgifterna`);
      }
    });

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }
}

// Export singleton instance
export const enhancedSimulationEngine = new EnhancedSimulationEngine();