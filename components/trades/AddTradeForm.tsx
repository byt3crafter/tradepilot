import React, { useState, useEffect } from 'react';
import AuthInput from '../auth/AuthInput';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import SelectInput from '../ui/SelectInput';
import { useStrategy } from '../../context/StrategyContext';
import { Trade, TradeResult, Direction } from '../../types';
import Checkbox from '../ui/Checkbox';
import { useTrade } from '../../context/TradeContext';
import Textarea from '../ui/Textarea';
import ImageUploader from './ImageUploader';

interface TradeFormProps {
  tradeToEdit?: Trade | null;
  onSuccess: () => void;
}

const TradeForm: React.FC<TradeFormProps> = ({ tradeToEdit, onSuccess }) => {
  const { strategies } = useStrategy();
  const { createTrade, updateTrade } = useTrade();
  
  const isEditMode = !!tradeToEdit;

  const [formState, setFormState] = useState<Partial<Trade>>({
    asset: '',
    direction: 'Buy',
    entryPrice: 0,
    riskPercentage: 1,
    strategyId: strategies[0]?.id || '',
    isPendingOrder: false,
    notes: '',
    exitPrice: null,
    result: null,
    screenshotBeforeUrl: null,
    screenshotAfterUrl: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditMode) {
      setFormState({
        ...tradeToEdit,
        entryPrice: tradeToEdit.entryPrice || 0,
        riskPercentage: tradeToEdit.riskPercentage || 1,
      });
    } else if (strategies.length > 0) {
      setFormState(prev => ({ ...prev, strategyId: strategies[0].id }));
    }
  }, [tradeToEdit, isEditMode, strategies]);

  useEffect(() => {
    // Auto-calculate P/L and R/R
    if (isEditMode && formState.exitPrice && formState.entryPrice) {
      const entry = Number(formState.entryPrice);
      const exit = Number(formState.exitPrice);
      const risk = Number(formState.riskPercentage) / 100;
      
      const pnl = formState.direction === 'Buy' ? (exit - entry) / entry : (entry - exit) / entry;
      const profitLoss = pnl * 100; // As a percentage of entry
      const rr = profitLoss / Number(formState.riskPercentage);

      setFormState(prev => ({ ...prev, profitLoss, rr }));
    }
  }, [formState.exitPrice, formState.entryPrice, formState.direction, formState.riskPercentage, isEditMode]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    
    setFormState(prev => ({
      ...prev,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value,
    }));
  };
  
  const handleImageUpload = (field: 'screenshotBeforeUrl' | 'screenshotAfterUrl', dataUrl: string | null) => {
    setFormState(prev => ({ ...prev, [field]: dataUrl }));
  };

  const canSubmit = formState.strategyId && formState.asset;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    
    setIsLoading(true);
    setError('');
    
    const tradeData = {
        ...formState,
        entryPrice: Number(formState.entryPrice),
        riskPercentage: Number(formState.riskPercentage),
        exitPrice: formState.exitPrice ? Number(formState.exitPrice) : null,
    };

    try {
      if (isEditMode) {
        await updateTrade(tradeToEdit.id, tradeData);
      } else {
        await createTrade(tradeData);
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
      <div className={isEditMode ? "grid grid-cols-1 lg:grid-cols-2 gap-x-8" : "space-y-4"}>
        {/* --- LEFT/MAIN COLUMN --- */}
        <div className="space-y-4">
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
          </div>

           {isEditMode && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-photonic-blue/10">
               <AuthInput
                  label="Exit Price"
                  id="exitPrice"
                  name="exitPrice"
                  type="number"
                  step="any"
                  value={formState.exitPrice ?? ''}
                  onChange={handleInputChange}
                />
                <SelectInput
                  label="Result"
                  id="result"
                  name="result"
                  value={formState.result ?? ''}
                  onChange={handleInputChange}
                  options={[
                    { value: '', label: 'Select Result' },
                    { value: TradeResult.Win, label: 'Win' },
                    { value: TradeResult.Loss, label: 'Loss' },
                    { value: TradeResult.Breakeven, label: 'Breakeven' },
                  ]}
                />
            </div>
           )}

           <SelectInput
              label="Strategy"
              id="strategyId"
              name="strategyId"
              value={formState.strategyId}
              onChange={handleInputChange}
              disabled={strategies.length === 0}
              options={strategies.length > 0
                ? strategies.map(s => ({ value: s.id, label: s.name }))
                : [{ value: '', label: 'Create a strategy first' }]
              }
            />
          
          <Textarea
            label="Notes / Trade Idea"
            id="notes"
            name="notes"
            placeholder="Why are you taking this trade?"
            value={formState.notes ?? ''}
            onChange={handleInputChange}
          />
          
          {!isEditMode && (
              <Checkbox
                id="isPendingOrder"
                name="isPendingOrder"
                label="This is a Pending Order"
                checked={formState.isPendingOrder}
                onChange={handleInputChange}
              />
          )}
        </div>

        {/* --- RIGHT COLUMN --- */}
        {isEditMode && (
          <div className="mt-6 lg:mt-0">
            <h3 className="text-base font-semibold text-future-light mb-2">Trade Images</h3>
            <div className="space-y-4">
              <ImageUploader 
                  label="Before Entry Screenshot"
                  onImageUpload={(data) => handleImageUpload('screenshotBeforeUrl', data)}
                  currentImage={formState.screenshotBeforeUrl}
              />
              <ImageUploader 
                  label="After Exit Screenshot"
                  onImageUpload={(data) => handleImageUpload('screenshotAfterUrl', data)}
                  currentImage={formState.screenshotAfterUrl}
              />
            </div>
          </div>
        )}
      </div>

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

export default TradeForm;