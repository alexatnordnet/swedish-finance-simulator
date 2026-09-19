// ============================================================================
// SWEDISH TAX AND PENSION PARAMETERS FOR 2025
// Based on official sources and the specification document
// ============================================================================

import { SwedishTaxParameters2025, MacroeconomicAssumptions } from '../../types';

export const SWEDISH_TAX_PARAMETERS_2025: SwedishTaxParameters2025 = {
  inkomstBasbelopp: 80600, // kr per year
  prisBasbelopp: 58800, // kr per year
  
  stateTaxBreakpoint: {
    under66: 643100, // kr per year (ca 53,592 kr/månad)
    over66: 733200,  // kr per year (ca 61,100 kr/månad)
  },
  
  // Skiktgräns: the threshold state tax is actually levied on, applied to
  // BESKATTNINGSBAR inkomst (after grundavdrag). The "brytpunkt" above is the
  // corresponding GROSS salary, i.e. skiktgräns + grundavdrag, and is display-only.
  stateTaxThreshold: 625800, // kr per year (2025)

  stateTaxRate: 0.20, // 20%
  averageMunicipalTax: 0.3241, // 32.41% (national average including region)
  generalPensionFee: 0.07, // 7% of PGI
  
  iskKfParameters: {
    governmentBondRate: 0.0196, // 1.96% (statslåneränta 30 Nov 2024)
    supplement: 0.01, // 1.00 percentage point
    minRate: 0.0125, // 1.25% minimum
    taxRate: 0.30, // 30% tax on schablonintäkt
    taxFreeAmount2025: 150000, // 150,000 kr tax-free amount for 2025
  },
  
  capitalGainsTax: {
    securities: 0.30, // 30% on stocks, funds etc.
  },
};

export const MACROECONOMIC_ASSUMPTIONS: MacroeconomicAssumptions = {
  inflation: 0.00, // 0.0% - Real prognosis model according to Pensionsmyndigheten standard
  realSalaryGrowth: 0.016, // 1.6% - based on productivity growth assumptions
  
  realReturnOnInvestments: {
    stocks: 0.045, // 4.5% real return (based on Pensionsmyndigheten standard)
    bonds: 0.005, // 0.5% real return (based on Pensionsmyndigheten standard)
    mixedPortfolio: 0.035, // 3.5% real return (75% stocks, 25% bonds - Pensionsmyndigheten standard)
  },
  
  lifeExpectancy: {
    male: 82.3, // SCB data March 2025
    female: 85.4, // SCB data March 2025
  },
};

export const BASIC_DEDUCTION_2025 = {
  priceBaseAmount: 58800, // prisbasbelopp 2025

  under66: {
    // Bracket boundaries, as multiples of pbb
    baseEnd: 0.99, // flat base amount up to here
    rampEnd: 2.72, // rises at rampRate up to here
    plateauEnd: 3.11, // flat maximum up to here
    phaseOutEnd: 7.88, // declines at phaseOutRate up to here, then flat minimum

    // Amounts, as multiples of pbb
    baseFactor: 0.423,
    maxFactor: 0.77,
    minFactor: 0.293,

    // Slopes
    rampRate: 0.2,
    phaseOutRate: 0.1,
  },

  // Förhöjt grundavdrag for those who turned 66 before the start of the year.
  //
  // APPROXIMATION: the statutory table in 63 kap. 3 a § IL is not reproduced
  // here. This is a continuous piecewise-linear curve through the three amounts
  // already documented for this simulator. The value at phaseOutEndIncome is
  // exact: brytpunkt (733,200) - skiktgräns (625,800) = 107,400.
  over66: {
    minimum: 65300, // low incomes
    maximum: 163100, // peak
    minimumAtHighIncome: 107400, // flat from phaseOutEndIncome upwards (exact)
    peakIncome: 300000, // FI at which the peak is reached
    phaseOutEndIncome: 733200, // FI at which the curve flattens out
  },
};

// ---------------------------------------------------------------------------
// JOBBSKATTEAVDRAG (earned income tax credit) 2025
//
// Skattereduktion för arbetsinkomst, 67 kap. 5-7 §§ inkomstskattelagen.
// The credit is (creditBase - grundavdrag) × kommunal skattesats, where
// creditBase is a piecewise-linear function of arbetsinkomsten in pbb.
// Applies to ARBETSINKOMST only - pension income does not qualify.
// ---------------------------------------------------------------------------
export const JOBBSKATTEAVDRAG_2025 = {
  // Bracket boundaries, as multiples of pbb
  break1: 0.91,
  break2: 3.24,
  break3: 8.08,

  // Slopes within brackets 2 and 3
  rate2: 0.3405,
  rate3: 0.128,

  // Credit base at the start of brackets 2 and 3, as multiples of pbb
  plateau2: 1.703, // 0.91 + 0.3405 × (3.24 - 0.91)
  plateau3: 2.323, // 1.703 + 0.128 × (8.08 - 3.24)

  // Avtrappning: reduced by phaseOutRate of the FI above phaseOutStart × pbb,
  // which exhausts the credit at roughly 2 MSEK.
  phaseOutStart: 13.54,
  phaseOutRate: 0.03,
};

// Default investment assumptions for user input
export const DEFAULT_INVESTMENT_ASSUMPTIONS = {
  liquidSavingsRate: 0.005, // 0.5% real return on bank accounts (often negative in real terms)
  iskAccountRate: 0.035,    // 3.5% real return (mixed portfolio assumption)
  capitalInsuranceRate: 0.035, // 3.5% real return (similar to ISK)
  traditionalDepotRate: 0.045, // 4.5% real return (pure stocks assumption)
  propertyAppreciation: 0.02,   // 2.0% real property appreciation
};

// Utility function to calculate effective ISK/KF tax rate for 2025
function calculateISKTaxRate(): number {
  const params = SWEDISH_TAX_PARAMETERS_2025.iskKfParameters;
  const schablonRate = Math.max(
    params.governmentBondRate + params.supplement,
    params.minRate
  );
  return schablonRate * params.taxRate; // Effective tax rate on capital
}

// Current ISK/KF effective tax rate for 2025
export const ISK_EFFECTIVE_TAX_RATE_2025 = calculateISKTaxRate(); // Should be ~0.888%
