import React, { useState, useEffect, useMemo } from 'react';
import AuthInput from '../auth/AuthInput';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import SelectInput from '../ui/SelectInput';
import { useStrategy } from '../../context/StrategyContext';
import { Trade, TradeResult, Direction } from '../../types';
import Checkbox from '../ui/Checkbox';
import { useTrade } from '../../context/TradeContext';
import ImageUploader from './ImageUploader';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { useAccount } from '../../context/AccountContext';

interface TradeFormProps {
  tradeToEdit?: Trade | null;
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

const TradeForm: React.FC<TradeFormProps> = ({ tradeToEdit, onSuccess }) => {
  const { strategies } = useStrategy();
  const { createTrade, updateTrade } = useTrade();
  const { activeAccount } = useAccount();
  
  const isEditMode = !!tradeToEdit;

  const [formState, setFormState] = useState<Partial<Trade>>({
    asset: '',
    direction: 'Buy',
    entryPrice: 0,
    riskPercentage: 1,
    strategyId: strategies[0]?.id || '',
    isPendingOrder: false,
    entryDate: toDateTimeLocal(new Date().toISOString()),
    exitDate: null,
    exitPrice: null,
    result: null,
    screenshotBeforeUrl: null,
    screenshotAfterUrl: null,
    lotSize: null,
    stopLoss: null,
    takeProfit: null,
    commission: null,
    swap: null,
    profitLoss: null,
    rr: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExecutionDetailsOpen, setIsExecutionDetailsOpen] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      const formattedEntryDate = toDateTimeLocal(tradeToEdit.entryDate);
      const formattedExitDate = tradeToEdit.exitDate
        ? toDateTimeLocal(tradeToEdit.exitDate)
        : formattedEntryDate; // Pre-fill exit date with entry date if empty

      setFormState({
        ...tradeToEdit,
        entryDate: formattedEntryDate,
        exitDate: formattedExitDate,
        entryPrice: tradeToEdit.entryPrice || 0,
        riskPercentage: tradeToEdit.riskPercentage || 1,
      });
      // Automatically open execution details if some are filled
      if (tradeToEdit.lotSize || tradeToEdit.commission || tradeToEdit.swap) {
        setIsExecutionDetailsOpen(true);
      }
    } else if (strategies.length > 0) {
      setFormState(prev => ({ ...prev, strategyId: strategies[0].id }));
    }
  }, [tradeToEdit, isEditMode, strategies]);

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

  const canSubmit = formState.strategyId && formState.asset && !riskValidationError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    
    setIsLoading(true);
    setError('');

    try {
      if (isEditMode) {
        const updatePayload: Partial<Trade> = {
          asset: formState.asset,
          direction: formState.direction,
          entryPrice: Number(formState.entryPrice),
          riskPercentage: Number(formState.riskPercentage),
          strategyId: formState.strategyId,
          entryDate: formState.entryDate ? new Date(formState.entryDate).toISOString() : new Date().toISOString(),
          exitDate: formState.exitDate ? new Date(formState.exitDate).toISOString() : null,
          exitPrice: formState.exitPrice ? Number(formState.exitPrice) : null,
          result: formState.result || null,
          screenshotBeforeUrl: formState.screenshotBeforeUrl,
          screenshotAfterUrl: formState.screenshotAfterUrl,
          profitLoss: formState.profitLoss ? Number(formState.profitLoss) : null,
          rr: formState.rr ? Number(formState.rr) : null,
          isPendingOrder: formState.isPendingOrder,
          lotSize: formState.lotSize ? Number(formState.lotSize) : null,
          stopLoss: formState.stopLoss ? Number(formState.stopLoss) : null,
          takeProfit: formState.takeProfit ? Number(formState.takeProfit) : null,
          commission: formState.commission ? Number(formState.commission) : null,
          swap: formState.swap ? Number(formState.swap) : null,
        };
        await updateTrade(tradeToEdit.id, updatePayload);
      } else {
        const createPayload: Partial<Trade> = {
          asset: formState.asset,
          direction: formState.direction,
          entryPrice: Number(formState.entryPrice),
          riskPercentage: Number(formState.riskPercentage),
          strategyId: formState.strategyId,
          isPendingOrder: formState.isPendingOrder,
          entryDate: formState.entryDate ? new Date(formState.entryDate).toISOString() : new Date().toISOString(),
        };
        await createTrade(createPayload);
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
           <AuthInput
              label="Entry Date & Time"
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
              step="0.01"
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

           {isEditMode && (
            <>
              <div className="pt-4 border-t border-photonic-blue/10">
                 <AuthInput
                    label="Exit Date & Time"
                    id="exitDate"
                    name="exitDate"
                    type="datetime-local"
                    value={formState.exitDate ?? ''}
                    onChange={handleInputChange}
                    step="1"
                  />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <AuthInput
                    label="Exit Price"
                    id="exitPrice"
                    name="exitPrice"
                    type="number"
                    step="0.01"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <AuthInput
                    label="Profit / Loss ($)"
                    id="profitLoss"
                    name="profitLoss"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 250.50"
                    value={formState.profitLoss ?? ''}
                    onChange={handleInputChange}
                  />
                  <AuthInput
                    label="R:R Ratio"
                    id="rr"
                    name="rr"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 2.5"
                    value={formState.rr ?? ''}
                    onChange={handleInputChange}
                  />
              </div>

              <div className="pt-4 border-t border-photonic-blue/10">
                <button
                  type="button"
                  onClick={() => setIsExecutionDetailsOpen(!isExecutionDetailsOpen)}
                  className="w-full flex items-center justify-between text-left"
                  aria-expanded={isExecutionDetailsOpen}
                  aria-controls="execution-details"
                >
                  <h3 className="text-sm font-orbitron text-photonic-blue/80">Execution Details</h3>
                  <ChevronDownIcon className={`w-5 h-5 text-photonic-blue/80 transition-transform duration-300 ${isExecutionDetailsOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <div 
                  id="execution-details"
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${isExecutionDetailsOpen ? 'max-h-96 mt-3' : 'max-h-0'}`}
                >
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <AuthInput
                          label="Lot Size"
                          id="lotSize" name="lotSize" type="number" step="any"
                          value={formState.lotSize ?? ''} onChange={handleInputChange}
                        />
                        <AuthInput
                          label="Stop Loss"
                          id="stopLoss" name="stopLoss" type="number" step="any"
                          value={formState.stopLoss ?? ''} onChange={handleInputChange}
                        />
                        <AuthInput
                          label="Take Profit"
                          id="takeProfit" name="takeProfit" type="number" step="any"
                          value={formState.takeProfit ?? ''} onChange={handleInputChange}
                        />
                        <AuthInput
                          label="Commission ($)"
                          id="commission" name="commission" type="number" step="any"
                          value={formState.commission ?? ''} onChange={handleInputChange}
                        />
                        <AuthInput
                          label="Swap ($)"
                          id="swap" name="swap" type="number" step="any"
                          value={formState.swap ?? ''} onChange={handleInputChange}
                        />
                    </div>
                </div>
              </div>
            </>
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