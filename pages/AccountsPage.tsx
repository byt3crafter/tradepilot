import React, { useState } from 'react';
import { useAccount } from '../context/AccountContext';
import Card from '../components/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/Spinner';
import AccountForm from '../components/accounts/AccountForm';
import { BrokerAccount } from '../types';
import { DropdownMenu, DropdownMenuItem } from '../components/ui/DropdownMenu';
import { PencilIcon } from '../components/icons/PencilIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { PlusIcon } from '../components/icons/PlusIcon';

type FormView = { mode: 'add' } | { mode: 'edit'; account: BrokerAccount };
type View = { mode: 'list' } | FormView;

const AccountsPage: React.FC = () => {
  const { accounts, isLoading, deleteAccount } = useAccount();
  const [view, setView] = useState<View>({ mode: 'list' });

  const showList = () => setView({ mode: 'list' });

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      try {
        await deleteAccount(id);
      } catch (err) {
        console.error(err);
        alert('Failed to delete account.');
      }
    }
  };

  const renderAccountType = (type: string) =>
    type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  // ── Form page ──────────────────────────────────────────────────────────────
  if (view.mode === 'add' || view.mode === 'edit') {
    const editingAccount = view.mode === 'edit' ? view.account : null;
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up">
        <AccountForm
          account={editingAccount}
          onBack={showList}
          onSuccess={showList}
        />
      </div>
    );
  }

  // ── Accounts list ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-jtp-3xl font-semibold text-jtp-text">Manage Accounts</h1>
          <p className="text-jtp-md text-jtp-textDim mt-1">
            Your central hub for all broker and prop-firm accounts.
          </p>
        </div>
        <Button onClick={() => setView({ mode: 'add' })} className="w-auto flex items-center gap-1.5">
          <PlusIcon className="w-4 h-4" />
          Add Account
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <p className="text-jtp-md text-jtp-textDim mb-5">
              You haven&rsquo;t added any accounts yet.
            </p>
            <Button onClick={() => setView({ mode: 'add' })}>Create Your First Account</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-jtp-sm">
              <thead className="border-b border-jtp-border">
                <tr>
                  <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">Name</th>
                  <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">Type</th>
                  <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">Initial Balance</th>
                  <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">Current Balance</th>
                  <th className="px-3 py-2.5 text-right text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b border-jtp-borderSubtle hover:bg-jtp-hover/40 transition-colors">
                    <td className="px-3 py-3 font-medium text-jtp-text">{account.name}</td>
                    <td className="px-3 py-3 text-jtp-textMuted">{renderAccountType(account.type)}</td>
                    <td className="px-3 py-3 font-mono text-jtp-textMuted">
                      ${account.initialBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 font-mono font-semibold text-jtp-text">
                      ${account.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuItem onSelect={() => setView({ mode: 'edit', account })}>
                          <PencilIcon className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => handleDelete(account.id)}
                          className="text-jtp-loss hover:bg-jtp-loss/10"
                        >
                          <TrashIcon className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AccountsPage;
