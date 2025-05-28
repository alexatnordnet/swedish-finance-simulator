// ============================================================================
// LOCAL STORAGE PERSISTENCE UTILITY
// Handles saving and loading simulation data to/from localStorage
// ============================================================================

import { EnhancedSimulationInputs } from '../types/pension';
import { InvestmentRates } from '../components';

const STORAGE_KEYS = {
  SIMULATION_INPUTS: 'swedish-finance-simulator-inputs',
  INVESTMENT_RATES: 'swedish-finance-simulator-investment-rates',
  LAST_SAVED: 'swedish-finance-simulator-last-saved'
} as const;

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
    const inputsJson = localStorage.getItem(STORAGE_KEYS.SIMULATION_INPUTS);
    const ratesJson = localStorage.getItem(STORAGE_KEYS.INVESTMENT_RATES);
    const lastSaved = localStorage.getItem(STORAGE_KEYS.LAST_SAVED);
    
    if (!inputsJson || !ratesJson || !lastSaved) {
      return null;
    }
    
    const inputs = JSON.parse(inputsJson) as EnhancedSimulationInputs;
    const investmentRates = JSON.parse(ratesJson) as InvestmentRates;
    
    return {
      inputs,
      investmentRates,
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