
import React, { useState } from 'react';
import { useAssets } from '../../context/AssetContext';
import { AssetSpecification } from '../../types';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface AssetFormProps {
  spec: AssetSpecification | null;
  onSuccess: () => void;
}

const AssetForm: React.FC<AssetFormProps> = ({ spec, onSuccess }) => {
  const { createAsset, updateAsset } = useAssets();
  const [formState, setFormState] = useState({
    symbol: spec?.symbol || '',
    name: spec?.name || '',
    pipSize: spec?.pipSize ?? '',
    lotSize: spec?.lotSize ?? '',
    valuePerPoint: spec?.valuePerPoint ?? '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const isEditMode = !!spec;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const payload = {
        symbol: formState.symbol.toUpperCase(),
        name: formState.name,
        pipSize: formState.pipSize ? Number(formState.pipSize) : null,
        lotSize: formState.lotSize ? Number(formState.lotSize) : null,
        valuePerPoint: formState.valuePerPoint ? Number(formState.valuePerPoint) : null,
    };

    try {
      if (isEditMode) {
        await updateAsset(spec.id, payload);
      } else {
        await createAsset(payload as any);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Symbol" id="symbol" name="symbol" value={formState.symbol} onChange={handleChange} placeholder="e.g., EURUSD" required />
        <Input label="Name" id="name" name="name" value={formState.name} onChange={handleChange} placeholder="e.g., Euro vs US Dollar" required />
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-sm text-future-gray mb-3">
          These values are crucial for accurate Pip calculations. Check your broker's contract specifications for these values.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
                <Input 
                    label="Pip / Point Size" 
                    id="pipSize" 
                    name="pipSize" 
                    type="number" 
                    step="any" 
                    value={formState.pipSize} 
                    onChange={handleChange} 
                    placeholder="e.g., 0.1" 
                />
                <p className="text-[10px] text-future-gray mt-1 -translate-y-3">
                    For Indices: 1 or 0.1<br/>For Forex: 0.0001 or 0.01 (JPY)
                </p>
            </div>
          <Input label="Lot Size (Units)" id="lotSize" name="lotSize" type="number" step="any" value={formState.lotSize} onChange={handleChange} placeholder="e.g., 100000" />
          <Input label="Value per Point ($)" id="valuePerPoint" name="valuePerPoint" type="number" step="any" value={formState.valuePerPoint} onChange={handleChange} placeholder="e.g., 1" />
        </div>
      </div>
      
      {error && <p className="text-risk-high text-sm text-center my-4">{error}</p>}
      <div className="mt-6">
        <Button type="submit" isLoading={isLoading} className="w-full">
          {isEditMode ? 'Save Changes' : 'Create Asset'}
        </Button>
      </div>
    </form>
  );
};

export default AssetForm;
