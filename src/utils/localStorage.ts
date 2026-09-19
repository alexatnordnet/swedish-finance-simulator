// ============================================================================
// LOCAL STORAGE PERSISTENCE UTILITY
// Handles saving and loading simulation data to/from localStorage
// ============================================================================

import { EnhancedSimulationInputs } from '../types/pension';
import { InvestmentRates } from '../components';

const STORAGE_KEYS = {
  SIMULATION_INPUTS: 'swedish-finance-simulator-inputs',
  INVESTMENT_RATES: 'swedish-finance-simulator-investment-rates',
  LAST_SAVED: 'swedish-finance-simulator-last-saved',
  SCHEMA_VERSION: 'swedish-finance-simulator-schema-version'
} as const;

/**
 * Bump this whenever the persisted shape changes incompatibly. Saved data from
 * an older version is discarded rather than loaded, so a shape change can't
 * feed half-populated objects into the simulation engine.
 */
const SCHEMA_VERSION = 1;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Structural check on loaded data.
 *
 * localStorage is user-writable and survives across deploys, so anything read
 * back is untrusted input. This verifies the fields the engine actually
 * dereferences; anything missing means we fall back to defaults instead of
 * crashing on a property of undefined.
 */
function isValidPersistedShape(inputs: unknown, rates: unknown): boolean {
  if (typeof inputs !== 'object' || inputs === null) return false;
  if (typeof rates !== 'object' || rates === null) return false;

  const i = inputs as Record<string, any>;
  const r = rates as Record<string, any>;

  if (!isFiniteNumber(r.liquidSavingsRate)) return false;
  if (!isFiniteNumber(r.iskAccountRate)) return false;

  if (!i.profile || !isFiniteNumber(i.profile.currentAge)) return false;
  if (!isFiniteNumber(i.profile.desiredRetirementAge)) return false;
  if (i.profile.gender !== 'man' && i.profile.gender !== 'kvinna') return false;

  if (!i.income || !isFiniteNumber(i.income.monthlySalary)) return false;
  if (!isFiniteNumber(i.income.realSalaryGrowth)) return false;
  if (!i.expenses || !isFiniteNumber(i.expenses.monthlyLiving)) return false;
  if (!i.assets || !isFiniteNumber(i.assets.liquidSavings)) return false;
  if (!isFiniteNumber(i.assets.iskAccount)) return false;

  if (!i.pensions || typeof i.pensions !== 'object') return false;
  if (!Array.isArray(i.pensions.accounts)) return false;
  const g = i.pensions.generalPension;
  if (!g || !isFiniteNumber(g.currentInkomstpension)) return false;
  if (!isFiniteNumber(g.currentPremiepension)) return false;
  if (!isFiniteNumber(g.estimatedMonthlyAmount)) return false;
  if (!isFiniteNumber(g.withdrawalStartAge)) return false;

  return i.pensions.accounts.every(
    (a: any) =>
      a &&
      typeof a.id === 'string' &&
      isFiniteNumber(a.currentValue) &&
      a.withdrawalSettings &&
      isFiniteNumber(a.withdrawalSettings.startAge)
  );
}

export interface PersistedData {
  inputs: EnhancedSimulationInputs;
  investmentRates: InvestmentRates;
  lastSaved: string;
}

/**
 * Save simulation data to localStorage
 */
export function saveToLocalStorage(inputs: EnhancedSimulationInputs, investmentRates: InvestmentRates): boolean {
  try {
    const timestamp = new Date().toISOString();
    
    localStorage.setItem(STORAGE_KEYS.SIMULATION_INPUTS, JSON.stringify(inputs));
    localStorage.setItem(STORAGE_KEYS.INVESTMENT_RATES, JSON.stringify(investmentRates));
    localStorage.setItem(STORAGE_KEYS.LAST_SAVED, timestamp);
    localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, String(SCHEMA_VERSION));
    
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    return false;
  }
}

/**
 * Load simulation data from localStorage
 */
export function loadFromLocalStorage(): PersistedData | null {
  try {
    const version = Number(localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION));
    if (version !== SCHEMA_VERSION) {
      // Written by an older build, or by a build that predates versioning.
      // Drop it rather than guessing at its shape.
      clearLocalStorage();
      return null;
    }

    const inputsJson = localStorage.getItem(STORAGE_KEYS.SIMULATION_INPUTS);
    const ratesJson = localStorage.getItem(STORAGE_KEYS.INVESTMENT_RATES);
    const lastSaved = localStorage.getItem(STORAGE_KEYS.LAST_SAVED);

    if (!inputsJson || !ratesJson || !lastSaved) {
      return null;
    }

    const inputs = JSON.parse(inputsJson);
    const investmentRates = JSON.parse(ratesJson);

    if (!isValidPersistedShape(inputs, investmentRates)) {
      console.warn('Discarding malformed saved data.');
      clearLocalStorage();
      return null;
    }

    return {
      inputs: inputs as EnhancedSimulationInputs,
      investmentRates: investmentRates as InvestmentRates,
      lastSaved
    };
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
}

/**
 * Clear all simulation data from localStorage
 */
export function clearLocalStorage(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEYS.SIMULATION_INPUTS);
    localStorage.removeItem(STORAGE_KEYS.INVESTMENT_RATES);
    localStorage.removeItem(STORAGE_KEYS.LAST_SAVED);
    localStorage.removeItem(STORAGE_KEYS.SCHEMA_VERSION);
    return true;
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
    return false;
  }
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the last saved timestamp
 */
export function getLastSavedTimestamp(): Date | null {
  try {
    const lastSaved = localStorage.getItem(STORAGE_KEYS.LAST_SAVED);
    return lastSaved ? new Date(lastSaved) : null;
  } catch {
    return null;
  }
}