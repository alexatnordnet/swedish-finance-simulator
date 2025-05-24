// ============================================================================
// MAIN APPLICATION COMPONENT
// Swedish Personal Finance Lifetime Simulator
// ============================================================================

import React, { useState } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  PieChart, 
  Settings, 
  Download, 
  HelpCircle,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  BarChart3
} from 'lucide-react';

import { useSimulation, useSimulationSummary, useChartData } from './hooks/useSimulation';
import { formatCurrency, formatPercentage, formatAge, formatSimulationYear } from './utils/formatters';
import { InteractiveLineChart, MultiLineChart, InteractiveBarChart } from './components/common/InteractiveCharts';

function App() {
  const simulation = useSimulation();
  const summary = useSimulationSummary(simulation.projections, simulation.inputs);
  const chartData = useChartData(simulation.projections);
  const [showCalculations, setShowCalculations] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'projections' | 'calculations'>('overview');

  const retirementProjection = simulation.projections.find(
    p => p.age === simulation.inputs.profile.desiredRetirementAge
  );

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Calculator className="h-8 w-8 text-indigo-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Svensk Livstidssimulator
                </h1>
                <p className="text-sm text-gray-500">
                  Privatekonomisk planering för svenska förhållanden
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCalculations(!showCalculations)}
                className={`p-2 rounded-md transition-colors ${
                  showCalculations 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Visa/dölj beräkningar"
              >
                {showCalculations ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
              <button
                onClick={simulation.exportData}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Exportera data"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={simulation.resetToDefaults}
                className="btn-secondary"
              >
                Återställ
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Alerts */}
      {(simulation.errors.length > 0 || simulation.warnings.length > 0) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {simulation.errors.map((error, index) => (
            <div key={index} className="mb-2 bg-red-50 border border-red-200 rounded-md p-3 flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
              <span className="text-red-800">{error}</span>
            </div>
          ))}
          {simulation.warnings.map((warning, index) => (
            <div key={index} className="mb-2 bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-center">
              <Info className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
              <span className="text-yellow-800">{warning}</span>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Input Panel */}
          <div className="lg:col-span-1">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Dina uppgifter
              </h2>
              
              {/* User Profile */}
              <div className="space-y-4 mb-6">
                <h3 className="font-medium text-gray-700">Personliga uppgifter</h3>
                
                <div>
                  <label className="label">Nuvarande ålder</label>
                  <input
                    type="number"
                    value={simulation.inputs.profile.currentAge}
                    onChange={(e) => simulation.updateProfile({ 
                      currentAge: parseInt(e.target.value) || 0 
                    })}
                    className="input-field"
                    min="16"
                    max="80"
                  />
                </div>
                
                <div>
                  <label className="label">Kön</label>
                  <select
                    value={simulation.inputs.profile.gender}
                    onChange={(e) => simulation.updateProfile({ 
                      gender: e.target.value as 'man' | 'kvinna' 
                    })}
                    className="input-field"
                  >
                    <option value="kvinna">Kvinna</option>
                    <option value="man">Man</option>
                  </select>
                </div>
                
                <div>
                  <label className="label">Önskad pensionsålder</label>
                  <input
                    type="number"
                    value={simulation.inputs.profile.desiredRetirementAge}
                    onChange={(e) => simulation.updateProfile({ 
                      desiredRetirementAge: parseInt(e.target.value) || 65 
                    })}
                    className="input-field"
                    min="55"
                    max="75"
                  />
                </div>
              </div>

              {/* Income */}
              <div className="space-y-4 mb-6">
                <h3 className="font-medium text-gray-700">Inkomst</h3>
                
                <div>
                  <label className="label">Bruttolön per månad (kr)</label>
                  <input
                    type="number"
                    value={simulation.inputs.income.monthlySalary}
                    onChange={(e) => simulation.updateIncome({ 
                      monthlySalary: parseInt(e.target.value) || 0 
                    })}
                    className="input-field"
                    min="0"
                    step="1000"
                  />
                </div>
                
                <div>
                  <label className="label">Förväntad real löneökning per år (%)</label>
                  <input
                    type="number"
                    value={(simulation.inputs.income.realSalaryGrowth * 100).toFixed(1)}
                    onChange={(e) => simulation.updateIncome({ 
                      realSalaryGrowth: (parseFloat(e.target.value) || 0) / 100 
                    })}
                    className="input-field"
                    min="0"
                    max="10"
                    step="0.1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Standard: 1,6% (baserat på produktivitetsökning)
                  </p>
                </div>
              </div>

              {/* Expenses */}
              <div className="space-y-4 mb-6">
                <h3 className="font-medium text-gray-700">Utgifter</h3>
                
                <div>
                  <label className="label">Levnadskostnader per månad (kr)</label>
                  <input
                    type="number"
                    value={simulation.inputs.expenses.monthlyLiving}
                    onChange={(e) => simulation.updateExpenses({ 
                      monthlyLiving: parseInt(e.target.value) || 0 
                    })}
                    className="input-field"
                    min="0"
                    step="1000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Inkludera boende, mat, transport, etc.
                  </p>
                </div>
              </div>

              {/* Assets */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">Tillgångar</h3>
                
                <div>
                  <label className="label">Likvida medel (kr)</label>
                  <input
                    type="number"
                    value={simulation.inputs.assets.liquidSavings}
                    onChange={(e) => simulation.updateAssets({ 
                      liquidSavings: parseInt(e.target.value) || 0 
                    })}
                    className="input-field"
                    min="0"
                    step="10000"
                  />
                </div>
                
                <div>
                  <label className="label">ISK-konto (kr)</label>
                  <input
                    type="number"
                    value={simulation.inputs.assets.iskAccount}
                    onChange={(e) => simulation.updateAssets({ 
                      iskAccount: parseInt(e.target.value) || 0 
                    })}
                    className="input-field"
                    min="0"
                    step="10000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            {/* Tab Navigation */}
            <div className="mb-6">
              <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                {[
                  { id: 'overview', label: 'Översikt', icon: PieChart },
                  { id: 'projections', label: 'Projektioner', icon: TrendingUp },
                  { id: 'calculations', label: 'Beräkningar', icon: BarChart3 }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === id
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Nettoförmögenhet vid pension
                    </h3>
                    <p className="text-2xl font-bold text-indigo-600">
                      {formatCurrency(summary.retirementNetWorth, { compact: true })}
                    </p>
                    <p className="text-sm text-gray-500">
                      Vid {formatAge(simulation.inputs.profile.desiredRetirementAge)}
                    </p>
                  </div>
                  
                  <div className="card">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Genomsnittligt årligt sparande
                    </h3>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(summary.averageYearlySavings, { compact: true })}
                    </p>
                    <p className="text-sm text-gray-500">
                      Under {summary.yearsOfPositiveCashFlow} år
                    </p>
                  </div>
                  
                  <div className="card">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Maximal förmögenhet
                    </h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(summary.maxNetWorth, { compact: true })}
                    </p>
                  </div>
                  
                  <div className="card">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Slutlig förmögenhet
                    </h3>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(summary.finalNetWorth, { compact: true })}
                    </p>
                  </div>
                </div>

                {/* Interactive Charts */}
                {simulation.projections.length > 0 && (
                  <div className="space-y-6">
                    {/* Net Worth Chart */}
                    <InteractiveLineChart
                      data={chartData.netWorthData}
                      title="Nettoförmögenhet över tid"
                      height={300}
                      color="#4F46E5"
                      fillColor="rgba(79, 70, 229, 0.1)"
                      valueFormatter={(value) => formatCurrency(value, { compact: true })}
                    />
                    
                    {/* Cash Flow Chart */}
                    <InteractiveLineChart
                      data={chartData.cashFlowData}
                      title="Årligt sparande (kassaflöde)"
                      height={250}
                      color="#059669"
                      fillColor="rgba(5, 150, 105, 0.1)"
                      valueFormatter={(value) => formatCurrency(value, { compact: true })}
                    />
                    
                    {/* Income vs Expenses Multi-line Chart */}
                    <MultiLineChart
                      datasets={[
                        {
                          label: 'Nettoinkomst',
                          data: chartData.incomeExpenseData.map(d => ({
                            year: d.year,
                            age: d.age,
                            value: d.netIncome,
                            label: d.label
                          })),
                          color: '#059669',
                          fillColor: 'rgba(5, 150, 105, 0.05)'
                        },
                        {
                          label: 'Utgifter',
                          data: chartData.incomeExpenseData.map(d => ({
                            year: d.year,
                            age: d.age,
                            value: d.expenses,
                            label: d.label
                          })),
                          color: '#DC2626'
                        }
                      ]}
                      title="Inkomst vs Utgifter"
                      height={280}
                      valueFormatter={(value) => formatCurrency(value, { compact: true })}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Projections Tab */}
            {activeTab === 'projections' && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Årliga projektioner</h3>
                
                {simulation.isCalculating ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Beräknar...</p>
                  </div>
                ) : simulation.projections.length > 0 ? (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            År
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ålder
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Bruttolön
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nettoinkomst
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Utgifter
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sparande
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nettoförmögenhet
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {simulation.projections.slice(0, 20).map((projection) => (
                          <tr key={projection.year} className={
                            projection.age === simulation.inputs.profile.desiredRetirementAge 
                              ? 'bg-yellow-50' 
                              : ''
                          }>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {formatSimulationYear(projection.year, currentYear)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {formatAge(projection.age)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                              {formatCurrency(projection.salary, { compact: true })}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                              {formatCurrency(projection.calculations.netIncome, { compact: true })}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                              {formatCurrency(projection.expenses, { compact: true })}
                            </td>
                            <td className={`px-3 py-2 whitespace-nowrap text-sm text-right ${
                              projection.savings >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(projection.savings, { compact: true })}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                              {formatCurrency(projection.netWorth, { compact: true })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {simulation.projections.length > 20 && (
                      <div className="text-center py-4 text-sm text-gray-500">
                        Visar första 20 åren av {simulation.projections.length} totalt
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Fyll i dina uppgifter för att se projektioner
                  </div>
                )}
              </div>
            )}

            {/* Calculations Tab */}
            {activeTab === 'calculations' && (
              <div className="space-y-6">
                {/* Tax Breakdown Chart */}
                {simulation.projections.length > 0 && (() => {
                  const currentProjection = simulation.projections[0];
                  if (!currentProjection) return null;
                  
                  const taxBreakdownData = [
                    {
                      label: 'Kommunalskatt',
                      value: currentProjection.calculations.municipalTax,
                      color: '#DC2626'
                    },
                    {
                      label: 'Statlig skatt',
                      value: currentProjection.calculations.stateTax,
                      color: '#7C2D12'
                    },
                    {
                      label: 'ISK-skatt',
                      value: currentProjection.calculations.iskTax,
                      color: '#B91C1C'
                    },
                    {
                      label: 'Pensionsavgift',
                      value: currentProjection.calculations.pensionFee,
                      color: '#991B1B'
                    }
                  ];
                  
                  return (
                    <InteractiveBarChart
                      data={taxBreakdownData}
                      title={`Skattefördelning ${formatSimulationYear(0, currentYear)}`}
                      height={200}
                      valueFormatter={(value) => formatCurrency(value)}
                    />
                  );
                })()}
                
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Beräkningsdetaljer</h3>
                
                {simulation.projections.length > 0 ? (
                  <div className="space-y-6">
                    {/* Current year detailed breakdown */}
                    {(() => {
                      const currentProjection = simulation.projections[0];
                      if (!currentProjection) return null;
                      
                      return (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-3">
                            Första årets beräkning ({formatSimulationYear(0, currentYear)})
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <h5 className="font-medium text-gray-700 mb-2">Inkomst</h5>
                              <div className="space-y-1 text-gray-600">
                                <div className="flex justify-between">
                                  <span>Bruttolön:</span>
                                  <span>{formatCurrency(currentProjection.calculations.grossIncome)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Pensionsavgift (7%):</span>
                                  <span className="text-red-600">-{formatCurrency(currentProjection.calculations.pensionFee)}</span>
                                </div>
                                <div className="flex justify-between font-medium">
                                  <span>Nettoinkomst:</span>
                                  <span>{formatCurrency(currentProjection.calculations.netIncome)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h5 className="font-medium text-gray-700 mb-2">Skatter</h5>
                              <div className="space-y-1 text-gray-600">
                                <div className="flex justify-between">
                                  <span>Kommunalskatt:</span>
                                  <span className="text-red-600">{formatCurrency(currentProjection.calculations.municipalTax)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Statlig skatt:</span>
                                  <span className="text-red-600">{formatCurrency(currentProjection.calculations.stateTax)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>ISK-skatt:</span>
                                  <span className="text-red-600">{formatCurrency(currentProjection.calculations.iskTax)}</span>
                                </div>
                                <div className="flex justify-between font-medium">
                                  <span>Total skatt:</span>
                                  <span className="text-red-600">{formatCurrency(currentProjection.calculations.totalTax)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex justify-between font-medium">
                              <span>Kassaflöde (sparande):</span>
                              <span className={currentProjection.calculations.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatCurrency(currentProjection.calculations.cashFlow)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Assumptions */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Antaganden</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <p><strong>Real avkastning ISK:</strong> 3,5% per år</p>
                          <p><strong>ISK-skatt:</strong> 0,888% per år (2025)</p>
                          <p><strong>Kommunalskatt:</strong> 32,41% (rikssnitt)</p>
                        </div>
                        <div>
                          <p><strong>Inflation:</strong> 2,0% per år</p>
                          <p><strong>Medellivslängd {simulation.inputs.profile.gender}:</strong> {simulation.inputs.profile.gender === 'man' ? '82,3' : '85,4'} år</p>
                          <p><strong>Valuta:</strong> Dagens penningvärde (SEK)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Kör simulationen för att se beräkningsdetaljer
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p className="mb-2">
              Svensk Livstidssimulator - Ett verktyg för privatekonomisk planering
            </p>
            <p className="mb-2">
              Baserat på svenska skatte- och pensionsregler för 2025
            </p>
            <p className="text-xs">
              ⚠️ Detta är ett planeringsverktyg och utgör inte finansiell rådgivning.
              Prognoser är osäkra och kan avvika från verkligheten.
            </p>
            {simulation.lastCalculated && (
              <p className="text-xs mt-2">
                Senast beräknad: {simulation.lastCalculated.toLocaleString('sv-SE')}
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;