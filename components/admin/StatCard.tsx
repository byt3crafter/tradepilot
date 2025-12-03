import React from 'react';
import Card from '../Card';

interface StatCardProps {
  title: string;
  value: string | number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value }) => {
  return (
    <Card className="p-6 flex flex-col justify-center">
      <h3 className="text-xs font-semibold text-secondary uppercase tracking-widest mb-3">{title}</h3>
      <p className="text-4xl font-bold font-orbitron text-white">{value}</p>
    </Card>
  );
};

export default StatCard;
