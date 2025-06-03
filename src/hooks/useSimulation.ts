// ============================================================================
// SIMULATION HOOK WITH UNIFIED ENGINE
// Updated to use the new UnifiedSimulationEngine in MVP mode
// ============================================================================

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  MVPSimulationInputs,
  MVPYearProjection,
  MVPUserProfile,
  MVPIncomeData,
  MVPExpenseData,
  MVPAssetData,
} from "../types";
import { financialSimulationEngine } from "../engine/core/FinancialSimulationEngine";
import { debounce } from "../utils/formatters";
import { DEFAULT_INVESTMENT_ASSUMPTIONS } from "../engine/swedish-parameters/TaxParameters2025";

interface SimulationState {
  inputs: MVPSimulationInputs;
  projections: MVPYearProjection[];
  isCalculating: boolean;
  lastCalculated: Date | null;
  warnings: string[];
  errors: string[];
}

interface SimulationActions {
  updateProfile: (profile: Partial<MVPUserProfile>) => void;
  updateIncome: (income: Partial<MVPIncomeData>) => void;
  updateExpenses: (expenses: Partial<MVPExpenseData>) => void;
  updateAssets: (assets: Partial<MVPAssetData>) => void;
  runSimulation: () => void;
  resetToDefaults: () => void;
  exportData: () => void;
}

const DEFAULT_INPUTS: MVPSimulationInputs = {
  profile: {
    currentAge: 30,
    gender: "kvinna",
    desiredRetirementAge: 65,
  },
  income: {
    monthlySalary: 45000,
    realSalaryGrowth: 0.016, // 1.6% real growth
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
};

export function useSimulation(): SimulationState & SimulationActions {
  const [state, setState] = useState<SimulationState>({
    inputs: DEFAULT_INPUTS,
    projections: [],
    isCalculating: false,
    lastCalculated: null,
    warnings: [],
    errors: [],
  });

  // Debounced calculation using unified engine in MVP mode
  const debouncedCalculation = useMemo(
    () =>
      debounce(() => {
        setState((prev) => ({ ...prev, isCalculating: true }));

        try {
          // Create simulation configuration for MVP mode (no pensions)
          const config = {
            includePensions: false,
            useCustomInvestmentRates: false,
            enableTransparency: false,
          };

          // Validate inputs using unified engine
          const validation = financialSimulationEngine.validateInputs(
            state.inputs,
            config
          );

          if (validation.isValid) {
            // Run unified simulation in MVP mode
            const projections = financialSimulationEngine.runSimulation(
              state.inputs,
              config
            ) as MVPYearProjection[]; // Type assertion safe because config.includePensions = false

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
          console.error("Simulation error:", error);
          setState((prev) => ({
            ...prev,
            isCalculating: false,
            errors: [
              "Ett fel uppstod vid beräkningen. Kontrollera dina indata.",
            ],
          }));
        }
      }, 500),
    [state.inputs]
  );

  // Auto-calculate when inputs change
  useEffect(() => {
    debouncedCalculation();
  }, [debouncedCalculation]);

  const updateProfile = useCallback((profile: Partial<MVPUserProfile>) => {
    setState((prev) => ({
      ...prev,
      inputs: {
        ...prev.inputs,
        profile: { ...prev.inputs.profile, ...profile },
      },
    }));
  }, []);

  const updateIncome = useCallback((income: Partial<MVPIncomeData>) => {
    setState((prev) => ({
      ...prev,
      inputs: {
        ...prev.inputs,
        income: { ...prev.inputs.income, ...income },
      },
    }));
  }, []);

  const updateExpenses = useCallback((expenses: Partial<MVPExpenseData>) => {
    setState((prev) => ({
      ...prev,
      inputs: {
        ...prev.inputs,
        expenses: { ...prev.inputs.expenses, ...expenses },
      },
    }));
  }, []);

  const updateAssets = useCallback((assets: Partial<MVPAssetData>) => {
    setState((prev) => ({
      ...prev,
      inputs: {
        ...prev.inputs,
        assets: { ...prev.inputs.assets, ...assets },
      },
    }));
  }, []);

  const runSimulation = useCallback(() => {
    debouncedCalculation();
  }, [debouncedCalculation]);

  const resetToDefaults = useCallback(() => {
    setState({
      inputs: DEFAULT_INPUTS,
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
      // Create CSV data
      const headers = [
        "År",
        "Ålder",
        "Bruttolön",
        "Utgifter",
        "Sparande",
        "Nettoförmögenhet",
      ];
      const csvData = state.projections.map((projection) => ({
        År: projection.year,
        Ålder: projection.age,
        Bruttolön: projection.salary,
        Utgifter: projection.expenses,
        Sparande: projection.savings,
        Nettoförmögenhet: projection.netWorth,
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
        `finanssimulering_${new Date().toISOString().split("T")[0]}.csv`
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

  return {
    ...state,
    updateProfile,
    updateIncome,
    updateExpenses,
    updateAssets,
    runSimulation,
    resetToDefaults,
    exportData,
  };
}

// Hook for derived calculations and summaries using unified engine
export function useSimulationSummary(
  projections: MVPYearProjection[],
  inputs: MVPSimulationInputs
) {
  return useMemo(() => {
    const config = {
      includePensions: false,
      useCustomInvestmentRates: false,
      enableTransparency: false,
    };

    return financialSimulationEngine.generateSummary(
      projections,
      inputs,
      config
    );
  }, [projections, inputs]);
}

// Hook for chart data formatting
export function useChartData(projections: MVPYearProjection[]) {
  return useMemo(() => {
    if (projections.length === 0) {
      return {
        netWorthData: [],
        cashFlowData: [],
        incomeExpenseData: [],
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
      label: `År ${p.year} (${p.age} år)`,
    }));

    return {
      netWorthData,
      cashFlowData,
      incomeExpenseData,
    };
  }, [projections]);
}
