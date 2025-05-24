import { Calculator, Download, Eye, EyeOff } from 'lucide-react';

interface HeaderProps {
  showCalculations: boolean;
  onToggleCalculations: () => void;
  onExportData: () => void;
  onResetToDefaults: () => void;
  lastCalculated?: Date | null;
}

export function Header({ 
  showCalculations, 
  onToggleCalculations, 
  onExportData, 
  onResetToDefaults
}: HeaderProps) {
  return (
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
              onClick={onToggleCalculations}
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
              onClick={onExportData}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="Exportera data"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={onResetToDefaults}
              className="btn-secondary"
            >
              Återställ
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}