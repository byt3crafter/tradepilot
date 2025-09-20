import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, id, ...props }) => {
  return (
    <div className="flex items-center">
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-photonic-blue/50 bg-future-dark text-photonic-blue focus:ring-photonic-blue focus:ring-2 focus:ring-offset-future-panel"
        {...props}
      />
      <label htmlFor={id} className="ml-3 block text-sm text-future-light">
        {label}
      </label>
    </div>
  );
};

export default Checkbox;