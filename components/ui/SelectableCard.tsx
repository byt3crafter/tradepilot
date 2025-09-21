import React from 'react';

interface SelectableCardProps {
  label: string;
  description?: string;
  isSelected: boolean;
  onSelect: () => void;
  type: 'radio' | 'checkbox';
}

const SelectableCard: React.FC<SelectableCardProps> = ({ label, description, isSelected, onSelect, type }) => {
  const baseClasses = "p-4 rounded-lg border-2 text-center cursor-pointer transition-all duration-200 h-full flex flex-col justify-center";
  const selectedClasses = "bg-photonic-blue/10 border-photonic-blue shadow-glow-blue";
  const unselectedClasses = "bg-future-dark/50 border-future-panel hover:border-photonic-blue/50";

  return (
    <div
      onClick={onSelect}
      className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`}
      role={type}
      aria-checked={isSelected}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') onSelect(); }}
    >
      <div className="font-semibold text-future-light text-sm md:text-base">{label}</div>
      {description && <div className="text-xs text-future-gray mt-1">{description}</div>}
    </div>
  );
};

export default SelectableCard;
