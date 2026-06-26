import React from 'react';

interface StatBoxProps {
  label: string;
  value: string | number;
  valueColor?: string;
}

const StatBox: React.FC<StatBoxProps> = ({ label, value, valueColor }) => {
  // Derive color from value sign if not explicitly provided
  const derivedColor = valueColor ?? (
    typeof value === 'string'
      ? value.startsWith('+') || (value.startsWith('$') && !value.startsWith('$-'))
        ? 'text-jtp-profit'
        : value.startsWith('-') || value.startsWith('$-')
        ? 'text-jtp-loss'
        : 'text-jtp-text'
      : 'text-jtp-text'
  );

  return (
    <div className="bg-jtp-raised border border-jtp-border rounded-jtp-panel px-4 py-[13px]">
      <div className="jtp-label mb-[5px] truncate">{label}</div>
      <div
        className={`font-mono font-semibold text-jtp-2xl leading-none truncate ${derivedColor}`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </div>
    </div>
  );
};

export default StatBox;
