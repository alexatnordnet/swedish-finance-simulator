// ============================================================================
// MAIN APPLICATION COMPONENT
// Swedish Personal Finance Lifetime Simulator
// ============================================================================

import { useState } from 'react';

import { useEnhancedSimulation, useEnhancedSimulationSummary, useEnhancedChartData } from './hooks/useEnhancedSimulation';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { AlertBanner } from './components/layout/AlertBanner';
import { TabNavigation, TabId } from './components/layout/TabNavigation';
import { InputPanel } from './components/forms/InputPanel';
import { OverviewTab } from './components/tabs/OverviewTab';
import { ProjectionsTab } from './components/tabs/ProjectionsTab';
import { CalculationsTab } from './components/tabs/CalculationsTab';

function App() {
  const simulation = useEnhancedSimulation();
  const summary = useEnhancedSimulationSummary(simulation.projections, simulation.inputs);
  const chartData = useEnhancedChartData(simulation.projections);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const currentYear = new Date().getFullYear();

  // Extract pension withdrawal ages for display
  const pensionWithdrawalAges = {
    generalPension: simulation.inputs.pensions.generalPension.withdrawalStartAge,
    occupationalPension: simulation.inputs.pensions.accounts
      .find(acc => acc.type === 'tjänste')?.withdrawalSettings.startAge || 0
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <Header
        onExportData={simulation.exportData}
        onResetToDefaults={simulation.resetToDefaults}
        lastCalculated={simulation.lastCalculated}
        hasLocalStorageSupport={simulation.hasLocalStorageSupport}
      />

      {/* Alerts */}
      <AlertBanner 
        errors={simulation.errors}
        warnings={simulation.warnings}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          
          {/* Input Panel */}
          <div className="lg:col-span-1">
            <InputPanel
              inputs={simulation.inputs}
              onUpdateProfile={simulation.updateProfile}
              onUpdateIncome={simulation.updateIncome}
              onUpdateExpenses={simulation.updateExpenses}
              onUpdateAssets={simulation.updateAssets}
              onUpdatePensions={simulation.updatePensions}
              investmentRates={simulation.investmentRates}
              onUpdateInvestmentRates={simulation.updateInvestmentRates}
            />
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            {/* Tab Navigation */}
            <TabNavigation 
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <OverviewTab
                summary={summary}
                desiredRetirementAge={simulation.inputs.profile.desiredRetirementAge}
                pensionWithdrawalAges={pensionWithdrawalAges}
                chartData={chartData}
              />
            )}

            {activeTab === 'projections' && (
              <ProjectionsTab
                projections={simulation.projections}
                isCalculating={simulation.isCalculating}
                desiredRetirementAge={simulation.inputs.profile.desiredRetirementAge}
                currentYear={currentYear}
              />
            )}

            {activeTab === 'calculations' && (
              <CalculationsTab
                projections={simulation.projections}
                currentYear={currentYear}
                gender={simulation.inputs.profile.gender}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer lastCalculated={simulation.lastCalculated} />
    </div>
  );
}

export default App;