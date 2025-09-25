import React from 'react';
import Card from '../Card';
import { InfoIcon } from '../icons/InfoIcon';

interface StatCardProps {
  title: string;
  children: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, children }) => {
  return (
    <Card className="p-4 h-36 flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <h3 className="text-xs text-future-gray uppercase tracking-wider font-semibold">{title}</h3>
        <InfoIcon className="w-4 h-4 text-future-gray/50 cursor-help" />
      </div>
      {children}
    </Card>
  );
};

export default StatCard;