
import React, { useState } from 'react';
import { useAccount } from '../../context/AccountContext';
import { BrokerAccount, BrokerAccountType, FeeModel } from '../../types';
import Input from '../ui/Input';
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
  const [currency, setCurrency] = useState(account?.currency || 'USD');
  const [leverage, setLeverage] = useState(account?.leverage || '');
  const [feeModel, setFeeModel] = useState<FeeModel>(account?.feeModel || FeeModel.SPREAD_ONLY);
  
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
    
    const accountPayload = {
      name,
      type,
      initialBalance: balance,
      currency,
      leverage: leverage ? parseInt(leverage as string, 10) : null,
      feeModel,
    };

    try {
      if (account) {
        const objectivesPayload = { isEnabled: objectivesEnabled, ...baseObjectivesPayload };
        const smartLimitsPayload = { isEnabled: smartLimitsEnabled, ...baseSmartLimitsPayload };
        await updateAccount(account.id, { ...accountPayload, objectives: objectivesPayload as any, smartLimits: smartLimitsPayload as any });
      } else {
        const objectivesPayload = objectivesEnabled ? baseObjectivesPayload : undefined;
        const smartLimitsPayload = smartLimitsEnabled ? baseSmartLimitsPayload : undefined;
        await createAccount({ ...accountPayload, objectives: objectivesPayload as any, smartLimits: smartLimitsPayload as any });
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
      <Input
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
      <Input
        label="Initial Balance"
        id="initialBalance"
        type="number"
        placeholder="e.g., 100000"
        value={initialBalance}
        onChange={(e) => setInitialBalance(e.target.value)}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <SelectInput
          label="Currency"
          id="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          options={[
            { value: 'USD', label: 'USD' },
            { value: 'EUR', label: 'EUR' },
            { value: 'GBP', label: 'GBP' },
            { value: 'JPY', label: 'JPY' },
            { value: 'AUD', label: 'AUD' },
            { value: 'CAD', label: 'CAD' },
            { value: 'CHF', label: 'CHF' },
          ]}
        />
         <Input
          label="Leverage (e.g., 100)"
          id="leverage"
          type="number"
          placeholder="100"
          value={leverage}
          onChange={(e) => setLeverage(e.target.value)}
        />
      </div>
      <SelectInput
        label="How does your broker charge fees?"
        id="feeModel"
        value={feeModel}
        onChange={(e) => setFeeModel(e.target.value as FeeModel)}
        options={[
          { value: FeeModel.SPREAD_ONLY, label: 'Spread only (no separate commission)' },
          { value: FeeModel.COMMISSION_ONLY, label: 'Commission only' },
          { value: FeeModel.COMMISSION_AND_SWAP, label: 'Commission + Swap/Financing' },
        ]}
      />

      <div className="my-4 pt-4 border-t border-white/10">
        <ToggleSwitch 
            label="Enable Trading Objectives (for Prop Firms)"
            checked={objectivesEnabled}
            onChange={setObjectivesEnabled}
        />
        {objectivesEnabled && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
                <Input label="Profit Target ($)" id="profitTarget" type="number" placeholder="e.g., 8000" value={profitTarget} onChange={e => setProfitTarget(e.target.value)} />
                <Input label="Min Trading Days" id="minTradingDays" type="number" placeholder="e.g., 5" value={minTradingDays} onChange={e => setMinTradingDays(e.target.value)} />
                <Input label="Max Overall Loss ($)" id="maxLoss" type="number" placeholder="e.g., 5000" value={maxLoss} onChange={e => setMaxLoss(e.target.value)} />
                <Input label="Max Daily Loss ($)" id="maxDailyLoss" type="number" placeholder="e.g., 2500" value={maxDailyLoss} onChange={e => setMaxDailyLoss(e.target.value)} />
            </div>
        )}
      </div>

       <div className="my-4 pt-4 border-t border-white/10">
        <ToggleSwitch 
            label="Enable Smart Limits (Personal Rules)"
            checked={smartLimitsEnabled}
            onChange={setSmartLimitsEnabled}
        />
        {smartLimitsEnabled && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
                <Input label="Max Risk per Trade (%)" id="maxRiskPerTrade" type="number" step="0.1" placeholder="e.g., 1" value={maxRiskPerTrade} onChange={e => setMaxRiskPerTrade(e.target.value)} />
                <Input label="Max Trades per Day" id="maxTradesPerDay" type="number" placeholder="e.g., 3" value={maxTradesPerDay} onChange={e => setMaxTradesPerDay(e.target.value)} />
                <Input label="Max Losses per Day" id="maxLossesPerDay" type="number" placeholder="e.g., 2" value={maxLossesPerDay} onChange={e => setMaxLossesPerDay(e.target.value)} />
            </div>
        )}
      </div>


      {error && <p className="text-risk-high text-sm text-center my-4">{error}</p>}
      <div className="mt-6">
        <Button type="submit" isLoading={isLoading} className="w-full">
          {account ? 'Save Changes' : 'Create Account'}
        </Button>
      </div>
    </form>
  );
};

export default AccountForm;
