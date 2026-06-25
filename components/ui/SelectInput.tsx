import React from 'react';

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  id: string;
  options: { value: string; label: string }[];
  subLabel?: string;
  containerClassName?: string;
}

const SelectInput: React.FC<SelectInputProps> = ({ label, id, options, subLabel, containerClassName = 'mb-4', ...props }) => {
  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={id} className="block text-jtp-xs uppercase tracking-wider font-medium text-jtp-textMuted mb-1.5">
          {label}
        </label>
      )}
      {subLabel && <p className="text-jtp-xs text-jtp-textDim mb-1.5 -mt-0.5">{subLabel}</p>}
      <div className="relative">
        <select
          id={id}
          className="w-full bg-jtp-control border border-jtp-borderStrong rounded-jtp-md px-3 py-2 text-jtp-md text-jtp-text focus:outline-none focus:ring-1 focus:ring-jtp-blue focus:border-jtp-blue transition-colors font-sans appearance-none"
          {...props}
        >
          {options.map(option => (
            <option
              key={option.value}
              value={option.value}
              className="bg-jtp-panel text-jtp-text py-2"
              style={{ backgroundColor: '#0f1216', color: '#e8eaed' }}
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-jtp-textDim">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default SelectInput;
