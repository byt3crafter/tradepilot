import React, { useState, useEffect } from 'react';
import { ObjectiveProgress } from '../../types';

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
    <div className={`px-3 py-1 text-xs font-semibold rounded-full border ${styles[status]}`}>
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
           Timer Reset In: {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
    );
};


const ObjectiveItem: React.FC<ObjectiveItemProps> = ({ objective }) => {
  const { title, status, currentValue, targetValue, remaining, type } = objective;

  const progressPercentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
  
  const isLossRule = objective.key.includes('Loss');
  const barColor = isLossRule ? 'bg-yellow-400' : 'bg-photonic-blue';

  return (
    <div className="bg-future-dark/50 p-3 rounded-lg border border-future-panel">
      {/* Top Row */}
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-future-light">{title}</h4>
        <StatusPill status={status} />
      </div>

      {/* Bottom Row / Progress Bar */}
      {type === 'progress' ? (
        <div>
          <div className="w-full bg-future-panel rounded-full h-1.5 mb-1">
            <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${Math.min(100, progressPercentage)}%` }}></div>
          </div>
          <div className="flex justify-between items-center text-xs text-future-gray">
            <span>
              {isLossRule ? 'Remaining: $' : 'Remaining: $'}
              {remaining?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? 'N/A'}
            </span>
             {status === 'Failed' && objective.key === 'maxDailyLoss' ? (
                <CountdownTimer />
             ) : (
                <span>
                    {isLossRule ? 'Max: $' : 'Max: $'}
                    {targetValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
             )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-future-gray">
          Results: {currentValue}
        </p>
      )}
    </div>
  );
};

export default ObjectiveItem;
