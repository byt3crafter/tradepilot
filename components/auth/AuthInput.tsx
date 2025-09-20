
import React from 'react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

const AuthInput: React.FC<AuthInputProps> = ({ label, id, ...props }) => {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-future-gray mb-2">
        {label}
      </label>
      <input
        id={id}
        className="w-full bg-future-dark border border-photonic-blue/30 rounded-md px-3 py-2 text-future-light placeholder-future-gray/50 focus:outline-none focus:ring-2 focus:ring-photonic-blue focus:border-transparent transition-shadow"
        {...props}
      />
    </div>
  );
};

export default AuthInput;
