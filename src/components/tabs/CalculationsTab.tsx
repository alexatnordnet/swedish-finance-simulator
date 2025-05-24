import { formatCurrency, formatSimulationYear } from '../../utils/formatters';
import { InteractiveBarChart } from '../common/InteractiveCharts';

interface CalculationDetails {
  grossIncome: number;
  pensionFee: number;
  netIncome: number;
  municipalTax: number;
  stateTax: number;
  iskTax: number;
  totalTax: number;
  cashFlow: number;
}

interface Projection {
  year: number;
  calculations: CalculationDetails;
}

interface CalculationsTabProps {
  projections: Projection[];
  currentYear: number;
  gender: 'man' | 'kvinna';
}

export function CalculationsTab({ projections, currentYear, gender }: CalculationsTabProps) {
  const firstProjection = projections[0];

  return (
    <div className="space-y-6">
      {/* Tax Breakdown Chart */}
      {firstProjection && (
        <InteractiveBarChart
          data={[
            {
              label: 'Kommunalskatt',
              value: firstProjection.calculations.municipalTax,
              color: '#DC2626'
            },
            {
              label: 'Statlig skatt',
              value: firstProjection.calculations.stateTax,
              color: '#7C2D12'
            },
            {
              label: 'ISK-skatt',
              value: firstProjection.calculations.iskTax,
              color: '#B91C1C'
            },
            {
              label: 'Pensionsavgift',
              value: firstProjection.calculations.pensionFee,
              color: '#991B1B'
            }
          ]}
          title={`Skattefördelning ${formatSimulationYear(0, currentYear)}`}
          height={200}
          valueFormatter={(value) => formatCurrency(value)}
        />
      )}
      
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Beräkningsdetaljer</h3>
      
        {projections.length > 0 ? (
          <div className="space-y-6">
            {/* Current year detailed breakdown */}
            {firstProjection && (
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
                        <span>{formatCurrency(firstProjection.calculations.grossIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pensionsavgift (7%):</span>
                        <span className="text-red-600">-{formatCurrency(firstProjection.calculations.pensionFee)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Nettoinkomst:</span>
                        <span>{formatCurrency(firstProjection.calculations.netIncome)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Skatter</h5>
                    <div className="space-y-1 text-gray-600">
                      <div className="flex justify-between">
                        <span>Kommunalskatt:</span>
                        <span className="text-red-600">{formatCurrency(firstProjection.calculations.municipalTax)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Statlig skatt:</span>
                        <span className="text-red-600">{formatCurrency(firstProjection.calculations.stateTax)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ISK-skatt:</span>
                        <span className="text-red-600">{formatCurrency(firstProjection.calculations.iskTax)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Total skatt:</span>
                        <span className="text-red-600">{formatCurrency(firstProjection.calculations.totalTax)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between font-medium">
                    <span>Kassaflöde (sparande):</span>
                    <span className={firstProjection.calculations.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(firstProjection.calculations.cashFlow)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
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
                  <p><strong>Medellivslängd {gender}:</strong> {gender === 'man' ? '82,3' : '85,4'} år</p>
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
  );
}