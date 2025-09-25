import React, { useState, useEffect, useMemo } from 'react';
import AuthInput from '../auth/AuthInput';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import SelectInput from '../ui/SelectInput';
import { usePlaybook } from '../../context/PlaybookContext';
import { Trade, TradeResult, PreTradeCheckResult } from '../../types';
import { useTrade } from '../../context/TradeContext';
import { useAssets } from '../../context/AssetContext';
import ImageUploader from './ImageUploader';
import Checkbox from '../ui/Checkbox';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { XCircleIcon } from '../icons/XCircleIcon';
import { QuestionMarkCircleIcon } from '../icons/QuestionMarkCircleIcon';

interface TradeFormProps {
  tradeToEdit?: Trade | null;
  onSuccess: () => void;
}

// State for user-editable fields
interface FormInputState {
  asset: string;
  direction: 'Buy' | 'Sell';
  entryDate: string;
  entryPrice: string;
  lotSize: string;
  stopLoss: string;
  takeProfit: string;
  playbookId: string;
  riskPercentage: string;
  screenshotBeforeUrl: string | null;
  // Closed trade fields are handled in CloseTradeModal or by editing the row
}

const toDateTimeLocal = (dateString?: string | null) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Adjust for timezone offset to display correctly in datetime-local input
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - timezoneOffset);
  return localDate.toISOString().slice(0, 19);
};

const SanityCheckResult: React.FC<{ result: PreTradeCheckResult }> = ({ result }) => {
    const iconMap = {
        'Yes': <CheckCircleIcon className="w-5 h-5 text-momentum-green" />,
        'No': <XCircleIcon className="w-5 h-5 text-risk-high" />,
        'Indeterminate': <QuestionMarkCircleIcon className="w-5 h-5 text-future-gray" />,
    };

    return (
        <div className="mt-4 p-3 bg-future-dark/50 rounded-lg border border-photonic-blue/20 animate-fade-in-up">
            <h4 className="text-sm font-semibold text-photonic-blue mb-2">AI Sanity Check Results</h4>
            <ul className="space-y-2">
                {result.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                        <div className="flex-shrink-0 mt-0.5">{iconMap[item.met]}</div>
                        <div>
                            <p className="text-future-light">{item.rule}</p>
                            <p className="text-xs text-future-gray">{item.reasoning}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
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
    direction: 'Buy',
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
  
  // AI Sanity Check State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PreTradeCheckResult | null>(null);
  const [analysisError, setAnalysisError] = useState('');

  // Populate form on initial load or when editing
  useEffect(() => {
    if (isEditMode && tradeToEdit) {
      setFormState({
        asset: tradeToEdit.asset || '',
        direction: tradeToEdit.direction || 'Buy',
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
        // For new trades, ensure a default playbook is selected if available
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

  const canAnalyze = useMemo(() => {
    return formState.playbookId && formState.asset && formState.screenshotBeforeUrl;
  }, [formState.playbookId, formState.asset, formState.screenshotBeforeUrl]);

  const handleSanityCheck = async () => {
    if (!canAnalyze || !accessToken) return;
    setIsAnalyzing(true);
    setAnalysisError('');
    setAnalysisResult(null);

    try {
        const result = await api.preTradeCheck({
            playbookId: formState.playbookId,
            asset: formState.asset,
            screenshotBeforeUrl: formState.screenshotBeforeUrl!,
        }, accessToken);
        setAnalysisResult(result);
    } catch (err: any) {
        setAnalysisError(err.message || "Failed to run analysis.");
    } finally {
        setIsAnalyzing(false);
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
    
    // When editing, preserve fields that aren't on this form
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
    <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
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
                <AuthInput label="Asset" id="asset" name="asset" value={formState.asset} disabled />
            ) : (
                <SelectInput label="Asset" id="asset" name="asset" value={formState.asset} onChange={handleInputChange} options={assetOptions} required />
            )}
            <SelectInput label="Direction" id="direction" name="direction" value={formState.direction} onChange={handleInputChange} options={[{ value: 'Buy', label: 'Buy (Long)' }, { value: 'Sell', label: 'Sell (Short)' }]}/>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AuthInput label="Entry Price" id="entryPrice" name="entryPrice" type="number" step="any" value={formState.entryPrice} onChange={handleInputChange} required />
            <AuthInput label="Risk (%)" id="riskPercentage" name="riskPercentage" type="number" step="any" value={formState.riskPercentage} onChange={handleInputChange} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <AuthInput label="Lot Size (Optional)" id="lotSize" name="lotSize" type="number" step="any" value={formState.lotSize} onChange={handleInputChange} />
            <AuthInput label="Stop Loss (Optional)" id="stopLoss" name="stopLoss" type="number" step="any" value={formState.stopLoss} onChange={handleInputChange} />
            <AuthInput label="Take Profit (Optional)" id="takeProfit" name="takeProfit" type="number" step="any" value={formState.takeProfit} onChange={handleInputChange} />
        </div>
        
        <ImageUploader 
            label="Before Entry Screenshot (Required for AI Sanity Check)"
            onImageUpload={(data) => handleImageUpload('screenshotBeforeUrl', data)}
            currentImage={formState.screenshotBeforeUrl}
        />

        <SelectInput label="Playbook" id="playbookId" name="playbookId" value={formState.playbookId} onChange={handleInputChange}
            disabled={playbooks.length === 0}
            options={playbooks.length > 0 ? playbooks.map(s => ({ value: s.id, label: s.name })) : [{ value: '', label: 'Create a playbook first' }]}
          />

        <Checkbox 
            label="This is a Pending Order"
            id="isPendingOrderCheckbox"
            checked={isPendingOrder}
            onChange={(e) => setIsPendingOrder(e.target.checked)}
            disabled={isEditMode && !tradeToEdit.isPendingOrder} // Can't make a live trade pending
        />

        {analysisResult && <SanityCheckResult result={analysisResult} />}
        {analysisError && <p className="text-risk-high text-sm text-center my-2">{analysisError}</p>}

        <div className="mt-6 pt-6 border-t border-photonic-blue/10">
            {error && <p className="text-risk-high text-sm text-center mb-4">{error}</p>}
            <div className="flex flex-col sm:flex-row gap-3">
                <Button type="button" onClick={handleSanityCheck} disabled={!canAnalyze || isAnalyzing} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-future-panel border border-photonic-blue/50 text-photonic-blue hover:bg-photonic-blue/10 hover:shadow-glow-blue">
                   {isAnalyzing ? <Spinner /> : <SparklesIcon className="w-5 h-5" />}
                   AI Sanity Check
                </Button>
                <Button type="submit" disabled={isLoading || !canSubmit} className="w-full">
                    {isLoading ? <Spinner /> : (isEditMode ? 'Save Changes' : 'Log Trade')}
                </Button>
            </div>
        </div>
    </form>
  );
};

export default AddTradeForm;