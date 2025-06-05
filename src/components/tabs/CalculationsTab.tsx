import { formatCurrency, formatSimulationYear } from '../../utils/formatters';
import { InteractiveBarChart } from '../common/InteractiveCharts';
import { useState } from 'react';

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
  age: number;
  salary: number;
  expenses: number;
  savings: number;
  netWorth: number;
  calculations: CalculationDetails;
  pensionIncome?: {
    generalPension: number;
    occupationalPension: number;
    privatePension: number;
    total: number;
  };
  pensionCapital?: {
    general: number;
    occupational: number;
    private: number;
    total: number;
  };
}

interface CalculationsTabProps {
  projections: Projection[];
  currentYear: number;
  gender: 'man' | 'kvinna';
}

export function CalculationsTab({ projections, currentYear, gender }: CalculationsTabProps) {
  const [selectedYearIndex, setSelectedYearIndex] = useState(0);
  const selectedProjection = projections[selectedYearIndex] || projections[0];

  return (
    <div className="space-y-6">
      {/* Tax Breakdown Chart */}
      {selectedProjection && (
        <InteractiveBarChart
          data={[
            {
              label: 'Kommunalskatt',
              value: selectedProjection.calculations.municipalTax,
              color: '#DC2626'
            },
            {
              label: 'Statlig skatt',
              value: selectedProjection.calculations.stateTax,
              color: '#7C2D12'
            },
            {
              label: 'ISK-skatt',
              value: selectedProjection.calculations.iskTax,
              color: '#B91C1C'
            },
            {
              label: 'Pensionsavgift',
              value: selectedProjection.calculations.pensionFee,
              color: '#991B1B'
            }
          ]}
          title={`Skattefördelning ${formatSimulationYear(selectedProjection.year, currentYear)}`}
          height={200}
          valueFormatter={(value) => formatCurrency(value)}
        />
      )}
      
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Beräkningsdetaljer</h3>
          
          {/* Year Selector */}
          {projections.length > 1 && (
            <div className="flex items-center space-x-2">
              <label htmlFor="year-select" className="text-sm text-gray-600">
                Visa år:
              </label>
              <select
                id="year-select"
                value={selectedYearIndex}
                onChange={(e) => setSelectedYearIndex(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {projections.map((projection, index) => (
                  <option key={index} value={index}>
                    {formatSimulationYear(projection.year, currentYear)} (ålder {projection.age})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      
        {projections.length > 0 ? (
          <div className="space-y-6">
            {/* Selected year detailed breakdown */}
            {selectedProjection && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">
                  Beräkning för {formatSimulationYear(selectedProjection.year, currentYear)} (ålder {selectedProjection.age})
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Inkomst</h5>
                    <div className="space-y-1 text-gray-600">
                      <div className="flex justify-between">
                        <span>Bruttolön:</span>
                        <span>{formatCurrency(selectedProjection.salary)}</span>
                      </div>
                      {selectedProjection.pensionIncome && selectedProjection.pensionIncome.total > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span>Allmän pension:</span>
                            <span className="text-purple-600">{formatCurrency(selectedProjection.pensionIncome.generalPension * 12)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tjänstepension:</span>
                            <span className="text-purple-600">{formatCurrency(selectedProjection.pensionIncome.occupationalPension * 12)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Privat pension:</span>
                            <span className="text-purple-600">{formatCurrency(selectedProjection.pensionIncome.privatePension * 12)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between font-medium border-t border-gray-300 pt-1">
                        <span>Total bruttoinkomst:</span>
                        <span>{formatCurrency(selectedProjection.calculations.grossIncome)}</span>
                      </div>
                      <div className="flex justify-between font-medium text-green-600 border-t border-gray-300 pt-1">
                        <span>Nettoinkomst (efter alla skatter):</span>
                        <span>{formatCurrency(selectedProjection.calculations.netIncome)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Skatter & Avgifter</h5>
                    <div className="space-y-1 text-gray-600">
                      <div className="flex justify-between">
                        <span>Kommunalskatt:</span>
                        <span className="text-red-600">{formatCurrency(selectedProjection.calculations.municipalTax)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Statlig skatt:</span>
                        <span className="text-red-600">{formatCurrency(selectedProjection.calculations.stateTax)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ISK-skatt:</span>
                        <span className="text-red-600">{formatCurrency(selectedProjection.calculations.iskTax)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pensionsavgift:</span>
                        <span className="text-red-600">{formatCurrency(selectedProjection.calculations.pensionFee)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t border-gray-300 pt-1">
                        <span>Totala skatter & avgifter:</span>
                        <span className="text-red-600">{formatCurrency(selectedProjection.calculations.totalTax)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Utgifter & Sparande</h5>
                    <div className="space-y-1 text-gray-600">
                      <div className="flex justify-between">
                        <span>Levnadskostnader:</span>
                        <span className="text-orange-600">{formatCurrency(selectedProjection.expenses)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t border-gray-300 pt-1">
                        <span>Disponibel inkomst:</span>
                        <span>{formatCurrency(selectedProjection.calculations.netIncome - selectedProjection.expenses)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Sparande/Kassaflöde:</span>
                        <span className={selectedProjection.calculations.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(selectedProjection.calculations.cashFlow)}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Nettoförmögenhet:</span>
                        <span className="text-blue-600">{formatCurrency(selectedProjection.netWorth)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    <h5 className="font-medium text-gray-700 mb-2">Sammanfattning</h5>
                    <div className="bg-white p-3 rounded border">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500">Inkomst efter skatt</div>
                          <div className="font-medium text-green-600">{formatCurrency(selectedProjection.calculations.netIncome)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Totala utgifter</div>
                          <div className="font-medium text-orange-600">{formatCurrency(selectedProjection.expenses)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Sparkvot</div>
                          <div className="font-medium">
                            {selectedProjection.calculations.netIncome > 0 
                              ? `${((selectedProjection.calculations.cashFlow / selectedProjection.calculations.netIncome) * 100).toFixed(1)}%`
                              : '0%'
                            }
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Effektiv skattesats</div>
                          <div className="font-medium">
                            {selectedProjection.calculations.grossIncome > 0 
                              ? `${((selectedProjection.calculations.totalTax / selectedProjection.calculations.grossIncome) * 100).toFixed(1)}%`
                              : '0%'
                            }
                          </div>
                        </div>
                      </div>
                    </div>
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
                  <p><strong>Inflation:</strong> 0,0% (real prognosmodell)</p>
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