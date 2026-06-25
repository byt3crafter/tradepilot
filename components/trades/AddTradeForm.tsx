
import React, { useState, useEffect, useMemo } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import SelectInput from '../ui/SelectInput';
import { usePlaybook } from '../../context/PlaybookContext';
import { Trade, Direction } from '../../types';
import { useTrade } from '../../context/TradeContext';
import { useAssets } from '../../context/AssetContext';
import { useAccount } from '../../context/AccountContext';
import ImageUploader from './ImageUploader';
import Checkbox from '../ui/Checkbox';

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
  const { activeAccount, smartLimitsProgress } = useAccount();

  const isEditMode = !!tradeToEdit;

  const isHardLimitReached = !isEditMode
    && activeAccount?.smartLimits?.isEnabled
    && activeAccount?.smartLimits?.severity === 'HARD'
    && smartLimitsProgress?.isTradeCreationBlocked;

  const blockReason = smartLimitsProgress?.blockReason || 'Smart limit reached';
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
        entryDate: toDateTimeLocal(new Date().toISOString()),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      setError("Please fill all required fields.");
      return;
    }

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
    ...specs.map(spec => ({ value: spec.symbol, label: spec.symbol })),
  ], [specs]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ImageUploader
        label="Before Entry Screenshot (for Journaling)"
        onImageUpload={(data) => handleImageUpload('screenshotBeforeUrl', data)}
        currentImage={formState.screenshotBeforeUrl}
      />

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
        <SelectInput
          label="Direction"
          id="direction"
          name="direction"
          value={formState.direction}
          onChange={handleInputChange}
          options={[{ value: 'Buy', label: 'Buy (Long)' }, { value: 'Sell', label: 'Sell (Short)' }]}
        />
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

      <SelectInput
        label="Playbook"
        id="playbookId"
        name="playbookId"
        value={formState.playbookId}
        onChange={handleInputChange}
        disabled={playbooks.length === 0}
        options={playbooks.length > 0 ? playbooks.map(s => ({ value: s.id, label: s.name })) : [{ value: '', label: 'Create a playbook first' }]}
      />

      <Checkbox
        label="This is a Pending Order"
        id="isPendingOrderCheckbox"
        checked={isPendingOrder}
        onChange={(e) => setIsPendingOrder(e.target.checked)}
        disabled={isEditMode && !tradeToEdit?.isPendingOrder}
      />

      <div className="mt-6 pt-6 border-t border-white/10">
        {isHardLimitReached && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {blockReason}
          </div>
        )}
        {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
        <Button
          type="submit"
          disabled={isLoading || !canSubmit || !!isHardLimitReached}
          isLoading={isLoading}
          className="w-full"
        >
          {isEditMode ? 'Save Changes' : 'Log Trade'}
        </Button>
      </div>
    </form>
  );
};

export default AddTradeForm;
