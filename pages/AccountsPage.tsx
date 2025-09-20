import React, { useState } from 'react';
import { useAccount } from '../context/AccountContext';
import Card from '../components/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/Spinner';
import Modal from '../components/ui/Modal';
import AccountForm from '../components/accounts/AccountForm';
import { BrokerAccount } from '../types';

const AccountsPage: React.FC = () => {
  const { accounts, isLoading, deleteAccount } = useAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BrokerAccount | null>(null);

  const openAddModal = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };
  
  const openEditModal = (account: BrokerAccount) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
        try {
            await deleteAccount(id);
        } catch(err) {
            console.error(err);
            alert('Failed to delete account.');
        }
    }
  };

  const renderAccountType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-orbitron text-future-light">Manage Accounts</h1>
          <p className="text-future-gray">Your central hub for all broker and prop firm accounts.</p>
        </div>
        <Button onClick={openAddModal}>
            Add New Account
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center p-8 text-future-gray">
            <p>You haven't added any accounts yet. Click "Add New Account" to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="border-b border-photonic-blue/30">
                    <tr>
                        <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Name</th>
                        <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Type</th>
                        <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Initial Balance</th>
                        <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Current Balance</th>
                        <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {accounts.map(account => (
                        <tr key={account.id} className="border-b border-future-panel/50">
                            <td className="p-3 font-semibold text-future-light">{account.name}</td>
                            <td className="p-3 text-future-gray">{renderAccountType(account.type)}</td>
                            <td className="p-3 font-tech-mono text-future-light">${account.initialBalance.toLocaleString()}</td>
                            <td className="p-3 font-tech-mono text-future-light">${account.currentBalance.toLocaleString()}</td>
                            <td className="p-3">
                                <div className="flex gap-2">
                                    <Button variant="link" className="text-sm" onClick={() => openEditModal(account)}>Edit</Button>
                                    <Button variant="link" className="text-sm text-risk-high" onClick={() => handleDelete(account.id)}>Delete</Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        )}
      </Card>

      {isModalOpen && (
        <Modal 
            title={editingAccount ? "Edit Account" : "Add New Account"} 
            onClose={() => setIsModalOpen(false)}
        >
            <AccountForm 
                account={editingAccount} 
                onSuccess={() => setIsModalOpen(false)} 
            />
        </Modal>
      )}
    </div>
  );
};

export default AccountsPage;
