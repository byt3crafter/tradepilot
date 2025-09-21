import React from 'react';
import Card from '../Card';

interface StatCardProps {
  title: string;
  value: string | number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value }) => {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-future-gray uppercase tracking-wider">{title}</h3>
      <p className="text-3xl font-orbitron text-future-light mt-2">{value}</p>
    </Card>
  );
};

export default StatCard;
