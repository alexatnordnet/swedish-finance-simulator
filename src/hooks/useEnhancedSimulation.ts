// ============================================================================
// ENHANCED SIMULATION HOOK WITH UNIFIED ENGINE
// Updated to use the new UnifiedSimulationEngine
// ============================================================================

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  MVPUserProfile,
  MVPIncomeData,
  MVPExpenseData,
  MVPAssetData,
} from "../types";
import {
  PensionSettings,
  EnhancedSimulationInputs,
  EnhancedYearProjection,
  DEFAULT_PENSION_SETTINGS,
} from "../types/pension";
import { financialSimulationEngine } from "../engine/core/FinancialSimulationEngine";
import { debounce } from "../utils/formatters";
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
  isLocalStorageAvailable,
  getLastSavedTimestamp,
} from "../utils/localStorage";
import { InvestmentRates } from "../components";
import { DEFAULT_INVESTMENT_ASSUMPTIONS } from "../engine/swedish-parameters/TaxParameters2025";

interface EnhancedSimulationState {
  inputs: EnhancedSimulationInputs;
  investmentRates: InvestmentRates;
  projections: EnhancedYearProjection[];
  isCalculating: boolean;
  lastCalculated: Date | null;
  warnings: string[];
  errors: string[];
}

interface EnhancedSimulationActions {
  updateProfile: (profile: Partial<MVPUserProfile>) => void;
  updateIncome: (income: Partial<MVPIncomeData>) => void;
  updateExpenses: (expenses: Partial<MVPExpenseData>) => void;
  updateAssets: (assets: Partial<MVPAssetData>) => void;
  updatePensions: (pensions: PensionSettings) => void;
  updateInvestmentRates: (rates: Partial<InvestmentRates>) => void;
  runSimulation: () => void;
  resetToDefaults: () => void;
  exportData: () => void;
  hasLocalStorageSupport: boolean;
}

const DEFAULT_ENHANCED_INPUTS: EnhancedSimulationInputs = {
  profile: {
    currentAge: 30,
    gender: "kvinna",
    desiredRetirementAge: 65,
  },
  income: {
    monthlySalary: 45000,
    realSalaryGrowth: 0.016,
  },
  expenses: {
    monthlyLiving: 25000,
  },
  assets: {
    liquidSavings: 100000,
    iskAccount: 200000,
  },
  investments: {
    liquidSavingsRate: DEFAULT_INVESTMENT_ASSUMPTIONS.liquidSavingsRate,
    iskAccountRate: DEFAULT_INVESTMENT_ASSUMPTIONS.iskAccountRate,
  },
  pensions: {
    ...DEFAULT_PENSION_SETTINGS,
    generalPension: {
      currentInkomstpension: 0,
      currentPremiepension: 0,
      estimatedMonthlyAmount: 15000,
      withdrawalStartAge: 65,
    },
  },
};

const DEFAULT_INVESTMENT_RATES: InvestmentRates = {
  liquidSavingsRate: DEFAULT_INVESTMENT_ASSUMPTIONS.liquidSavingsRate,
  iskAccountRate: DEFAULT_INVESTMENT_ASSUMPTIONS.iskAccountRate,
};

// Initialize state with data from localStorage if available
function initializeState(): EnhancedSimulationState {
  const savedData = loadFromLocalStorage();

  if (savedData) {
    return {
      inputs: savedData.inputs,
      investmentRates: savedData.investmentRates,
      projections: [],
      isCalculating: false,
      lastCalculated: getLastSavedTimestamp(),
      warnings: [],
      errors: [],
    };
  }

  return {
    inputs: DEFAULT_ENHANCED_INPUTS,
    investmentRates: DEFAULT_INVESTMENT_RATES,
    projections: [],
    isCalculating: false,
    lastCalculated: null,
    warnings: [],
    errors: [],
  };
}

export function useEnhancedSimulation(): EnhancedSimulationState &
  EnhancedSimulationActions {
  const [state, setState] = useState<EnhancedSimulationState>(initializeState);

  // Debounced calculation using the unified engine
  const debouncedCalculation = useMemo(
    () =>
      debounce(() => {
        setState((prev) => ({ ...prev, isCalculating: true }));

        try {
          // Create simulation configuration for enhanced mode
          const config = {
            includePensions: true,
            useCustomInvestmentRates: true,
            enableTransparency: false,
          };

          // Validate inputs using unified engine
          const validation = financialSimulationEngine.validateInputs(
            state.inputs,
            config
          );

          if (validation.isValid) {
            // Run unified simulation in enhanced mode with custom investment rates
            const projections = financialSimulationEngine.runSimulation(
              state.inputs,
              config,
              state.investmentRates
            ) as EnhancedYearProjection[]; // Type assertion safe because config.includePensions = true

            setState((prev) => ({
              ...prev,
              projections,
              isCalculating: false,
              lastCalculated: new Date(),
              warnings: validation.warnings,
              errors: [],
            }));
          } else {
            setState((prev) => ({
              ...prev,
              isCalculating: false,
              errors: validation.errors,
              warnings: validation.warnings,
            }));
          }
        } catch (error) {
          console.error("Enhanced simulation error:", error);
          setState((prev) => ({
            ...prev,
            isCalculating: false,
            errors: [
              "Ett fel uppstod vid beräkningen. Kontrollera dina indata.",
            ],
          }));
        }
      }, 500),
    [state.inputs, state.investmentRates]
  );

  // Auto-calculate when inputs change
  useEffect(() => {
    debouncedCalculation();
  }, [debouncedCalculation]);

  const updateProfile = useCallback((profile: Partial<MVPUserProfile>) => {
    setState((prev) => {
      const newState = {
        ...prev,
        inputs: {
          ...prev.inputs,
          profile: { ...prev.inputs.profile, ...profile },
        },
      };

      // Auto-save after update
      if (isLocalStorageAvailable()) {
        saveToLocalStorage(newState.inputs, prev.investmentRates);
      }

      return newState;
    });
  }, []);

  const updateIncome = useCallback((income: Partial<MVPIncomeData>) => {
    setState((prev) => {
      const newState = {
        ...prev,
        inputs: {
          ...prev.inputs,
          income: { ...prev.inputs.income, ...income },
        },
      };

      // Auto-save after update
      if (isLocalStorageAvailable()) {
        saveToLocalStorage(newState.inputs, prev.investmentRates);
      }

      return newState;
    });
  }, []);

  const updateExpenses = useCallback((expenses: Partial<MVPExpenseData>) => {
    setState((prev) => {
      const newState = {
        ...prev,
        inputs: {
          ...prev.inputs,
          expenses: { ...prev.inputs.expenses, ...expenses },
        },
      };

      // Auto-save after update
      if (isLocalStorageAvailable()) {
        saveToLocalStorage(newState.inputs, prev.investmentRates);
      }

      return newState;
    });
  }, []);

  const updateAssets = useCallback((assets: Partial<MVPAssetData>) => {
    setState((prev) => {
      const newState = {
        ...prev,
        inputs: {
          ...prev.inputs,
          assets: { ...prev.inputs.assets, ...assets },
        },
      };

      // Auto-save after update
      if (isLocalStorageAvailable()) {
        saveToLocalStorage(newState.inputs, prev.investmentRates);
      }

      return newState;
    });
  }, []);

  const updatePensions = useCallback((pensions: PensionSettings) => {
    setState((prev) => {
      const newState = {
        ...prev,
        inputs: {
          ...prev.inputs,
          pensions,
        },
      };

      // Auto-save after update
      if (isLocalStorageAvailable()) {
        saveToLocalStorage(newState.inputs, prev.investmentRates);
      }

      return newState;
    });
  }, []);

  const updateInvestmentRates = useCallback(
    (rates: Partial<InvestmentRates>) => {
      // Convert percentage input to decimal for internal calculations
      const convertedRates: Partial<InvestmentRates> = {};

      if (rates.liquidSavingsRate !== undefined) {
        convertedRates.liquidSavingsRate = rates.liquidSavingsRate / 100;
      }
      if (rates.iskAccountRate !== undefined) {
        convertedRates.iskAccountRate = rates.iskAccountRate / 100;
      }

      setState((prev) => {
        const newRates = { ...prev.investmentRates, ...convertedRates };

        // Auto-save after update
        if (isLocalStorageAvailable()) {
          saveToLocalStorage(prev.inputs, newRates);
        }

        return {
          ...prev,
          investmentRates: newRates,
        };
      });
    },
    []
  );

  const runSimulation = useCallback(() => {
    debouncedCalculation();
  }, [debouncedCalculation]);

  const resetToDefaults = useCallback(() => {
    // Clear localStorage when resetting to defaults
    if (isLocalStorageAvailable()) {
      clearLocalStorage();
    }

    setState({
      inputs: DEFAULT_ENHANCED_INPUTS,
      investmentRates: DEFAULT_INVESTMENT_RATES,
      projections: [],
      isCalculating: false,
      lastCalculated: null,
      warnings: [],
      errors: [],
    });
  }, []);

  const exportData = useCallback(() => {
    if (state.projections.length === 0) {
      alert("Inga data att exportera. Kör simulationen först.");
      return;
    }

    try {
      // Create enhanced CSV data
      const headers = [
        "År",
        "Ålder",
        "Bruttolön",
        "Pensionsinkomst",
        "Nettoinkomst",
        "Utgifter",
        "Sparande",
        "Nettoförmögenhet",
        "Pensionskapital",
      ];

      const csvData = state.projections.map((projection) => ({
        År: projection.year,
        Ålder: projection.age,
        Bruttolön: projection.salary,
        Pensionsinkomst: (projection.pensionIncome?.total || 0) * 12,
        Nettoinkomst: projection.calculations.netIncome,
        Utgifter: projection.expenses,
        Sparande: projection.savings,
        Nettoförmögenhet: projection.netWorth,
        Pensionskapital: projection.pensionCapital?.total || 0,
      }));

      const csvContent = [
        headers.join(","),
        ...csvData.map((row) =>
          headers.map((header) => row[header as keyof typeof row]).join(",")
        ),
      ].join("\n");

      // Download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `finanssimulering_med_pension_${
          new Date().toISOString().split("T")[0]
        }.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export error:", error);
      alert("Fel vid export av data.");
    }
  }, [state.projections]);

  const hasLocalStorageSupport = isLocalStorageAvailable();

  return {
    ...state,
    updateProfile,
    updateIncome,
    updateExpenses,
    updateAssets,
    updatePensions,
    updateInvestmentRates,
    runSimulation,
    resetToDefaults,
    exportData,
    hasLocalStorageSupport,
  };
}

// Enhanced summary hook using unified engine
export function useEnhancedSimulationSummary(
  projections: EnhancedYearProjection[],
  inputs: EnhancedSimulationInputs
) {
  return useMemo(() => {
    const config = {
      includePensions: true,
      useCustomInvestmentRates: true,
      enableTransparency: false,
    };

    return financialSimulationEngine.generateSummary(
      projections,
      inputs,
      config
    );
  }, [projections, inputs]);
}

// Enhanced chart data hook
export function useEnhancedChartData(projections: EnhancedYearProjection[]) {
  return useMemo(() => {
    if (projections.length === 0) {
      return {
        netWorthData: [],
        cashFlowData: [],
        incomeExpenseData: [],
        pensionIncomeData: [],
        pensionCapitalData: [],
      };
    }

    const netWorthData = projections.map((p) => ({
      year: p.year,
      age: p.age,
      value: p.netWorth || 0,
      label: `År ${p.year} (${p.age} år)`,
    }));

    const cashFlowData = projections.map((p) => ({
      year: p.year,
      age: p.age,
      value: p.savings || 0,
      label: `År ${p.year} (${p.age} år)`,
    }));

    const incomeExpenseData = projections.map((p) => ({
      year: p.year,
      age: p.age,
      salary: p.salary || 0,
      expenses: p.expenses || 0,
      netIncome: p.calculations?.netIncome || 0,
      pensionIncome: (p.pensionIncome?.total || 0) * 12,
      label: `År ${p.year} (${p.age} år)`,
    }));

    const pensionIncomeData = projections.map((p) => ({
      year: p.year,
      age: p.age,
      general: p.pensionIncome?.generalPension || 0,
      occupational: p.pensionIncome?.occupationalPension || 0,
      private: p.pensionIncome?.privatePension || 0,
      total: p.pensionIncome?.total || 0,
      label: `År ${p.year} (${p.age} år)`,
    }));

    const pensionCapitalData = projections.map((p) => ({
      year: p.year,
      age: p.age,
      value: p.pensionCapital?.total || 0,
      general: p.pensionCapital?.general || 0,
      occupational: p.pensionCapital?.occupational || 0,
      private: p.pensionCapital?.private || 0,
      label: `År ${p.year} (${p.age} år)`,
    }));

    return {
      netWorthData,
      cashFlowData,
      incomeExpenseData,
      pensionIncomeData,
      pensionCapitalData,
    };
  }, [projections]);
}
