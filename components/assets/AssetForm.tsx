import React, { useState } from 'react';
import { useAssets } from '../../context/AssetContext';
import { PlusIcon } from '../icons/PlusIcon';
import Button from '../ui/Button';

const inputClass =
  'w-full bg-jtp-control border border-jtp-borderStrong rounded-jtp-sm px-2.5 py-1.5 text-jtp-sm text-jtp-text placeholder:text-jtp-textDisabled outline-none focus:ring-1 focus:ring-jtp-blue focus:border-jtp-blue transition-colors';

const AssetForm: React.FC = () => {
  const { createAsset } = useAssets();
  const [formState, setFormState] = useState({
    symbol: '',
    name: '',
    pipSize: '',
    lotSize: '',
    valuePerPoint: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleAdd = async () => {
    const symbol = formState.symbol.trim().toUpperCase();
    const name = formState.name.trim();
    if (!symbol || !name) return;
    setIsLoading(true);
    setError('');
    try {
      await createAsset({
        symbol,
        name,
        pipSize: formState.pipSize ? Number(formState.pipSize) : null,
        lotSize: formState.lotSize ? Number(formState.lotSize) : null,
        valuePerPoint: formState.valuePerPoint ? Number(formState.valuePerPoint) : null,
      });
      setFormState({ symbol: '', name: '', pipSize: '', lotSize: '', valuePerPoint: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to add instrument.');
    } finally {
      setIsLoading(false);
    }
  };

  const canAdd = formState.symbol.trim().length > 0 && formState.name.trim().length > 0;

  return (
    <div className="rounded-jtp-md border border-dashed border-jtp-borderStrong bg-jtp-raised p-3">
      <p className="text-jtp-xs text-jtp-textDim mb-2.5 flex items-center gap-1.5">
        <PlusIcon className="w-3 h-3" />
        Add custom instrument
      </p>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="block text-jtp-xs text-jtp-textDim mb-1">
            Symbol <span className="text-jtp-textFaint">*</span>
          </label>
          <input
            id="new-symbol"
            name="symbol"
            value={formState.symbol}
            onChange={handleChange}
            placeholder="e.g., XAUUSD"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-jtp-xs text-jtp-textDim mb-1">
            Name <span className="text-jtp-textFaint">*</span>
          </label>
          <input
            id="new-name"
            name="name"
            value={formState.name}
            onChange={handleChange}
            placeholder="e.g., Gold vs US Dollar"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className="block text-jtp-xs text-jtp-textDim mb-1">Pip/Point Size</label>
          <input
            id="new-pipSize"
            name="pipSize"
            type="number"
            step="any"
            value={formState.pipSize}
            onChange={handleChange}
            placeholder="0.0001"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-jtp-xs text-jtp-textDim mb-1">Lot Size (Units)</label>
          <input
            id="new-lotSize"
            name="lotSize"
            type="number"
            step="any"
            value={formState.lotSize}
            onChange={handleChange}
            placeholder="100000"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-jtp-xs text-jtp-textDim mb-1">Value/Point ($)</label>
          <input
            id="new-valuePerPoint"
            name="valuePerPoint"
            type="number"
            step="any"
            value={formState.valuePerPoint}
            onChange={handleChange}
            placeholder="1"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            className={inputClass}
          />
        </div>
      </div>

      {error && <p className="text-jtp-loss text-jtp-xs mb-2">{error}</p>}

      <Button
        onClick={handleAdd}
        disabled={!canAdd}
        isLoading={isLoading}
        className="w-auto px-4 py-1.5 text-jtp-sm"
      >
        Add Instrument
      </Button>
    </div>
  );
};

export default AssetForm;
