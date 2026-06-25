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
    <label className={`flex items-center justify-between ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <span className="text-jtp-md text-jtp-text">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={handleToggle}
        disabled={disabled}
        className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-jtp-panel focus:ring-jtp-blue ${
          checked ? 'bg-jtp-blue' : 'bg-jtp-control border border-jtp-borderStrong'
        }`}
      >
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
        <span
          className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform shadow-sm ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
};

export default ToggleSwitch;
