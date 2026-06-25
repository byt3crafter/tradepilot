import React, { useState } from 'react';
import { useAccount } from '../../context/AccountContext';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import AccountForm from './AccountForm';
import { BrokerAccount } from '../../types';
import { PlusIcon } from '../icons/PlusIcon';
import AccountRow from './AccountRow';
import ImportTradesModal from './ImportTradesModal';
import { XCircleIcon } from '../icons/XCircleIcon';

type FormView = { mode: 'add' } | { mode: 'edit'; account: BrokerAccount };
type View = { mode: 'list' } | FormView;

const AccountManager: React.FC = () => {
  const { accounts, isLoading, isServerOffline } = useAccount();
  const [view, setView] = useState<View>({ mode: 'list' });
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importingAccount, setImportingAccount] = useState<BrokerAccount | null>(null);

  const showList = () => setView({ mode: 'list' });

  const openImportModal = (account: BrokerAccount) => {
    setImportingAccount(account);
    setIsImportModalOpen(true);
  };

  // ── Form page (Add / Edit) ─────────────────────────────────────────────────
  if (view.mode === 'add' || view.mode === 'edit') {
    const editingAccount = view.mode === 'edit' ? view.account : null;
    return (
      <>
        <AccountForm
          account={editingAccount}
          onBack={showList}
          onSuccess={showList}
        />
        {isImportModalOpen && importingAccount && (
          <ImportTradesModal
            account={importingAccount}
            onClose={() => setIsImportModalOpen(false)}
          />
        )}
      </>
    );
  }

  // ── Accounts list ──────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-jtp-xl font-semibold text-jtp-text">Manage Accounts</h2>
          <p className="text-jtp-sm text-jtp-textDim mt-0.5">
            Your central hub for all broker and prop-firm accounts.
          </p>
        </div>
        {!isServerOffline && (
          <Button
            onClick={() => setView({ mode: 'add' })}
            className="w-auto flex items-center gap-1.5 px-3 py-1.5 text-jtp-sm"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Account</span>
          </Button>
        )}
      </div>

      <div>
        {isLoading ? (
          <div className="flex justify-center p-10">
            <Spinner />
          </div>
        ) : isServerOffline ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-jtp-loss/30 rounded-jtp-panel text-center bg-jtp-loss/5">
            <XCircleIcon className="w-12 h-12 text-jtp-loss mb-3" />
            <h3 className="text-jtp-lg font-semibold text-jtp-text">Server Connection Failed</h3>
            <p className="text-jtp-sm text-jtp-textDim mt-2 mb-5 max-w-md">
              We cannot reach the backend server. Please ensure it is running on port 8080 and
              that your database connection string in .env is correct.
            </p>
            <Button onClick={() => window.location.reload()} variant="secondary">
              Retry Connection
            </Button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-jtp-borderStrong rounded-jtp-panel text-center">
            <h3 className="text-jtp-lg font-semibold text-jtp-text">No Accounts Found</h3>
            <p className="text-jtp-sm text-jtp-textDim mt-2 mb-5">
              Click &ldquo;Add Account&rdquo; to get started.
            </p>
            <Button onClick={() => setView({ mode: 'add' })}>Create Your First Account</Button>
          </div>
        ) : (
          <div className="overflow-x-auto table-scrollbar">
            <table className="w-full text-jtp-sm">
              <thead className="border-b border-jtp-border">
                <tr>
                  <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">
                    Account Name
                  </th>
                  <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">
                    Type
                  </th>
                  <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">
                    Initial Balance
                  </th>
                  <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">
                    Current Balance
                  </th>
                  <th className="px-3 py-2.5 text-right text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    onEdit={() => setView({ mode: 'edit', account })}
                    onImport={() => openImportModal(account)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isImportModalOpen && importingAccount && (
        <ImportTradesModal
          account={importingAccount}
          onClose={() => setIsImportModalOpen(false)}
        />
      )}
    </>
  );
};

export default AccountManager;
