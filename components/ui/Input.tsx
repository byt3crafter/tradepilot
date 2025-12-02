
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
        <label htmlFor={id} className="block text-xs font-semibold text-future-gray mb-2 font-orbitron uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full bg-surface border ${error ? 'border-loss' : 'border-white/10'} rounded-lg px-4 py-2.5 text-primary placeholder-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 font-tech-mono text-sm ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-loss animate-fade-in">{error}</p>}
    </div>
  );
};

export default Input;
