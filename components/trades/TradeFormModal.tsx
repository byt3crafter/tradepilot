import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import SelectInput from '../ui/SelectInput';
import Checkbox from '../ui/Checkbox';
import ImageUploader from './ImageUploader';
import LogWithAI from './LogWithAI';
import Spinner from '../Spinner';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { Trade, Direction, FeeModel } from '../../types';
import { useTrade } from '../../context/TradeContext';
import { usePlaybook } from '../../context/PlaybookContext';
import { useAssets } from '../../context/AssetContext';
import { useAuth } from '../../context/AuthContext';
import { useAccount } from '../../context/AccountContext';
import api from '../../services/api';

interface TradeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeToEdit?: Trade | null;
  onSuccess: () => void;
}

interface FormState {
  asset: string;
  direction: Direction;
  entryDate: string;
  entryPrice: string;
  stopLoss: string;
  riskPercentage: string;

  // More details section
  exitPrice: string;
  exitDate: string;
  takeProfit: string;
  lotSize: string;
  playbookId: string;
  isPendingOrder: boolean;
  screenshotBeforeUrl: string | null;
  screenshotAfterUrl: string | null;
  commission: string;
  swap: string;
  playbookSetupId?: string;
}

const toDateTimeLocal = (dateString?: string | null) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - timezoneOffset);
  return localDate.toISOString().slice(0, 19);
};

const TradeFormModal: React.FC<TradeFormModalProps> = ({
  isOpen,
  onClose,
  tradeToEdit,
  onSuccess
}) => {
  const { createTrade, updateTrade } = useTrade();
  const { playbooks } = usePlaybook();
  const { specs } = useAssets();
  const { accessToken } = useAuth();
  const { activeAccount } = useAccount();

  const isEditMode = !!tradeToEdit;
  const [showMoreDetails, setShowMoreDetails] = useState(isEditMode);

  // Determine if we should show commission/swap based on account fee model
  const shouldShowCosts = useMemo(() => {
    if (!activeAccount) return false;
    return activeAccount.feeModel === FeeModel.COMMISSION_ONLY ||
      activeAccount.feeModel === FeeModel.COMMISSION_AND_SWAP;
  }, [activeAccount]);

  const [formState, setFormState] = useState<FormState>({
    asset: '',
    direction: Direction.Buy,
    entryDate: toDateTimeLocal(new Date().toISOString()),
    entryPrice: '',
    stopLoss: '',
    riskPercentage: '1',
    exitPrice: '',
    exitDate: '',
    takeProfit: '',
    lotSize: '',
    playbookId: '',
    isPendingOrder: false,
    screenshotBeforeUrl: null,
    screenshotAfterUrl: null,
    commission: '',
    swap: '',
    playbookSetupId: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiParseError, setAiParseError] = useState<string | null>(null);
  const [isParsingText, setIsParsingText] = useState(false);
  const [aiParsedSuccessfully, setAiParsedSuccessfully] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Prevent double submission

  // Populate form when editing
  useEffect(() => {
    if (isEditMode && tradeToEdit) {
      setFormState({
        asset: tradeToEdit.asset || '',
        direction: tradeToEdit.direction || Direction.Buy,
        entryDate: toDateTimeLocal(tradeToEdit.entryDate),
        entryPrice: tradeToEdit.entryPrice?.toString() ?? '',
        stopLoss: tradeToEdit.stopLoss?.toString() ?? '',
        riskPercentage: tradeToEdit.riskPercentage?.toString() ?? '1',
        exitPrice: tradeToEdit.exitPrice?.toString() ?? '',
        exitDate: toDateTimeLocal(tradeToEdit.exitDate),
        takeProfit: tradeToEdit.takeProfit?.toString() ?? '',
        lotSize: tradeToEdit.lotSize?.toString() ?? '',
        playbookId: tradeToEdit.playbookId || '',
        isPendingOrder: tradeToEdit.isPendingOrder ?? false,
        screenshotBeforeUrl: tradeToEdit.screenshotBeforeUrl || null,
        screenshotAfterUrl: tradeToEdit.screenshotAfterUrl || null,
        commission: tradeToEdit.commission?.toString() ?? '',
        swap: tradeToEdit.swap?.toString() ?? '',
        playbookSetupId: tradeToEdit.playbookSetupId || '',
      });
    } else {
      // Default playbook for new trades
      setFormState(prev => ({
        ...prev,
        playbookId: playbooks[0]?.id || '',
      }));
    }
  }, [tradeToEdit, isEditMode, playbooks]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (field: 'screenshotBeforeUrl' | 'screenshotAfterUrl', dataUrl: string | null) => {
    setFormState(prev => ({ ...prev, [field]: dataUrl }));
  };

  // AI Text Parsing
  const handleParseText = async (text: string) => {
    if (!accessToken) return;

    setIsParsingText(true);
    setAiParseError(null);

    try {
      const availableAssets = specs.map(s => s.symbol);
      const result = await api.parseTradeText(text, availableAssets, accessToken);

      // Apply parsed data to form
      const updates: Partial<FormState> = {};
      if (result.asset) updates.asset = result.asset;
      if (result.direction) updates.direction = result.direction as Direction;
      if (result.entryPrice !== null && result.entryPrice !== undefined) {
        updates.entryPrice = String(result.entryPrice);
      }
      if (result.stopLoss !== null && result.stopLoss !== undefined) {
        updates.stopLoss = String(result.stopLoss);
      }
      if (result.takeProfit !== null && result.takeProfit !== undefined) {
        updates.takeProfit = String(result.takeProfit);
      }
      if (result.riskPercentage !== null && result.riskPercentage !== undefined) {
        updates.riskPercentage = String(result.riskPercentage);
      }
      if (result.exitPrice !== null && result.exitPrice !== undefined) {
        updates.exitPrice = String(result.exitPrice);
      }
      // Only update entry date if it's a valid date string
      if (result.entryDate && result.entryDate !== 'null' && result.entryDate !== '') {
        try {
          const parsedDate = new Date(result.entryDate);
          if (!isNaN(parsedDate.getTime())) {
            updates.entryDate = toDateTimeLocal(parsedDate.toISOString());
          }
        } catch (e) {
          console.warn('Invalid date from AI:', result.entryDate);
        }
      }

      setFormState(prev => ({ ...prev, ...updates }));

      // Mark as successfully parsed
      setAiParsedSuccessfully(true);

      // Show warnings for missing fields
      const warnings = [];
      if (!result.stopLoss) warnings.push('Stop loss not detected');
      if (!result.takeProfit) warnings.push('Take profit not detected');

      if (warnings.length > 0) {
        setAiParseError(`Note: ${warnings.join(', ')}. You can add them manually.`);
      }
    } catch (err: any) {
      setAiParseError(err.message || 'Failed to parse trade text.');
      setAiParsedSuccessfully(false);
    } finally {
      setIsParsingText(false);
    }
  };

  const handleQuickSubmit = async () => {
    // Prevent multiple submissions
    if (isSubmitting || isLoading || !canSubmit) {
      console.log('Quick submit blocked:', { isSubmitting, isLoading, canSubmit });
      return;
    }

    console.log('Starting quick submit...');
    setIsSubmitting(true);
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
      lotSize: formState.lotSize ? Number(formState.lotSize) : null,
      screenshotBeforeUrl: formState.screenshotBeforeUrl,
      playbookSetupId: formState.playbookSetupId || null,
    };

    console.log('Payload:', payload);

    try {
      console.log('Calling createTrade...');
      await createTrade(payload);
      console.log('Trade created successfully!');

      // Don't reset loading state - let modal close
      console.log('Calling onSuccess...');
      if (onSuccess) onSuccess();

      console.log('Calling onClose...');
      if (onClose) onClose();

      console.log('Quick submit completed!');
    } catch (err: any) {
      console.error('Quick submit error:', err);
      setError(err.message || 'An unexpected error occurred.');
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  const canSubmit = useMemo(() => {
    return formState.asset && formState.entryPrice && formState.playbookId;
  }, [formState.asset, formState.entryPrice, formState.playbookId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      console.log('Form submit blocked - already submitting');
      return;
    }

    if (!canSubmit) {
      setError('Please fill all required fields.');
      return;
    }

    setIsSubmitting(true);
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
      lotSize: formState.lotSize ? Number(formState.lotSize) : null,
      screenshotBeforeUrl: formState.screenshotBeforeUrl,
      playbookSetupId: formState.playbookSetupId || null,
    };

    // Only include exit-related fields when editing a closed trade
    if (isEditMode && tradeToEdit?.result) {
      payload.screenshotAfterUrl = formState.screenshotAfterUrl;
      payload.commission = formState.commission ? Number(formState.commission) : null;
      payload.swap = formState.swap ? Number(formState.swap) : null;

      if (formState.exitPrice) {
        payload.exitPrice = Number(formState.exitPrice);
        payload.exitDate = formState.exitDate ? new Date(formState.exitDate).toISOString() : null;
      }
    }

    try {
      console.log('Form submit - payload:', payload);
      if (isEditMode && tradeToEdit) {
        console.log('Updating trade...');
        await updateTrade(tradeToEdit.id, payload);
      } else {
        console.log('Creating new trade...');
        await createTrade(payload);
      }
      console.log('Trade saved successfully!');

      // Don't reset states - let modal close
      console.log('Calling onSuccess...');
      if (onSuccess) onSuccess();

      console.log('Calling onClose...');
      if (onClose) onClose();

      console.log('Form submit completed!');
    } catch (err: any) {
      console.error('Form submit error:', err);
      setError(err.message || 'An unexpected error occurred.');
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  const assetOptions = useMemo(() => [
    { value: '', label: 'Select an Asset...' },
    ...specs.map(spec => ({ value: spec.symbol, label: spec.symbol }))
  ], [specs]);

  if (!isOpen) return null;

  return (
    <Modal
      title={isEditMode ? 'Edit Trade' : 'Log Trade'}
      onClose={onClose}
      size="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* AI Section - Only show for new trades */}
        {!isEditMode && (
          <LogWithAI
            onParsedData={(data) => console.log('Parsed:', data)}
            isLoading={isParsingText}
            onParseText={handleParseText}
            error={aiParseError}
            onQuickSubmit={handleQuickSubmit}
            canQuickSubmit={aiParsedSuccessfully && canSubmit}
            isSubmitting={isLoading}
          />
        )}

        {/* Core Trade Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-orbitron text-photonic-blue/80 uppercase tracking-wide border-b border-white/10 pb-2">
            Core Trade
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isEditMode ? (
              <Input
                label="Asset"
                id="asset"
                name="asset"
                value={formState.asset}
                disabled
                containerClassName="mb-0"
              />
            ) : (
              <SelectInput
                label="Asset"
                id="asset"
                name="asset"
                value={formState.asset}
                onChange={handleInputChange}
                options={assetOptions}
                required
              />
            )}
            <SelectInput
              label="Direction"
              id="direction"
              name="direction"
              value={formState.direction}
              onChange={handleInputChange}
              options={[
                { value: 'Buy', label: 'Buy (Long)' },
                { value: 'Sell', label: 'Sell (Short)' }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Entry Price"
              id="entryPrice"
              name="entryPrice"
              type="number"
              step="any"
              value={formState.entryPrice}
              onChange={handleInputChange}
              required
              containerClassName="mb-0"
            />
            <Input
              label="Stop Loss (Optional)"
              id="stopLoss"
              name="stopLoss"
              type="number"
              step="any"
              value={formState.stopLoss}
              onChange={handleInputChange}
              containerClassName="mb-0"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Risk (%)"
              id="riskPercentage"
              name="riskPercentage"
              type="number"
              step="any"
              value={formState.riskPercentage}
              onChange={handleInputChange}
              required
              containerClassName="mb-0"
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
              containerClassName="mb-0"
            />
          </div>
        </div>

        {/* More Details Section (Collapsible) */}
        <div className="border-t border-white/10 pt-4">
          <button
            type="button"
            className="w-full flex items-center justify-between py-2 hover:bg-white/5 transition-colors rounded px-2"
            onClick={() => setShowMoreDetails(!showMoreDetails)}
          >
            <h3 className="text-sm font-orbitron text-photonic-blue/80 uppercase tracking-wide">
              More Details (Optional)
            </h3>
            <ChevronDownIcon
              className={`w-5 h-5 text-photonic-blue/80 transition-transform ${showMoreDetails ? 'rotate-180' : ''}`}
            />
          </button>

          {showMoreDetails && (
            <div className="animate-fade-in-up space-y-4 mt-4">

              {/* Exit Details - Only show when editing a closed trade */}
              {isEditMode && tradeToEdit?.result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Exit Price"
                    id="exitPrice"
                    name="exitPrice"
                    type="number"
                    step="any"
                    value={formState.exitPrice}
                    onChange={handleInputChange}
                    containerClassName="mb-0"
                  />
                  <Input
                    label="Exit Date & Time"
                    id="exitDate"
                    name="exitDate"
                    type="datetime-local"
                    value={formState.exitDate}
                    onChange={handleInputChange}
                    step="1"
                    containerClassName="mb-0"
                  />
                </div>
              )}

              {/* Execution Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Take Profit"
                  id="takeProfit"
                  name="takeProfit"
                  type="number"
                  step="any"
                  value={formState.takeProfit}
                  onChange={handleInputChange}
                  containerClassName="mb-0"
                />
                <Input
                  label="Lot Size / Position Size"
                  id="lotSize"
                  name="lotSize"
                  type="number"
                  step="any"
                  value={formState.lotSize}
                  onChange={handleInputChange}
                  containerClassName="mb-0"
                />
              </div>

              {/* Playbook & Pending Order */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectInput
                  label="Playbook / Strategy"
                  id="playbookId"
                  name="playbookId"
                  value={formState.playbookId}
                  onChange={(e) => {
                    handleInputChange(e);
                    // Reset setup when playbook changes
                    setFormState(prev => ({ ...prev, playbookSetupId: '' }));
                  }}
                  disabled={playbooks.length === 0}
                  options={playbooks.length > 0
                    ? playbooks.map(s => ({ value: s.id, label: s.name }))
                    : [{ value: '', label: 'Create a playbook first' }]
                  }
                />

                {formState.playbookId && (
                  <SelectInput
                    label="Specific Setup (Optional)"
                    id="playbookSetupId"
                    name="playbookSetupId"
                    value={formState.playbookSetupId || ''}
                    onChange={handleInputChange}
                    options={[
                      { value: '', label: 'General / No Specific Setup' },
                      ...(playbooks.find(p => p.id === formState.playbookId)?.setups.map(s => ({ value: s.id, label: s.name })) || [])
                    ]}
                  />
                )}

                <div className="flex items-end pb-2">
                  <Checkbox
                    label="This is a Pending Order"
                    id="isPendingOrderCheckbox"
                    checked={formState.isPendingOrder}
                    onChange={(e) => setFormState(prev => ({ ...prev, isPendingOrder: e.target.checked }))}
                    disabled={isEditMode && !tradeToEdit?.isPendingOrder}
                  />
                </div>
              </div>

              {/* Screenshots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ImageUploader
                  label="Before Entry Screenshot"
                  onImageUpload={(data) => handleImageUpload('screenshotBeforeUrl', data)}
                  currentImage={formState.screenshotBeforeUrl}
                />
                {/* After Exit Screenshot - Only show when editing a closed trade */}
                {isEditMode && tradeToEdit?.result && (
                  <ImageUploader
                    label="After Exit Screenshot"
                    onImageUpload={(data) => handleImageUpload('screenshotAfterUrl', data)}
                    currentImage={formState.screenshotAfterUrl}
                  />
                )}
              </div>

              {/* Costs (Commission & Swap) - Only show when editing a closed trade and fee model requires it */}
              {isEditMode && tradeToEdit?.result && shouldShowCosts && (
                <div className="bg-future-dark/30 border border-white/10 rounded-lg p-4">
                  <h4 className="text-xs font-orbitron text-future-gray/80 uppercase tracking-wide mb-3">
                    Costs (Optional)
                  </h4>
                  <p className="text-xs text-future-gray mb-3 italic">
                    Leave empty if your broker already includes this in P/L.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(activeAccount?.feeModel === FeeModel.COMMISSION_ONLY ||
                      activeAccount?.feeModel === FeeModel.COMMISSION_AND_SWAP) && (
                        <Input
                          label="Commission ($)"
                          id="commission"
                          name="commission"
                          type="number"
                          step="any"
                          value={formState.commission}
                          onChange={handleInputChange}
                          containerClassName="mb-0"
                        />
                      )}
                    {activeAccount?.feeModel === FeeModel.COMMISSION_AND_SWAP && (
                      <Input
                        label="Swap / Financing ($)"
                        id="swap"
                        name="swap"
                        type="number"
                        step="any"
                        value={formState.swap}
                        onChange={handleInputChange}
                        containerClassName="mb-0"
                      />
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Submit Section */}
        <div className="mt-6 pt-6 border-t border-white/10">
          {error && <p className="text-risk-high text-sm text-center mb-4">{error}</p>}
          <Button
            type="submit"
            disabled={isLoading || !canSubmit}
            isLoading={isLoading}
            className="w-full"
          >
            {isEditMode ? 'Save Changes' : 'Log Trade'}
          </Button>
        </div>

      </form>
    </Modal>
  );
};

export default TradeFormModal;
