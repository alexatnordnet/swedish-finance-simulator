// ============================================================================
// TAX CALCULATOR MODULE
// Handles all Swedish tax calculations for the simulator
// ============================================================================

import { 
  SWEDISH_TAX_PARAMETERS_2025, 
  BASIC_DEDUCTION_2025,
  ISK_EFFECTIVE_TAX_RATE_2025 
} from '../swedish-parameters/TaxParameters2025';
import { CalculationStep, TransparentCalculation } from '../../types';

export interface TaxCalculationInputs {
  grossSalary: number;
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

  /**
   * Calculate all taxes for a given year
   */
  calculateYearlyTax(inputs: TaxCalculationInputs): TaxCalculationResult {
    const calculations: TransparentCalculation[] = [];
    
    // 1. Calculate income tax (municipal + state)
    const incomeTaxResult = this.calculateIncomeTax(inputs.grossSalary, inputs.age);
    calculations.push(incomeTaxResult.calculation);
    
    // 2. Calculate ISK tax (schablonskatt)
    const iskTaxResult = this.calculateISKTax(inputs.iskCapital);
    calculations.push(iskTaxResult.calculation);
    
    // 3. Calculate KF tax (avkastningsskatt)
    const kfTaxResult = this.calculateKFTax(inputs.kfCapital);
    calculations.push(kfTaxResult.calculation);
    
    // 4. Calculate capital gains tax if applicable
    const capitalGainsTax = inputs.capitalGains ? 
      this.calculateCapitalGainsTax(inputs.capitalGains) : 0;
    
    const totalTax = incomeTaxResult.municipalTax + incomeTaxResult.stateTax + 
                    iskTaxResult.tax + kfTaxResult.tax + capitalGainsTax;
    
    const netIncome = inputs.grossSalary - totalTax;
    
    return {
      municipalTax: incomeTaxResult.municipalTax,
      stateTax: incomeTaxResult.stateTax,
      iskTax: iskTaxResult.tax,
      kfTax: kfTaxResult.tax,
      capitalGainsTax,
      totalTax,
      netIncome,
      calculations
    };
  }

  /**
   * Calculate Swedish income tax (municipal + state + pension fee)
   */
  private calculateIncomeTax(grossSalary: number, age: number) {
    const steps: CalculationStep[] = [];
    
    // Step 1: Calculate pension fee (7% of PGI)
    const maxPGI = this.taxParams.inkomstBasbelopp * 8.07 * 0.93; // Approximate PGI calculation
    const pensionableIncome = Math.min(grossSalary, maxPGI);
    const pensionFee = pensionableIncome * this.taxParams.generalPensionFee;
    
    steps.push({
      description: "Allmän pensionsavgift (7% av PGI)",
      formula: "min(bruttolön, max_PGI) × 7%",
      inputs: { bruttolön: grossSalary, max_PGI: maxPGI, procent: 7 },
      result: pensionFee
    });
    
    // Step 2: Calculate basic deduction (grundavdrag)
    const basicDeduction = this.calculateBasicDeduction(grossSalary - pensionFee, age);
    
    steps.push({
      description: "Grundavdrag",
      formula: "Grundavdrag baserat på beskattningsbar inkomst och ålder",
      inputs: { beskattningsbar_inkomst: grossSalary - pensionFee, ålder: age },
      result: basicDeduction
    });
    
    // Step 3: Calculate taxable income
    const taxableIncome = Math.max(0, grossSalary - pensionFee - basicDeduction);
    
    steps.push({
      description: "Beskattningsbar inkomst",
      formula: "bruttolön - pensionsavgift - grundavdrag",
      inputs: { 
        bruttolön: grossSalary, 
        pensionsavgift: pensionFee, 
        grundavdrag: basicDeduction 
      },
      result: taxableIncome
    });
    
    // Step 4: Calculate municipal tax
    const municipalTax = taxableIncome * this.taxParams.averageMunicipalTax;
    
    steps.push({
      description: "Kommunalskatt (inkl. region)",
      formula: "beskattningsbar_inkomst × 32.41%",
      inputs: { beskattningsbar_inkomst: taxableIncome, procent: 32.41 },
      result: municipalTax
    });
    
    // Step 5: Calculate state tax
    const stateThreshold = age >= 66 ? 
      this.taxParams.stateTaxBreakpoint.over66 : 
      this.taxParams.stateTaxBreakpoint.under66;
    
    const stateTaxableIncome = Math.max(0, taxableIncome - stateThreshold);
    const stateTax = stateTaxableIncome * this.taxParams.stateTaxRate;
    
    steps.push({
      description: "Statlig inkomstskatt (20% över brytpunkt)",
      formula: "max(0, beskattningsbar_inkomst - brytpunkt) × 20%",
      inputs: { 
        beskattningsbar_inkomst: taxableIncome, 
        brytpunkt: stateThreshold,
        procent: 20
      },
      result: stateTax
    });
    
    const calculation: TransparentCalculation = {
      category: "Inkomstskatt",
      steps,
      finalResult: municipalTax + stateTax
    };
    
    return {
      municipalTax,
      stateTax,
      pensionFee,
      basicDeduction,
      taxableIncome,
      calculation
    };
  }

  /**
   * Calculate basic deduction (grundavdrag) based on income and age
   */
  private calculateBasicDeduction(taxableIncome: number, age: number): number {
    const deduction = age >= 66 ? this.basicDeduction.over66 : this.basicDeduction.under66;
    
    // Simplified calculation - in reality this is more complex
    if (taxableIncome <= 100000) {
      return deduction.minimum;
    } else if (taxableIncome <= 500000) {
      return deduction.maximum;
    } else {
      return deduction.minimumAtHighIncome;
    }
  }

  /**
   * Calculate ISK schablonskatt (flat tax on capital)
   */
  private calculateISKTax(iskCapital: number) {
    const steps: CalculationStep[] = [];
    
    // Step 1: Apply tax-free amount
    const taxFreeAmount = this.taxParams.iskKfParameters.taxFreeAmount2025;
    const taxableCapital = Math.max(0, iskCapital - taxFreeAmount);
    
    steps.push({
      description: "Kapital över skattefritt belopp",
      formula: "max(0, ISK_kapital - 150,000)",
      inputs: { ISK_kapital: iskCapital, skattefritt: taxFreeAmount },
      result: taxableCapital
    });
    
    // Step 2: Calculate tax
    const tax = taxableCapital * ISK_EFFECTIVE_TAX_RATE_2025;
    
    steps.push({
      description: "ISK schablonskatt (0.888% på kapital över fribelopp)",
      formula: "beskattningsbart_kapital × 0.888%",
      inputs: { beskattningsbart_kapital: taxableCapital, procent: 0.888 },
      result: tax
    });
    
    const calculation: TransparentCalculation = {
      category: "ISK Schablonskatt",
      steps,
      finalResult: tax
    };
    
    return { tax, calculation };
  }

  /**
   * Calculate KF avkastningsskatt (same calculation as ISK)
   */
  private calculateKFTax(kfCapital: number) {
    // KF uses same calculation as ISK for 2025
    return this.calculateISKTax(kfCapital);
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
  calculateNetIncome(grossIncome: number, age: number, iskCapital: number = 0, kfCapital: number = 0): number {
    const taxResult = this.calculateYearlyTax({
      grossSalary: grossIncome,
      age,
      iskCapital,
      kfCapital
    });
    
    return taxResult.netIncome;
  }

  /**
   * Get a summary of tax calculations for transparency
   */
  getTaxSummary(inputs: TaxCalculationInputs): { description: string; amount: number }[] {
    const result = this.calculateYearlyTax(inputs);
    
    return [
      { description: "Kommunalskatt (inkl. region)", amount: result.municipalTax },
      { description: "Statlig inkomstskatt", amount: result.stateTax },
      { description: "ISK schablonskatt", amount: result.iskTax },
      { description: "KF avkastningsskatt", amount: result.kfTax },
      { description: "Reavinstskatt", amount: result.capitalGainsTax },
      { description: "Total skatt", amount: result.totalTax }
    ];
  }
}

// Export singleton instance
export const taxCalculator = new SwedishTaxCalculator();
