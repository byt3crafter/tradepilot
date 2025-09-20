
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-future-panel/70 backdrop-blur-md border border-photonic-blue/20 rounded-lg p-4 md:p-6 shadow-lg ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
