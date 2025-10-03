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

const AccountManager: React.FC = () => {
  const { accounts, isLoading } = useAccount();
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-orbitron text-photonic-blue">Manage Accounts</h2>
          <p className="text-future-gray text-sm mt-1">Your central hub for all broker and prop firm accounts.</p>
        </div>
        <Button onClick={openAddModal} className="w-auto flex items-center gap-2 px-3 py-2 text-sm">
          <PlusIcon className="w-5 h-5" />
          <span>Add New Account</span>
        </Button>
      </div>

      <div>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed border-photonic-blue/20 rounded-lg">
            <h3 className="text-lg font-semibold text-future-light">No Accounts Found</h3>
            <p className="text-future-gray mt-2 mb-4">Click "Add New Account" to get started.</p>
            <Button onClick={openAddModal} className="w-auto">
              Create Your First Account
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto table-scrollbar">
            <table className="w-full text-sm">
              <thead className="border-b border-photonic-blue/30">
                <tr>
                  <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Account Name</th>
                  <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Type</th>
                  <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Initial Balance</th>
                  <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Current Balance</th>
                  <th className="p-3 text-right font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Actions</th>
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
            title={editingAccount ? "Edit Account" : "Add New Account"} 
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
