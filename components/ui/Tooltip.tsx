import React from 'react';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ children, text, position = 'right' }) => {
  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };

  // Don't show tooltip if text is empty
  if (!text) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex items-center group justify-center">
      {children}
      <div className={`absolute ${positionClasses[position]} px-2 py-1 bg-future-panel border border-photonic-blue/20 text-future-light text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 max-w-[200px] whitespace-normal break-words`}>
        {text}
      </div>
    </div>
  );
};

export default Tooltip;
