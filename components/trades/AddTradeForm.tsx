
import React, { useState, useEffect, useMemo } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import SelectInput from '../ui/SelectInput';
import { usePlaybook } from '../../context/PlaybookContext';
import { Trade, PreTradeCheckResult, AnalyzeChartResult, Direction } from '../../types';
import { useTrade } from '../../context/TradeContext';
import { useAssets } from '../../context/AssetContext';
import ImageUploader from './ImageUploader';
import Checkbox from '../ui/Checkbox';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ChecklistIcon } from '../icons/ChecklistIcon';
import SanityCheckModal from './SanityCheckModal';
import AutofillModal from './AutofillModal';

interface TradeFormProps {
  tradeToEdit?: Trade | null;
  onSuccess: () => void;
}

interface FormInputState {
  asset: string;
  direction: Direction;
  entryDate: string;
  entryPrice: string;
  lotSize: string;
  stopLoss: string;
  takeProfit: string;
  playbookId: string;
  riskPercentage: string;
  screenshotBeforeUrl: string | null;
}

export const toDateTimeLocal = (dateString?: string | null) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - timezoneOffset);
  return localDate.toISOString().slice(0, 19);
};

const AddTradeForm: React.FC<TradeFormProps> = ({ tradeToEdit, onSuccess }) => {
  const { playbooks } = usePlaybook();
  const { createTrade, updateTrade } = useTrade();
  const { specs } = useAssets();
  const { accessToken } = useAuth();
  
  const isEditMode = !!tradeToEdit;
  const [isPendingOrder, setIsPendingOrder] = useState(tradeToEdit?.isPendingOrder ?? false);

  const [formState, setFormState] = useState<FormInputState>({
    asset: '',
    direction: Direction.Buy,
    entryDate: toDateTimeLocal(new Date().toISOString()),
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    lotSize: '',
    riskPercentage: '1',
    playbookId: '',
    screenshotBeforeUrl: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // AI State
  const [isAutofillModalOpen, setIsAutofillModalOpen] = useState(false);
  const [isCheckingSanity, setIsCheckingSanity] = useState(false);
  const [sanityCheckResult, setSanityCheckResult] = useState<PreTradeCheckResult | null>(null);
  const [showSanityCheckModal, setShowSanityCheckModal] = useState(false);
  const [aiError, setAiError] = useState('');

  // Populate form
  useEffect(() => {
    if (isEditMode && tradeToEdit) {
      setFormState({
        asset: tradeToEdit.asset || '',
        direction: tradeToEdit.direction || Direction.Buy,
        entryDate: toDateTimeLocal(tradeToEdit.entryDate),
        entryPrice: tradeToEdit.entryPrice?.toString() ?? '',
        stopLoss: tradeToEdit.stopLoss?.toString() ?? '',
        takeProfit: tradeToEdit.takeProfit?.toString() ?? '',
        lotSize: tradeToEdit.lotSize?.toString() ?? '',
        riskPercentage: tradeToEdit.riskPercentage?.toString() ?? '1',
        playbookId: tradeToEdit.playbookId || '',
        screenshotBeforeUrl: tradeToEdit.screenshotBeforeUrl || null,
      });
    } else {
        setFormState(prev => ({ 
            ...prev, 
            playbookId: playbooks[0]?.id || '',
            entryDate: toDateTimeLocal(new Date().toISOString()) 
        }));
    }
  }, [tradeToEdit, isEditMode, playbooks]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (field: 'screenshotBeforeUrl', dataUrl: string | null) => {
    setFormState(prev => ({ ...prev, [field]: dataUrl }));
  };

  const canSubmit = useMemo(() => {
    return formState.playbookId && formState.asset && formState.entryPrice;
  }, [formState.playbookId, formState.asset, formState.entryPrice]);
  
  const handleApplyAutofill = (data: AnalyzeChartResult) => {
    const updates: Partial<FormInputState> = {};
    if (data.asset) updates.asset = data.asset;
    if (data.direction) updates.direction = data.direction as Direction;
    if (data.entryPrice ?? null !== null) updates.entryPrice = String(data.entryPrice);
    if (data.stopLoss ?? null !== null) updates.stopLoss = String(data.stopLoss);
    if (data.takeProfit ?? null !== null) updates.takeProfit = String(data.takeProfit);
    if (data.entryDate) updates.entryDate = toDateTimeLocal(data.entryDate);
    if (data.lotSize ?? null !== null) updates.lotSize = String(data.lotSize);
    
    setFormState(prev => ({...prev, ...updates}));
    setIsAutofillModalOpen(false);
  };


  const handleSanityCheck = async () => {
    if (!formState.screenshotBeforeUrl || !formState.playbookId || !formState.asset || !accessToken) {
        setAiError("Please upload a screenshot and select an asset & playbook first.");
        return;
    }
    setIsCheckingSanity(true);
    setSanityCheckResult(null);
    setAiError('');

    try {
        const result = await api.preTradeCheck({
            playbookId: formState.playbookId,
            screenshotBeforeUrl: formState.screenshotBeforeUrl,
            asset: formState.asset
        }, accessToken);
        setSanityCheckResult(result);
        setShowSanityCheckModal(true);
    } catch (err: any) {
        setAiError(err.message || "Failed to run sanity check.");
    } finally {
        setIsCheckingSanity(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      setError("Please fill all required fields.");
      return;
    };
    
    setIsLoading(true);
    setError('');

    const payload: Partial<Trade> = {
      asset: formState.asset,
      direction: formState.direction,
      entryPrice: Number(formState.entryPrice),
      riskPercentage: Number(formState.riskPercentage),
      playbookId: formState.playbookId,
      isPendingOrder: isPendingOrder,
      entryDate: formState.entryDate ? new Date(formState.entryDate).toISOString() : new Date().toISOString(),
      stopLoss: formState.stopLoss ? Number(formState.stopLoss) : null,
      takeProfit: formState.takeProfit ? Number(formState.takeProfit) : null,
      lotSize: formState.lotSize ? Number(formState.lotSize) : null,
      screenshotBeforeUrl: formState.screenshotBeforeUrl,
    };
    
    const preservedFields: Partial<Trade> = tradeToEdit ? {
        lotSize: tradeToEdit.lotSize,
        commission: tradeToEdit.commission,
        swap: tradeToEdit.swap,
    } : {};


    try {
      if (isEditMode && tradeToEdit) {
        await updateTrade(tradeToEdit.id, { ...preservedFields, ...payload });
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
  
  const assetOptions = useMemo(() => [
    { value: '', label: 'Select an Asset...' },
    ...specs.map(spec => ({ value: spec.symbol, label: spec.symbol }))
  ], [specs]);

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-4">
        <ImageUploader 
            label="Before Entry Screenshot (for Journaling)"
            onImageUpload={(data) => handleImageUpload('screenshotBeforeUrl', data)}
            currentImage={formState.screenshotBeforeUrl}
        />
        
        <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button 
                type="button" 
                onClick={() => setIsAutofillModalOpen(true)} 
                variant="secondary"
                className="w-full sm:w-auto text-xs py-1.5 px-3 flex items-center justify-center gap-2"
            >
                <SparklesIcon className="w-4 h-4 text-photonic-blue" />
                Autofill with AI
            </Button>
            <Button 
                type="button" 
                onClick={handleSanityCheck} 
                disabled={isCheckingSanity || !formState.playbookId || !formState.asset || !formState.screenshotBeforeUrl} 
                variant="secondary"
                className="w-full sm:w-auto text-xs py-1.5 px-3 flex items-center justify-center gap-2"
            >
                {isCheckingSanity ? <Spinner /> : <ChecklistIcon className="w-4 h-4 text-photonic-blue" />}
                AI Sanity Check
            </Button>
        </div>
        {aiError && <p className="text-risk-high text-xs text-center my-2">{aiError}</p>}


        <Input
            label="Entry Date & Time"
            id="entryDate"
            name="entryDate"
            type="datetime-local"
            value={formState.entryDate}
            onChange={handleInputChange}
            required
            step="1"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isEditMode ? (
                <Input label="Asset" id="asset" name="asset" value={formState.asset} disabled />
            ) : (
                <SelectInput label="Asset" id="asset" name="asset" value={formState.asset} onChange={handleInputChange} options={assetOptions} required />
            )}
            <SelectInput label="Direction" id="direction" name="direction" value={formState.direction} onChange={handleInputChange} options={[{ value: 'Buy', label: 'Buy (Long)' }, { value: 'Sell', label: 'Sell (Short)' }]}/>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Entry Price" id="entryPrice" name="entryPrice" type="number" step="any" value={formState.entryPrice} onChange={handleInputChange} required />
            <Input label="Risk (%)" id="riskPercentage" name="riskPercentage" type="number" step="any" value={formState.riskPercentage} onChange={handleInputChange} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Lot Size (Optional)" id="lotSize" name="lotSize" type="number" step="any" value={formState.lotSize} onChange={handleInputChange} />
            <Input label="Stop Loss (Optional)" id="stopLoss" name="stopLoss" type="number" step="any" value={formState.stopLoss} onChange={handleInputChange} />
            <Input label="Take Profit (Optional)" id="takeProfit" name="takeProfit" type="number" step="any" value={formState.takeProfit} onChange={handleInputChange} />
        </div>
        
        <SelectInput label="Playbook" id="playbookId" name="playbookId" value={formState.playbookId} onChange={handleInputChange}
            disabled={playbooks.length === 0}
            options={playbooks.length > 0 ? playbooks.map(s => ({ value: s.id, label: s.name })) : [{ value: '', label: 'Create a playbook first' }]}
          />

        <Checkbox 
            label="This is a Pending Order"
            id="isPendingOrderCheckbox"
            checked={isPendingOrder}
            onChange={(e) => setIsPendingOrder(e.target.checked)}
            disabled={isEditMode && !tradeToEdit.isPendingOrder} 
        />

        <div className="mt-6 pt-6 border-t border-white/10">
            {error && <p className="text-risk-high text-sm text-center mb-4">{error}</p>}
            <Button type="submit" disabled={isLoading || !canSubmit} isLoading={isLoading} className="w-full">
                {isEditMode ? 'Save Changes' : 'Log Trade'}
            </Button>
        </div>
    </form>
    
    {isAutofillModalOpen && (
        <AutofillModal 
            onClose={() => setIsAutofillModalOpen(false)}
            onApply={handleApplyAutofill}
        />
    )}

    {showSanityCheckModal && sanityCheckResult && (
        <SanityCheckModal 
            result={sanityCheckResult} 
            onClose={() => setShowSanityCheckModal(false)} 
            onConfirm={() => setShowSanityCheckModal(false)}
        />
    )}
    </>
  );
};

export default AddTradeForm;
