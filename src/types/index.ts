// ============================================================================
// SWEDISH PERSONAL FINANCE LIFETIME SIMULATOR - TYPE DEFINITIONS
// ============================================================================

export interface UserProfile {
  currentAge: number;
  gender: 'man' | 'kvinna';
  desiredRetirementAge: number;
  civilStatus?: 'ensamstående' | 'gift_sambo' | 'särbo';
  children?: Array<{ age: number }>;
}

export interface LiquidAssets {
  totalAmount: number;
}

export interface ISKAccount {
  currentMarketValue: number;
  assetAllocation?: {
    stocks: number;
    funds: number;
  };
}

export interface CapitalInsurance {
  currentMarketValue: number;
  assetAllocation?: {
    stocks: number;
    funds: number;
  };
}

export interface TraditionalDepot {
  holdings: Array<{
    name: string;
    quantity: number;
    currentPrice: number;
    averageAcquisitionCost: number; // GAV - critical for capital gains
  }>;
  unusedLossDeduction?: number;
}

export interface Property {
  type: 'villa' | 'bostadsrätt' | 'ägarlägenhet' | 'fritidshus';
  currentMarketValue: number;
  originalPurchasePrice: number;
  lagfartsCost?: number;
  improvementExpenses: Array<{
    amount: number;
    year: number;
    description: string;
  }>;
  deferredAmount?: number; // uppskovsbelopp
}

export interface Loan {
  id: string;
  type: 'bolån' | 'studielån' | 'privatlån' | 'billån' | 'kreditkort';
  remainingAmount: number;
  interestRate: number;
  interestRateFixedUntil?: Date;
  amortizationType: 'rak' | 'annuitet';
  currentAmortizationAmount: number;
  isAmortizationInKronor: boolean; // true = kr/month, false = % per year
}

export interface CurrentFinancialSnapshot {
  assets: {
    liquidAssets: LiquidAssets;
    iskAccount?: ISKAccount;
    capitalInsurance?: CapitalInsurance;
    traditionalDepot?: TraditionalDepot;
    primaryHome?: Property;
    vacationHome?: Property;
    otherAssets: Array<{
      description: string;
      value: number;
    }>;
  };
  debts: {
    mortgages: Loan[];
    otherLoans: Loan[];
  };
}

export interface IncomeParameters {
  currentMonthlySalary: number; // Gross monthly salary
  expectedRealSalaryGrowth: number; // Annual % increase above inflation
  salaryExchange?: {
    isActive: boolean;
    monthlyAmount: number;
    employerContribution: number; // Usually ~5.8%
    pensionType: string;
  };
  otherRegularIncome: Array<{
    description: string;
    monthlyAmount: number;
    isInflationAdjusted: boolean;
  }>;
}

export interface GeneralPension {
  currentInkomstpensionCapital: number;
  currentPremiepensionCapital: number;
  selectedPPMFunds?: Array<{
    name: string;
    allocation: number; // percentage
    expectedReturn: number;
    fees: number;
  }>;
}

export interface OccupationalPension {
  agreementType: 'ITP1' | 'ITP2' | 'SAF-LO' | 'KAP-KL' | 'AKAP-KR' | 'PA16' | 'other';
  currentCapital?: number;
  employerContribution?: {
    percentageUpToLimit: number;
    percentageAboveLimit: number;
    salaryLimit: number; // Usually related to IBB
  };
  administrator: string;
  fees: {
    managementFee: number;
    capitalFee?: number;
    administrativeFee?: number;
  };
  survivorBenefit?: {
    hasReturnProtection: boolean;
    hasFamilyProtection: boolean;
    cost: number;
  };
}

export interface PrivatePension {
  type: 'IPS' | 'private_insurance';
  currentCapital: number;
  ongoingContributions?: number;
  expectedReturn: number;
  fees: number;
}

export interface PensionSystemData {
  generalPension: GeneralPension;
  occupationalPensions: OccupationalPension[];
  privatePensions: PrivatePension[];
}

export interface ExpenseModeling {
  useDetailedExpenses: boolean;
  detailedExpenses?: {
    housing: number;
    food: number;
    transportation: number;
    clothing: number;
    leisure: number;
    insurance: number;
    other: number;
  };
  useStandardizedCosts?: {
    baseCost: number;
    adjustmentFactor: number; // Multiplier for personal preferences
  };
}

export interface MacroeconomicAssumptions {
  inflation: number; // Default 2.0% (Riksbank target)
  realSalaryGrowth: number; // Default 1.6%
  realReturnOnInvestments: {
    stocks: number; // Default 4.5%
    bonds: number; // Default 0.5%
    mixedPortfolio: number; // Default 3.5%
  };
  overReturn: number; // Default 1.9% for real prognosis model
  lifeExpectancy: {
    male: number; // Default 82.3 years (SCB 2025)
    female: number; // Default 85.4 years (SCB 2025)
  };
}

export interface SwedishTaxParameters2025 {
  inkomstBasbelopp: number; // 80,600 kr
  prisBasbelopp: number; // 58,800 kr
  stateTaxBreakpoint: {
    under66: number; // 643,100 kr/year
    over66: number; // 733,200 kr/year
  };
  stateTaxRate: number; // 20%
  averageMunicipalTax: number; // 32.41%
  generalPensionFee: number; // 7% of PGI
  iskKfParameters: {
    governmentBondRate: number; // 1.96% (30 Nov 2024)
    supplement: number; // 1.00%
    minRate: number; // 1.25%
    taxRate: number; // 30%
    taxFreeAmount2025: number; // 150,000 kr
    taxFreeAmount2026: number; // 300,000 kr
  };
  capitalGainsTax: {
    securities: number; // 30%
    primaryHome: number; // 22%
  };
  interestDeduction: {
    rate1: number; // 30% (up to 100k)
    rate2: number; // 21% (above 100k)
    threshold: number; // 100,000 kr
  };
}

// Core simulation state for each year
export interface YearlyFinancialState {
  year: number;
  age: number;
  income: {
    salary: number;
    capitalIncome: number;
    pensionIncome: number;
    otherIncome: number;
    totalGross: number;
    totalNet: number;
  };
  expenses: {
    living: number;
    loanInterest: number;
    amortization: number;
    taxes: number;
    total: number;
  };
  taxes: {
    municipalTax: number;
    stateTax: number;
    capitalTax: number;
    iskTax: number;
    kfTax: number;
    propertyTax: number;
    total: number;
  };
  assets: {
    liquidAssets: number;
    iskValue: number;
    kfValue: number;
    depotValue: number;
    propertyValue: number;
    pensionCapital: number;
    totalAssets: number;
  };
  debts: {
    mortgages: number;
    otherLoans: number;
    totalDebts: number;
  };
  netWorth: number;
  cashFlow: number;
}

export interface SimulationResults {
  yearlyStates: YearlyFinancialState[];
  summary: {
    expectedMonthlyPension: number;
    pensionCompensationRatio: number;
    capitalDurationYears: number;
    finalNetWorth: number;
  };
}

// Input validation and calculation transparency
export interface CalculationStep {
  description: string;
  formula: string;
  inputs: Record<string, number>;
  result: number;
}

export interface TransparentCalculation {
  category: string;
  steps: CalculationStep[];
  finalResult: number;
}

// Simplified types for MVP version
export interface MVPUserProfile {
  currentAge: number;
  gender: 'man' | 'kvinna';
  desiredRetirementAge: number;
}

export interface MVPIncomeData {
  monthlySalary: number;
  realSalaryGrowth: number;
}

export interface MVPExpenseData {
  monthlyLiving: number;
}

export interface MVPAssetData {
  liquidSavings: number;
  iskAccount: number;
}

export interface MVPSimulationInputs {
  profile: MVPUserProfile;
  income: MVPIncomeData;
  expenses: MVPExpenseData;
  assets: MVPAssetData;
}

export interface MVPYearProjection {
  year: number;
  age: number;
  salary: number;
  expenses: number;
  savings: number;
  netWorth: number;
  calculations: {
    grossIncome: number;
    pensionFee: number;
    municipalTax: number;
    stateTax: number;
    iskTax: number;
    totalTax: number;
    netIncome: number;
    cashFlow: number;
  };
}
