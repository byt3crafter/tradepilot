import React from 'react';
import { SmartLimit, SmartLimitProgress } from '../../types';
import Tooltip from '../ui/Tooltip';
import { InfoIcon } from '../icons/InfoIcon';

interface SmartLimitsCardProps {
  progress: SmartLimitProgress;
  limits: SmartLimit;
}

const LimitStatItem: React.FC<{ label: string; currentValue: number; maxValue: number; tooltip: string }> = ({ label, currentValue, maxValue, tooltip }) => (
    <div className="text-right">
        <Tooltip text={tooltip}>
            <div className="flex items-center justify-end gap-1.5">
                <span className="text-xs text-future-gray">{label}</span>
                <InfoIcon className="w-3.5 h-3.5 text-future-gray/50" />
            </div>
        </Tooltip>
        <p className={`font-tech-mono text-future-light text-base mt-1 ${currentValue >= maxValue ? 'text-risk-high' : ''}`}>
            {currentValue} / {maxValue}
        </p>
    </div>
);

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

  return (
    <div className="bg-future-panel/50 border border-photonic-blue/10 rounded-lg p-3 flex items-center justify-end gap-4">
        {maxTradesPerDay && (
            <LimitStatItem 
                label="Trades Today"
                currentValue={tradesToday}
                maxValue={maxTradesPerDay}
                tooltip="Your daily limit on the number of trades executed."
            />
        )}
        {maxTradesPerDay && maxLossesPerDay && <div className="h-10 w-px bg-photonic-blue/20 self-center"></div>}
        {maxLossesPerDay && (
            <LimitStatItem 
                label="Losses Today"
                currentValue={lossesToday}
                maxValue={maxLossesPerDay}
                tooltip="Your daily limit on the number of losing trades."
            />
        )}
    </div>
  );
};

export default SmartLimitsCard;