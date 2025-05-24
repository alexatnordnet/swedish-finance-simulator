// ============================================================================
// PENSION INPUT FORM COMPONENT
// Component for managing pension accounts and withdrawal settings
// ============================================================================

import { useState } from 'react';
import { Plus, Trash2, Edit3, Calculator, Info, HelpCircle } from 'lucide-react';
import { PensionAccount, PensionSettings, PENSION_ACCOUNT_TEMPLATES } from '../../types/pension';
import { formatCurrency, formatAge } from '../../utils/formatters';
import { CurrencyInput, AgeInput } from '../common/InputField';

interface PensionFormProps {
  pensions: PensionSettings;
  onUpdate: (pensions: PensionSettings) => void;
  className?: string;
}

export function PensionForm({ pensions, onUpdate, className = '' }: PensionFormProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);

  const addAccount = (template: keyof typeof PENSION_ACCOUNT_TEMPLATES) => {
    const templateData = PENSION_ACCOUNT_TEMPLATES[template];
    const newAccount: PensionAccount = {
      id: Date.now().toString(),
      currentValue: 0,
      ...templateData,
      withdrawalSettings: {
        startAge: templateData.earliestWithdrawalAge + 10, // Default to reasonable age
        monthlyAmount: 0,
        isPercentage: false,
        isLifelong: true
      }
    };

    onUpdate({
      ...pensions,
      accounts: [...pensions.accounts, newAccount]
    });
    setShowAddForm(false);
  };

  const updateAccount = (accountId: string, updates: Partial<PensionAccount>) => {
    onUpdate({
      ...pensions,
      accounts: pensions.accounts.map(account => 
        account.id === accountId ? { ...account, ...updates } : account
      )
    });
  };

  const removeAccount = (accountId: string) => {
    onUpdate({
      ...pensions,
      accounts: pensions.accounts.filter(account => account.id !== accountId)
    });
  };

  const updateGeneralPension = (updates: Partial<PensionSettings['generalPension']>) => {
    onUpdate({
      ...pensions,
      generalPension: { ...pensions.generalPension, ...updates }
    });
  };

  const estimateMonthlyPension = (account: PensionAccount): number => {
    if (account.expectedMonthlyPension) return account.expectedMonthlyPension;
    
    // Simple estimation: 4% annual withdrawal rate
    const annualWithdrawal = account.currentValue * 0.04;
    return annualWithdrawal / 12;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* General Pension */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calculator className="h-5 w-5 mr-2 text-blue-600" />
          Allmän pension
          <button className="ml-2 text-gray-400 hover:text-gray-600" title="Information från Pensionsmyndigheten">
            <HelpCircle className="h-4 w-4" />
          </button>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CurrencyInput
            label="Nuvarande inkomstpension"
            value={pensions.generalPension.currentInkomstpension}
            onChange={(value) => updateGeneralPension({ currentInkomstpension: value })}
            helpText="Finns i ditt orange kuvert eller på MinaPensioner.se"
          />
          
          <CurrencyInput
            label="Nuvarande premiepension (PPM)"
            value={pensions.generalPension.currentPremiepension}
            onChange={(value) => updateGeneralPension({ currentPremiepension: value })}
            helpText="Värde på dina PPM-fonder"
          />
          
          <CurrencyInput
            label="Uppskattat månatligt belopp"
            value={pensions.generalPension.estimatedMonthlyAmount}
            onChange={(value) => updateGeneralPension({ estimatedMonthlyAmount: value })}
            helpText="Beräknat månadsbelopp från Pensionsmyndigheten"
          />
          
          <AgeInput
            label="Önskad startålder för allmän pension"
            value={pensions.generalPension.withdrawalStartAge}
            onChange={(value) => updateGeneralPension({ withdrawalStartAge: value })}
            min={62}
            max={70}
            helpText="Tidigast 3 år före riktålder"
          />
        </div>
      </div>

      {/* Pension Accounts */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calculator className="h-5 w-5 mr-2 text-green-600" />
            Tjänste- och privat pension
          </h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Lägg till
          </button>
        </div>

        {/* Add Account Form */}
        {showAddForm && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium text-gray-900 mb-3">Välj typ av pension</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(PENSION_ACCOUNT_TEMPLATES).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => addAccount(key as keyof typeof PENSION_ACCOUNT_TEMPLATES)}
                  className="p-3 text-left border border-gray-200 rounded-md hover:border-indigo-300 hover:bg-white transition-colors"
                >
                  <div className="font-medium text-gray-900">{template.name}</div>
                  <div className="text-sm text-gray-500">{template.provider}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Uttag från {template.earliestWithdrawalAge} år
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddForm(false)}
              className="mt-3 text-sm text-gray-600 hover:text-gray-800"
            >
              Avbryt
            </button>
          </div>
        )}

        {/* Existing Accounts */}
        {pensions.accounts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calculator className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Inga pensionskonton tillagda ännu</p>
            <p className="text-sm">Klicka "Lägg till" för att börja</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pensions.accounts.map((account) => (
              <div key={account.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{account.name}</h4>
                    <p className="text-sm text-gray-600">{account.provider}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingAccount(editingAccount === account.id ? null : account.id)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Redigera"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeAccount(account.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Ta bort"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {editingAccount === account.id ? (
                  /* Edit Mode */
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CurrencyInput
                        label="Nuvarande värde"
                        value={account.currentValue}
                        onChange={(value) => updateAccount(account.id, { currentValue: value })}
                      />
                      
                      {account.type === 'tjänste' && (
                        <CurrencyInput
                          label="Uppskattat månatligt belopp"
                          value={account.expectedMonthlyPension || 0}
                          onChange={(value) => updateAccount(account.id, { expectedMonthlyPension: value })}
                          helpText="Om känt från pensionsbolag"
                        />
                      )}
                    </div>

                    <div className="border-t pt-4">
                      <h5 className="font-medium text-gray-700 mb-3">Uttagsinställningar</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <AgeInput
                          label="Startålder för uttag"
                          value={account.withdrawalSettings.startAge}
                          onChange={(value) => updateAccount(account.id, {
                            withdrawalSettings: { ...account.withdrawalSettings, startAge: value }
                          })}
                          min={account.earliestWithdrawalAge}
                          max={account.latestWithdrawalAge}
                        />
                        
                        <CurrencyInput
                          label="Månadsbelopp"
                          value={account.withdrawalSettings.monthlyAmount}
                          onChange={(value) => updateAccount(account.id, {
                            withdrawalSettings: { ...account.withdrawalSettings, monthlyAmount: value }
                          })}
                          helpText="0 = beräknas automatiskt"
                        />

                        <div>
                          <label className="label">Uttagstyp</label>
                          <select
                            value={account.withdrawalSettings.isLifelong ? 'lifelong' : 'until_depleted'}
                            onChange={(e) => updateAccount(account.id, {
                              withdrawalSettings: { 
                                ...account.withdrawalSettings, 
                                isLifelong: e.target.value === 'lifelong' 
                              }
                            })}
                            className="input-field"
                          >
                            <option value="lifelong">Livsvarigt</option>
                            <option value="until_depleted">Tills kapitalet tar slut</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Nuvarande värde</div>
                      <div className="font-medium">{formatCurrency(account.currentValue, { compact: true })}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Uppskattat/månad</div>
                      <div className="font-medium text-green-600">
                        {formatCurrency(estimateMonthlyPension(account))}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Startålder</div>
                      <div className="font-medium">{formatAge(account.withdrawalSettings.startAge)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Typ</div>
                      <div className="font-medium capitalize">{account.type}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {pensions.accounts.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Sammanfattning</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Totalt pensionskapital</div>
                <div className="text-lg font-semibold text-blue-600">
                  {formatCurrency(
                    pensions.generalPension.currentInkomstpension + 
                    pensions.generalPension.currentPremiepension +
                    pensions.accounts.reduce((sum, acc) => sum + acc.currentValue, 0),
                    { compact: true }
                  )}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Uppskattad total månadspension</div>
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(
                    pensions.generalPension.estimatedMonthlyAmount +
                    pensions.accounts.reduce((sum, acc) => sum + estimateMonthlyPension(acc), 0)
                  )}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Antal pensionskonton</div>
                <div className="text-lg font-semibold text-gray-900">
                  {pensions.accounts.length + 1} st
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper component for quick pension estimation
export function PensionEstimator({ currentAge, salary }: { currentAge: number; salary: number }) {
  const workingYears = 65 - currentAge;
  const estimatedGeneralPension = salary * 0.6 * (workingYears / 40); // Rough estimation
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center mb-2">
        <Info className="h-5 w-5 text-yellow-600 mr-2" />
        <h4 className="font-medium text-yellow-800">Snabbuppskattning</h4>
      </div>
      <p className="text-sm text-yellow-700 mb-2">
        Baserat på {workingYears} år kvar till pension och nuvarande lön:
      </p>
      <div className="text-lg font-semibold text-yellow-800">
        ~{formatCurrency(estimatedGeneralPension)} per månad
      </div>
      <p className="text-xs text-yellow-600 mt-1">
        Detta är en grov uppskattning. Kontrollera med Pensionsmyndigheten för exakta siffror.
      </p>
    </div>
  );
}