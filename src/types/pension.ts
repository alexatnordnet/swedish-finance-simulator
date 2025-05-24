// ============================================================================
// UPDATED TYPES - PENSION SYSTEM
// Extended types for comprehensive pension modeling
// ============================================================================

import { MVPSimulationInputs, MVPYearProjection } from './index';

export interface PensionAccount {
  id: string;
  name: string;
  currentValue: number;
  expectedMonthlyPension?: number; // For defined benefit plans
  provider: string;
  type: 'allmän' | 'tjänste' | 'privat';
  canChooseWithdrawalAge: boolean;
  earliestWithdrawalAge: number;
  latestWithdrawalAge: number;
  withdrawalSettings: {
    startAge: number;
    monthlyAmount: number;
    isPercentage: boolean; // true = percentage of capital, false = fixed amount
    isLifelong: boolean; // true = until death, false = until capital runs out
  };
}

export interface PensionSettings {
  accounts: PensionAccount[];
  generalPension: {
    currentInkomstpension: number;
    currentPremiepension: number;
    estimatedMonthlyAmount: number; // Based on current accumulated rights
    withdrawalStartAge: number; // When to start taking general pension
  };
}

// Update existing MVP types to include pensions
export interface EnhancedSimulationInputs extends MVPSimulationInputs {
  pensions: PensionSettings;
}

export interface EnhancedYearProjection extends MVPYearProjection {
  pensionIncome: {
    generalPension: number;
    occupationalPension: number;
    privatePension: number;
    total: number;
  };
  pensionCapital: {
    general: number;
    occupational: number;
    private: number;
    total: number;
  };
}

// Preset pension account types for easy setup
export const PENSION_ACCOUNT_TEMPLATES = {
  allmän: {
    name: 'Allmän pension',
    type: 'allmän' as const,
    provider: 'Pensionsmyndigheten',
    canChooseWithdrawalAge: true,
    earliestWithdrawalAge: 62,
    latestWithdrawalAge: 70
  },
  itp1: {
    name: 'ITP1 Tjänstepension',
    type: 'tjänste' as const,
    provider: 'Collectum',
    canChooseWithdrawalAge: true,
    earliestWithdrawalAge: 55,
    latestWithdrawalAge: 70
  },
  itp2: {
    name: 'ITP2 Tjänstepension',
    type: 'tjänste' as const,
    provider: 'Alecta/Collectum',
    canChooseWithdrawalAge: true,
    earliestWithdrawalAge: 55,
    latestWithdrawalAge: 70
  },
  saflo: {
    name: 'Avtalspension SAF-LO',
    type: 'tjänste' as const,
    provider: 'Fora',
    canChooseWithdrawalAge: true,
    earliestWithdrawalAge: 55,
    latestWithdrawalAge: 70
  },
  ips: {
    name: 'Privat pensionssparande (IPS)',
    type: 'privat' as const,
    provider: 'Eget val',
    canChooseWithdrawalAge: true,
    earliestWithdrawalAge: 55,
    latestWithdrawalAge: 100
  }
};

// Default pension settings
export const DEFAULT_PENSION_SETTINGS: PensionSettings = {
  accounts: [],
  generalPension: {
    currentInkomstpension: 0,
    currentPremiepension: 0,
    estimatedMonthlyAmount: 0,
    withdrawalStartAge: 65
  }
};

// Keep all existing types from the original file
export * from './index';