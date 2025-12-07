import React from 'react';

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange, disabled = false }) => {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <label className={`flex items-center justify-between ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <span className="text-sm text-future-light">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={handleToggle}
        disabled={disabled}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-future-panel focus:ring-photonic-blue ${checked ? 'bg-photonic-blue' : 'bg-future-dark border border-future-gray/50'
          }`}
      >
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
        <span
          className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
            }`}
        />
      </button>
    </label>
  );
};

export default ToggleSwitch;
