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
      className={`bg-surface border border-white/10 rounded-xl p-5 shadow-surface backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;