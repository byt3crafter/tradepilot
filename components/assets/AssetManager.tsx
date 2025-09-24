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
        } catch(err) {
            console.error(err);
            alert('Failed to delete asset.');
        }
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-orbitron text-photonic-blue">Asset Specifications</h2>
          <p className="text-future-gray text-sm mt-1">Manage the instruments you trade for accurate calculations.</p>
        </div>
        <Button onClick={openAddModal} className="w-auto flex items-center gap-2 px-3 py-2 text-sm">
          <PlusIcon className="w-5 h-5" />
          <span>Add New Asset</span>
        </Button>
      </div>

      <div>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto table-scrollbar">
            <table className="w-full text-sm">
              <thead className="border-b border-photonic-blue/30">
                <tr>
                  <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Symbol</th>
                  <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Name</th>
                  <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {specs.map(spec => (
                  <tr key={spec.id} className="border-b border-future-panel/50">
                    <td className="p-3 font-semibold font-tech-mono text-future-light">{spec.symbol}</td>
                    <td className="p-3 text-future-gray">{spec.name}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button variant="link" className="text-sm p-1" onClick={() => openEditModal(spec)}>Edit</Button>
                        <Button variant="link" className="text-sm text-risk-high p-1" onClick={() => handleDelete(spec.id)}>Delete</Button>
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
            title={editingSpec ? "Edit Asset" : "Add New Asset"} 
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