import React, { useState } from 'react';
import { useAccount } from '../../context/AccountContext';
import { BrokerAccount, BrokerAccountType } from '../../types';
import AuthInput from '../auth/AuthInput';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import SelectInput from '../ui/SelectInput';

interface AccountFormProps {
  account: BrokerAccount | null;
  onSuccess: () => void;
}

const AccountForm: React.FC<AccountFormProps> = ({ account, onSuccess }) => {
  const { createAccount, updateAccount } = useAccount();
  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState<BrokerAccountType>(account?.type || BrokerAccountType.LIVE);
  const [initialBalance, setInitialBalance] = useState(account?.initialBalance || '');
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

    try {
      if (account) {
        // Update existing account
        await updateAccount(account.id, { name, type, initialBalance: balance });
      } else {
        // Create new account
        await createAccount({ name, type, initialBalance: balance });
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
