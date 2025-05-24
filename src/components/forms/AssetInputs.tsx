interface Assets {
  liquidSavings: number;
  iskAccount: number;
}

interface AssetInputsProps {
  assets: Assets;
  onUpdate: (updates: Partial<Assets>) => void;
}

export function AssetInputs({ assets, onUpdate }: AssetInputsProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-700">Tillgångar</h3>
      
      <div>
        <label className="label">Likvida medel (kr)</label>
        <input
          type="number"
          value={assets.liquidSavings}
          onChange={(e) => onUpdate({ 
            liquidSavings: parseInt(e.target.value) || 0 
          })}
          className="input-field"
          min="0"
          step="10000"
        />
      </div>
      
      <div>
        <label className="label">ISK-konto (kr)</label>
        <input
          type="number"
          value={assets.iskAccount}
          onChange={(e) => onUpdate({ 
            iskAccount: parseInt(e.target.value) || 0 
          })}
          className="input-field"
          min="0"
          step="10000"
        />
      </div>
    </div>
  );
}