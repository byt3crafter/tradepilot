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
        <label htmlFor={id} className="block text-xs font-semibold text-future-gray mb-2 font-orbitron uppercase tracking-wider">
          {label}
        </label>
      )}
      {subLabel && <p className="text-xs text-future-gray mb-2 -mt-1">{subLabel}</p>}
      <div className="relative">
        <select
          id={id}
          className="w-full bg-[#0C0D0E] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-primary placeholder-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 font-tech-mono appearance-none"
          {...props}
        >
          {options.map(option => (
            <option 
                key={option.value} 
                value={option.value} 
                className="bg-[#0C0D0E] text-white py-2"
                style={{ backgroundColor: '#0C0D0E', color: 'white' }}
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-future-gray">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default SelectInput;