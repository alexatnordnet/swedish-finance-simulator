// ============================================================================
// TAX CALCULATOR MODULE
// Handles all Swedish tax calculations for the simulator
// ============================================================================

import {
  SWEDISH_TAX_PARAMETERS_2025,
  BASIC_DEDUCTION_2025,
  JOBBSKATTEAVDRAG_2025,
  ISK_EFFECTIVE_TAX_RATE_2025,
} from '../swedish-parameters/TaxParameters2025';
import { CalculationStep, TransparentCalculation } from '../../types';

export interface TaxCalculationInputs {
  /** Arbetsinkomst (salary). Pensionsgrundande and qualifies for jobbskatteavdrag. */
  grossSalary: number;
  /** Pension payouts. Taxed as income but neither pensionsgrundande nor eligible for jobbskatteavdrag. */
  pensionIncome?: number;
  age: number;
  iskCapital: number;
  kfCapital: number;
  capitalGains?: number;
  propertyValue?: number;
  interestExpenses?: number;
}

export interface TaxCalculationResult {
  municipalTax: number;
  stateTax: number;
  /** Jobbskatteavdrag, as a positive number. Already deducted from totalTax. */
  earnedIncomeTaxCredit: number;
  /** Allmän pensionsavgift, levied on salary only. */
  pensionFee: number;
  /** Skattereduktion offsetting the pensionsavgift in full. Already netted out of totalTax. */
  pensionFeeCredit: number;
  grundavdrag: number;
  iskTax: number;
  kfTax: number;
  capitalGainsTax: number;
  totalTax: number;
  netIncome: number;
  calculations: TransparentCalculation[];
}

export class SwedishTaxCalculator {
  private readonly taxParams = SWEDISH_TAX_PARAMETERS_2025;
  private readonly basicDeduction = BASIC_DEDUCTION_2025;
  private readonly jobbskatteavdrag = JOBBSKATTEAVDRAG_2025;

  /**
   * Calculate all taxes for a given year
   */
  calculateYearlyTax(inputs: TaxCalculationInputs): TaxCalculationResult {
    const calculations: TransparentCalculation[] = [];

    // 1. Calculate income tax (municipal + state - jobbskatteavdrag)
    const incomeTaxResult = this.calculateIncomeTax(
      inputs.grossSalary,
      inputs.pensionIncome ?? 0,
      inputs.age
    );
    calculations.push(incomeTaxResult.calculation);

    // 2. Calculate schablonskatt on ISK and KF.
    //    The tax-free amount is a single per-person allowance shared across all
    //    ISK and KF holdings, so the two capitals are pooled before it applies.
    const schablonResult = this.calculateSchablonTax(
      inputs.iskCapital,
      inputs.kfCapital
    );
    calculations.push(schablonResult.calculation);

    // 3. Calculate capital gains tax if applicable
    const capitalGainsTax = inputs.capitalGains
      ? this.calculateCapitalGainsTax(inputs.capitalGains)
      : 0;

    const totalTax =
      incomeTaxResult.municipalTax +
      incomeTaxResult.stateTax +
      incomeTaxResult.pensionFee -
      incomeTaxResult.pensionFeeCredit -
      incomeTaxResult.earnedIncomeTaxCredit +
      schablonResult.iskTax +
      schablonResult.kfTax +
      capitalGainsTax;

    const grossIncome = inputs.grossSalary + (inputs.pensionIncome ?? 0);
    const netIncome = grossIncome - totalTax;

    return {
      municipalTax: incomeTaxResult.municipalTax,
      stateTax: incomeTaxResult.stateTax,
      earnedIncomeTaxCredit: incomeTaxResult.earnedIncomeTaxCredit,
      pensionFee: incomeTaxResult.pensionFee,
      pensionFeeCredit: incomeTaxResult.pensionFeeCredit,
      grundavdrag: incomeTaxResult.basicDeduction,
      iskTax: schablonResult.iskTax,
      kfTax: schablonResult.kfTax,
      capitalGainsTax,
      totalTax,
      netIncome,
      calculations,
    };
  }

  /**
   * Calculate Swedish income tax (municipal + state + pension fee - jobbskatteavdrag)
   */
  private calculateIncomeTax(
    grossSalary: number,
    pensionIncome: number,
    age: number
  ) {
    const steps: CalculationStep[] = [];
    const grossIncome = grossSalary + pensionIncome;

    // Step 1: Allmän pensionsavgift, 7% of PGI. Levied on salary only -
    // pension payouts are not pensionsgrundande.
    //
    // The fee does NOT reduce the fastställda förvärvsinkomsten. It is instead
    // offset in full by skattereduktion för allmän pensionsavgift (67 kap. 4 §
    // IL), so it is a wash for the individual. Both legs are modelled
    // explicitly so the displayed breakdown stays honest.
    const maxPGI = this.taxParams.inkomstBasbelopp * 8.07 * 0.93;
    const pensionableIncome = Math.min(grossSalary, maxPGI);
    const pensionFee = pensionableIncome * this.taxParams.generalPensionFee;

    steps.push({
      description: 'Allmän pensionsavgift (7% av PGI, endast på arbetsinkomst)',
      formula: 'min(bruttolön, max_PGI) × 7%',
      inputs: { bruttolön: grossSalary, max_PGI: maxPGI, procent: 7 },
      result: pensionFee,
    });

    // Step 2: Fastställd förvärvsinkomst
    const establishedIncome = Math.max(0, grossIncome);

    // Step 3: Grundavdrag
    const basicDeduction = this.calculateBasicDeduction(establishedIncome, age);

    steps.push({
      description: 'Grundavdrag',
      formula:
        age >= 66
          ? 'Förhöjt grundavdrag, styckvis linjärt i fastställd förvärvsinkomst'
          : 'Styckvis linjärt i fastställd förvärvsinkomst (andelar av prisbasbeloppet)',
      inputs: {
        fastställd_förvärvsinkomst: establishedIncome,
        prisbasbelopp: this.basicDeduction.priceBaseAmount,
        ålder: age,
      },
      result: basicDeduction,
    });

    // Step 4: Beskattningsbar inkomst
    const taxableIncome = Math.max(0, establishedIncome - basicDeduction);

    steps.push({
      description: 'Beskattningsbar inkomst',
      formula: 'fastställd_förvärvsinkomst - grundavdrag',
      inputs: {
        fastställd_förvärvsinkomst: establishedIncome,
        grundavdrag: basicDeduction,
      },
      result: taxableIncome,
    });

    // Step 5: Kommunalskatt
    const municipalTax = taxableIncome * this.taxParams.averageMunicipalTax;

    steps.push({
      description: 'Kommunalskatt (inkl. region)',
      formula: 'beskattningsbar_inkomst × 32.41%',
      inputs: { beskattningsbar_inkomst: taxableIncome, procent: 32.41 },
      result: municipalTax,
    });

    // Step 6: Statlig inkomstskatt.
    // Levied on beskattningsbar inkomst above the SKIKTGRÄNS. The brytpunkt
    // quoted publicly is the equivalent gross salary (skiktgräns + grundavdrag)
    // and must not be compared against post-deduction income.
    const stateTaxableIncome = Math.max(
      0,
      taxableIncome - this.taxParams.stateTaxThreshold
    );
    const stateTax = stateTaxableIncome * this.taxParams.stateTaxRate;

    steps.push({
      description: 'Statlig inkomstskatt (20% över skiktgränsen)',
      formula: 'max(0, beskattningsbar_inkomst - skiktgräns) × 20%',
      inputs: {
        beskattningsbar_inkomst: taxableIncome,
        skiktgräns: this.taxParams.stateTaxThreshold,
        procent: 20,
      },
      result: stateTax,
    });

    // Step 7: Jobbskatteavdrag. Applies to arbetsinkomst only and cannot
    // exceed the kommunalskatt it is credited against.
    const earnedIncomeTaxCredit = this.calculateEarnedIncomeTaxCredit(
      grossSalary,
      establishedIncome,
      basicDeduction,
      municipalTax
    );

    steps.push({
      description: 'Jobbskatteavdrag (skattereduktion för arbetsinkomst)',
      formula: '(avdragsgrundande_belopp - grundavdrag) × kommunal_skattesats',
      inputs: {
        arbetsinkomst: grossSalary,
        grundavdrag: basicDeduction,
        kommunal_skattesats: this.taxParams.averageMunicipalTax,
      },
      result: -earnedIncomeTaxCredit,
    });

    // Step 8: Skattereduktion för allmän pensionsavgift. Offsets the fee from
    // step 1 in full, so the two cancel in the total.
    const pensionFeeCredit = pensionFee;

    steps.push({
      description: 'Skattereduktion för allmän pensionsavgift',
      formula: 'motsvarar hela den allmänna pensionsavgiften',
      inputs: { allmän_pensionsavgift: pensionFee },
      result: -pensionFeeCredit,
    });

    const calculation: TransparentCalculation = {
      category: 'Inkomstskatt',
      steps,
      finalResult:
        municipalTax +
        stateTax +
        pensionFee -
        pensionFeeCredit -
        earnedIncomeTaxCredit,
    };

    return {
      municipalTax,
      stateTax,
      earnedIncomeTaxCredit,
      pensionFee,
      pensionFeeCredit,
      basicDeduction,
      taxableIncome,
      calculation,
    };
  }

  /**
   * Calculate grundavdrag as a continuous, piecewise-linear function of the
   * fastställda förvärvsinkomsten, per 63 kap. 3 § inkomstskattelagen.
   */
  private calculateBasicDeduction(
    establishedIncome: number,
    age: number
  ): number {
    if (age >= 66) {
      return this.calculateEnhancedBasicDeduction(establishedIncome);
    }

    const pbb = this.basicDeduction.priceBaseAmount;
    const p = this.basicDeduction.under66;
    const income = Math.max(0, establishedIncome) / pbb; // in pbb units

    let deduction: number;

    if (income <= p.baseEnd) {
      // Flat base amount
      deduction = p.baseFactor;
    } else if (income <= p.rampEnd) {
      // Rises with income
      deduction = p.baseFactor + p.rampRate * (income - p.baseEnd);
    } else if (income <= p.plateauEnd) {
      // Flat maximum
      deduction = p.maxFactor;
    } else if (income <= p.phaseOutEnd) {
      // Phased out with income
      deduction = p.maxFactor - p.phaseOutRate * (income - p.plateauEnd);
    } else {
      // Flat minimum
      deduction = p.minFactor;
    }

    // Clamp against the statutory floor/ceiling, then round up to the nearest
    // 100 kr as required by 63 kap. 3 § IL.
    const clamped = Math.min(
      Math.max(deduction * pbb, p.minFactor * pbb),
      p.maxFactor * pbb
    );
    const amount = Math.ceil(clamped / 100) * 100;

    // Grundavdrag can never exceed the income it is deducted from
    return Math.min(amount, Math.max(0, establishedIncome));
  }

  /**
   * Förhöjt grundavdrag for those who have turned 66. Continuous piecewise-linear
   * approximation - see the note on BASIC_DEDUCTION_2025.over66.
   */
  private calculateEnhancedBasicDeduction(establishedIncome: number): number {
    const p = this.basicDeduction.over66;
    const income = Math.max(0, establishedIncome);

    let amount: number;

    if (income <= 0) {
      amount = 0;
    } else if (income <= p.peakIncome) {
      // Rises linearly from the minimum to the peak
      amount =
        p.minimum + ((p.maximum - p.minimum) * income) / p.peakIncome;
    } else if (income <= p.phaseOutEndIncome) {
      // Declines linearly from the peak to the high-income level
      const span = p.phaseOutEndIncome - p.peakIncome;
      amount =
        p.maximum -
        ((p.maximum - p.minimumAtHighIncome) * (income - p.peakIncome)) / span;
    } else {
      amount = p.minimumAtHighIncome;
    }

    return Math.min(amount, income);
  }

  /**
   * Calculate jobbskatteavdrag (skattereduktion för arbetsinkomst).
   *
   * The credit is (avdragsgrundande belopp - grundavdrag) × kommunal skattesats.
   * It is available only against arbetsinkomst, is phased out at high incomes,
   * and is capped at the kommunalskatt actually owed.
   */
  private calculateEarnedIncomeTaxCredit(
    earnedIncome: number,
    establishedIncome: number,
    basicDeduction: number,
    municipalTax: number
  ): number {
    if (earnedIncome <= 0) return 0;

    const pbb = this.basicDeduction.priceBaseAmount;
    const p = this.jobbskatteavdrag;
    const income = earnedIncome / pbb; // in pbb units

    // Avdragsgrundande belopp, in pbb units
    let creditBase: number;

    if (income <= p.break1) {
      creditBase = income;
    } else if (income <= p.break2) {
      creditBase = p.break1 + p.rate2 * (income - p.break1);
    } else if (income <= p.break3) {
      creditBase = p.plateau2 + p.rate3 * (income - p.break2);
    } else {
      creditBase = p.plateau3;
    }

    // The credit is the tax value of the amount by which the credit base
    // exceeds the grundavdrag, so it cannot be negative.
    let credit = Math.max(
      0,
      (creditBase * pbb - basicDeduction) * this.taxParams.averageMunicipalTax
    );

    // Avtrappning for high incomes
    const phaseOutThreshold = p.phaseOutStart * pbb;
    if (establishedIncome > phaseOutThreshold) {
      const reduction =
        (establishedIncome - phaseOutThreshold) * p.phaseOutRate;
      credit = Math.max(0, credit - reduction);
    }

    // A skattereduktion can never exceed the tax it is credited against
    return Math.min(credit, municipalTax);
  }

  /**
   * Calculate schablonskatt on ISK and KF capital.
   *
   * The tax-free amount is a single per-person allowance covering all ISK and
   * KF holdings combined, so the capitals are pooled before it is applied and
   * the resulting tax is then split back in proportion to each capital.
   */
  private calculateSchablonTax(iskCapital: number, kfCapital: number) {
    const steps: CalculationStep[] = [];

    const isk = Math.max(0, iskCapital);
    const kf = Math.max(0, kfCapital);
    const totalCapital = isk + kf;

    // Step 1: Apply the shared tax-free amount
    const taxFreeAmount = this.taxParams.iskKfParameters.taxFreeAmount2025;
    const taxableCapital = Math.max(0, totalCapital - taxFreeAmount);

    steps.push({
      description: 'Kapital över skattefritt belopp (ISK och KF gemensamt)',
      formula: 'max(0, ISK_kapital + KF_kapital - 150,000)',
      inputs: {
        ISK_kapital: isk,
        KF_kapital: kf,
        skattefritt: taxFreeAmount,
      },
      result: taxableCapital,
    });

    // Step 2: Calculate the tax
    const totalTax = taxableCapital * ISK_EFFECTIVE_TAX_RATE_2025;

    steps.push({
      description: 'Schablonskatt (0.888% på kapital över fribeloppet)',
      formula: 'beskattningsbart_kapital × 0.888%',
      inputs: { beskattningsbart_kapital: taxableCapital, procent: 0.888 },
      result: totalTax,
    });

    // Step 3: Split the tax back across the two account types
    const iskShare = totalCapital > 0 ? isk / totalCapital : 0;
    const iskTax = totalTax * iskShare;
    const kfTax = totalTax - iskTax;

    const calculation: TransparentCalculation = {
      category: 'ISK/KF Schablonskatt',
      steps,
      finalResult: totalTax,
    };

    return { iskTax, kfTax, totalTax, calculation };
  }

  /**
   * Calculate capital gains tax on securities
   */
  private calculateCapitalGainsTax(capitalGains: number): number {
    return Math.max(0, capitalGains) * this.taxParams.capitalGainsTax.securities;
  }

  /**
   * Calculate net income after all taxes
   */
  calculateNetIncome(
    grossIncome: number,
    age: number,
    iskCapital: number = 0,
    kfCapital: number = 0
  ): number {
    const taxResult = this.calculateYearlyTax({
      grossSalary: grossIncome,
      age,
      iskCapital,
      kfCapital,
    });

    return taxResult.netIncome;
  }

  /**
   * Get a summary of tax calculations for transparency
   */
  getTaxSummary(
    inputs: TaxCalculationInputs
  ): { description: string; amount: number }[] {
    const result = this.calculateYearlyTax(inputs);

    return [
      { description: 'Kommunalskatt (inkl. region)', amount: result.municipalTax },
      { description: 'Statlig inkomstskatt', amount: result.stateTax },
      { description: 'Allmän pensionsavgift', amount: result.pensionFee },
      {
        description: 'Skattereduktion allmän pensionsavgift',
        amount: -result.pensionFeeCredit,
      },
      { description: 'Jobbskatteavdrag', amount: -result.earnedIncomeTaxCredit },
      { description: 'ISK schablonskatt', amount: result.iskTax },
      { description: 'KF avkastningsskatt', amount: result.kfTax },
      { description: 'Reavinstskatt', amount: result.capitalGainsTax },
      { description: 'Total skatt', amount: result.totalTax },
    ];
  }
}

// Export singleton instance
export const taxCalculator = new SwedishTaxCalculator();
