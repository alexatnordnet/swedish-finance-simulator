import { formatCurrency, formatAge, formatSimulationYear } from '../../utils/formatters';

interface Projection {
  year: number;
  age: number;
  salary: number;
  pensionIncome?: {
    total: number;
  };
  calculations: {
    netIncome: number;
  };
  expenses: number;
  savings: number;
  netWorth: number;
}

interface ProjectionsTabProps {
  projections: Projection[];
  isCalculating: boolean;
  desiredRetirementAge: number;
  currentYear: number;
}

export function ProjectionsTab({ 
  projections, 
  isCalculating, 
  desiredRetirementAge, 
  currentYear 
}: ProjectionsTabProps) {
  if (isCalculating) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Beräknar...</p>
        </div>
      </div>
    );
  }

  if (projections.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Årliga projektioner</h3>
        <div className="text-center py-8 text-gray-500">
          Fyll i dina uppgifter för att se projektioner
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Årliga projektioner</h3>
      
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
                Pensionsinkomst
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
            {projections.slice(0, 20).map((projection) => (
              <tr key={projection.year} className={
                projection.age === desiredRetirementAge 
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
                <td className="px-3 py-2 whitespace-nowrap text-sm text-purple-600 text-right">
                  {formatCurrency((projection.pensionIncome?.total || 0) * 12, { compact: true })}
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
        
        {projections.length > 20 && (
          <div className="text-center py-4 text-sm text-gray-500">
            Visar första 20 åren av {projections.length} totalt
          </div>
        )}
      </div>
    </div>
  );
}