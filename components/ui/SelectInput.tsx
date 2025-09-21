import React from 'react';

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  id: string;
  options: { value: string; label: string }[];
  subLabel?: string;
}

const SelectInput: React.FC<SelectInputProps> = ({ label, id, options, subLabel, ...props }) => {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-lg font-semibold text-future-light">
        {label}
      </label>
      {subLabel && <p className="text-sm text-future-gray mb-3 -mt-1">{subLabel}</p>}
      <div className="relative">
        <select
          id={id}
          className="w-full bg-future-dark border border-photonic-blue/30 rounded-md px-3 py-3 text-future-light placeholder-future-gray/50 focus:outline-none focus:ring-2 focus:ring-photonic-blue focus:border-transparent transition-shadow appearance-none"
          {...props}
        >
          {options.map(option => (
            <option key={option.value} value={option.value} className="bg-future-panel text-future-light py-2">
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-future-gray">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default SelectInput;
