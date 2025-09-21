import React from 'react';
import { SmartLimit, SmartLimitProgress } from '../../types';
import Card from '../Card';

interface LimitProgressItemProps {
    label: string;
    current: number;
    max: number;
}

const LimitProgressItem: React.FC<LimitProgressItemProps> = ({ label, current, max }) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    const isExceeded = current >= max;

    return (
        <div className="flex-1">
            <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm text-future-gray">{label}</span>
                <span className={`font-tech-mono font-semibold ${isExceeded ? 'text-risk-high' : 'text-future-light'}`}>
                    {current} / {max}
                </span>
            </div>
            <div className="w-full bg-future-panel rounded-full h-1.5">
                <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${isExceeded ? 'bg-risk-high' : 'bg-photonic-blue'}`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                ></div>
            </div>
        </div>
    );
};


interface SmartLimitsCardProps {
  progress: SmartLimitProgress;
  limits: SmartLimit;
}

const SmartLimitsCard: React.FC<SmartLimitsCardProps> = ({ progress, limits }) => {
  if (!progress || !limits) {
    return null;
  }

  const { tradesToday, lossesToday } = progress;
  const { maxTradesPerDay, maxLossesPerDay } = limits;

  return (
    <Card>
        <h2 className="text-xl font-orbitron text-photonic-blue mb-4">Daily Discipline Report</h2>
        <div className="flex flex-col md:flex-row gap-6">
            {maxTradesPerDay && (
                <LimitProgressItem label="Trades Today" current={tradesToday} max={maxTradesPerDay} />
            )}
            {maxLossesPerDay && (
                <LimitProgressItem label="Losses Today" current={lossesToday} max={maxLossesPerDay} />
            )}
        </div>
    </Card>
  );
};

export default SmartLimitsCard;
