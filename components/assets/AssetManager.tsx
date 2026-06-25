import React, { useState } from 'react';
import { useAssets } from '../../context/AssetContext';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import Modal from '../ui/Modal';
import { AssetSpecification } from '../../types';
import { PlusIcon } from '../icons/PlusIcon';
import AssetForm from './AssetForm';

const AssetManager: React.FC = () => {
  const { specs, isLoading, deleteAsset } = useAssets();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<AssetSpecification | null>(null);

  const openAddModal = () => {
    setEditingSpec(null);
    setIsModalOpen(true);
  };

  const openEditModal = (spec: AssetSpecification) => {
    setEditingSpec(spec);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this asset? This cannot be undone.')) {
      try {
        await deleteAsset(id);
      } catch (err) {
        console.error(err);
        alert('Failed to delete asset.');
      }
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-jtp-xl font-semibold text-jtp-text">Asset Specifications</h2>
          <p className="text-jtp-sm text-jtp-textDim mt-0.5">Manage the instruments you trade for accurate calculations.</p>
        </div>
        <Button onClick={openAddModal} className="w-auto flex items-center gap-1.5 px-3 py-1.5 text-jtp-sm">
          <PlusIcon className="w-4 h-4" />
          <span>Add Asset</span>
        </Button>
      </div>

      <div>
        {isLoading ? (
          <div className="flex justify-center p-10">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto table-scrollbar">
            <table className="w-full text-jtp-sm">
              <thead className="border-b border-jtp-border">
                <tr>
                  <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">Symbol</th>
                  <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">Name</th>
                  <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">Actions</th>
                </tr>
              </thead>
              <tbody>
                {specs.map(spec => (
                  <tr key={spec.id} className="border-b border-jtp-borderSubtle hover:bg-jtp-hover/40 transition-colors">
                    <td className="px-3 py-3 font-semibold font-mono text-jtp-text">{spec.symbol}</td>
                    <td className="px-3 py-3 text-jtp-textMuted">{spec.name}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <Button variant="link" className="text-jtp-sm p-1 text-jtp-blue" onClick={() => openEditModal(spec)}>Edit</Button>
                        <Button variant="link" className="text-jtp-sm p-1 text-jtp-loss" onClick={() => handleDelete(spec.id)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal
          title={editingSpec ? 'Edit Asset' : 'Add New Asset'}
          onClose={() => setIsModalOpen(false)}
          size="lg"
        >
          <AssetForm
            spec={editingSpec}
            onSuccess={() => setIsModalOpen(false)}
          />
        </Modal>
      )}
    </>
  );
};

export default AssetManager;
