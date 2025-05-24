import { Settings } from 'lucide-react';
import { UserProfileInputs } from './UserProfileInputs';
import { IncomeInputs } from './IncomeInputs';
import { ExpenseInputs } from './ExpenseInputs';
import { AssetInputs } from './AssetInputs';
import { PensionInputs } from './PensionInputs';

// Import types from the enhanced simulation
import { EnhancedSimulationInputs } from '../../types/pension';
import { 
  MVPUserProfile,
  MVPIncomeData,
  MVPExpenseData,
  MVPAssetData
} from '../../types';
import { PensionSettings } from '../../types/pension';

export interface SimulationInputs extends EnhancedSimulationInputs {}

interface InputPanelProps {
  inputs: SimulationInputs;
  onUpdateProfile: (updates: Partial<MVPUserProfile>) => void;
  onUpdateIncome: (updates: Partial<MVPIncomeData>) => void;
  onUpdateExpenses: (updates: Partial<MVPExpenseData>) => void;
  onUpdateAssets: (updates: Partial<MVPAssetData>) => void;
  onUpdatePensions: (pensions: PensionSettings) => void;
}

export function InputPanel({
  inputs,
  onUpdateProfile,
  onUpdateIncome,
  onUpdateExpenses,
  onUpdateAssets,
  onUpdatePensions
}: InputPanelProps) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
        <Settings className="h-5 w-5 mr-2" />
        Dina uppgifter
      </h2>
      
      <div className="space-y-6">
        <UserProfileInputs 
          profile={inputs.profile}
          onUpdate={onUpdateProfile}
        />
        
        <IncomeInputs 
          income={inputs.income}
          onUpdate={onUpdateIncome}
        />
        
        <ExpenseInputs 
          expenses={inputs.expenses}
          onUpdate={onUpdateExpenses}
        />
        
        <AssetInputs 
          assets={inputs.assets}
          onUpdate={onUpdateAssets}
        />
        
        <PensionInputs 
          pensions={inputs.pensions}
          onUpdate={onUpdatePensions}
          userAge={inputs.profile.currentAge}
        />
      </div>
    </div>
  );
}