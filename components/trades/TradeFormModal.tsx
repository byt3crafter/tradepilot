import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import SelectInput from '../ui/SelectInput';
import Checkbox from '../ui/Checkbox';
import ImageUploader from './ImageUploader';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { Trade, Direction, FeeModel } from '../../types';
import { useTrade } from '../../context/TradeContext';
import { usePlaybook } from '../../context/PlaybookContext';
import { useAssets } from '../../context/AssetContext';
import { useAccount } from '../../context/AccountContext';

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
  exitPrice: string;
  exitDate: string;
  lotSize: string;
  stopLoss: string;
  takeProfit: string;
  riskPercentage: string;
  playbookId: string;
  playbookSetupId: string;
  isPendingOrder: boolean;
  screenshotBeforeUrl: string | null;
  screenshotAfterUrl: string | null;
  commission: string;
  swap: string;
}

const toDateTimeLocal = (dateString?: string | null) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 19);
};

const TradeFormModal: React.FC<TradeFormModalProps> = ({
  isOpen,
  onClose,
  tradeToEdit,
  onSuccess,
}) => {
  const { createTrade, updateTrade } = useTrade();
  const { playbooks } = usePlaybook();
  const { specs } = useAssets();
  const { activeAccount } = useAccount();

  const isEditMode = !!tradeToEdit;
  const [showAdvanced, setShowAdvanced] = useState(isEditMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const shouldShowCosts = useMemo(() => {
    if (!activeAccount) return false;
    return (
      activeAccount.feeModel === FeeModel.COMMISSION_ONLY ||
      activeAccount.feeModel === FeeModel.COMMISSION_AND_SWAP
    );
  }, [activeAccount]);

  const [formState, setFormState] = useState<FormState>({
    asset: '',
    direction: Direction.Buy,
    entryDate: toDateTimeLocal(new Date().toISOString()),
    entryPrice: '',
    exitPrice: '',
    exitDate: '',
    lotSize: '',
    stopLoss: '',
    takeProfit: '',
    riskPercentage: '1',
    playbookId: '',
    playbookSetupId: '',
    isPendingOrder: false,
    screenshotBeforeUrl: null,
    screenshotAfterUrl: null,
    commission: '',
    swap: '',
  });

  useEffect(() => {
    if (isEditMode && tradeToEdit) {
      setFormState({
        asset: tradeToEdit.asset || '',
        direction: tradeToEdit.direction || Direction.Buy,
        entryDate: toDateTimeLocal(tradeToEdit.entryDate),
        entryPrice: tradeToEdit.entryPrice?.toString() ?? '',
        exitPrice: tradeToEdit.exitPrice?.toString() ?? '',
        exitDate: toDateTimeLocal(tradeToEdit.exitDate),
        lotSize: tradeToEdit.lotSize?.toString() ?? '',
        stopLoss: tradeToEdit.stopLoss?.toString() ?? '',
        takeProfit: tradeToEdit.takeProfit?.toString() ?? '',
        riskPercentage: tradeToEdit.riskPercentage?.toString() ?? '1',
        playbookId: tradeToEdit.playbookId || '',
        playbookSetupId: tradeToEdit.playbookSetupId || '',
        isPendingOrder: tradeToEdit.isPendingOrder ?? false,
        screenshotBeforeUrl: tradeToEdit.screenshotBeforeUrl || null,
        screenshotAfterUrl: tradeToEdit.screenshotAfterUrl || null,
        commission: tradeToEdit.commission?.toString() ?? '',
        swap: tradeToEdit.swap?.toString() ?? '',
      });
    } else {
      setFormState(prev => ({
        ...prev,
        playbookId: playbooks[0]?.id || '',
      }));
    }
  }, [tradeToEdit, isEditMode, playbooks]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (
    field: 'screenshotBeforeUrl' | 'screenshotAfterUrl',
    dataUrl: string | null,
  ) => {
    setFormState(prev => ({ ...prev, [field]: dataUrl }));
  };

  const canSubmit = useMemo(
    () => !!(formState.asset && formState.entryPrice),
    [formState.asset, formState.entryPrice],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isLoading) return;

    setIsLoading(true);
    setError('');

    const payload: Partial<Trade> = {
      asset: formState.asset,
      direction: formState.direction,
      entryPrice: Number(formState.entryPrice),
      riskPercentage: formState.riskPercentage ? Number(formState.riskPercentage) : undefined,
      playbookId: formState.playbookId || undefined,
      playbookSetupId: formState.playbookSetupId || null,
      isPendingOrder: formState.isPendingOrder,
      entryDate: formState.entryDate
        ? new Date(formState.entryDate).toISOString()
        : new Date().toISOString(),
      stopLoss: formState.stopLoss ? Number(formState.stopLoss) : null,
      takeProfit: formState.takeProfit ? Number(formState.takeProfit) : null,
      lotSize: formState.lotSize ? Number(formState.lotSize) : null,
      screenshotBeforeUrl: formState.screenshotBeforeUrl,
    };

    // Include exit fields if provided (logging a completed trade)
    if (formState.exitPrice) {
      payload.exitPrice = Number(formState.exitPrice);
      payload.exitDate = formState.exitDate
        ? new Date(formState.exitDate).toISOString()
        : new Date().toISOString();
    }

    // When editing a closed trade, include additional fields
    if (isEditMode && tradeToEdit?.result) {
      payload.screenshotAfterUrl = formState.screenshotAfterUrl;
      if (shouldShowCosts) {
        payload.commission = formState.commission ? Number(formState.commission) : null;
        payload.swap = formState.swap ? Number(formState.swap) : null;
      }
    }

    try {
      if (isEditMode && tradeToEdit) {
        await updateTrade(tradeToEdit.id, payload);
      } else {
        await createTrade(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const assetOptions = useMemo(
    () => [
      { value: '', label: 'Select asset…' },
      ...specs.map(s => ({ value: s.symbol, label: s.symbol })),
    ],
    [specs],
  );

  const selectedPlaybook = playbooks.find(p => p.id === formState.playbookId);

  if (!isOpen) return null;

  return (
    <Modal title={isEditMode ? 'Edit Trade' : 'Log Trade'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Core fields ─────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Asset + Direction */}
          <div className="grid grid-cols-2 gap-3">
            {isEditMode ? (
              <div>
                <label className="block text-jtp-xs font-semibold uppercase tracking-[0.4px] text-jtp-textDim mb-1">
                  Asset
                </label>
                <div className="px-3 py-[9px] bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl text-jtp-base-minus text-jtp-textMuted">
                  {formState.asset || '—'}
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="asset" className="block text-jtp-xs font-semibold uppercase tracking-[0.4px] text-jtp-textDim mb-1">
                  Asset <span className="text-jtp-loss">*</span>
                </label>
                <select
                  id="asset"
                  name="asset"
                  value={formState.asset}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-[9px] bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl text-jtp-base-minus text-jtp-text outline-none focus:border-jtp-blue transition-colors"
                >
                  {assetOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="direction" className="block text-jtp-xs font-semibold uppercase tracking-[0.4px] text-jtp-textDim mb-1">
                Direction
              </label>
              <select
                id="direction"
                name="direction"
                value={formState.direction}
                onChange={handleChange}
                className="w-full px-3 py-[9px] bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl text-jtp-base-minus text-jtp-text outline-none focus:border-jtp-blue transition-colors"
              >
                <option value="Buy">Long (Buy)</option>
                <option value="Sell">Short (Sell)</option>
              </select>
            </div>
          </div>

          {/* Entry Price + Entry Date */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Entry Price *"
              id="entryPrice"
              name="entryPrice"
              type="number"
              step="any"
              value={formState.entryPrice}
              onChange={handleChange}
              required
              containerClassName="mb-0"
            />
            <Input
              label="Entry Date & Time *"
              id="entryDate"
              name="entryDate"
              type="datetime-local"
              value={formState.entryDate}
              onChange={handleChange}
              required
              step="1"
              containerClassName="mb-0"
            />
          </div>

          {/* Exit Price + Exit Date */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Exit Price"
              id="exitPrice"
              name="exitPrice"
              type="number"
              step="any"
              value={formState.exitPrice}
              onChange={handleChange}
              containerClassName="mb-0"
            />
            <Input
              label="Exit Date & Time"
              id="exitDate"
              name="exitDate"
              type="datetime-local"
              value={formState.exitDate}
              onChange={handleChange}
              step="1"
              containerClassName="mb-0"
            />
          </div>

          {/* Lot Size */}
          <Input
            label="Lot Size / Position Size"
            id="lotSize"
            name="lotSize"
            type="number"
            step="any"
            value={formState.lotSize}
            onChange={handleChange}
            containerClassName="mb-0"
          />
        </div>

        {/* ── Advanced (collapsible) ───────────────────────────── */}
        <div className="border-t border-jtp-border pt-3">
          <button
            type="button"
            className="w-full flex items-center justify-between py-1.5 text-left"
            onClick={() => setShowAdvanced(v => !v)}
          >
            <span className="text-jtp-xs font-semibold uppercase tracking-[0.4px] text-jtp-blue">
              Advanced
            </span>
            <ChevronDownIcon
              className={`w-4 h-4 text-jtp-blue transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            />
          </button>

          {showAdvanced && (
            <div className="space-y-4 mt-3">
              {/* SL + TP */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Stop Loss"
                  id="stopLoss"
                  name="stopLoss"
                  type="number"
                  step="any"
                  value={formState.stopLoss}
                  onChange={handleChange}
                  containerClassName="mb-0"
                />
                <Input
                  label="Take Profit"
                  id="takeProfit"
                  name="takeProfit"
                  type="number"
                  step="any"
                  value={formState.takeProfit}
                  onChange={handleChange}
                  containerClassName="mb-0"
                />
              </div>

              {/* Risk % */}
              <Input
                label="Risk (%)"
                id="riskPercentage"
                name="riskPercentage"
                type="number"
                step="any"
                value={formState.riskPercentage}
                onChange={handleChange}
                containerClassName="mb-0"
              />

              {/* Playbook + Setup */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SelectInput
                  label="Playbook / Strategy"
                  id="playbookId"
                  name="playbookId"
                  value={formState.playbookId}
                  onChange={e => {
                    handleChange(e);
                    setFormState(prev => ({ ...prev, playbookSetupId: '' }));
                  }}
                  disabled={playbooks.length === 0}
                  options={
                    playbooks.length > 0
                      ? [{ value: '', label: 'None' }, ...playbooks.map(p => ({ value: p.id, label: p.name }))]
                      : [{ value: '', label: 'Create a playbook first' }]
                  }
                />

                {selectedPlaybook && selectedPlaybook.setups?.length > 0 && (
                  <SelectInput
                    label="Specific Setup"
                    id="playbookSetupId"
                    name="playbookSetupId"
                    value={formState.playbookSetupId}
                    onChange={handleChange}
                    options={[
                      { value: '', label: 'General / No specific setup' },
                      ...selectedPlaybook.setups.map(s => ({ value: s.id, label: s.name })),
                    ]}
                  />
                )}
              </div>

              {/* Pending order */}
              <div className="flex items-center gap-2 py-1">
                <Checkbox
                  label="This is a Pending Order"
                  id="isPendingOrderCheckbox"
                  checked={formState.isPendingOrder}
                  onChange={e =>
                    setFormState(prev => ({ ...prev, isPendingOrder: e.target.checked }))
                  }
                  disabled={isEditMode && !tradeToEdit?.isPendingOrder}
                />
              </div>

              {/* Screenshots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ImageUploader
                  label="Before Entry Screenshot"
                  onImageUpload={data => handleImageUpload('screenshotBeforeUrl', data)}
                  currentImage={formState.screenshotBeforeUrl}
                />
                {isEditMode && tradeToEdit?.result && (
                  <ImageUploader
                    label="After Exit Screenshot"
                    onImageUpload={data => handleImageUpload('screenshotAfterUrl', data)}
                    currentImage={formState.screenshotAfterUrl}
                  />
                )}
              </div>

              {/* Costs (edit mode + fee model) */}
              {isEditMode && tradeToEdit?.result && shouldShowCosts && (
                <div className="bg-jtp-raised border border-jtp-border rounded-jtp-panel p-4 space-y-3">
                  <p className="text-jtp-xs font-semibold uppercase tracking-[0.4px] text-jtp-textDim">
                    Costs (optional)
                  </p>
                  <p className="text-jtp-xs text-jtp-textFaint italic">
                    Leave empty if your broker already includes this in P&L.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {(activeAccount?.feeModel === FeeModel.COMMISSION_ONLY ||
                      activeAccount?.feeModel === FeeModel.COMMISSION_AND_SWAP) && (
                      <Input
                        label="Commission ($)"
                        id="commission"
                        name="commission"
                        type="number"
                        step="any"
                        value={formState.commission}
                        onChange={handleChange}
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
                        onChange={handleChange}
                        containerClassName="mb-0"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Submit ──────────────────────────────────────────── */}
        <div className="pt-2">
          {error && (
            <p className="text-jtp-loss text-jtp-sm text-center mb-3">{error}</p>
          )}
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
