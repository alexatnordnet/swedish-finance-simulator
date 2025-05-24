interface Expenses {
  monthlyLiving: number;
}

interface ExpenseInputsProps {
  expenses: Expenses;
  onUpdate: (updates: Partial<Expenses>) => void;
}

export function ExpenseInputs({ expenses, onUpdate }: ExpenseInputsProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-700">Utgifter</h3>
      
      <div>
        <label className="label">Levnadskostnader per månad (kr)</label>
        <input
          type="number"
          value={expenses.monthlyLiving}
          onChange={(e) => onUpdate({ 
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
  );
}