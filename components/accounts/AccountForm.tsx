import React, { useState } from 'react';
import { useAccount } from '../../context/AccountContext';
import { BrokerAccount, BrokerAccountType } from '../../types';
import AuthInput from '../auth/AuthInput';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import SelectInput from '../ui/SelectInput';
import ToggleSwitch from '../ui/ToggleSwitch';

interface AccountFormProps {
  account: BrokerAccount | null;
  onSuccess: () => void;
}

const AccountForm: React.FC<AccountFormProps> = ({ account, onSuccess }) => {
  const { createAccount, updateAccount } = useAccount();
  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState<BrokerAccountType>(account?.type || BrokerAccountType.LIVE);
  const [initialBalance, setInitialBalance] = useState(account?.initialBalance || '');
  
  const [objectivesEnabled, setObjectivesEnabled] = useState(account?.objectives?.isEnabled || false);
  const [profitTarget, setProfitTarget] = useState(account?.objectives?.profitTarget ?? '');
  const [minTradingDays, setMinTradingDays] = useState(account?.objectives?.minTradingDays ?? '');
  const [maxLoss, setMaxLoss] = useState(account?.objectives?.maxLoss ?? '');
  const [maxDailyLoss, setMaxDailyLoss] = useState(account?.objectives?.maxDailyLoss ?? '');

  const [smartLimitsEnabled, setSmartLimitsEnabled] = useState(account?.smartLimits?.isEnabled || false);
  const [maxRiskPerTrade, setMaxRiskPerTrade] = useState(account?.smartLimits?.maxRiskPerTrade ?? '');
  const [maxTradesPerDay, setMaxTradesPerDay] = useState(account?.smartLimits?.maxTradesPerDay ?? '');
  const [maxLossesPerDay, setMaxLossesPerDay] = useState(account?.smartLimits?.maxLossesPerDay ?? '');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const balance = parseFloat(initialBalance as string);
    if (isNaN(balance)) {
      setError('Initial balance must be a valid number.');
      setIsLoading(false);
      return;
    }
    
    const baseObjectivesPayload = {
      profitTarget: profitTarget ? parseFloat(profitTarget as string) : null,
      minTradingDays: minTradingDays ? parseInt(minTradingDays as string, 10) : null,
      maxLoss: maxLoss ? parseFloat(maxLoss as string) : null,
      maxDailyLoss: maxDailyLoss ? parseFloat(maxDailyLoss as string) : null,
    };

    const baseSmartLimitsPayload = {
      maxRiskPerTrade: maxRiskPerTrade ? parseFloat(maxRiskPerTrade as string) : null,
      maxTradesPerDay: maxTradesPerDay ? parseInt(maxTradesPerDay as string, 10) : null,
      maxLossesPerDay: maxLossesPerDay ? parseInt(maxLossesPerDay as string, 10) : null,
    };

    try {
      if (account) {
        // UPDATE: Payload includes isEnabled
        const objectivesPayload = { isEnabled: objectivesEnabled, ...baseObjectivesPayload };
        const smartLimitsPayload = { isEnabled: smartLimitsEnabled, ...baseSmartLimitsPayload };
        await updateAccount(account.id, { name, type, initialBalance: balance, objectives: objectivesPayload as any, smartLimits: smartLimitsPayload as any });
      } else {
        // CREATE: Payload does NOT include isEnabled. Send undefined if not enabled.
        const objectivesPayload = objectivesEnabled ? baseObjectivesPayload : undefined;
        const smartLimitsPayload = smartLimitsEnabled ? baseSmartLimitsPayload : undefined;
        await createAccount({ name, type, initialBalance: balance, objectives: objectivesPayload as any, smartLimits: smartLimitsPayload as any });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <AuthInput
        label="Account Name"
        id="accountName"
        type="text"
        placeholder="e.g., FTMO Challenge"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <SelectInput
        label="Account Type"
        id="accountType"
        value={type}
        onChange={(e) => setType(e.target.value as BrokerAccountType)}
        options={[
          { value: BrokerAccountType.LIVE, label: 'Live' },
          { value: BrokerAccountType.DEMO, label: 'Demo' },
          { value: BrokerAccountType.PROP_FIRM, label: 'Prop Firm' },
        ]}
      />
      <AuthInput
        label="Initial Balance ($)"
        id="initialBalance"
        type="number"
        placeholder="e.g., 100000"
        value={initialBalance}
        onChange={(e) => setInitialBalance(e.target.value)}
        required
      />

      <div className="my-4 pt-4 border-t border-photonic-blue/20">
        <ToggleSwitch 
            label="Enable Trading Objectives (for Prop Firms)"
            checked={objectivesEnabled}
            onChange={setObjectivesEnabled}
        />
        {objectivesEnabled && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
                <AuthInput label="Profit Target ($)" id="profitTarget" type="number" placeholder="e.g., 8000" value={profitTarget} onChange={e => setProfitTarget(e.target.value)} />
                <AuthInput label="Min Trading Days" id="minTradingDays" type="number" placeholder="e.g., 5" value={minTradingDays} onChange={e => setMinTradingDays(e.target.value)} />
                <AuthInput label="Max Overall Loss ($)" id="maxLoss" type="number" placeholder="e.g., 5000" value={maxLoss} onChange={e => setMaxLoss(e.target.value)} />
                <AuthInput label="Max Daily Loss ($)" id="maxDailyLoss" type="number" placeholder="e.g., 2500" value={maxDailyLoss} onChange={e => setMaxDailyLoss(e.target.value)} />
            </div>
        )}
      </div>

       <div className="my-4 pt-4 border-t border-photonic-blue/20">
        <ToggleSwitch 
            label="Enable Smart Limits (Personal Rules)"
            checked={smartLimitsEnabled}
            onChange={setSmartLimitsEnabled}
        />
        {smartLimitsEnabled && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
                <AuthInput label="Max Risk per Trade (%)" id="maxRiskPerTrade" type="number" step="0.1" placeholder="e.g., 1" value={maxRiskPerTrade} onChange={e => setMaxRiskPerTrade(e.target.value)} />
                <AuthInput label="Max Trades per Day" id="maxTradesPerDay" type="number" placeholder="e.g., 3" value={maxTradesPerDay} onChange={e => setMaxTradesPerDay(e.target.value)} />
                <AuthInput label="Max Losses per Day" id="maxLossesPerDay" type="number" placeholder="e.g., 2" value={maxLossesPerDay} onChange={e => setMaxLossesPerDay(e.target.value)} />
            </div>
        )}
      </div>


      {error && <p className="text-risk-high text-sm text-center my-4">{error}</p>}
      <div className="mt-6">
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? <Spinner /> : (account ? 'Save Changes' : 'Create Account')}
        </Button>
      </div>
    </form>
  );
};

export default AccountForm;