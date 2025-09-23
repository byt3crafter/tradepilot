import React, { useState, useEffect, useMemo } from 'react';
import AuthInput from '../auth/AuthInput';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import SelectInput from '../ui/SelectInput';
import { usePlaybook } from '../../context/PlaybookContext';
import { Trade } from '../../types';
import Checkbox from '../ui/Checkbox';
import { useTrade } from '../../context/TradeContext';
import { useAccount } from '../../context/AccountContext';

interface TradeFormProps {
  tradeToEdit?: Trade | null;
  isPending: boolean;
  onSuccess: () => void;
}

// Helper to format date for datetime-local input
const toDateTimeLocal = (dateString?: string | null) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Adjust for timezone offset to display correctly in user's local time
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - timezoneOffset);
  return localDate.toISOString().slice(0, 19);
};

const AddTradeForm: React.FC<TradeFormProps> = ({ tradeToEdit, isPending, onSuccess }) => {
  const { playbooks } = usePlaybook();
  const { createTrade, updateTrade } = useTrade();
  const { activeAccount } = useAccount();
  
  const isEditMode = !!tradeToEdit;

  const [formState, setFormState] = useState<Partial<Trade>>({
    asset: '',
    direction: 'Buy',
    entryPrice: 0,
    riskPercentage: 1,
    playbookId: playbooks[0]?.id || '',
    isPendingOrder: isPending,
    entryDate: toDateTimeLocal(new Date().toISOString()),
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditMode) {
      setFormState({
        ...tradeToEdit,
        entryDate: toDateTimeLocal(tradeToEdit.entryDate),
        entryPrice: tradeToEdit.entryPrice || 0,
        riskPercentage: tradeToEdit.riskPercentage || 1,
      });
    } else {
      setFormState(prev => ({ 
        ...prev, 
        isPendingOrder: isPending,
        playbookId: playbooks[0]?.id || '' 
      }));
    }
  }, [tradeToEdit, isEditMode, isPending, playbooks]);

  const maxRiskLimit = useMemo(() => {
    if (activeAccount?.smartLimits?.isEnabled && activeAccount.smartLimits.maxRiskPerTrade) {
      return activeAccount.smartLimits.maxRiskPerTrade;
    }
    return null;
  }, [activeAccount]);

  const riskValidationError = useMemo(() => {
    if (maxRiskLimit !== null && (formState.riskPercentage ?? 0) > maxRiskLimit) {
      return `Risk exceeds your Smart Limit of ${maxRiskLimit}%.`;
    }
    return null;
  }, [formState.riskPercentage, maxRiskLimit]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    
    setFormState(prev => ({
      ...prev,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value,
    }));
  };
  
  const canSubmit = formState.playbookId && formState.asset && !riskValidationError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    
    setIsLoading(true);
    setError('');

    const payload: Partial<Trade> = {
      asset: formState.asset,
      direction: formState.direction,
      entryPrice: Number(formState.entryPrice),
      riskPercentage: Number(formState.riskPercentage),
      playbookId: formState.playbookId,
      isPendingOrder: formState.isPendingOrder,
      entryDate: formState.entryDate ? new Date(formState.entryDate).toISOString() : new Date().toISOString(),
      stopLoss: formState.stopLoss ? Number(formState.stopLoss) : null,
      takeProfit: formState.takeProfit ? Number(formState.takeProfit) : null,
    };

    try {
      if (isEditMode) {
        await updateTrade(tradeToEdit.id, payload);
      } else {
        await createTrade(payload);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthInput
        label={isPending ? "Order Date & Time" : "Entry Date & Time"}
        id="entryDate"
        name="entryDate"
        type="datetime-local"
        value={formState.entryDate ?? ''}
        onChange={handleInputChange}
        required
        step="1"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AuthInput
          label="Asset"
          id="asset"
          name="asset"
          type="text"
          placeholder="e.g., EURUSD"
          value={formState.asset}
          onChange={handleInputChange}
          required
        />
          <SelectInput
          label="Direction"
          id="direction"
          name="direction"
          value={formState.direction}
          onChange={handleInputChange}
          options={[
            { value: 'Buy', label: 'Buy (Long)' },
            { value: 'Sell', label: 'Sell (Short)' },
          ]}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AuthInput
          label="Entry Price"
          id="entryPrice"
          name="entryPrice"
          type="number"
          step="any"
          value={formState.entryPrice}
          onChange={handleInputChange}
          required
        />
        <div>
          <AuthInput
            label="Risk (%)"
            id="riskPercentage"
            name="riskPercentage"
            type="number"
            step="0.01"
            value={formState.riskPercentage}
            onChange={handleInputChange}
            required
          />
          {riskValidationError && (
            <p className="text-xs text-risk-high -mt-3">{riskValidationError}</p>
          )}
        </div>
      </div>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         <AuthInput
            label="Stop Loss (Optional)"
            id="stopLoss"
            name="stopLoss"
            type="number"
            step="any"
            value={formState.stopLoss ?? ''}
            onChange={handleInputChange}
          />
           <AuthInput
            label="Take Profit (Optional)"
            id="takeProfit"
            name="takeProfit"
            type="number"
            step="any"
            value={formState.takeProfit ?? ''}
            onChange={handleInputChange}
          />
      </div>

        <SelectInput
          label="Playbook"
          id="playbookId"
          name="playbookId"
          value={formState.playbookId}
          onChange={handleInputChange}
          disabled={playbooks.length === 0}
          options={playbooks.length > 0
            ? playbooks.map(s => ({ value: s.id, label: s.name }))
            : [{ value: '', label: 'Create a playbook first' }]
          }
        />
                
      {!isEditMode && (
          <Checkbox
            id="isPendingOrder"
            name="isPendingOrder"
            label="This is a Pending Order"
            checked={!!formState.isPendingOrder}
            onChange={handleInputChange}
          />
      )}

      {/* --- FOOTER --- */}
      <div className="mt-6 pt-6 border-t border-photonic-blue/10">
        {error && <p className="text-risk-high text-sm text-center mb-4">{error}</p>}
        
        <Button type="submit" disabled={isLoading || !canSubmit} className="w-full">
          {isLoading ? <Spinner /> : (isEditMode ? 'Save Changes' : 'Log Trade')}
        </Button>
      </div>
    </form>
  );
};

export default AddTradeForm;
