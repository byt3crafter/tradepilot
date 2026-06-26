import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: 'profit' | 'loss' | 'blue' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, accent = 'neutral' }) => {
  const accentClasses = {
    profit: 'text-jtp-profit',
    loss: 'text-jtp-loss',
    blue: 'text-jtp-blue',
    neutral: 'text-jtp-text',
  };

  return (
    <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-jtp-xs uppercase tracking-widest font-medium text-jtp-textDim">
          {title}
        </span>
        {icon && (
          <div className="text-jtp-textDim">
            {icon}
          </div>
        )}
      </div>
      <p className={`text-jtp-4xl font-bold font-mono tabular-nums leading-none ${accentClasses[accent]}`}>
        {value}
      </p>
    </div>
  );
};

export default StatCard;
