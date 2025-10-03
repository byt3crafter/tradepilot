import React from 'react';
import { BrokerAccount, BrokerAccountType } from '../../types';
import { useAccount } from '../../context/AccountContext';
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { ImportIcon } from '../icons/ImportIcon';

interface AccountRowProps {
  account: BrokerAccount;
  onEdit: () => void;
  onImport: () => void;
}

const typeStyles: Record<BrokerAccountType, string> = {
  [BrokerAccountType.LIVE]: 'bg-momentum-green/10 text-momentum-green border-momentum-green/20',
  [BrokerAccountType.DEMO]: 'bg-risk-medium/10 text-risk-medium border-risk-medium/20',
  [BrokerAccountType.PROP_FIRM]: 'bg-photonic-blue/10 text-photonic-blue border-photonic-blue/20',
};

const AccountRow: React.FC<AccountRowProps> = ({ account, onEdit, onImport }) => {
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
    <tr className="border-b border-future-panel/50 hover:bg-photonic-blue/5 transition-colors">
      <td className="p-3 font-semibold text-future-light">{account.name}</td>
      <td className="p-3">
        <div className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${typeStyles[account.type]}`}>
          {formattedType}
        </div>
      </td>
      <td className="p-3 font-tech-mono text-future-gray">${account.initialBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td className="p-3 font-tech-mono text-future-light font-semibold">${account.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
         <DropdownMenu>
            <DropdownMenuItem onSelect={onEdit}>
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onImport}>
                <ImportIcon className="w-4 h-4 mr-2" />
                Import Trades
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleDelete} className="text-risk-high hover:bg-risk-high/10">
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete
            </DropdownMenuItem>
          </DropdownMenu>
      </td>
    </tr>
  );
};

export default AccountRow;
