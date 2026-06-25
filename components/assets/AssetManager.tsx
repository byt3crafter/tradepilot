import React, { useState } from 'react';
import { useAssets } from '../../context/AssetContext';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import { AssetSpecification } from '../../types';
import { TrashIcon } from '../icons/TrashIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { CancelIcon } from '../icons/CancelIcon';
import { PencilIcon } from '../icons/PencilIcon';
import AssetForm from './AssetForm';

const cellInputClass =
  'w-full bg-jtp-control border border-jtp-blue rounded-jtp-xs px-2 py-1 text-jtp-sm text-jtp-text placeholder:text-jtp-textDisabled outline-none focus:ring-1 focus:ring-jtp-blue/40 transition-colors font-sans';

type EditState = {
  symbol: string;
  name: string;
  pipSize: string;
  lotSize: string;
  valuePerPoint: string;
};

const AssetManager: React.FC = () => {
  const { specs, isLoading, deleteAsset, updateAsset } = useAssets();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    symbol: '',
    name: '',
    pipSize: '',
    lotSize: '',
    valuePerPoint: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const startEdit = (spec: AssetSpecification) => {
    setEditingId(spec.id);
    setEditState({
      symbol: spec.symbol,
      name: spec.name,
      pipSize: spec.pipSize != null ? String(spec.pipSize) : '',
      lotSize: spec.lotSize != null ? String(spec.lotSize) : '',
      valuePerPoint: spec.valuePerPoint != null ? String(spec.valuePerPoint) : '',
    });
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setIsSaving(true);
    setEditError('');
    try {
      await updateAsset(editingId, {
        symbol: editState.symbol.trim().toUpperCase(),
        name: editState.name.trim(),
        pipSize: editState.pipSize ? Number(editState.pipSize) : null,
        lotSize: editState.lotSize ? Number(editState.lotSize) : null,
        valuePerPoint: editState.valuePerPoint ? Number(editState.valuePerPoint) : null,
      });
      setEditingId(null);
    } catch (err: any) {
      setEditError(err.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditState(prev => ({ ...prev, [name]: value }));
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
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

  const dash = <span className="text-jtp-textDim">—</span>;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-jtp-xl font-semibold text-jtp-text">Instruments</h2>
        <p className="text-jtp-sm text-jtp-textDim mt-0.5">
          Common symbols (EURUSD, NAS100, BTCUSD, …) are auto-detected. Add a custom instrument only if you trade something we don't recognise, or to override its contract spec.
        </p>
      </div>

      <div>
        {isLoading ? (
          <div className="flex justify-center p-10">
            <Spinner />
          </div>
        ) : (
          <>
            {specs.length > 0 && (
              <div className="overflow-x-auto table-scrollbar mb-4">
                <table className="w-full text-jtp-sm">
                  <thead className="border-b border-jtp-border">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim w-28">
                        Symbol
                      </th>
                      <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim">
                        Name
                      </th>
                      <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim w-28">
                        Pip Size
                      </th>
                      <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim w-28">
                        Lot Size
                      </th>
                      <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim w-28">
                        Val/Point
                      </th>
                      <th className="px-3 py-2.5 text-left text-jtp-xs uppercase tracking-wider font-medium text-jtp-textDim w-24">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {specs.map(spec =>
                      editingId === spec.id ? (
                        <tr key={spec.id} className="border-b border-jtp-borderSubtle bg-jtp-active">
                          <td className="px-2 py-2">
                            <input
                              name="symbol"
                              value={editState.symbol}
                              onChange={handleEditChange}
                              onKeyDown={handleEditKeyDown}
                              autoFocus
                              aria-label="Symbol"
                              className={`${cellInputClass} font-mono uppercase`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              name="name"
                              value={editState.name}
                              onChange={handleEditChange}
                              onKeyDown={handleEditKeyDown}
                              aria-label="Name"
                              className={cellInputClass}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              name="pipSize"
                              type="number"
                              step="any"
                              value={editState.pipSize}
                              onChange={handleEditChange}
                              onKeyDown={handleEditKeyDown}
                              placeholder="e.g. 0.0001"
                              aria-label="Pip size"
                              className={cellInputClass}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              name="lotSize"
                              type="number"
                              step="any"
                              value={editState.lotSize}
                              onChange={handleEditChange}
                              onKeyDown={handleEditKeyDown}
                              placeholder="e.g. 100000"
                              aria-label="Lot size"
                              className={cellInputClass}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              name="valuePerPoint"
                              type="number"
                              step="any"
                              value={editState.valuePerPoint}
                              onChange={handleEditChange}
                              onKeyDown={handleEditKeyDown}
                              placeholder="e.g. 1"
                              aria-label="Value per point"
                              className={cellInputClass}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={isSaving}
                                aria-label="Save changes"
                                className="p-1.5 rounded text-jtp-profit hover:text-jtp-profitDot disabled:opacity-40 transition-colors"
                              >
                                <CheckCircleIcon className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                aria-label="Cancel editing"
                                className="p-1.5 rounded text-jtp-textDim hover:text-jtp-text transition-colors"
                              >
                                <CancelIcon className="w-4 h-4" />
                              </button>
                            </div>
                            {editError && (
                              <p className="text-jtp-loss text-jtp-xs mt-1 whitespace-nowrap">{editError}</p>
                            )}
                          </td>
                        </tr>
                      ) : (
                        <tr
                          key={spec.id}
                          className="border-b border-jtp-borderSubtle hover:bg-jtp-hover/40 transition-colors"
                        >
                          <td className="px-3 py-3 font-semibold font-mono text-jtp-text">{spec.symbol}</td>
                          <td className="px-3 py-3 text-jtp-textMuted">{spec.name}</td>
                          <td className="px-3 py-3 font-mono text-jtp-textMuted">
                            {spec.pipSize != null ? spec.pipSize : dash}
                          </td>
                          <td className="px-3 py-3 font-mono text-jtp-textMuted">
                            {spec.lotSize != null ? spec.lotSize : dash}
                          </td>
                          <td className="px-3 py-3 font-mono text-jtp-textMuted">
                            {spec.valuePerPoint != null ? spec.valuePerPoint : dash}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="link"
                                className="p-1.5 h-auto text-jtp-textDim hover:text-jtp-text"
                                onClick={() => startEdit(spec)}
                                aria-label={`Edit ${spec.symbol}`}
                              >
                                <PencilIcon className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="link"
                                className="p-1.5 h-auto text-jtp-loss"
                                onClick={() => handleDelete(spec.id)}
                                aria-label={`Delete ${spec.symbol}`}
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <AssetForm />
          </>
        )}
      </div>
    </div>
  );
};

export default AssetManager;
