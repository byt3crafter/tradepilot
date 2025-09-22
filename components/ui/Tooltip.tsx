import React from 'react';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, text }) => {
  return (
    <div className="relative flex items-center group">
      {children}
      <div className="absolute left-full ml-4 px-2 py-1 bg-future-panel border border-photonic-blue/20 text-future-light text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {text}
      </div>
    </div>
  );
};

export default Tooltip;
