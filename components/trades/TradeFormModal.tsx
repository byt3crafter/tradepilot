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
import { useChecklist } from '../../context/ChecklistContext';

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
  confidence: number | null;
  mae: string;
  mfe: string;
  mistakeTags: string[];
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
  const { createTrade, updateTrade, closedTrades } = useTrade();
  const { playbooks } = usePlaybook();
  const { specs } = useAssets();
  const { activeAccount } = useAccount();
  const { rules } = useChecklist();

  const isEditMode = !!tradeToEdit;
  const [showAdvanced, setShowAdvanced] = useState(isEditMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [preTradeChecklistState, setPreTradeChecklistState] = useState<
    { label: string; checked: boolean }[]
  >([]);

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
    confidence: null,
    mae: '',
    mfe: '',
    mistakeTags: [],
  });

  // Initialize form fields from tradeToEdit or reset for new trade
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
        confidence: tradeToEdit.confidence ?? null,
        mae: tradeToEdit.mae?.toString() ?? '',
        mfe: tradeToEdit.mfe?.toString() ?? '',
        mistakeTags: tradeToEdit.mistakeTags ?? [],
      });
    } else {
      setFormState(prev => ({
        ...prev,
        playbookId: playbooks[0]?.id || '',
      }));
    }
  }, [tradeToEdit, isEditMode, playbooks]);

  // Initialize pre-trade checklist state
  useEffect(() => {
    if (isEditMode && tradeToEdit?.preTradeChecklistState) {
      setPreTradeChecklistState(tradeToEdit.preTradeChecklistState);
    } else if (rules.length > 0) {
      setPreTradeChecklistState(rules.map(r => ({ label: r.rule, checked: false })));
    }
  }, [tradeToEdit, isEditMode, rules]);

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

  // Mistake tag helpers
  const allSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const t of closedTrades) {
      for (const tag of t.mistakeTags ?? []) {
        if (!seen.has(tag)) {
          seen.add(tag);
          result.push(tag);
        }
      }
    }
    return result;
  }, [closedTrades]);

  const filteredSuggestions = useMemo(() => {
    const lc = tagInput.toLowerCase();
    return allSuggestions.filter(
      s => !formState.mistakeTags.includes(s) && (lc === '' || s.toLowerCase().includes(lc)),
    ).slice(0, 8);
  }, [allSuggestions, formState.mistakeTags, tagInput]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || formState.mistakeTags.includes(trimmed)) {
      setTagInput('');
      return;
    }
    setFormState(prev => ({ ...prev, mistakeTags: [...prev.mistakeTags, trimmed] }));
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setFormState(prev => ({ ...prev, mistakeTags: prev.mistakeTags.filter(t => t !== tag) }));
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
      // New optional capture fields
      confidence: formState.confidence ?? undefined,
      mae: formState.mae ? Number(formState.mae) : undefined,
      mfe: formState.mfe ? Number(formState.mfe) : undefined,
      mistakeTags: formState.mistakeTags,
      preTradeChecklistState: preTradeChecklistState.length > 0 ? preTradeChecklistState : undefined,
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

              {/* ── Confidence ─────────────────────────────────── */}
              <div>
                <label className="block text-jtp-xs font-semibold uppercase tracking-[0.4px] text-jtp-textDim mb-2">
                  Confidence
                </label>
                <div className="flex gap-2">
                  {([1, 2, 3, 4, 5] as const).map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() =>
                        setFormState(prev => ({
                          ...prev,
                          confidence: prev.confidence === n ? null : n,
                        }))
                      }
                      className={`w-9 h-9 rounded-jtp-md font-semibold text-jtp-sm transition-colors
                        ${formState.confidence === n
                          ? 'bg-jtp-blue text-white border border-jtp-blue'
                          : 'bg-jtp-control border border-jtp-borderStrong text-jtp-textMuted hover:border-jtp-blue hover:text-jtp-text'
                        }`}
                      aria-label={`Confidence ${n}`}
                      aria-pressed={formState.confidence === n}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-jtp-xs text-jtp-textFaint mt-1">
                  Rate your conviction at entry (1 = low, 5 = high). Optional.
                </p>
              </div>

              {/* ── MAE + MFE ──────────────────────────────────── */}
              <div>
                <label className="block text-jtp-xs font-semibold uppercase tracking-[0.4px] text-jtp-textDim mb-2">
                  Max Adverse / Favourable Excursion
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="MAE (adverse)"
                    id="mae"
                    name="mae"
                    type="number"
                    step="any"
                    value={formState.mae}
                    onChange={handleChange}
                    containerClassName="mb-0"
                  />
                  <Input
                    label="MFE (favourable)"
                    id="mfe"
                    name="mfe"
                    type="number"
                    step="any"
                    value={formState.mfe}
                    onChange={handleChange}
                    containerClassName="mb-0"
                  />
                </div>
                <p className="text-jtp-xs text-jtp-textFaint mt-1">
                  In price units (same as entry price). Optional.
                </p>
              </div>

              {/* ── Mistake Tags ────────────────────────────────── */}
              <div>
                <label className="block text-jtp-xs font-semibold uppercase tracking-[0.4px] text-jtp-textDim mb-2">
                  Mistake Tags
                </label>

                {/* Selected tag chips */}
                {formState.mistakeTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {formState.mistakeTags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-jtp-xs px-2 py-1 rounded-jtp-md bg-jtp-loss/10 text-jtp-lossSoft border border-jtp-loss/20"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-0.5 text-jtp-textFaint hover:text-jtp-loss transition-colors leading-none"
                          aria-label={`Remove tag ${tag}`}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Free-text input */}
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                      e.preventDefault();
                      addTag(tagInput.trim());
                    }
                  }}
                  placeholder="Type a tag and press Enter…"
                  className="w-full px-3 py-[9px] bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl text-jtp-base-minus text-jtp-text outline-none focus:border-jtp-blue transition-colors placeholder:text-jtp-textFaint"
                />

                {/* Suggestions */}
                {filteredSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-jtp-xs text-jtp-textFaint self-center">Suggestions:</span>
                    {filteredSuggestions.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addTag(s)}
                        className="text-jtp-xs px-2 py-0.5 rounded-jtp-md bg-jtp-control border border-jtp-borderStrong text-jtp-textMuted hover:border-jtp-blue hover:text-jtp-text transition-colors"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Pre-Trade Checklist ──────────────────────────── */}
              {preTradeChecklistState.length > 0 && (
                <div className="bg-jtp-raised border border-jtp-border rounded-jtp-panel p-4 space-y-3">
                  <p className="text-jtp-xs font-semibold uppercase tracking-[0.4px] text-jtp-textDim">
                    Pre-Trade Checklist <span className="normal-case font-normal text-jtp-textFaint">(optional)</span>
                  </p>
                  <div className="space-y-2">
                    {preTradeChecklistState.map((item, idx) => (
                      <label
                        key={idx}
                        className="flex items-start gap-2.5 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={e => {
                            setPreTradeChecklistState(prev =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, checked: e.target.checked } : it,
                              ),
                            );
                          }}
                          className="mt-0.5 w-4 h-4 rounded accent-jtp-blue flex-shrink-0"
                        />
                        <span className="text-jtp-sm text-jtp-textSoft group-hover:text-jtp-text transition-colors">
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

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
