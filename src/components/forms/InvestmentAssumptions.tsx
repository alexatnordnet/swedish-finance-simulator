import { TrendingUp, Info } from 'lucide-react';

export interface InvestmentRates {
  liquidSavingsRate: number; // Expected return on bank accounts/cash
  iskAccountRate: number; // Expected return on ISK account investments
}

interface InvestmentAssumptionsProps {
  rates: InvestmentRates;
  onUpdate: (updates: Partial<InvestmentRates>) => void;
}

export function InvestmentAssumptions({ rates, onUpdate }: InvestmentAssumptionsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        <h3 className="font-medium text-gray-700">Förväntad avkastning</h3>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Realavkastning (efter inflation)</p>
            <p>Ange förväntad årlig avkastning efter inflation. Standardvärden baseras på Pensionsmyndighetens prognosantaganden.</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="label">
            Likvida medel / Sparkonto (% per år)
            <span className="text-sm text-gray-500 ml-2">Rekommenderat: 0-1%</span>
          </label>
          <input
            type="number"
            value={Number((rates.liquidSavingsRate * 100).toFixed(1))}
            onChange={(e) => onUpdate({ 
              liquidSavingsRate: (parseFloat(e.target.value) || 0) / 100
            })}
            className="input-field"
            min="-10"
            max="20"
            step="0.1"
            placeholder="0.5"
          />
          <p className="text-xs text-gray-500 mt-1">
            Bankränta på sparkonto minus inflation. Ofta nära noll eller negativ.
          </p>
        </div>
        
        <div>
          <label className="label">
            ISK-konto / Aktier och fonder (% per år)
            <span className="text-sm text-gray-500 ml-2">Rekommenderat: 3-5%</span>
          </label>
          <input
            type="number"
            value={Number((rates.iskAccountRate * 100).toFixed(1))}
            onChange={(e) => onUpdate({ 
              iskAccountRate: (parseFloat(e.target.value) || 0) / 100
            })}
            className="input-field"
            min="-50"
            max="50"
            step="0.1"
            placeholder="3.5"
          />
          <p className="text-xs text-gray-500 mt-1">
            Förväntad realavkastning på aktier och fonder efter avgifter och inflation.
          </p>
        </div>
      </div>
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h4 className="font-medium text-gray-700 mb-2">Referensvärden (realavkastning)</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Aktier (långsiktigt):</span>
            <span className="font-mono">4,5%</span>
          </div>
          <div className="flex justify-between">
            <span>Blandportfölj (75/25):</span>
            <span className="font-mono">3,5%</span>
          </div>
          <div className="flex justify-between">
            <span>Räntebärande:</span>
            <span className="font-mono">0,5%</span>
          </div>
          <div className="flex justify-between">
            <span>Bankkonto:</span>
            <span className="font-mono">0,0%</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Källa: Pensionsmyndighetens prognosstandard för långsiktiga antaganden
        </p>
      </div>
    </div>
  );
}