
import React from 'react';
import Spinner from '../Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'link' | 'danger';
  className?: string;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', isLoading = false, ...props }) => {
  const baseClasses = "font-medium rounded-lg text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-void focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";

  const variantClasses = {
    primary: "bg-white text-black hover:bg-gray-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-[0.98]",
    secondary: "bg-white/5 border border-white/10 text-primary hover:bg-white/10 hover:border-white/20 active:scale-[0.98]",
    danger: "bg-loss/10 text-loss border border-loss/20 hover:bg-loss/20 hover:border-loss/40 active:scale-[0.98]",
    link: "text-secondary hover:text-white p-0 h-auto font-normal hover:underline justify-start",
  };
  
  // Default padding if not link
  const paddingClasses = variant === 'link' ? '' : 'px-4 py-2.5';

  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses} ${className}`} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <span className="mr-2"><Spinner /></span>}
      {children}
    </button>
  );
};

export default Button;
