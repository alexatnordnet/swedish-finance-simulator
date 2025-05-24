interface PensionAccount {
  id: string;
  name: string;
  currentValue: number;
  expectedMonthlyPension?: number;
  provider: string;
  type: 'allmän' | 'tjänste' | 'privat';
  canChooseWithdrawalAge: boolean;
  earliestWithdrawalAge: number;
  latestWithdrawalAge: number;
  withdrawalSettings: {
    startAge: number;
    monthlyAmount: number;
    isPercentage: boolean;
    isLifelong: boolean;
  };
}

interface Pensions {
  generalPension: {
    currentInkomstpension: number;
    currentPremiepension: number;
    estimatedMonthlyAmount: number;
    withdrawalStartAge: number;
  };
  accounts: PensionAccount[];
}

interface PensionInputsProps {
  pensions: Pensions;
  onUpdate: (pensions: Pensions) => void;
  userAge: number;
}

export function PensionInputs({ pensions, onUpdate, userAge }: PensionInputsProps) {
  const handleTjänstePensionChange = (monthlyAmount: number) => {
    const currentAccounts = pensions.accounts.filter(acc => acc.type !== 'tjänste');
    
    if (monthlyAmount > 0) {
      const existingAccount = pensions.accounts.find(acc => acc.type === 'tjänste');
      const tjänsteAccount: PensionAccount = {
        id: 'tjanste-main',
        name: 'Tjänstepension',
        currentValue: 0,
        expectedMonthlyPension: monthlyAmount,
        provider: 'Tjänstepensionsbolag',
        type: 'tjänste',
        canChooseWithdrawalAge: true,
        earliestWithdrawalAge: 55,
        latestWithdrawalAge: 70,
        withdrawalSettings: {
          startAge: existingAccount?.withdrawalSettings.startAge || 65,
          monthlyAmount: monthlyAmount,
          isPercentage: false,
          isLifelong: true
        }
      };
      currentAccounts.push(tjänsteAccount);
    }
    
    onUpdate({
      ...pensions,
      accounts: currentAccounts
    });
  };

  const handleTjänstePensionAgeChange = (startAge: number) => {
    const currentAccounts = pensions.accounts.filter(acc => acc.type !== 'tjänste');
    const existingAccount = pensions.accounts.find(acc => acc.type === 'tjänste');
    
    if (existingAccount) {
      const updatedAccount: PensionAccount = {
        ...existingAccount,
        withdrawalSettings: {
          ...existingAccount.withdrawalSettings,
          startAge: startAge
        }
      };
      currentAccounts.push(updatedAccount);
      
      onUpdate({
        ...pensions,
        accounts: currentAccounts
      });
    }
  };

  const tjänstePensionAccount = pensions.accounts.find(acc => acc.type === 'tjänste');

  // Beräkna riktålder baserat på födelseår (förenklad)
  const birthYear = new Date().getFullYear() - userAge;
  const getRiktålder = (birthYear: number): number => {
    if (birthYear <= 1959) return 66;
    if (birthYear <= 1966) return 67;
    if (birthYear <= 1980) return 68;
    if (birthYear <= 1996) return 69;
    if (birthYear <= 2014) return 70;
    return 71;
  };

  const riktålder = getRiktålder(birthYear);
  const earliestGeneralPensionAge = Math.max(61, riktålder - 3); // Tidigast 3 år före riktålder, men inte före 61

  return (
    <div className="space-y-6">
      <h3 className="font-medium text-gray-700">Pension</h3>
      
      {/* Allmän pension */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <h4 className="font-medium text-gray-800 flex items-center">
          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
          Allmän pension
        </h4>
        
        <div>
          <label className="label">Månadsbelopp (kr)</label>
          <input
            type="number"
            value={pensions.generalPension.estimatedMonthlyAmount}
            onChange={(e) => onUpdate({
              ...pensions,
              generalPension: {
                ...pensions.generalPension,
                estimatedMonthlyAmount: parseInt(e.target.value) || 0
              }
            })}
            className="input-field"
            min="0"
            step="1000"
          />
          <p className="text-xs text-gray-500 mt-1">
            Uppskattad månadspension från allmän pension (inkomst- + premiepension)
          </p>
        </div>

        <div>
          <label className="label">Uttagsålder</label>
          <select
            value={pensions.generalPension.withdrawalStartAge}
            onChange={(e) => onUpdate({
              ...pensions,
              generalPension: {
                ...pensions.generalPension,
                withdrawalStartAge: parseInt(e.target.value)
              }
            })}
            className="input-field"
          >
            {Array.from({ length: 10 }, (_, i) => earliestGeneralPensionAge + i).map(age => (
              <option key={age} value={age}>
                {age} år {age === riktålder ? '(riktålder)' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Tidigast {earliestGeneralPensionAge} år. Din riktålder är {riktålder} år (född {birthYear}).
          </p>
        </div>
      </div>
      
      {/* Tjänstepension */}
      <div className="bg-green-50 p-4 rounded-lg space-y-4">
        <h4 className="font-medium text-gray-800 flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          Tjänstepension
        </h4>
        
        <div>
          <label className="label">Månadsbelopp (kr)</label>
          <input
            type="number"
            value={tjänstePensionAccount?.expectedMonthlyPension || 0}
            onChange={(e) => handleTjänstePensionChange(parseInt(e.target.value) || 0)}
            className="input-field"
            min="0"
            step="1000"
          />
          <p className="text-xs text-gray-500 mt-1">
            Uppskattad månadspension från tjänstepension (ITP, SAF-LO, etc.)
          </p>
        </div>

        {tjänstePensionAccount && (tjänstePensionAccount.expectedMonthlyPension || 0) > 0 && (
          <div>
            <label className="label">Uttagsålder</label>
            <select
              value={tjänstePensionAccount.withdrawalSettings.startAge}
              onChange={(e) => handleTjänstePensionAgeChange(parseInt(e.target.value))}
              className="input-field"
            >
              {Array.from({ length: 16 }, (_, i) => 55 + i).map(age => (
                <option key={age} value={age}>
                  {age} år
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Tjänstepension kan vanligtvis tas ut från 55 år
            </p>
          </div>
        )}
      </div>

      {/* Information om pensionsuttag */}
      <div className="bg-yellow-50 p-3 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Viktigt om pensionsuttag
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Tidigareläggning av allmän pension minskar månadsbeloppet</li>
                <li>Senareläggning ökar månadsbeloppet (upp till 67-72 år beroende på riktålder)</li>
                <li>Tjänstepension kan ofta tas ut oberoende av allmän pension</li>
                <li>Kontrollera alltid dina faktiska pensionsvillkor hos respektive pensionsbolag</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}