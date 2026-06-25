
import React from 'react';
import Spinner from '../Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'link' | 'danger';
  className?: string;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', isLoading = false, ...props }) => {
  const baseClasses = "font-medium rounded-jtp-md text-jtp-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-jtp-bg focus:ring-jtp-blue/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";

  const variantClasses = {
    primary: "bg-jtp-blue text-white hover:bg-jtp-blueHover active:scale-[0.98] shadow-none",
    secondary: "bg-jtp-control border border-jtp-borderStrong text-jtp-text hover:bg-jtp-hover hover:border-jtp-borderHover active:scale-[0.98]",
    danger: "bg-jtp-loss/10 text-jtp-loss border border-jtp-loss/20 hover:bg-jtp-loss/20 hover:border-jtp-loss/40 active:scale-[0.98]",
    link: "text-jtp-textMuted hover:text-jtp-text p-0 h-auto font-normal hover:underline justify-start",
  };

  // Default padding if not link
  const paddingClasses = variant === 'link' ? '' : 'px-4 py-2';

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
