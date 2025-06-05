import { formatCurrency, formatAge } from '../../utils/formatters';
import { InteractiveLineChart, MultiLineChart } from '../common/InteractiveCharts';

interface OverviewTabProps {
  summary: {
    retirementNetWorth: number;
    averageYearlySavings: number;
    yearsOfPositiveCashFlow: number;
    maxNetWorth: number;
    finalNetWorth: number;
    averageMonthlyPension: number;
    pensionCompensationRatio: number;
  };
  desiredRetirementAge: number;
  pensionWithdrawalAges: {
    generalPension: number;
    occupationalPension: number;
  };
  chartData: {
    netWorthData: Array<{ year: number; age: number; value: number; label: string }>;
    cashFlowData: Array<{ year: number; age: number; value: number; label: string }>;
    incomeExpenseData: Array<{ year: number; age: number; netIncome: number; expenses: number; label: string }>;
    pensionIncomeData: Array<{ year: number; age: number; general: number; occupational: number; private: number; total: number; label: string }>;
  };
}

export function OverviewTab({ summary, desiredRetirementAge, pensionWithdrawalAges, chartData }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="card">
          <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Nettoförmögenhet vid pension
          </h3>
          <p className="text-xl sm:text-2xl font-bold text-indigo-600">
            {formatCurrency(summary.retirementNetWorth, { compact: true })}
          </p>
          <p className="text-xs sm:text-sm text-gray-500">
            Vid {formatAge(desiredRetirementAge)}
          </p>
        </div>
        
        <div className="card">
          <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Genomsnittlig månadspension
          </h3>
          <p className="text-xl sm:text-2xl font-bold text-green-600">
            {formatCurrency(summary.averageMonthlyPension, { compact: true })}
          </p>
          <p className="text-xs sm:text-sm text-gray-500">
            {Math.round(summary.pensionCompensationRatio * 100)}% av slutlön
          </p>
        </div>
        
        <div className="card">
          <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Pensionsuttag startar
          </h3>
          <div className="space-y-1">
            <p className="text-base sm:text-lg font-semibold text-blue-600">
              Allmän: {formatAge(pensionWithdrawalAges.generalPension)}
            </p>
            {pensionWithdrawalAges.occupationalPension > 0 && (
              <p className="text-base sm:text-lg font-semibold text-green-600">
                Tjänste: {formatAge(pensionWithdrawalAges.occupationalPension)}
              </p>
            )}
          </div>
        </div>
        
        <div className="card">
          <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Genomsnittligt årligt sparande
          </h3>
          <p className="text-xl sm:text-2xl font-bold text-orange-600">
            {formatCurrency(summary.averageYearlySavings, { compact: true })}
          </p>
          <p className="text-xs sm:text-sm text-gray-500">
            Under {summary.yearsOfPositiveCashFlow} år
          </p>
        </div>
      </div>

      {/* Interactive Charts */}
      {chartData.netWorthData.length > 0 && (
        <div className="space-y-4 sm:space-y-6">
          {/* Net Worth Chart */}
          <InteractiveLineChart
            data={chartData.netWorthData}
            title="Nettoförmögenhet över tid"
            height={250}
            color="#4F46E5"
            fillColor="rgba(79, 70, 229, 0.1)"
            valueFormatter={(value) => formatCurrency(value, { compact: true })}
          />
          
          {/* Cash Flow Chart */}
          <InteractiveLineChart
            data={chartData.cashFlowData}
            title="Årligt sparande (kassaflöde)"
            height={220}
            color="#059669"
            fillColor="rgba(5, 150, 105, 0.1)"
            valueFormatter={(value) => formatCurrency(value, { compact: true })}
          />
          
          {/* Pension Income Chart */}
          <MultiLineChart
            datasets={[
              {
                label: 'Allmän pension',
                data: chartData.pensionIncomeData.map(d => ({
                  year: d.year,
                  age: d.age,
                  value: d.general * 12, // Convert to annual
                  label: d.label
                })),
                color: '#3B82F6',
                fillColor: 'rgba(59, 130, 246, 0.05)'
              },
              {
                label: 'Tjänstepension',
                data: chartData.pensionIncomeData.map(d => ({
                  year: d.year,
                  age: d.age,
                  value: d.occupational * 12, // Convert to annual
                  label: d.label
                })),
                color: '#10B981'
              },
              {
                label: 'Privat pension',
                data: chartData.pensionIncomeData.map(d => ({
                  year: d.year,
                  age: d.age,
                  value: d.private * 12, // Convert to annual
                  label: d.label
                })),
                color: '#8B5CF6'
              }
            ]}
            title="Pensionsinkomster över tid"
            height={250}
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
            height={250}
            valueFormatter={(value) => formatCurrency(value, { compact: true })}
          />
        </div>
      )}
    </div>
  );
}