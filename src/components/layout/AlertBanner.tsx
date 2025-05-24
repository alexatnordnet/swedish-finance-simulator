import { AlertTriangle, Info } from 'lucide-react';

interface AlertBannerProps {
  errors: string[];
  warnings: string[];
}

export function AlertBanner({ errors, warnings }: AlertBannerProps) {
  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {errors.map((error, index) => (
        <div key={index} className="mb-2 bg-red-50 border border-red-200 rounded-md p-3 flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
          <span className="text-red-800">{error}</span>
        </div>
      ))}
      {warnings.map((warning, index) => (
        <div key={index} className="mb-2 bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-center">
          <Info className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
          <span className="text-yellow-800">{warning}</span>
        </div>
      ))}
    </div>
  );
}