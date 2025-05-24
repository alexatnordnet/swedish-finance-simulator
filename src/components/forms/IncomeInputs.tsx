interface Income {
  monthlySalary: number;
  realSalaryGrowth: number;
}

interface IncomeInputsProps {
  income: Income;
  onUpdate: (updates: Partial<Income>) => void;
}

export function IncomeInputs({ income, onUpdate }: IncomeInputsProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-700">Inkomst</h3>
      
      <div>
        <label className="label">Bruttolön per månad (kr)</label>
        <input
          type="number"
          value={income.monthlySalary}
          onChange={(e) => onUpdate({ 
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
          value={(income.realSalaryGrowth * 100).toFixed(1)}
          onChange={(e) => onUpdate({ 
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
  );
}