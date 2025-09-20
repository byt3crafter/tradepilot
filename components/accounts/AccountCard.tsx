import React from 'react';
import { BrokerAccount, BrokerAccountType } from '../../types';
import { useAccount } from '../../context/AccountContext';
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';

interface AccountCardProps {
  account: BrokerAccount;
  onEdit: () => void;
}

const typeStyles: Record<BrokerAccountType, string> = {
  [BrokerAccountType.LIVE]: 'bg-momentum-green/10 text-momentum-green border-momentum-green/20',
  [BrokerAccountType.DEMO]: 'bg-risk-medium/10 text-risk-medium border-risk-medium/20',
  [BrokerAccountType.PROP_FIRM]: 'bg-photonic-blue/10 text-photonic-blue border-photonic-blue/20',
};

const AccountCard: React.FC<AccountCardProps> = ({ account, onEdit }) => {
  const { deleteAccount } = useAccount();

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this account? This action is permanent.')) {
      try {
        await deleteAccount(account.id);
      } catch (err) {
        console.error('Failed to delete account:', err);
        alert('Could not delete the account. Please try again.');
      }
    }
  };
  
  const formattedType = account.type.replace('_', ' ');

  return (
    <div className="bg-future-dark/50 border border-photonic-blue/20 rounded-lg p-4 flex flex-col justify-between transition-all hover:border-photonic-blue/50 hover:shadow-glow-blue">
      <div>
        <div className="flex justify-between items-start">
          <h3 className="font-orbitron text-lg text-future-light">{account.name}</h3>
          <DropdownMenu>
            <DropdownMenuItem onSelect={onEdit}>
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleDelete} className="text-risk-high hover:bg-risk-high/10">
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
        <div className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full border ${typeStyles[account.type]}`}>
          {formattedType}
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-photonic-blue/10">
        <div className="flex justify-between items-baseline">
            <span className="text-sm text-future-gray">Initial Balance</span>
            <span className="font-tech-mono text-future-light">${account.initialBalance.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-baseline mt-1">
            <span className="text-sm text-future-gray">Current Balance</span>
            <span className="font-tech-mono text-lg font-bold text-future-light">${account.currentBalance.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default AccountCard;
