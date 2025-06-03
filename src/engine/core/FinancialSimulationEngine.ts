// ============================================================================
// FINANCIAL SIMULATION ENGINE
// Core engine for Swedish personal finance lifetime simulation
// ============================================================================

import { MVPSimulationInputs, MVPYearProjection } from "../../types";
import {
  PensionSettings,
  PensionAccount,
  EnhancedYearProjection,
} from "../../types/pension";
import { taxCalculator } from "../modules/TaxCalculator";
import { MACROECONOMIC_ASSUMPTIONS } from "../swedish-parameters/TaxParameters2025";
import { InvestmentRates } from "../../components";

// Configuration for simulation behavior
interface SimulationConfig {
  includePensions: boolean;
  useCustomInvestmentRates: boolean;
  enableTransparency: boolean;
}

// Unified input type that handles both MVP and Enhanced scenarios
type UnifiedSimulationInputs = MVPSimulationInputs & {
  pensions?: PensionSettings;
};

// Unified projection type that can be either MVP or Enhanced
type UnifiedYearProjection = MVPYearProjection & {
  pensionIncome?: EnhancedYearProjection["pensionIncome"];
  pensionCapital?: EnhancedYearProjection["pensionCapital"];
};

// Validation result type
interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

// Year calculation parameters
interface YearCalculationParams {
  year: number;
  age: number;
  isRetired: boolean;
  currentSalary: number;
  liquidAssets: number;
  iskAccount: number;
  monthlyExpenses: number;
  generalPensionCapital?: number;
  pensionAccounts?: PensionAccount[];
  pensionSettings?: PensionSettings;
  investmentRates?: InvestmentRates;
}

export class FinancialSimulationEngine {
  private readonly assumptions = MACROECONOMIC_ASSUMPTIONS;

  /**
   * Run simulation with unified logic for both MVP and Enhanced scenarios
   */
  runSimulation(
    inputs: UnifiedSimulationInputs,
    config: SimulationConfig = {
      includePensions: false,
      useCustomInvestmentRates: false,
      enableTransparency: false,
    },
    investmentRates?: InvestmentRates
  ): UnifiedYearProjection[] {
    const results: UnifiedYearProjection[] = [];
    const lifeExpectancy =
      this.assumptions.lifeExpectancy[
        inputs.profile.gender === "man" ? "male" : "female"
      ];

    // Validate and cap investment rates to prevent extreme calculations
    const safeInvestmentRates = this.sanitizeInvestmentRates(investmentRates);

    // Initialize state variables with validation
    let currentSalary = this.safeNumber(inputs.income.monthlySalary * 12);
    let liquidAssets = this.safeNumber(inputs.assets.liquidSavings);
    let iskAccount = this.safeNumber(inputs.assets.iskAccount);

    // Initialize pension-related state if enabled
    let generalPensionCapital = 0;
    let pensionAccounts: PensionAccount[] = [];

    if (config.includePensions && inputs.pensions) {
      generalPensionCapital = this.safeNumber(
        inputs.pensions.generalPension.currentInkomstpension +
          inputs.pensions.generalPension.currentPremiepension
      );
      pensionAccounts = [...inputs.pensions.accounts];
    }

    // Run simulation year by year
    for (
      let year = 0;
      year <= lifeExpectancy - inputs.profile.currentAge;
      year++
    ) {
      const age = inputs.profile.currentAge + year;
      const isRetired = age >= inputs.profile.desiredRetirementAge;

      const yearProjection = this.simulateYear(
        {
          year,
          age,
          isRetired,
          currentSalary: isRetired ? 0 : currentSalary,
          liquidAssets,
          iskAccount,
          monthlyExpenses: this.safeNumber(inputs.expenses.monthlyLiving),
          generalPensionCapital: config.includePensions
            ? generalPensionCapital
            : undefined,
          pensionAccounts: config.includePensions ? pensionAccounts : undefined,
          pensionSettings: config.includePensions ? inputs.pensions : undefined,
          investmentRates: config.useCustomInvestmentRates
            ? safeInvestmentRates
            : undefined,
        },
        config
      );

      results.push(yearProjection);

      // Update state for next year using configurable logic
      this.updateStateForNextYear({
        yearProjection,
        liquidAssets,
        iskAccount,
        currentSalary,
        generalPensionCapital,
        pensionAccounts,
        isRetired,
        config,
        inputs,
        safeInvestmentRates,
      });

      // Update variables for next iteration
      liquidAssets = this.calculateNextLiquidAssets(
        yearProjection,
        liquidAssets,
        safeInvestmentRates,
        config
      );
      iskAccount = this.calculateNextISKValue(
        iskAccount,
        safeInvestmentRates,
        config
      );

      if (config.includePensions) {
        generalPensionCapital = yearProjection.pensionCapital?.general || 0;
        pensionAccounts = this.updatePensionAccounts(pensionAccounts, age);
      }

      // Update salary if not retired
      if (!isRetired) {
        currentSalary = this.safeNumber(
          currentSalary * (1 + inputs.income.realSalaryGrowth)
        );
      }
    }

    return results;
  }

  /**
   * Unified year simulation that handles both MVP and Enhanced scenarios
   */
  private simulateYear(
    params: YearCalculationParams,
    config: SimulationConfig
  ): UnifiedYearProjection {
    const {
      year,
      age,
      currentSalary,
      liquidAssets,
      iskAccount,
      monthlyExpenses,
      generalPensionCapital,
      pensionAccounts,
      pensionSettings,
    } = params;

    // Calculate pension income if enabled
    let pensionIncome = undefined;
    if (
      config.includePensions &&
      generalPensionCapital !== undefined &&
      pensionAccounts &&
      pensionSettings
    ) {
      pensionIncome = this.calculatePensionIncome(
        age,
        generalPensionCapital,
        pensionAccounts,
        pensionSettings
      );
    }

    // Calculate total income (salary + pension if applicable)
    const salaryIncome = this.safeNumber(currentSalary);
    const pensionYearlyIncome = pensionIncome
      ? this.safeNumber(pensionIncome.total * 12)
      : 0;
    const totalGrossIncome = salaryIncome + pensionYearlyIncome;

    // Calculate taxes on total income
    const taxResult = taxCalculator.calculateYearlyTax({
      grossSalary: totalGrossIncome,
      age,
      iskCapital: this.safeNumber(iskAccount),
      kfCapital: 0,
    });

    // Calculate yearly expenses and cash flow
    const yearlyExpenses = this.safeNumber(monthlyExpenses * 12);
    const netIncome = this.safeNumber(taxResult.netIncome);
    const cashFlow = netIncome - yearlyExpenses;

    // Calculate pension capital if enabled
    let pensionCapital = undefined;
    if (
      config.includePensions &&
      generalPensionCapital !== undefined &&
      pensionAccounts &&
      pensionSettings
    ) {
      const updatedPensionCapital = this.updatePensionCapital(
        age,
        generalPensionCapital,
        pensionAccounts,
        pensionSettings,
        pensionIncome!
      );
      pensionCapital = {
        general: this.safeNumber(updatedPensionCapital.general),
        occupational: this.safeNumber(updatedPensionCapital.occupational),
        private: this.safeNumber(updatedPensionCapital.private),
        total: this.safeNumber(updatedPensionCapital.total),
      };
    }

    // Calculate net worth
    const totalPensionCapital = pensionCapital?.total || 0;
    const netWorth = Math.max(
      0,
      this.safeNumber(liquidAssets) +
        this.safeNumber(iskAccount) +
        totalPensionCapital
    );

    // Build the unified projection
    const baseProjection: MVPYearProjection = {
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
        cashFlow,
      },
    };

    // Add pension data if enabled
    if (config.includePensions && pensionIncome && pensionCapital) {
      return {
        ...baseProjection,
        pensionIncome,
        pensionCapital,
      };
    }

    return baseProjection;
  }

  /**
   * Consolidated validation logic for all input types
   */
  validateInputs(
    inputs: UnifiedSimulationInputs,
    config: SimulationConfig = {
      includePensions: false,
      useCustomInvestmentRates: false,
      enableTransparency: false,
    }
  ): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Basic profile validation
    this.validateProfile(inputs.profile, errors, warnings);

    // Income validation
    this.validateIncome(inputs.income, warnings);

    // Expense validation
    this.validateExpenses(inputs.expenses, inputs.income, warnings);

    // Investment rates validation if enabled
    if (config.useCustomInvestmentRates && inputs.investments) {
      this.validateInvestmentRates(inputs.investments, errors, warnings);
    }

    // Pension validation if enabled
    if (config.includePensions && inputs.pensions) {
      this.validatePensions(inputs.pensions, errors, warnings);
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  }

  /**
   * Profile validation logic
   */
  private validateProfile(
    profile: MVPSimulationInputs["profile"],
    errors: string[],
    warnings: string[]
  ): void {
    if (profile.currentAge < 16 || profile.currentAge > 80) {
      errors.push("Ålder måste vara mellan 16 och 80 år");
    }

    if (profile.desiredRetirementAge <= profile.currentAge) {
      errors.push("Pensionsålder måste vara högre än nuvarande ålder");
    }

    if (profile.desiredRetirementAge < 61) {
      warnings.push(
        "Pensionsålder under 61 år kan begränsa pensionsutbetalningar"
      );
    }
  }

  /**
   * Income validation logic
   */
  private validateIncome(
    income: MVPSimulationInputs["income"],
    warnings: string[]
  ): void {
    if (income.monthlySalary < 10000) {
      warnings.push("Låg månadslön kan påverka pensionsintjänandet");
    }

    if (income.monthlySalary > 100000) {
      warnings.push(
        "Hög lön över pensionstak - begränsad pensionsintjäning på överskjutande del"
      );
    }

    if (income.realSalaryGrowth < -0.05 || income.realSalaryGrowth > 0.1) {
      warnings.push(
        "Ovanlig real lönetillväxt - kontrollera att värdet är rimligt"
      );
    }
  }

  /**
   * Expense validation logic
   */
  private validateExpenses(
    expenses: MVPSimulationInputs["expenses"],
    income: MVPSimulationInputs["income"],
    warnings: string[]
  ): void {
    if (expenses.monthlyLiving >= income.monthlySalary) {
      warnings.push(
        "Utgifter är lika med eller högre än inkomst - inget sparande"
      );
    }

    if (expenses.monthlyLiving < 15000) {
      warnings.push(
        "Mycket låga levnadskostnader - kontrollera att alla utgifter är inkluderade"
      );
    }
  }

  /**
   * Investment rates validation logic
   */
  private validateInvestmentRates(
    rates: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (rates.liquidSavingsRate < -0.1 || rates.liquidSavingsRate > 0.2) {
      warnings.push(
        "Avkastning på likvida medel verkar orealistisk (bör vara mellan -10% och 20%)"
      );
    }

    if (rates.iskAccountRate < -0.5 || rates.iskAccountRate > 0.5) {
      errors.push("Avkastning på ISK-konto måste vara mellan -50% och 50%");
    }

    if (rates.iskAccountRate > 0.15) {
      warnings.push(
        "Hög förväntad avkastning på ISK-konto (över 15% årligen) - överväg mer konservativa antaganden"
      );
    }
  }

  /**
   * Pension validation logic
   */
  private validatePensions(
    pensions: PensionSettings,
    errors: string[],
    warnings: string[]
  ): void {
    if (pensions.generalPension.withdrawalStartAge < 62) {
      errors.push("Allmän pension kan tidigast tas ut vid 62 års ålder");
    }

    if (pensions.generalPension.withdrawalStartAge > 70) {
      warnings.push("Allmän pension bör tas ut senast vid 70 års ålder");
    }

    pensions.accounts.forEach((account) => {
      if (account.withdrawalSettings.startAge < account.earliestWithdrawalAge) {
        errors.push(
          `${account.name}: Uttagsålder för tidigt (minimum ${account.earliestWithdrawalAge} år)`
        );
      }

      if (account.withdrawalSettings.startAge > account.latestWithdrawalAge) {
        warnings.push(`${account.name}: Sent uttag kan reducera total pension`);
      }

      if (account.currentValue === 0 && !account.expectedMonthlyPension) {
        warnings.push(
          `${account.name}: Inget värde angivet - kontrollera uppgifterna`
        );
      }
    });
  }

  /**
   * Sanitize and cap investment rates to prevent extreme calculations
   */
  private sanitizeInvestmentRates(rates?: InvestmentRates): InvestmentRates {
    if (!rates) {
      return {
        liquidSavingsRate: this.assumptions.realReturnOnInvestments.bonds,
        iskAccountRate: this.assumptions.realReturnOnInvestments.mixedPortfolio,
      };
    }

    const safeLiquidRate = Math.max(
      -0.1,
      Math.min(0.2, rates.liquidSavingsRate)
    );
    const safeISKRate = Math.max(-0.5, Math.min(0.5, rates.iskAccountRate));

    if (safeLiquidRate !== rates.liquidSavingsRate) {
      console.warn(
        `Liquid savings rate capped from ${rates.liquidSavingsRate} to ${safeLiquidRate}`
      );
    }
    if (safeISKRate !== rates.iskAccountRate) {
      console.warn(
        `ISK rate capped from ${rates.iskAccountRate} to ${safeISKRate}`
      );
    }

    return {
      liquidSavingsRate: safeLiquidRate,
      iskAccountRate: safeISKRate,
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
  ): EnhancedYearProjection["pensionIncome"] {
    let generalPension = 0;
    let occupationalPension = 0;
    let privatePension = 0;

    // General pension
    if (age >= pensionSettings.generalPension.withdrawalStartAge) {
      if (pensionSettings.generalPension.estimatedMonthlyAmount > 0) {
        generalPension = this.safeNumber(
          pensionSettings.generalPension.estimatedMonthlyAmount
        );
      } else {
        // Estimate based on capital and life expectancy
        const genderKey = age >= 65 ? "female" : "male";
        const remainingYears = Math.max(
          1,
          this.assumptions.lifeExpectancy[genderKey] - age
        );
        generalPension = this.safeNumber(
          generalPensionCapital / (remainingYears * 12)
        );
      }
    }

    // Occupational and private pensions
    pensionAccounts.forEach((account) => {
      if (age >= account.withdrawalSettings.startAge) {
        const monthlyAmount = this.safeNumber(
          this.calculateAccountPension(account, age)
        );

        if (account.type === "tjänste") {
          occupationalPension += monthlyAmount;
        } else if (account.type === "privat") {
          privatePension += monthlyAmount;
        }
      }
    });

    return {
      generalPension,
      occupationalPension,
      privatePension,
      total: generalPension + occupationalPension + privatePension,
    };
  }

  /**
   * Calculate monthly pension from a specific account
   */
  private calculateAccountPension(
    account: PensionAccount,
    currentAge: number
  ): number {
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
      const genderKey = currentAge >= 65 ? "female" : "male";
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
    pensionIncome: EnhancedYearProjection["pensionIncome"]
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
        updatedGeneralCapital *
          (1 + this.assumptions.realReturnOnInvestments.bonds)
      );
    }

    // Occupational and private pension capital
    let occupationalCapital = 0;
    let privateCapital = 0;

    pensionAccounts.forEach((account) => {
      if (age >= account.withdrawalSettings.startAge) {
        // Withdrawing from this account
        const annualWithdrawal = this.safeNumber(
          this.calculateAccountPension(account, age) * 12
        );
        account.currentValue = Math.max(
          0,
          this.safeNumber(account.currentValue) - annualWithdrawal
        );
      } else {
        // Not withdrawing yet, grow the capital
        account.currentValue = this.safeNumber(
          account.currentValue *
            (1 + this.assumptions.realReturnOnInvestments.mixedPortfolio)
        );
      }

      if (account.type === "tjänste") {
        occupationalCapital += this.safeNumber(account.currentValue);
      } else if (account.type === "privat") {
        privateCapital += this.safeNumber(account.currentValue);
      }
    });

    return {
      general: updatedGeneralCapital,
      occupational: occupationalCapital,
      private: privateCapital,
      total: updatedGeneralCapital + occupationalCapital + privateCapital,
    };
  }

  /**
   * Update state for next year with configurable logic
   */
  private updateStateForNextYear(params: {
    yearProjection: UnifiedYearProjection;
    liquidAssets: number;
    iskAccount: number;
    currentSalary: number;
    generalPensionCapital: number;
    pensionAccounts: PensionAccount[];
    isRetired: boolean;
    config: SimulationConfig;
    inputs: UnifiedSimulationInputs;
    safeInvestmentRates: InvestmentRates;
  }): void {
    // This method handles state updates that might need special logic
    // Currently just used for debugging, but could be extended for more complex state management
    if (params.yearProjection.year <= 5) {
      console.log(
        `Year ${
          params.yearProjection.year
        }: Liquid=${params.liquidAssets.toFixed(
          0
        )}, ISK=${params.iskAccount.toFixed(
          0
        )}, CashFlow=${params.yearProjection.calculations.cashFlow.toFixed(
          0
        )}, NetWorth=${params.yearProjection.netWorth.toFixed(0)}`
      );
    }
  }

  /**
   * Calculate next year's liquid assets
   */
  private calculateNextLiquidAssets(
    yearProjection: UnifiedYearProjection,
    currentLiquidAssets: number,
    investmentRates: InvestmentRates,
    config: SimulationConfig
  ): number {
    let totalCashFlow = yearProjection.calculations.cashFlow;
    let liquidAssets = currentLiquidAssets;

    // If cash flow is negative, we need to draw from assets to cover the deficit
    if (totalCashFlow < 0) {
      // First draw from liquid assets
      const liquidDeficit = Math.min(-totalCashFlow, liquidAssets);
      liquidAssets -= liquidDeficit;
      totalCashFlow += liquidDeficit;
    } else {
      // Positive cash flow goes to liquid assets
      liquidAssets += totalCashFlow;
    }

    // Apply investment growth to remaining positive assets
    if (liquidAssets > 0) {
      const growthRate = config.useCustomInvestmentRates
        ? investmentRates.liquidSavingsRate
        : this.assumptions.realReturnOnInvestments.bonds;
      liquidAssets = this.safeNumber(liquidAssets * (1 + growthRate));
    }

    return Math.max(0, liquidAssets);
  }

  /**
   * Calculate next year's ISK value
   */
  private calculateNextISKValue(
    currentISKValue: number,
    investmentRates: InvestmentRates,
    config: SimulationConfig
  ): number {
    if (currentISKValue <= 0) return 0;

    const growthRate = config.useCustomInvestmentRates
      ? investmentRates.iskAccountRate
      : this.assumptions.realReturnOnInvestments.mixedPortfolio;

    return this.safeNumber(currentISKValue * (1 + growthRate));
  }

  /**
   * Update pension accounts array
   */
  private updatePensionAccounts(
    accounts: PensionAccount[],
    age: number
  ): PensionAccount[] {
    return accounts.map((account) => {
      if (age >= account.withdrawalSettings.startAge) {
        const monthlyWithdrawal = this.safeNumber(
          this.calculateAccountPension(account, age)
        );
        const annualWithdrawal = monthlyWithdrawal * 12;

        return {
          ...account,
          currentValue: Math.max(
            0,
            this.safeNumber(account.currentValue) - annualWithdrawal
          ),
        };
      } else {
        // Grow the capital
        return {
          ...account,
          currentValue: this.safeNumber(
            account.currentValue *
              (1 + this.assumptions.realReturnOnInvestments.mixedPortfolio)
          ),
        };
      }
    });
  }

  /**
   * Utility method to ensure a number is valid and not NaN
   */
  private safeNumber(value: number | undefined | null): number {
    if (
      value === null ||
      value === undefined ||
      isNaN(value) ||
      !isFinite(value)
    ) {
      return 0;
    }

    // Prevent extreme values that indicate calculation errors
    const MAX_REASONABLE_VALUE = 1e12; // 1 trillion SEK
    if (Math.abs(value) > MAX_REASONABLE_VALUE) {
      console.warn(
        `Extreme value detected: ${value}. Capping at reasonable limit.`
      );
      return value > 0 ? MAX_REASONABLE_VALUE : -MAX_REASONABLE_VALUE;
    }

    return value;
  }

  /**
   * Generate summary statistics for the simulation
   */
  generateSummary(
    projections: UnifiedYearProjection[],
    inputs: UnifiedSimulationInputs,
    config: SimulationConfig
  ) {
    if (projections.length === 0) {
      return this.getEmptySummary();
    }

    const pension = this.estimatePension(inputs, config);
    const capitalDuration = this.analyzeCapitalDuration(
      projections,
      inputs.profile.desiredRetirementAge
    );
    const finalProjection = projections[projections.length - 1];

    const maxNetWorth = Math.max(...projections.map((p) => p.netWorth));
    const retirementProjection = projections.find(
      (p) => p.age === inputs.profile.desiredRetirementAge
    );
    const retirementNetWorth = retirementProjection?.netWorth || 0;

    const positiveSavings = projections.filter((p) => p.savings > 0);
    const totalSavings = positiveSavings.reduce((sum, p) => sum + p.savings, 0);
    const averageYearlySavings =
      positiveSavings.length > 0 ? totalSavings / positiveSavings.length : 0;
    const yearsOfPositiveCashFlow = positiveSavings.length;

    const breakEvenProjection = projections.find((p) => p.netWorth > 0);
    const breakEvenAge = breakEvenProjection?.age || null;

    const baseSummary = {
      maxNetWorth,
      retirementNetWorth,
      finalNetWorth: finalProjection.netWorth,
      totalSavings,
      averageYearlySavings,
      yearsOfPositiveCashFlow,
      breakEvenAge,
      expectedMonthlyPension: pension.monthlyPension,
      pensionCompensationRatio: pension.compensationRatio,
      capitalDurationYears: capitalDuration,
    };

    // Add pension-specific metrics if enabled
    if (config.includePensions && inputs.pensions) {
      const totalPensionCapital =
        inputs.pensions.generalPension.currentInkomstpension +
        inputs.pensions.generalPension.currentPremiepension +
        inputs.pensions.accounts.reduce(
          (sum, acc) => sum + acc.currentValue,
          0
        );

      const pensionProjections = projections.filter(
        (p) => p.age >= inputs.pensions!.generalPension.withdrawalStartAge
      );
      const averageMonthlyPension =
        pensionProjections.length > 0
          ? pensionProjections.reduce(
              (sum, p) => sum + (p.pensionIncome?.total || 0),
              0
            ) / pensionProjections.length
          : 0;

      const pensionYears = pensionProjections.filter(
        (p) => (p.pensionIncome?.total || 0) > 0
      ).length;

      return {
        ...baseSummary,
        totalPensionCapital,
        averageMonthlyPension,
        pensionDuration: pensionYears,
      };
    }

    // Always return all fields for consistency, with defaults for MVP mode
    return {
      ...baseSummary,
      totalPensionCapital: 0,
      averageMonthlyPension: pension.monthlyPension,
      pensionDuration: 0,
    };
  }

  /**
   * Estimate pension amounts (simplified for MVP or enhanced for full version)
   */
  private estimatePension(
    inputs: UnifiedSimulationInputs,
    config: SimulationConfig
  ): {
    monthlyPension: number;
    compensationRatio: number;
  } {
    if (config.includePensions && inputs.pensions) {
      // Enhanced pension calculation
      const estimatedMonthlyPension =
        inputs.pensions.generalPension.estimatedMonthlyAmount +
        inputs.pensions.accounts.reduce(
          (sum, acc) => sum + (acc.expectedMonthlyPension || 0),
          0
        );

      const compensationRatio =
        inputs.income.monthlySalary > 0
          ? estimatedMonthlyPension / inputs.income.monthlySalary
          : 0;

      return { monthlyPension: estimatedMonthlyPension, compensationRatio };
    } else {
      // Simplified MVP calculation
      const avgSalary = inputs.income.monthlySalary;
      const estimatedMonthlyPension = avgSalary * 0.6; // Rough 60% estimate
      return {
        monthlyPension: estimatedMonthlyPension,
        compensationRatio: 0.6,
      };
    }
  }

  /**
   * Analyze how long capital will last in retirement
   */
  private analyzeCapitalDuration(
    projections: UnifiedYearProjection[],
    retirementAge: number
  ): number {
    const retirementYear = projections.findIndex(
      (p) => p.age === retirementAge
    );
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
   * Get empty summary for initial state
   */
  private getEmptySummary() {
    return {
      maxNetWorth: 0,
      retirementNetWorth: 0,
      finalNetWorth: 0,
      totalSavings: 0,
      averageYearlySavings: 0,
      yearsOfPositiveCashFlow: 0,
      breakEvenAge: null,
      expectedMonthlyPension: 0,
      pensionCompensationRatio: 0,
      capitalDurationYears: 0,
      totalPensionCapital: 0,
      averageMonthlyPension: 0,
      pensionDuration: 0,
    };
  }
}

// Export singleton instance
export const financialSimulationEngine = new FinancialSimulationEngine();
