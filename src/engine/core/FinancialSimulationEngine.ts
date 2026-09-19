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
  /**
   * Account balances at the end of this year, carried into the next iteration.
   * Internal bookkeeping - consumers should read `pensionCapital` instead.
   */
  pensionAccountsAfterYear?: PensionAccount[];
  /**
   * General pension monthly amount locked in at withdrawal start, carried
   * forward so it stays flat. Internal bookkeeping.
   */
  lockedGeneralPension?: number;
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
  gender: MVPSimulationInputs["profile"]["gender"];
  /** General pension monthly amount locked in when payouts began, if they have. */
  lockedGeneralPension?: number;
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
    const gender = inputs.profile.gender;
    const lifeExpectancy = this.lifeExpectancyFor(gender);

    // Validate and cap investment rates to prevent extreme calculations
    const safeInvestmentRates = this.sanitizeInvestmentRates(investmentRates);

    // Initialize state variables with validation
    let currentSalary = this.safeNumber(inputs.income.monthlySalary * 12);
    let liquidAssets = this.safeNumber(inputs.assets.liquidSavings);
    let iskAccount = this.safeNumber(inputs.assets.iskAccount);

    // Initialize pension-related state if enabled
    let generalPensionCapital = 0;
    let pensionAccounts: PensionAccount[] = [];
    let lockedGeneralPension: number | undefined;

    if (config.includePensions && inputs.pensions) {
      generalPensionCapital = this.safeNumber(
        inputs.pensions.generalPension.currentInkomstpension +
          inputs.pensions.generalPension.currentPremiepension
      );
      // Deep copy: the simulation advances each account's balance year by year,
      // and these objects are owned by React state. A shallow copy would let
      // the simulation mutate its own inputs, so every recalculation would
      // start from the previous run's end state.
      pensionAccounts = inputs.pensions.accounts.map((account) => ({
        ...account,
        withdrawalSettings: { ...account.withdrawalSettings },
      }));
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
          gender,
          lockedGeneralPension,
        },
        config
      );

      results.push(yearProjection);

      // Carry the end-of-year balances into the next iteration. simulateYear
      // has already applied cash flow, drawdown and growth.
      liquidAssets = yearProjection.assets.liquidSavings;
      iskAccount = yearProjection.assets.iskAccount;

      if (config.includePensions) {
        // simulateYear has already advanced the accounts for this year, so the
        // projected balances are carried straight over. Applying growth or
        // withdrawals again here would compound them twice.
        generalPensionCapital = yearProjection.pensionCapital?.general || 0;
        pensionAccounts = yearProjection.pensionAccountsAfterYear ?? pensionAccounts;
        lockedGeneralPension =
          yearProjection.lockedGeneralPension ?? lockedGeneralPension;
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

    // Calculate pension income if enabled. Accounts starting payouts this year
    // get their annuity priced and locked before any income is read off them.
    let pensionIncome = undefined;
    let activeAccounts = pensionAccounts;
    if (
      config.includePensions &&
      generalPensionCapital !== undefined &&
      pensionAccounts &&
      pensionSettings
    ) {
      activeAccounts = this.resolveAnnuities(age, pensionAccounts, params.gender);
      pensionIncome = this.calculatePensionIncome(
        age,
        generalPensionCapital,
        activeAccounts,
        pensionSettings,
        params.gender,
        params.lockedGeneralPension
      );
    }

    // Calculate total income (salary + pension if applicable)
    const salaryIncome = this.safeNumber(currentSalary);
    const pensionYearlyIncome = pensionIncome
      ? this.safeNumber(pensionIncome.total * 12)
      : 0;
    const totalGrossIncome = salaryIncome + pensionYearlyIncome;

    // Calculate taxes. Salary and pension are passed separately: only salary is
    // pensionsgrundande and only salary qualifies for jobbskatteavdrag.
    const taxResult = taxCalculator.calculateYearlyTax({
      grossSalary: salaryIncome,
      pensionIncome: pensionYearlyIncome,
      age,
      iskCapital: this.safeNumber(iskAccount),
      kfCapital: 0,
    });

    // Calculate yearly expenses and cash flow
    const yearlyExpenses = this.safeNumber(monthlyExpenses * 12);
    const netIncome = this.safeNumber(taxResult.netIncome);
    const cashFlow = netIncome - yearlyExpenses;

    // Advance pension capital by one year if enabled. This is the single place
    // pension balances move: it returns new account objects rather than
    // mutating, and the caller carries them into the next year.
    let pensionCapital = undefined;
    let pensionAccountsAfterYear: PensionAccount[] | undefined;
    if (
      config.includePensions &&
      generalPensionCapital !== undefined &&
      pensionAccounts &&
      pensionSettings
    ) {
      const advanced = this.advancePensionCapital(
        age,
        generalPensionCapital,
        activeAccounts!,
        pensionSettings,
        pensionIncome!,
        params.gender
      );
      pensionCapital = advanced.capital;
      pensionAccountsAfterYear = advanced.accounts;
    }

    // Advance liquid savings and ISK by one year: apply this year's cash flow
    // (drawing down capital if it is negative), then investment growth.
    const assets = this.advanceAssets(
      cashFlow,
      this.safeNumber(liquidAssets),
      this.safeNumber(iskAccount),
      params.investmentRates,
      config
    );

    // Net worth is measured at the END of the year, so it is consistent with
    // the balances reported alongside it. It is deliberately NOT floored at
    // zero: once capital is exhausted, a continuing deficit is a real debt and
    // hiding it would make the projection look solvent when it is not.
    const totalPensionCapital = pensionCapital?.total || 0;
    const netWorth = this.safeNumber(assets.drawable + totalPensionCapital);

    // Build the unified projection
    const baseProjection: MVPYearProjection = {
      year,
      age,
      salary: salaryIncome,
      expenses: yearlyExpenses,
      savings: cashFlow,
      netWorth: this.safeNumber(netWorth),
      assets,
      calculations: {
        grossIncome: totalGrossIncome,
        pensionFee: this.safeNumber(taxResult.pensionFee),
        earnedIncomeTaxCredit: this.safeNumber(
          taxResult.earnedIncomeTaxCredit
        ),
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
        pensionAccountsAfterYear,
        lockedGeneralPension:
          params.lockedGeneralPension ??
          (pensionIncome.generalPension > 0
            ? pensionIncome.generalPension
            : undefined),
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
    pensionSettings: PensionSettings,
    gender: MVPSimulationInputs["profile"]["gender"],
    lockedMonthlyAmount?: number
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
      } else if (lockedMonthlyAmount !== undefined) {
        // Already priced in an earlier year - hold it flat.
        generalPension = this.safeNumber(lockedMonthlyAmount);
      } else {
        // Price it once, over the life expectancy remaining at the age
        // withdrawals begin.
        const remainingYears = Math.max(
          1,
          this.lifeExpectancyFor(gender) -
            pensionSettings.generalPension.withdrawalStartAge
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
          this.calculateAccountPension(account, age, gender)
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
    currentAge: number,
    gender: MVPSimulationInputs["profile"]["gender"]
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

    // A payment locked in when withdrawals began is held flat for life.
    if (
      account.annuitisedMonthlyAmount !== undefined &&
      account.annuitisedMonthlyAmount > 0
    ) {
      return this.safeNumber(account.annuitisedMonthlyAmount);
    }

    // Calculate based on capital and withdrawal strategy
    const currentValue = this.safeNumber(account.currentValue);

    if (account.withdrawalSettings.isLifelong) {
      // Lifelong pension - annuitised over the life expectancy remaining AT
      // THE START of withdrawals. Using the horizon remaining at the current
      // age instead would shrink the divisor every year and make the payment
      // balloon towards the end of life.
      const remainingYears = Math.max(
        1,
        this.lifeExpectancyFor(gender) - account.withdrawalSettings.startAge
      );
      return currentValue / (remainingYears * 12);
    } else {
      // Until capital depleted - use 4% rule as default
      return (currentValue * 0.04) / 12;
    }
  }

  /**
   * Lock in the annuity for any account that starts paying out this year.
   *
   * A lifelong pension is priced once, from the capital and life expectancy at
   * the moment withdrawals begin, and then stays flat. Re-pricing it annually
   * against a shrinking horizon is what produced the end-of-life payment spike.
   */
  private resolveAnnuities(
    age: number,
    accounts: PensionAccount[],
    gender: MVPSimulationInputs["profile"]["gender"]
  ): PensionAccount[] {
    return accounts.map((account) => {
      const started = age >= account.withdrawalSettings.startAge;
      if (!started || account.annuitisedMonthlyAmount !== undefined) {
        return account;
      }
      return {
        ...account,
        annuitisedMonthlyAmount: this.safeNumber(
          this.calculateAccountPension(account, age, gender)
        ),
      };
    });
  }

  /**
   * Life expectancy for a profile's gender.
   */
  private lifeExpectancyFor(
    gender: MVPSimulationInputs["profile"]["gender"]
  ): number {
    return this.assumptions.lifeExpectancy[
      gender === "man" ? "male" : "female"
    ];
  }

  /**
   * Advance all pension capital by one year.
   *
   * This is the single place pension balances move. It is pure: it returns new
   * account objects rather than mutating the ones passed in, so the caller can
   * safely hold on to the previous year's state and repeated runs over the same
   * inputs produce identical results.
   */
  private advancePensionCapital(
    age: number,
    generalPensionCapital: number,
    pensionAccounts: PensionAccount[],
    pensionSettings: PensionSettings,
    pensionIncome: EnhancedYearProjection["pensionIncome"],
    gender: MVPSimulationInputs["profile"]["gender"]
  ): {
    capital: EnhancedYearProjection["pensionCapital"];
    accounts: PensionAccount[];
  } {
    // General pension capital
    let updatedGeneralCapital = this.safeNumber(generalPensionCapital);
    if (age >= pensionSettings.generalPension.withdrawalStartAge) {
      // Withdrawing: reduce capital by this year's payout
      const withdrawal = this.safeNumber(pensionIncome.generalPension * 12);
      updatedGeneralCapital = Math.max(0, updatedGeneralCapital - withdrawal);
    } else {
      // Still accumulating: grow with a conservative return
      updatedGeneralCapital = this.safeNumber(
        updatedGeneralCapital *
          (1 + this.assumptions.realReturnOnInvestments.bonds)
      );
    }

    // Occupational and private pension capital
    let occupationalCapital = 0;
    let privateCapital = 0;

    const accounts = pensionAccounts.map((account) => {
      let nextValue: number;

      if (age >= account.withdrawalSettings.startAge) {
        // Withdrawing from this account
        const annualWithdrawal = this.safeNumber(
          this.calculateAccountPension(account, age, gender) * 12
        );
        nextValue = Math.max(
          0,
          this.safeNumber(account.currentValue) - annualWithdrawal
        );
      } else {
        // Still accumulating
        nextValue = this.safeNumber(
          account.currentValue *
            (1 + this.assumptions.realReturnOnInvestments.mixedPortfolio)
        );
      }

      if (account.type === "tjänste") {
        occupationalCapital += nextValue;
      } else if (account.type === "privat") {
        privateCapital += nextValue;
      }

      return { ...account, currentValue: nextValue };
    });

    return {
      capital: {
        general: this.safeNumber(updatedGeneralCapital),
        occupational: this.safeNumber(occupationalCapital),
        private: this.safeNumber(privateCapital),
        total: this.safeNumber(
          updatedGeneralCapital + occupationalCapital + privateCapital
        ),
      },
      accounts,
    };
  }

  /**
   * Advance liquid savings and ISK by one year.
   *
   * A surplus is saved, a deficit is funded. Cash is spent first and ISK is
   * only touched once cash is gone, which matches how people actually draw
   * down: the bank account before the brokerage account. If both are
   * exhausted the remaining deficit is carried as negative cash, i.e. debt.
   * Growth is applied after the cash flow, so money saved this year starts
   * earning next year rather than retroactively.
   */
  private advanceAssets(
    cashFlow: number,
    currentLiquidAssets: number,
    currentISKValue: number,
    investmentRates: InvestmentRates | undefined,
    config: SimulationConfig
  ): { liquidSavings: number; iskAccount: number; drawable: number } {
    const rates = this.sanitizeInvestmentRates(investmentRates);
    let liquidAssets = currentLiquidAssets;
    let iskAccount = currentISKValue;

    if (cashFlow >= 0) {
      // Surplus is invested in the ISK, where a long-horizon saver would put
      // it, rather than left to earn the cash rate.
      iskAccount += cashFlow;
    } else {
      let deficit = -cashFlow;

      // Cash first.
      const fromLiquid = Math.min(deficit, Math.max(0, liquidAssets));
      liquidAssets -= fromLiquid;
      deficit -= fromLiquid;

      // Then the ISK.
      if (deficit > 0) {
        const fromISK = Math.min(deficit, Math.max(0, iskAccount));
        iskAccount -= fromISK;
        deficit -= fromISK;
      }

      // Anything still unfunded is borrowed.
      if (deficit > 0) {
        liquidAssets -= deficit;
      }
    }

    // Growth applies only to positive balances. A negative cash balance is
    // debt; growing it at the savings rate would be nonsense.
    if (liquidAssets > 0) {
      const growthRate = config.useCustomInvestmentRates
        ? rates.liquidSavingsRate
        : this.assumptions.realReturnOnInvestments.bonds;
      liquidAssets = this.safeNumber(liquidAssets * (1 + growthRate));
    }
    if (iskAccount > 0) {
      const growthRate = config.useCustomInvestmentRates
        ? rates.iskAccountRate
        : this.assumptions.realReturnOnInvestments.mixedPortfolio;
      iskAccount = this.safeNumber(iskAccount * (1 + growthRate));
    }

    liquidAssets = this.safeNumber(liquidAssets);
    iskAccount = this.safeNumber(Math.max(0, iskAccount));

    return {
      liquidSavings: liquidAssets,
      iskAccount,
      drawable: this.safeNumber(liquidAssets + iskAccount),
    };
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

    const pension = this.estimatePension(inputs, config, projections);
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

    // Break-even is the age net worth first turns positive, and it only means
    // anything if it started out negative. Reporting the first positive year
    // of an always-positive projection just restates the starting age.
    const breakEvenAge =
      projections.length > 0 && projections[0].netWorth < 0
        ? projections.find((p) => p.netWorth > 0)?.age ?? null
        : null;

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
   * First-year monthly pension and its ratio to final salary.
   *
   * Both are read off the projections rather than off the raw input fields:
   * the simulation already prices annuities from capital, and the input
   * fields are optional, so trusting them reported 0 kr for anyone who had
   * not hand-entered an expected amount. The ratio is measured against the
   * last working year's salary, which is what "av slutlön" means.
   */
  private estimatePension(
    inputs: UnifiedSimulationInputs,
    config: SimulationConfig,
    projections: UnifiedYearProjection[]
  ): {
    monthlyPension: number;
    compensationRatio: number;
  } {
    if (config.includePensions && inputs.pensions) {
      const firstPayoutYear = projections.find(
        (p) => (p.pensionIncome?.total || 0) > 0
      );
      const estimatedMonthlyPension = this.safeNumber(
        firstPayoutYear?.pensionIncome?.total || 0
      );

      // Final salary: the last year with any salary at all.
      const workingYears = projections.filter((p) => p.salary > 0);
      const finalYearlySalary =
        workingYears.length > 0
          ? workingYears[workingYears.length - 1].salary
          : this.safeNumber(inputs.income.monthlySalary * 12);
      const finalMonthlySalary = finalYearlySalary / 12;

      const compensationRatio =
        finalMonthlySalary > 0
          ? estimatedMonthlyPension / finalMonthlySalary
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
   * Number of years into retirement that drawable capital lasts.
   *
   * Measured against liquid savings + ISK, not net worth: pension capital is
   * not something you can spend down at will, and counting it made capital
   * look like it lasted to death in every scenario. If retirement falls
   * outside the projected range the answer is undefined rather than 0.
   */
  private analyzeCapitalDuration(
    projections: UnifiedYearProjection[],
    retirementAge: number
  ): number {
    const retirementIndex = projections.findIndex((p) => p.age >= retirementAge);
    if (retirementIndex === -1) return 0;

    for (let i = retirementIndex; i < projections.length; i++) {
      if (projections[i].assets.drawable <= 0) {
        return projections[i].age - projections[retirementIndex].age;
      }
    }

    // Capital was never exhausted within the projection.
    const lastProjection = projections[projections.length - 1];
    return lastProjection.age - projections[retirementIndex].age;
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
