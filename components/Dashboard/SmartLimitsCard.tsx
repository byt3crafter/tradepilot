import React from 'react';
import { SmartLimit, SmartLimitProgress } from '../../types';
import PortalTooltip from '../ui/PortalTooltip';
import { InfoIcon } from '../icons/InfoIcon';

interface SmartLimitsCardProps {
  progress: SmartLimitProgress;
  limits: SmartLimit;
}

const LimitStatItem: React.FC<{
  label: string;
  currentValue: number;
  maxValue: number;
  tooltip: string;
  metricType: 'trades' | 'losses';
}> = ({ label, currentValue, maxValue, tooltip, metricType }) => {
  // Calculate percentage
  const percentageUsed = (currentValue / maxValue) * 100;
  const isAtLimit = percentageUsed >= 100;

  // Determine color based on usage
  let valueColor = 'text-future-light';
  if (isAtLimit) {
    valueColor = 'text-risk-high font-semibold';
  } else if (percentageUsed >= 80) {
    valueColor = 'text-warning font-semibold';
  }

  // Determine background color for the entire card to show warning state
  let cardBgClass = '';
  if (isAtLimit) {
    cardBgClass = 'bg-risk-high/5';
  } else if (percentageUsed >= 80) {
    cardBgClass = 'bg-warning/5';
  }

  return (
    <PortalTooltip text={tooltip} position="top">
      <div className={`text-right px-2 py-1.5 rounded transition-colors ${cardBgClass}`}>
        <div className="flex items-center justify-end gap-1.5 mb-1">
          <span className="text-xs text-future-gray font-medium">{label}</span>
          <InfoIcon className="w-3.5 h-3.5 text-future-gray/50 hover:text-future-gray cursor-help transition-colors" />
        </div>
        <div className="flex items-center justify-end gap-1.5">
          <p className={`font-tech-mono text-base mt-0.5 ${valueColor}`}>
            {currentValue} <span className="text-future-gray text-sm">/ {maxValue}</span>
          </p>
          {isAtLimit && (
            <div className="w-2 h-2 rounded-full bg-risk-high animate-pulse mt-0.5"></div>
          )}
        </div>
      </div>
    </PortalTooltip>
  );
};

const SmartLimitsCard: React.FC<SmartLimitsCardProps> = ({ progress, limits }) => {
  if (!progress || !limits) {
    return null;
  }

  const { tradesToday, lossesToday } = progress;
  const { maxTradesPerDay, maxLossesPerDay } = limits;

  const hasLimits = maxTradesPerDay || maxLossesPerDay;

  if (!hasLimits) {
    return null;
  }

  // Check if any limit is at 100% for visual feedback
  const tradesAtLimit = maxTradesPerDay && tradesToday >= maxTradesPerDay;
  const lossesAtLimit = maxLossesPerDay && lossesToday >= maxLossesPerDay;
  const anyLimitReached = tradesAtLimit || lossesAtLimit;

  const cardBgClass = anyLimitReached ? 'border-risk-high/30 bg-risk-high/5' : 'border-photonic-blue/10';

  return (
    <div className={`bg-future-panel/50 ${cardBgClass} rounded-lg p-3 flex items-center justify-end gap-6 transition-colors`}>
      {maxTradesPerDay && (
        <LimitStatItem
          label="Trades Today"
          currentValue={tradesToday}
          maxValue={maxTradesPerDay}
          tooltip={`Daily trades: ${tradesToday} of ${maxTradesPerDay} allowed on your plan`}
          metricType="trades"
        />
      )}
      {maxTradesPerDay && maxLossesPerDay && <div className="h-10 w-px bg-photonic-blue/20 self-center"></div>}
      {maxLossesPerDay && (
        <LimitStatItem
          label="Losses Today"
          currentValue={lossesToday}
          maxValue={maxLossesPerDay}
          tooltip={`Daily losses: ${lossesToday} of ${maxLossesPerDay} allowed - trading stops if limit reached`}
          metricType="losses"
        />
      )}
    </div>
  );
};

export default SmartLimitsCard;