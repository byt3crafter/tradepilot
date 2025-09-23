import React, { useState } from 'react';
import { Trade, TradeResult, Direction } from '../../types';
import { useTrade } from '../../context/TradeContext';
import AuthInput from '../auth/AuthInput';
import SelectInput from '../ui/SelectInput';
import ImageUploader from './ImageUploader';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import Spinner from '../Spinner';

interface EditTradeFormProps {
  tradeToEdit: Trade;
  onSuccess: () => void;
}

const toDateTimeLocal = (dateString?: string | null) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - timezoneOffset);
  return localDate.toISOString().slice(0, 19);
};

const EditTradeForm: React.FC<EditTradeFormProps> = ({ tradeToEdit, onSuccess }) => {
  const { updateTrade } = useTrade();
  
  const [formState, setFormState] = useState({
    entryDate: toDateTimeLocal(tradeToEdit.entryDate),
    exitDate: toDateTimeLocal(tradeToEdit.exitDate),
    asset: tradeToEdit.asset || '',
    direction: tradeToEdit.direction || 'Buy',
    entryPrice: String(tradeToEdit.entryPrice || ''),
    exitPrice: String(tradeToEdit.exitPrice || ''),
    riskPercentage: String(tradeToEdit.riskPercentage || ''),
    result: tradeToEdit.result || '',
    lotSize: String(tradeToEdit.lotSize || ''),
    stopLoss: String(tradeToEdit.stopLoss || ''),
    takeProfit: String(tradeToEdit.takeProfit || ''),
    profitLoss: String(tradeToEdit.profitLoss || ''),
    rr: String(tradeToEdit.rr || ''),
    commission: String(tradeToEdit.commission || ''),
    swap: String(tradeToEdit.swap || ''),
    screenshotBeforeUrl: tradeToEdit.screenshotBeforeUrl || null,
    screenshotAfterUrl: tradeToEdit.screenshotAfterUrl || null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (field: 'screenshotBeforeUrl' | 'screenshotAfterUrl', dataUrl: string | null) => {
    setFormState(prev => ({ ...prev, [field]: dataUrl }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const payload: Partial<Trade> = {
        entryDate: formState.entryDate ? new Date(formState.entryDate).toISOString() : undefined,
        exitDate: formState.exitDate ? new Date(formState.exitDate).toISOString() : null,
        asset: formState.asset,
        direction: formState.direction as Direction,
        entryPrice: Number(formState.entryPrice),
        exitPrice: formState.exitPrice ? Number(formState.exitPrice) : null,
        riskPercentage: Number(formState.riskPercentage),
        result: (formState.result as TradeResult) || null,
        lotSize: formState.lotSize ? Number(formState.lotSize) : null,
        stopLoss: formState.stopLoss ? Number(formState.stopLoss) : null,
        takeProfit: formState.takeProfit ? Number(formState.takeProfit) : null,
        profitLoss: formState.profitLoss ? Number(formState.profitLoss) : null,
        rr: formState.rr ? Number(formState.rr) : null,
        commission: formState.commission ? Number(formState.commission) : null,
        swap: formState.swap ? Number(formState.swap) : null,
        screenshotBeforeUrl: formState.screenshotBeforeUrl,
        screenshotAfterUrl: formState.screenshotAfterUrl,
      };

      await updateTrade(tradeToEdit.id, payload);
      onSuccess();

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
            <h3 className="text-base font-orbitron text-photonic-blue/80 mb-2">Entry Details</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AuthInput label="Entry Date & Time" id="entryDate" name="entryDate" type="datetime-local" value={formState.entryDate} onChange={handleInputChange} step="1" />
                <AuthInput label="Asset" id="asset" name="asset" type="text" value={formState.asset} onChange={handleInputChange} />
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectInput label="Direction" id="direction" name="direction" value={formState.direction} onChange={handleInputChange} options={[{ value: 'Buy', label: 'Buy (Long)' },{ value: 'Sell', label: 'Sell (Short)' }]} />
                <AuthInput label="Entry Price" id="entryPrice" name="entryPrice" type="number" step="any" value={formState.entryPrice} onChange={handleInputChange} />
             </div>
            
            <h3 className="text-base font-orbitron text-photonic-blue/80 mb-2 pt-4 border-t border-photonic-blue/10">Exit Details</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AuthInput label="Exit Date & Time" id="exitDate" name="exitDate" type="datetime-local" value={formState.exitDate} onChange={handleInputChange} step="1" />
                <AuthInput label="Exit Price" id="exitPrice" name="exitPrice" type="number" step="any" value={formState.exitPrice} onChange={handleInputChange} />
             </div>
            <SelectInput label="Result" id="result" name="result" value={formState.result} onChange={handleInputChange} options={[{ value: '', label: 'Select Result' },{ value: TradeResult.Win, label: 'Win' },{ value: TradeResult.Loss, label: 'Loss' },{ value: TradeResult.Breakeven, label: 'Breakeven' }]}/>

            <h3 className="text-base font-orbitron text-photonic-blue/80 mb-2 pt-4 border-t border-photonic-blue/10">Performance</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AuthInput label="Gross P/L ($)" id="profitLoss" name="profitLoss" type="number" step="any" value={formState.profitLoss} onChange={handleInputChange} />
                <AuthInput label="R:R Ratio" id="rr" name="rr" type="number" step="0.01" value={formState.rr} onChange={handleInputChange} />
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AuthInput label="Commission ($)" id="commission" name="commission" type="number" step="any" value={formState.commission} onChange={handleInputChange} />
                <AuthInput label="Swap ($)" id="swap" name="swap" type="number" step="any" value={formState.swap} onChange={handleInputChange} />
             </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4 mt-6 lg:mt-0">
            <h3 className="text-base font-orbitron text-photonic-blue/80 mb-2">Execution Details</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AuthInput label="Stop Loss" id="stopLoss" name="stopLoss" type="number" step="any" value={formState.stopLoss} onChange={handleInputChange} />
                <AuthInput label="Take Profit" id="takeProfit" name="takeProfit" type="number" step="any" value={formState.takeProfit} onChange={handleInputChange} />
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AuthInput label="Lot Size" id="lotSize" name="lotSize" type="number" step="any" value={formState.lotSize} onChange={handleInputChange} />
                <AuthInput label="Risk (%)" id="riskPercentage" name="riskPercentage" type="number" step="0.01" value={formState.riskPercentage} onChange={handleInputChange} />
             </div>

            <div className="pt-4">
                <h3 className="text-base font-orbitron text-photonic-blue/80 mb-2">Trade Images</h3>
                <div className="space-y-4">
                    <ImageUploader label="Before Entry Screenshot" onImageUpload={(data) => handleImageUpload('screenshotBeforeUrl', data)} currentImage={formState.screenshotBeforeUrl}/>
                    <ImageUploader label="After Exit Screenshot" onImageUpload={(data) => handleImageUpload('screenshotAfterUrl', data)} currentImage={formState.screenshotAfterUrl} />
                </div>
            </div>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-photonic-blue/10">
          {error && <p className="text-risk-high text-sm text-center mb-4">{error}</p>}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? <Spinner /> : 'Save Changes'}
          </Button>
        </div>
    </form>
  );
};

export default EditTradeForm;