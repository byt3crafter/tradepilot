import React, { useState } from 'react';
import { useAccount } from '../../context/AccountContext';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import Modal from '../ui/Modal';
import AccountForm from './AccountForm';
import { BrokerAccount } from '../../types';
import { PlusIcon } from '../icons/PlusIcon';
import AccountRow from './AccountRow';
import ImportTradesModal from './ImportTradesModal';
import { XCircleIcon } from '../icons/XCircleIcon';

const AccountManager: React.FC = () => {
  const { accounts, isLoading, isServerOffline } = useAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BrokerAccount | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importingAccount, setImportingAccount] = useState<BrokerAccount | null>(null);

  const openAddModal = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const openEditModal = (account: BrokerAccount) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const openImportModal = (account: BrokerAccount) => {
    setImportingAccount(account);
    setIsImportModalOpen(true);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-jtp-xl font-semibold text-jtp-text">Manage Accounts</h2>
          <p className="text-jtp-sm text-jtp-textDim mt-0.5">Your central hub for all broker and prop firm accounts.</p>
        </div>
        {!isServerOffline && (
          <Button onClick={openAddModal} className="w-auto flex items-center gap-1.5 px-3 py-1.5 text-jtp-sm">
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
              We cannot reach the backend server. Please ensure it is running on port 8080 and that your database connection string in .env is correct.
            </p>
            <Button onClick={() => window.location.reload()} variant="secondary">
              Retry Connection
            </Button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-jtp-borderStrong rounded-jtp-panel text-center">
            <h3 className="text-jtp-lg font-semibold text-jtp-text">No Accounts Found</h3>
            <p className="text-jtp-sm text-jtp-textDim mt-2 mb-5">Click "Add Account" to get started.</p>
            <Button onClick={openAddModal}>
              Create Your First Account
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto table-scrollbar">
            <table className="w-full text-jtp-sm">
              <thead className="border-b border-jtp-border">
                <tr>
                  <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">Account Name</th>
                  <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">Type</th>
                  <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">Initial Balance</th>
                  <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">Current Balance</th>
                  <th className="px-3 py-2.5 text-right text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(account => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    onEdit={() => openEditModal(account)}
                    onImport={() => openImportModal(account)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal
          title={editingAccount ? 'Edit Account' : 'Add New Account'}
          onClose={() => setIsModalOpen(false)}
          size="md"
        >
          <AccountForm
            account={editingAccount}
            onSuccess={() => setIsModalOpen(false)}
          />
        </Modal>
      )}

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
