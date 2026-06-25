import React, { useState, useEffect } from 'react';
import { useAccount } from '../../context/AccountContext';
import { BrokerAccount, BrokerAccountType, FeeModel, PropFirmTemplate } from '../../types';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import SelectInput from '../ui/SelectInput';
import ToggleSwitch from '../ui/ToggleSwitch';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface AccountFormProps {
  account: BrokerAccount | null;
  onBack: () => void;
  onSuccess: () => void;
}

// ── Section wrapper ────────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <div className="bg-jtp-raised border border-jtp-border rounded-jtp-panel p-6">
    <div className="mb-5">
      <h3 className="text-jtp-lg font-semibold text-jtp-text">{title}</h3>
      {description && (
        <p className="text-jtp-sm text-jtp-textDim mt-0.5">{description}</p>
      )}
    </div>
    {children}
  </div>
);

// ── Info callout ───────────────────────────────────────────────────────────────

const InfoNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-2.5 px-3.5 py-3 bg-jtp-blue/5 border border-jtp-blue/20 rounded-jtp-md text-jtp-sm text-jtp-textSoft">
    <svg
      className="w-4 h-4 text-jtp-blue flex-shrink-0 mt-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
      />
    </svg>
    <span>{children}</span>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────

const AccountForm: React.FC<AccountFormProps> = ({ account, onBack, onSuccess }) => {
  const { createAccount, updateAccount } = useAccount();
  const { accessToken } = useAuth();

  // ── Account fields ─────────────────────────────────────────────────────────
  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState<BrokerAccountType>(account?.type || BrokerAccountType.LIVE);
  const [initialBalance, setInitialBalance] = useState(account?.initialBalance || '');
  const [currency, setCurrency] = useState(account?.currency || 'USD');
  const [leverage, setLeverage] = useState(account?.leverage || '');
  const [feeModel, setFeeModel] = useState<FeeModel>(account?.feeModel || FeeModel.SPREAD_ONLY);

  // ── Prop-firm template ─────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<PropFirmTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(account?.templateId || '');

  // ── Trading objectives ─────────────────────────────────────────────────────
  const [objectivesEnabled, setObjectivesEnabled] = useState(account?.objectives?.isEnabled || false);
  const [profitTarget, setProfitTarget] = useState(account?.objectives?.profitTarget ?? '');
  const [minTradingDays, setMinTradingDays] = useState(account?.objectives?.minTradingDays ?? '');
  const [maxLoss, setMaxLoss] = useState(account?.objectives?.maxLoss ?? '');
  const [maxDailyLoss, setMaxDailyLoss] = useState(account?.objectives?.maxDailyLoss ?? '');

  // ── Smart limits ───────────────────────────────────────────────────────────
  const [smartLimitsEnabled, setSmartLimitsEnabled] = useState(account?.smartLimits?.isEnabled || false);
  // Smart limits are advisory only — severity is always SOFT (never hard-blocks a trade).
  // We keep the field in state so we don't strip it from the payload, but we no longer
  // expose a severity picker to the user since "block trade" is no longer supported.
  const [maxRiskPerTrade, setMaxRiskPerTrade] = useState(account?.smartLimits?.maxRiskPerTrade ?? '');
  const [maxTradesPerDay, setMaxTradesPerDay] = useState(account?.smartLimits?.maxTradesPerDay ?? '');
  const [maxLossesPerDay, setMaxLossesPerDay] = useState(account?.smartLimits?.maxLossesPerDay ?? '');

  // ── UI state ───────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Load prop-firm templates ───────────────────────────────────────────────
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!accessToken) return;
      try {
        const templatesData = await api.getAllPropFirmTemplates(accessToken);
        setTemplates(templatesData.filter((t) => t.isActive));
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      }
    };
    fetchTemplates();
  }, [accessToken]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setInitialBalance(template.accountSize.toString());
    setObjectivesEnabled(true);
    setProfitTarget(template.profitTarget.toString());
    setMinTradingDays(template.minTradingDays.toString());
    setMaxLoss(template.maxDrawdown.toString());
    setMaxDailyLoss(template.dailyDrawdown.toString());
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const balance = parseFloat(initialBalance as string);
    if (isNaN(balance)) {
      setError('Initial balance must be a valid number.');
      setIsLoading(false);
      return;
    }

    const baseObjectivesPayload = {
      profitTarget: profitTarget ? parseFloat(profitTarget as string) : null,
      minTradingDays: minTradingDays ? parseInt(minTradingDays as string, 10) : null,
      maxLoss: maxLoss ? parseFloat(maxLoss as string) : null,
      maxDailyLoss: maxDailyLoss ? parseFloat(maxDailyLoss as string) : null,
    };

    const baseSmartLimitsPayload = {
      // Always SOFT — smart limits are advisory; they warn but never block a trade.
      severity: 'SOFT' as const,
      maxRiskPerTrade: maxRiskPerTrade ? parseFloat(maxRiskPerTrade as string) : null,
      maxTradesPerDay: maxTradesPerDay ? parseInt(maxTradesPerDay as string, 10) : null,
      maxLossesPerDay: maxLossesPerDay ? parseInt(maxLossesPerDay as string, 10) : null,
    };

    const accountPayload = {
      name,
      type,
      initialBalance: balance,
      currency,
      leverage: leverage ? parseInt(leverage as string, 10) : null,
      feeModel,
      templateId: selectedTemplateId || null,
    };

    try {
      if (account) {
        const objectivesPayload = { isEnabled: objectivesEnabled, ...baseObjectivesPayload };
        const smartLimitsPayload = { isEnabled: smartLimitsEnabled, ...baseSmartLimitsPayload };
        await updateAccount(account.id, {
          ...accountPayload,
          objectives: objectivesPayload as any,
          smartLimits: smartLimitsPayload as any,
        });
      } else {
        const objectivesPayload = objectivesEnabled ? baseObjectivesPayload : undefined;
        const smartLimitsPayload = smartLimitsEnabled ? baseSmartLimitsPayload : undefined;
        await createAccount({
          ...accountPayload,
          objectives: objectivesPayload as any,
          smartLimits: smartLimitsPayload as any,
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 animate-jtp-fade-in">
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-jtp-textMuted hover:text-jtp-text text-jtp-base transition-colors flex-shrink-0"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Accounts
          </button>

          <div className="w-px h-5 bg-jtp-borderStrong flex-shrink-0" />

          <h2 className="text-jtp-2xl font-semibold text-jtp-text">
            {account ? 'Edit Account' : 'Add New Account'}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl text-jtp-textSoft text-jtp-base-minus font-medium hover:border-jtp-borderHover transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-jtp-blue hover:bg-jtp-blueHover rounded-jtp-xl text-white text-jtp-base-minus font-semibold transition-colors disabled:opacity-60"
          >
            {isLoading && <Spinner />}
            {account ? 'Save Changes' : 'Create Account'}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-jtp-loss/10 border border-jtp-loss/30 rounded-jtp-md text-jtp-sm text-jtp-loss">
          {error}
        </div>
      )}

      {/* ── Section 1: Account Details ──────────────────────────────────────── */}
      <Section
        title="Account Details"
        description="Core information about the broker or prop-firm account."
      >
        <div className="space-y-0">
          <Input
            label="Account Name"
            id="accountName"
            type="text"
            placeholder="e.g., FTMO Challenge"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <SelectInput
            label="Account Type"
            id="accountType"
            value={type}
            onChange={(e) => setType(e.target.value as BrokerAccountType)}
            options={[
              { value: BrokerAccountType.LIVE, label: 'Live' },
              { value: BrokerAccountType.DEMO, label: 'Demo' },
              { value: BrokerAccountType.PROP_FIRM, label: 'Prop Firm' },
            ]}
          />

          {type === BrokerAccountType.PROP_FIRM && templates.length > 0 && (
            <div className="animate-fade-in-up">
              <SelectInput
                label="Prop Firm Template (Optional)"
                id="template"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                options={[
                  { value: '', label: 'No template — enter manually' },
                  ...templates.map((t) => ({
                    value: t.id,
                    label: `${t.name} ($${(t.accountSize / 1000).toFixed(0)}K)`,
                  })),
                ]}
              />
            </div>
          )}

          <Input
            label="Initial Balance"
            id="initialBalance"
            type="number"
            placeholder="e.g., 100000"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectInput
              label="Currency"
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { value: 'USD', label: 'USD' },
                { value: 'EUR', label: 'EUR' },
                { value: 'GBP', label: 'GBP' },
                { value: 'JPY', label: 'JPY' },
                { value: 'AUD', label: 'AUD' },
                { value: 'CAD', label: 'CAD' },
                { value: 'CHF', label: 'CHF' },
              ]}
            />
            <Input
              label="Leverage (e.g., 100)"
              id="leverage"
              type="number"
              placeholder="100"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
            />
          </div>

          <SelectInput
            label="Fee Model"
            id="feeModel"
            value={feeModel}
            onChange={(e) => setFeeModel(e.target.value as FeeModel)}
            options={[
              { value: FeeModel.SPREAD_ONLY, label: 'Spread only (no separate commission)' },
              { value: FeeModel.COMMISSION_ONLY, label: 'Commission only' },
              { value: FeeModel.COMMISSION_AND_SWAP, label: 'Commission + Swap / Financing' },
            ]}
          />
        </div>
      </Section>

      {/* ── Section 2: Trading Objectives ──────────────────────────────────── */}
      <div className="bg-jtp-raised border border-jtp-border rounded-jtp-panel p-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <h3 className="text-jtp-lg font-semibold text-jtp-text">Trading Objectives</h3>
            <p className="text-jtp-sm text-jtp-textDim mt-0.5">
              Prop-firm rules: profit target, trading-day minimums, and drawdown limits.
            </p>
          </div>
          <ToggleSwitch
            label=""
            checked={objectivesEnabled}
            onChange={setObjectivesEnabled}
          />
        </div>

        {objectivesEnabled && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
            <Input
              label="Profit Target ($)"
              id="profitTarget"
              type="number"
              placeholder="e.g., 8 000"
              value={profitTarget}
              onChange={(e) => setProfitTarget(e.target.value)}
              containerClassName=""
            />
            <Input
              label="Min Trading Days"
              id="minTradingDays"
              type="number"
              placeholder="e.g., 5"
              value={minTradingDays}
              onChange={(e) => setMinTradingDays(e.target.value)}
              containerClassName=""
            />
            <Input
              label="Max Overall Loss ($)"
              id="maxLoss"
              type="number"
              placeholder="e.g., 5 000"
              value={maxLoss}
              onChange={(e) => setMaxLoss(e.target.value)}
              containerClassName=""
            />
            <Input
              label="Max Daily Loss ($)"
              id="maxDailyLoss"
              type="number"
              placeholder="e.g., 2 500"
              value={maxDailyLoss}
              onChange={(e) => setMaxDailyLoss(e.target.value)}
              containerClassName=""
            />
          </div>
        )}
      </div>

      {/* ── Section 3: Smart Limits ─────────────────────────────────────────── */}
      <div className="bg-jtp-raised border border-jtp-border rounded-jtp-panel p-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <h3 className="text-jtp-lg font-semibold text-jtp-text">Smart Limits</h3>
            <p className="text-jtp-sm text-jtp-textDim mt-0.5">
              Personal guardrails shown as in-app warnings.
            </p>
          </div>
          <ToggleSwitch
            label=""
            checked={smartLimitsEnabled}
            onChange={setSmartLimitsEnabled}
          />
        </div>

        {smartLimitsEnabled && (
          <div className="mt-5 space-y-4 animate-fade-in-up">
            <InfoNote>
              Smart limits are advisory only. JTradePilot will show you a warning when you
              approach or exceed a limit, but will never prevent you from placing a trade.
            </InfoNote>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Max Risk per Trade (%)"
                id="maxRiskPerTrade"
                type="number"
                step="0.1"
                placeholder="e.g., 1"
                value={maxRiskPerTrade}
                onChange={(e) => setMaxRiskPerTrade(e.target.value)}
                containerClassName=""
              />
              <Input
                label="Max Trades per Day"
                id="maxTradesPerDay"
                type="number"
                placeholder="e.g., 3"
                value={maxTradesPerDay}
                onChange={(e) => setMaxTradesPerDay(e.target.value)}
                containerClassName=""
              />
              <Input
                label="Max Losses per Day"
                id="maxLossesPerDay"
                type="number"
                placeholder="e.g., 2"
                value={maxLossesPerDay}
                onChange={(e) => setMaxLossesPerDay(e.target.value)}
                containerClassName=""
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom save / cancel ────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-1 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl text-jtp-textSoft text-jtp-base-minus font-medium hover:border-jtp-borderHover transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2 bg-jtp-blue hover:bg-jtp-blueHover rounded-jtp-xl text-white text-jtp-base-minus font-semibold transition-colors disabled:opacity-60"
        >
          {isLoading && <Spinner />}
          {account ? 'Save Changes' : 'Create Account'}
        </button>
      </div>
    </form>
  );
};

export default AccountForm;
