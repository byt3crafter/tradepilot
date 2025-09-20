
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'link';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseClasses = "font-semibold rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-future-dark";

  const variantClasses = {
    primary: "w-full bg-photonic-blue text-future-dark py-2 px-4 shadow-glow-blue hover:bg-opacity-90 hover:shadow-lg hover:shadow-photonic-blue/50 transform hover:-translate-y-0.5",
    link: "text-photonic-blue hover:underline focus:ring-photonic-blue",
  };
  
  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
