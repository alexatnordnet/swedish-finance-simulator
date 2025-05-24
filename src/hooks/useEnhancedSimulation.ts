// ============================================================================
// ENHANCED SIMULATION HOOK WITH PENSION SUPPORT
// React hook for managing enhanced simulation state including pensions
// ============================================================================

import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  MVPUserProfile,
  MVPIncomeData,
  MVPExpenseData,
  MVPAssetData
} from '../types';
import { 
  PensionSettings, 
  EnhancedSimulationInputs,
  EnhancedYearProjection,
  DEFAULT_PENSION_SETTINGS 
} from '../types/pension';
import { enhancedSimulationEngine } from '../engine/core/EnhancedSimulationEngine';
import { debounce } from '../utils/formatters';

interface EnhancedSimulationState {
  inputs: EnhancedSimulationInputs;
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
  runSimulation: () => void;
  resetToDefaults: () => void;
  exportData: () => void;
}

const DEFAULT_ENHANCED_INPUTS: EnhancedSimulationInputs = {
  profile: {
    currentAge: 30,
    gender: 'kvinna',
    desiredRetirementAge: 65
  },
  income: {
    monthlySalary: 45000,
    realSalaryGrowth: 0.016
  },
  expenses: {
    monthlyLiving: 25000
  },
  assets: {
    liquidSavings: 100000,
    iskAccount: 200000
  },
  pensions: {
    ...DEFAULT_PENSION_SETTINGS,
    generalPension: {
      currentInkomstpension: 0,
      currentPremiepension: 0,
      estimatedMonthlyAmount: 15000,
      withdrawalStartAge: 65
    }
  }
};

export function useEnhancedSimulation(): EnhancedSimulationState & EnhancedSimulationActions {
  const [state, setState] = useState<EnhancedSimulationState>({
    inputs: DEFAULT_ENHANCED_INPUTS,
    projections: [],
    isCalculating: false,
    lastCalculated: null,
    warnings: [],
    errors: []
  });

  // Debounced calculation
  const debouncedCalculation = useMemo(
    () => debounce(() => {
      setState(prev => ({ ...prev, isCalculating: true }));
      
      try {
        // Validate inputs
        const validation = enhancedSimulationEngine.validateEnhancedInputs(state.inputs);
        
        if (validation.isValid) {
          // Run enhanced simulation
          const projections = enhancedSimulationEngine.runEnhancedSimulation(state.inputs);
          
          setState(prev => ({
            ...prev,
            projections,
            isCalculating: false,
            lastCalculated: new Date(),
            warnings: validation.warnings,
            errors: []
          }));
        } else {
          setState(prev => ({
            ...prev,
            isCalculating: false,
            errors: validation.errors,
            warnings: validation.warnings
          }));
        }
      } catch (error) {
        console.error('Enhanced simulation error:', error);
        setState(prev => ({
          ...prev,
          isCalculating: false,
          errors: ['Ett fel uppstod vid beräkningen. Kontrollera dina indata.']
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
    setState(prev => ({
      ...prev,
      inputs: {
        ...prev.inputs,
        profile: { ...prev.inputs.profile, ...profile }
      }
    }));
  }, []);

  const updateIncome = useCallback((income: Partial<MVPIncomeData>) => {
    setState(prev => ({
      ...prev,
      inputs: {
        ...prev.inputs,
        income: { ...prev.inputs.income, ...income }
      }
    }));
  }, []);

  const updateExpenses = useCallback((expenses: Partial<MVPExpenseData>) => {
    setState(prev => ({
      ...prev,
      inputs: {
        ...prev.inputs,
        expenses: { ...prev.inputs.expenses, ...expenses }
      }
    }));
  }, []);

  const updateAssets = useCallback((assets: Partial<MVPAssetData>) => {
    setState(prev => ({
      ...prev,
      inputs: {
        ...prev.inputs,
        assets: { ...prev.inputs.assets, ...assets }
      }
    }));
  }, []);

  const updatePensions = useCallback((pensions: PensionSettings) => {
    setState(prev => ({
      ...prev,
      inputs: {
        ...prev.inputs,
        pensions
      }
    }));
  }, []);

  const runSimulation = useCallback(() => {
    debouncedCalculation();
  }, [debouncedCalculation]);

  const resetToDefaults = useCallback(() => {
    setState({
      inputs: DEFAULT_ENHANCED_INPUTS,
      projections: [],
      isCalculating: false,
      lastCalculated: null,
      warnings: [],
      errors: []
    });
  }, []);

  const exportData = useCallback(() => {
    if (state.projections.length === 0) {
      alert('Inga data att exportera. Kör simulationen först.');
      return;
    }

    try {
      // Create enhanced CSV data
      const headers = [
        'År', 'Ålder', 'Bruttolön', 'Pensionsinkomst', 'Nettoinkomst', 
        'Utgifter', 'Sparande', 'Nettoförmögenhet', 'Pensionskapital'
      ];
      
      const csvData = state.projections.map(projection => ({
        'År': projection.year,
        'Ålder': projection.age,
        'Bruttolön': projection.salary,
        'Pensionsinkomst': projection.pensionIncome.total * 12,
        'Nettoinkomst': projection.calculations.netIncome,
        'Utgifter': projection.expenses,
        'Sparande': projection.savings,
        'Nettoförmögenhet': projection.netWorth,
        'Pensionskapital': projection.pensionCapital.total
      }));

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => row[header as keyof typeof row]).join(',')
        )
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `finanssimulering_med_pension_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Fel vid export av data.');
    }
  }, [state.projections]);

  return {
    ...state,
    updateProfile,
    updateIncome,
    updateExpenses,
    updateAssets,
    updatePensions,
    runSimulation,
    resetToDefaults,
    exportData
  };
}

// Enhanced summary hook
export function useEnhancedSimulationSummary(projections: EnhancedYearProjection[], inputs: EnhancedSimulationInputs) {
  return useMemo(() => {
    if (projections.length === 0) {
      return {
        maxNetWorth: 0,
        retirementNetWorth: 0,
        finalNetWorth: 0,
        totalSavings: 0,
        averageYearlySavings: 0,
        yearsOfPositiveCashFlow: 0,
        breakEvenAge: null,
        // Pension-specific metrics
        totalPensionCapital: 0,
        averageMonthlyPension: 0,
        pensionCompensationRatio: 0,
        pensionDuration: 0
      };
    }

    // Basic metrics
    const maxNetWorth = Math.max(...projections.map(p => p.netWorth));
    const retirementProjection = projections.find(p => p.age === inputs.profile.desiredRetirementAge);
    const retirementNetWorth = retirementProjection?.netWorth || 0;
    const finalNetWorth = projections[projections.length - 1].netWorth;
    
    const positiveSavings = projections.filter(p => p.savings > 0);
    const totalSavings = positiveSavings.reduce((sum, p) => sum + p.savings, 0);
    const averageYearlySavings = positiveSavings.length > 0 ? totalSavings / positiveSavings.length : 0;
    const yearsOfPositiveCashFlow = positiveSavings.length;
    
    const breakEvenProjection = projections.find(p => p.netWorth > 0);
    const breakEvenAge = breakEvenProjection?.age || null;

    // Pension-specific metrics
    const totalPensionCapital = inputs.pensions.generalPension.currentInkomstpension + 
                               inputs.pensions.generalPension.currentPremiepension +
                               inputs.pensions.accounts.reduce((sum, acc) => sum + acc.currentValue, 0);
    
    const pensionProjections = projections.filter(p => p.age >= inputs.pensions.generalPension.withdrawalStartAge);
    const averageMonthlyPension = pensionProjections.length > 0 
      ? pensionProjections.reduce((sum, p) => sum + p.pensionIncome.total, 0) / pensionProjections.length
      : 0;
    
    const finalSalary = inputs.income.monthlySalary;
    const pensionCompensationRatio = finalSalary > 0 ? averageMonthlyPension / finalSalary : 0;
    
    const pensionYears = pensionProjections.filter(p => p.pensionIncome.total > 0).length;

    return {
      maxNetWorth,
      retirementNetWorth,
      finalNetWorth,
      totalSavings,
      averageYearlySavings,
      yearsOfPositiveCashFlow,
      breakEvenAge,
      totalPensionCapital,
      averageMonthlyPension,
      pensionCompensationRatio,
      pensionDuration: pensionYears
    };
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
        pensionCapitalData: []
      };
    }

    const netWorthData = projections.map(p => ({
      year: p.year,
      age: p.age,
      value: p.netWorth || 0,
      label: `År ${p.year} (${p.age} år)`
    }));

    const cashFlowData = projections.map(p => ({
      year: p.year,
      age: p.age,
      value: p.savings || 0,
      label: `År ${p.year} (${p.age} år)`
    }));

    const incomeExpenseData = projections.map(p => ({
      year: p.year,
      age: p.age,
      salary: p.salary || 0,
      expenses: p.expenses || 0,
      netIncome: p.calculations?.netIncome || 0,
      pensionIncome: (p.pensionIncome?.total || 0) * 12,
      label: `År ${p.year} (${p.age} år)`
    }));

    const pensionIncomeData = projections.map(p => ({
      year: p.year,
      age: p.age,
      general: p.pensionIncome?.generalPension || 0,
      occupational: p.pensionIncome?.occupationalPension || 0,
      private: p.pensionIncome?.privatePension || 0,
      total: p.pensionIncome?.total || 0,
      label: `År ${p.year} (${p.age} år)`
    }));

    const pensionCapitalData = projections.map(p => ({
      year: p.year,
      age: p.age,
      value: p.pensionCapital?.total || 0,
      general: p.pensionCapital?.general || 0,
      occupational: p.pensionCapital?.occupational || 0,
      private: p.pensionCapital?.private || 0,
      label: `År ${p.year} (${p.age} år)`
    }));

    return {
      netWorthData,
      cashFlowData,
      incomeExpenseData,
      pensionIncomeData,
      pensionCapitalData
    };
  }, [projections]);
}