import React, { useState } from 'react';
import { useAssets } from '../../context/AssetContext';
import { AssetSpecification } from '../../types';
import AuthInput from '../auth/AuthInput';
import Button from '../ui/Button';
import Spinner from '../Spinner';

interface AssetFormProps {
  spec: AssetSpecification | null;
  onSuccess: () => void;
}

const AssetForm: React.FC<AssetFormProps> = ({ spec, onSuccess }) => {
  const { createAsset, updateAsset } = useAssets();
  const [formState, setFormState] = useState({
    symbol: spec?.symbol || '',
    name: spec?.name || '',
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
        <AuthInput label="Symbol" id="symbol" name="symbol" value={formState.symbol} onChange={handleChange} placeholder="e.g., EURUSD" required />
        <AuthInput label="Name" id="name" name="name" value={formState.name} onChange={handleChange} placeholder="e.g., Euro vs US Dollar" required />
      </div>
      
      {error && <p className="text-risk-high text-sm text-center my-4">{error}</p>}
      <div className="mt-6">
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? <Spinner /> : (isEditMode ? 'Save Changes' : 'Create Asset')}
        </Button>
      </div>
    </form>
  );
};

export default AssetForm;