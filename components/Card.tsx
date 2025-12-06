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
      className={`bg-[#0C0D0E] border border-white/10 rounded-sm p-6 transition-colors hover:bg-white/[0.02] ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;