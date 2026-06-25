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
  [BrokerAccountType.LIVE]: 'bg-jtp-profit/10 text-jtp-profit border-jtp-profit/20',
  [BrokerAccountType.DEMO]: 'bg-jtp-warning/10 text-jtp-warning border-jtp-warning/20',
  [BrokerAccountType.PROP_FIRM]: 'bg-jtp-blue/10 text-jtp-blue border-jtp-blue/20',
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
    <tr className="border-b border-jtp-borderSubtle hover:bg-jtp-hover/40 transition-colors">
      <td className="px-3 py-3 font-medium text-jtp-text">{account.name}</td>
      <td className="px-3 py-3">
        <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-jtp-xs font-semibold border ${typeStyles[account.type]}`}>
          {formattedType}
        </div>
      </td>
      <td className="px-3 py-3 font-mono text-jtp-textMuted text-jtp-sm">
        ${account.initialBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="px-3 py-3 font-mono text-jtp-text font-semibold text-jtp-sm">
        ${account.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuItem onSelect={onEdit}>
            <PencilIcon className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onImport}>
            <ImportIcon className="w-4 h-4 mr-2" />
            Import Trades
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleDelete} className="text-jtp-loss hover:bg-jtp-loss/10">
            <TrashIcon className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenu>
      </td>
    </tr>
  );
};

export default AccountRow;
