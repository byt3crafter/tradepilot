
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
  error?: string;
  containerClassName?: string;
}

const Input: React.FC<InputProps> = ({ label, id, error, containerClassName = 'mb-4', className = '', ...props }) => {
  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={id} className="block text-jtp-xs uppercase tracking-wider font-medium text-jtp-textMuted mb-1.5">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full bg-jtp-control border ${error ? 'border-jtp-loss' : 'border-jtp-borderStrong'} rounded-jtp-md px-3 py-2 text-jtp-text text-jtp-md placeholder-jtp-textDisabled focus:outline-none focus:ring-1 focus:ring-jtp-blue focus:border-jtp-blue transition-colors font-sans ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-jtp-xs text-jtp-loss animate-fade-in">{error}</p>}
    </div>
  );
};

export default Input;
