import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-jtp-panel border border-jtp-border rounded-jtp-panel p-6 transition-colors hover:bg-jtp-hover/30 ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;