import { Calculator, Download } from 'lucide-react';

interface HeaderProps {
  onExportData: () => void;
  onResetToDefaults: () => void;
  lastCalculated?: Date | null;
  hasLocalStorageSupport?: boolean;
}

export function Header({ 
  onExportData, 
  onResetToDefaults,
  lastCalculated,
  hasLocalStorageSupport = false
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
            
            {/* Auto-save indicator */}
            {hasLocalStorageSupport && lastCalculated && (
              <div className="text-xs text-gray-400">
                Automatiskt sparad: {lastCalculated.toLocaleString('sv-SE')}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}