import React, { useState, useEffect } from 'react';
import { ObjectiveProgress } from '../../types';
import Card from '../Card';

interface ObjectiveItemProps {
  objective: ObjectiveProgress;
}

const StatusPill: React.FC<{ status: ObjectiveProgress['status'] }> = ({ status }) => {
  const styles: Record<ObjectiveProgress['status'], string> = {
    'In Progress': 'bg-risk-medium/10 text-risk-medium border-risk-medium/20',
    'Success': 'bg-momentum-green/10 text-momentum-green border-momentum-green/20',
    'Failed': 'bg-risk-high/10 text-risk-high border-risk-high/20',
  };
  return (
    <div className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${styles[status]}`}>
      {status}
    </div>
  );
};

const CountdownTimer: React.FC = () => {
  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 0, 0);
    return tomorrow;
  }

  const [timeLeft, setTimeLeft] = useState(getTomorrow().getTime() - new Date().getTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTomorrow().getTime() - new Date().getTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return (
    <span className="text-xs text-risk-high/80 font-tech-mono">
      {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
};


const ObjectiveItem: React.FC<ObjectiveItemProps> = ({ objective }) => {
  const { title, status, currentValue, targetValue, type, key, format = 'currency' } = objective;

  const progressPercentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;

  const isLossRule = key.includes('Loss');
  const isFailed = status === 'Failed';
  const isSuccess = status === 'Success';

  let barColor = 'bg-white'; // Default for profit target
  if (isFailed) barColor = 'bg-risk-high';
  else if (isSuccess) barColor = 'bg-momentum-green';
  else if (isLossRule) barColor = 'bg-risk-high';

  let valueColor = 'text-future-light';
  if (format === 'currency') {
    if (key === 'profitTarget') {
      if (currentValue < 0) valueColor = 'text-risk-high';
      else if (currentValue > 0) valueColor = 'text-momentum-green';
    } else if (isLossRule && currentValue > 0) {
      valueColor = 'text-risk-high';
    }
  }

  const formatValue = (val?: number) => {
    if (val === undefined || val === null) return format === 'currency' ? '$-.--' : '-';
    if (format === 'currency') {
      const prefix = val < 0 ? '-$' : '$';
      return `${prefix}${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return val.toLocaleString();
  };


  return (
    <Card className={`p-3 flex flex-col h-full ${isFailed ? 'border-risk-high/30' : ''} ${isSuccess ? 'border-momentum-green/30' : ''}`}>
      <div className="flex justify-between items-start">
        <h4 className="text-xs text-future-gray uppercase tracking-wider font-semibold">{title}</h4>
        {status === 'Failed' && key === 'maxDailyLoss' ? (
          <CountdownTimer />
        ) : (
          <StatusPill status={status} />
        )}
      </div>

      <div className="flex-grow flex flex-col justify-end mt-2">
        <div className={`text-xl font-orbitron ${valueColor}`}>
          {formatValue(currentValue)}
          <span className="text-sm font-tech-mono text-future-gray ml-1">
            / {formatValue(targetValue)}
          </span>
        </div>

        {(type === 'progress' || key === 'maxLoss') && (
          <div className="mt-2">
            <div className="w-full bg-future-panel rounded-full h-1.5">
              <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${Math.min(100, progressPercentage)}%` }}></div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ObjectiveItem;
