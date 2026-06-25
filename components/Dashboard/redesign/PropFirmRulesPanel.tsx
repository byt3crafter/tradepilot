import React from 'react';
import { BrokerAccount, ObjectiveProgress } from '../../../types';

interface PropFirmRulesPanelProps {
  objectives: ObjectiveProgress[];
  account: BrokerAccount;
}

type BadgeVariant = 'passed' | 'ontrack' | 'safe' | 'breached' | 'progress';

interface RuleBadgeProps {
  variant: BadgeVariant;
}

const BADGE_STYLES: Record<BadgeVariant, { bg: string; text: string; label: string }> = {
  passed:   { bg: 'bg-[rgba(76,195,138,.16)]',  text: 'text-jtp-profit',  label: 'Passed' },
  ontrack:  { bg: 'bg-[rgba(91,141,239,.14)]',  text: 'text-jtp-blue',    label: 'On track' },
  safe:     { bg: 'bg-[rgba(217,162,59,.14)]',  text: 'text-jtp-warning', label: 'Safe' },
  breached: { bg: 'bg-[rgba(229,99,95,.16)]',   text: 'text-jtp-loss',    label: 'Breached' },
  progress: { bg: 'bg-[rgba(91,141,239,.14)]',  text: 'text-jtp-blue',    label: 'In progress' },
};

const RuleBadge: React.FC<RuleBadgeProps> = ({ variant }) => {
  const s = BADGE_STYLES[variant];
  return (
    <span
      className={`text-jtp-2xs font-semibold px-[7px] py-[2px] rounded-jtp-md ${s.bg} ${s.text}`}
      style={{ letterSpacing: '0.2px' }}
    >
      {s.label}
    </span>
  );
};

function getBadgeVariant(obj: ObjectiveProgress): BadgeVariant {
  const isLossRule = obj.key === 'maxLoss' || obj.key === 'maxDailyLoss';
  if (obj.status === 'Failed') return 'breached';
  if (isLossRule) return 'safe';
  if (obj.status === 'Success') return 'passed';
  return 'ontrack';
}

function getBarColor(obj: ObjectiveProgress): string {
  if (obj.status === 'Failed') return 'bg-jtp-loss';
  const isLossRule = obj.key === 'maxLoss' || obj.key === 'maxDailyLoss';
  if (isLossRule) return 'bg-jtp-warning';
  if (obj.status === 'Success') return 'bg-jtp-profit';
  return 'bg-jtp-blue';
}

function getProgressPct(obj: ObjectiveProgress): number {
  if (obj.targetValue === 0) return 0;
  const isLossRule = obj.key === 'maxLoss' || obj.key === 'maxDailyLoss';
  if (isLossRule) {
    // currentValue is negative loss; targetValue is negative limit
    // progress = how much of the limit has been consumed
    const consumed = Math.abs(obj.currentValue);
    const limit = Math.abs(obj.targetValue);
    return limit > 0 ? Math.min(100, (consumed / limit) * 100) : 0;
  }
  return Math.min(100, (obj.currentValue / obj.targetValue) * 100);
}

function formatValue(obj: ObjectiveProgress): string {
  const fmt = obj.format ?? 'currency';
  if (fmt === 'days') {
    return `${Math.round(obj.currentValue)} / ${Math.round(obj.targetValue)} days`;
  }
  // currency
  const fmtCurrency = (v: number) => {
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };
  return `${fmtCurrency(obj.currentValue)} / ${fmtCurrency(obj.targetValue)}`;
}

function getSubtext(obj: ObjectiveProgress): string {
  switch (obj.key) {
    case 'profitTarget': {
      const rem = obj.targetValue - obj.currentValue;
      if (rem <= 0) return 'target reached';
      return `$${Math.abs(rem).toLocaleString(undefined, { maximumFractionDigits: 0 })} to target`;
    }
    case 'minTradingDays': {
      const rem = obj.targetValue - obj.currentValue;
      if (rem <= 0) return 'requirement met';
      return `${Math.round(rem)} day${rem !== 1 ? 's' : ''} remaining`;
    }
    case 'maxLoss': {
      const headroom = obj.targetValue - obj.currentValue; // targetValue is negative, currentValue is negative loss
      const head = Math.abs(headroom);
      if (obj.status === 'Failed') return 'limit breached';
      return `$${head.toLocaleString(undefined, { maximumFractionDigits: 0 })} headroom`;
    }
    case 'maxDailyLoss': {
      if (obj.status === 'Failed') return 'daily limit breached';
      return 'worst day so far';
    }
    default:
      return '';
  }
}

function getAccountContextLabel(account: BrokerAccount): string {
  const type = account.type === 'PROP_FIRM' ? 'Prop' : account.type === 'DEMO' ? 'Demo' : 'Live';
  const balance = `balance $${account.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `${account.name} · ${type} · ${balance}`;
}

const PropFirmRulesPanel: React.FC<PropFirmRulesPanelProps> = ({ objectives, account }) => {
  return (
    <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel px-[18px] py-[15px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-[14px]">
        <div className="text-jtp-base-minus font-semibold text-jtp-text" style={{ letterSpacing: '0.2px' }}>
          Prop Firm Rules
        </div>
        <div className="text-jtp-sm-minus text-jtp-textDim font-mono">
          {getAccountContextLabel(account)}
        </div>
      </div>

      {/* Rule columns */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-[22px]">
        {objectives.map(obj => {
          const pct = getProgressPct(obj);
          const barColor = getBarColor(obj);
          const badge = getBadgeVariant(obj);

          return (
            <div key={obj.key}>
              {/* Label + badge */}
              <div className="flex items-center justify-between mb-[7px]">
                <span className="text-jtp-sm text-jtp-textMuted">{obj.title}</span>
                <RuleBadge variant={badge} />
              </div>

              {/* Value string */}
              <div className="font-mono text-jtp-md-plus font-medium text-jtp-text mb-[7px]">
                {formatValue(obj)}
              </div>

              {/* Progress bar */}
              <div className="h-[5px] rounded-jtp-xs bg-jtp-border overflow-hidden">
                <div
                  className={`h-full rounded-jtp-xs ${barColor} transition-all`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>

              {/* Subtext */}
              <div className="text-jtp-xs text-jtp-textFaint mt-[6px]">
                {getSubtext(obj)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PropFirmRulesPanel;
