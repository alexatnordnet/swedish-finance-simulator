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
  
  stateTaxRate: 0.20, // 20%
  averageMunicipalTax: 0.3241, // 32.41% (national average including region)
  generalPensionFee: 0.07, // 7% of PGI
  
  iskKfParameters: {
    governmentBondRate: 0.0196, // 1.96% (statslåneränta 30 Nov 2024)
    supplement: 0.01, // 1.00 percentage point
    minRate: 0.0125, // 1.25% minimum
    taxRate: 0.30, // 30% tax on schablonintäkt
    taxFreeAmount2025: 150000, // 150,000 kr tax-free amount for 2025
    taxFreeAmount2026: 300000, // 300,000 kr tax-free amount from 2026
  },
  
  capitalGainsTax: {
    securities: 0.30, // 30% on stocks, funds etc.
    primaryHome: 0.22, // 22% on primary residence
  },
  
  interestDeduction: {
    rate1: 0.30, // 30% deduction up to threshold
    rate2: 0.21, // 21% deduction above threshold
    threshold: 100000, // 100,000 kr threshold
  },
};

export const MACROECONOMIC_ASSUMPTIONS: MacroeconomicAssumptions = {
  inflation: 0.02, // 2.0% - Riksbank target
  realSalaryGrowth: 0.016, // 1.6% - based on productivity growth assumptions
  
  realReturnOnInvestments: {
    stocks: 0.045, // 4.5% real return (6.5% nominal - 2% inflation)
    bonds: 0.005, // 0.5% real return (2.5% nominal - 2% inflation)
    mixedPortfolio: 0.035, // 3.5% real return (75% stocks, 25% bonds)
  },
  
  overReturn: 0.019, // 1.9% "överavkastning" for real prognosis model
  
  lifeExpectancy: {
    male: 82.3, // SCB data March 2025
    female: 85.4, // SCB data March 2025
  },
};

// Pension system parameters
export const PENSION_PARAMETERS_2025 = {
  // General pension (allmän pension)
  generalPension: {
    avsättningTotal: 0.185, // 18.5% of PGI
    inkomstpensionAndel: 0.16, // 16 percentage points to inkomstpension
    premiepensionAndel: 0.025, // 2.5 percentage points to premiepension
    maxPGI: 604500, // Maximum pensionsgrundande inkomst (8.07 × IBB × 0.93)
    minInkomstForIntjänande: 24873, // Minimum income for pension accrual
    följsamhetsIndexering: 0.04, // 4.0% for 2025
  },
  
  // Occupational pension parameters
  occupationalPension: {
    ITP1: {
      premieUnderTak: 0.045, // 4.5% of salary up to 7.5 IBB
      premieÖverTak: 0.30, // 30% of salary between 7.5 and 30 IBB
      takLågNivå: 50375, // 7.5 IBB/12 monthly (kr/månad)
      takHögNivå: 201500, // 30 IBB/12 monthly (kr/månad)
    },
    
    ITPK: {
      premie: 0.02, // 2% of salary
    },
    
    SAFLO: {
      premieUnderTak: 0.045, // 4.5% (4.38% billed to employer, 4.5% credited)
      premieÖverTak: 0.30, // 30% above threshold
      tak: 50375, // 7.5 IBB/12 monthly (kr/månad)
    },
  },
  
  // Riktålder (target retirement age) by birth year
  riktÅlder: new Map([
    [1958, 66], [1959, 66],
    [1960, 67], [1961, 67], [1962, 67], [1963, 67], [1964, 67], [1965, 67], [1966, 67],
    [1967, 68], // Approximate for 1967-1980
    [1981, 69], // Approximate for 1981-1996
    [1997, 70], // Approximate for 1997-2014
    [2015, 71], // Approximate for 2015+
  ]),
};

// Basic deduction amounts (grundavdrag) for 2025
export const BASIC_DEDUCTION_2025 = {
  under66: {
    minimum: 24900,
    maximum: 45300,
    minimumAtHighIncome: 17300,
  },
  over66: {
    minimum: 65300,
    maximum: 163100,
    minimumAtHighIncome: 107400,
  },
};

// Default investment assumptions for user input
export const DEFAULT_INVESTMENT_ASSUMPTIONS = {
  liquidSavingsRate: 0.005, // 0.5% real return on bank accounts (often negative in real terms)
  iskAccountRate: 0.035,    // 3.5% real return (mixed portfolio assumption)
  capitalInsuranceRate: 0.035, // 3.5% real return (similar to ISK)
  traditionalDepotRate: 0.045, // 4.5% real return (pure stocks assumption)
  propertyAppreciation: 0.02,   // 2.0% real property appreciation
};

// Utility function to get riktålder by birth year
export function getRiktÅlder(birthYear: number): number {
  const riktÅlder = PENSION_PARAMETERS_2025.riktÅlder;
  
  // Find the closest year
  for (const [year, age] of riktÅlder) {
    if (birthYear <= year) {
      return age;
    }
  }
  
  // Default to latest age for very young people
  return 71;
}

// Utility function to calculate effective ISK/KF tax rate for 2025
export function calculateISKTaxRate(): number {
  const params = SWEDISH_TAX_PARAMETERS_2025.iskKfParameters;
  const schablonRate = Math.max(
    params.governmentBondRate + params.supplement,
    params.minRate
  );
  return schablonRate * params.taxRate; // Effective tax rate on capital
}

// Current ISK/KF effective tax rate for 2025
export const ISK_EFFECTIVE_TAX_RATE_2025 = calculateISKTaxRate(); // Should be ~0.888%

// Consumer costs reference values (example values, should be updated with latest Konsumentverket data)
export const CONSUMER_REFERENCE_COSTS_2025 = {
  ensamstående: {
    mat: 4080, // kr/månad (mat, allt lagas hemma)
    kläder: 900,
    fritid: 700,
    telefon: 200,
    hygien: 630,
    förbrukning: 200,
    hemutrustning: 1000,
    media: 1074,
    hushållsel: 380,
    hemförsäkring: 150,
  },
};
