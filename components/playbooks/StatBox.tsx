import React from 'react';
import Card from '../Card';

interface StatBoxProps {
  label: string;
  value: string | number;
}

const StatBox: React.FC<StatBoxProps> = ({ label, value }) => {
  const isPositive = typeof value === 'string' && value.startsWith('$') && !value.includes('$-');
  const isNegative = typeof value === 'string' && value.includes('$-');

  const valueColor = isPositive ? 'text-momentum-green' : isNegative ? 'text-risk-high' : 'text-future-light';

  return (
    <Card className="p-3">
      <h4 className="text-xs text-future-gray uppercase tracking-wider font-semibold">{label}</h4>
      <p className={`text-2xl font-orbitron mt-2 ${valueColor}`}>{value}</p>
    </Card>
  );
};

export default StatBox;