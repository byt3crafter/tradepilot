import React from 'react';
import Card from '../Card';

interface StatBoxProps {
  label: string;
  value: string | number;
  valueColor?: string;
}

const StatBox: React.FC<StatBoxProps> = ({ label, value, valueColor: customValueColor }) => {
  const isPositive = typeof value === 'string' && value.startsWith('$') && !value.includes('$-');
  const isNegative = typeof value === 'string' && value.includes('$-');

  const valueColor = customValueColor || (isPositive ? 'text-momentum-green' : isNegative ? 'text-risk-high' : 'text-future-light');

  return (
    <Card className="p-3">
      <p className="text-xs text-future-gray uppercase tracking-wider mb-1 truncate">{label}</p>
      <p className={`text-xl font-bold font-tech-mono ${valueColor} truncate`}>{value}</p>
    </Card>
  );
};

export default StatBox;