import React from 'react';
import { BrokerAccount, ObjectiveProgress } from '../../../types';
import { Panel, Badge } from '../../ui';
import type { BadgeVariant } from '../../ui';

interface PropFirmRulesPanelProps {
  objectives: ObjectiveProgress[];
  account: BrokerAccount;
}

// ── Badge / bar logic ─────────────────────────────────────────────────────────

function getBadgeVariant(obj: ObjectiveProgress): BadgeVariant {
  const isLossRule = obj.key === 'maxLoss' || obj.key === 'maxDailyLoss';
  if (obj.status === 'Failed')  return 'loss';
  if (isLossRule)               return 'warning';
  if (obj.status === 'Success') return 'profit';
  return 'info';
}

function getBadgeLabel(obj: ObjectiveProgress): string {
  const isLossRule = obj.key === 'maxLoss' || obj.key === 'maxDailyLoss';
  if (obj.status === 'Failed')  return 'BREACHED';
  if (isLossRule)               return 'SAFE';
  if (obj.status === 'Success') return 'PASSED';
  return 'ON TRACK';
}

function getBarColor(obj: ObjectiveProgress): string {
  if (obj.status === 'Failed') return '#e5635f'; // jtp-loss
  const isLossRule = obj.key === 'maxLoss' || obj.key === 'maxDailyLoss';
  if (isLossRule)               return '#d9a23b'; // jtp-warning
  if (obj.status === 'Success') return '#4cc38a'; // jtp-profit
  return '#e8a23d';                               // jtp-blue
}

function getProgressPct(obj: ObjectiveProgress): number {
  if (obj.targetValue === 0) return 0;
  const isLossRule = obj.key === 'maxLoss' || obj.key === 'maxDailyLoss';
  if (isLossRule) {
    const consumed = Math.abs(obj.currentValue);
    const limit    = Math.abs(obj.targetValue);
    return limit > 0 ? Math.min(100, (consumed / limit) * 100) : 0;
  }
  return Math.min(100, (obj.currentValue / obj.targetValue) * 100);
}

function formatValue(obj: ObjectiveProgress): string {
  const fmt = obj.format ?? 'currency';
  if (fmt === 'days') {
    return `${Math.round(obj.currentValue)} / ${Math.round(obj.targetValue)} days`;
  }
  const fmtCurrency = (v: number) => {
    const abs  = Math.abs(v);
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
      const headroom = obj.targetValue - obj.currentValue;
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

function getAccountContext(account: BrokerAccount): string {
  const type    = account.type === 'PROP_FIRM' ? 'Prop' : account.type === 'DEMO' ? 'Demo' : 'Live';
  const balance = `$${account.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `${account.name} · ${type} · ${balance}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

const PropFirmRulesPanel: React.FC<PropFirmRulesPanelProps> = ({ objectives, account }) => {
  const accountLabel = (
    <span
      className="font-mono text-jtp-xs-plus text-jtp-textDim"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {getAccountContext(account)}
    </span>
  );

  return (
    <Panel label="PROP FIRM RULES" actions={accountLabel} className="h-full">
      <div className="grid grid-cols-1 gap-y-4">
        {objectives.map(obj => {
          const pct      = getProgressPct(obj);
          const barColor = getBarColor(obj);
          const variant  = getBadgeVariant(obj);
          const badgeLabel = getBadgeLabel(obj);
          const subtext  = getSubtext(obj);

          return (
            <div key={obj.key}>
              {/* Label + status badge */}
              <div className="flex items-center justify-between mb-[8px]">
                <span className="text-jtp-md text-jtp-textMuted font-medium">{obj.title}</span>
                <Badge variant={variant} size="xs">{badgeLabel}</Badge>
              </div>

              {/* Value — mono, tabular */}
              <div
                className="font-mono text-jtp-lg font-semibold text-jtp-text mb-[8px]"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatValue(obj)}
              </div>

              {/* Progress bar */}
              <div
                className="h-[4px] rounded-full overflow-hidden"
                style={{ backgroundColor: '#1c2128' }}
                role="progressbar"
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, pct)}%`, backgroundColor: barColor }}
                />
              </div>

              {/* Subtext */}
              {subtext && (
                <div className="font-mono text-jtp-xs text-jtp-textFaint mt-[5px]">
                  {subtext}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

export default PropFirmRulesPanel;
