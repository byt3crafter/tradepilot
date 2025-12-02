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
      className={`bg-white/[0.01] border border-white/10 rounded-sm p-6 backdrop-blur-sm transition-colors hover:bg-white/[0.02] ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;