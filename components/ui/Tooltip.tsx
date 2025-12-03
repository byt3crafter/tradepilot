import React, { useRef, useState, useEffect } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ children, text, position = 'right' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState<'top' | 'bottom' | 'left' | 'right'>(position);

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };

  useEffect(() => {
    const handleMouseEnter = () => {
      if (!containerRef.current || !tooltipRef.current) return;

      // Get positions
      const containerRect = containerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Check if tooltip overflows on the right
      if (tooltipRect.right > viewportWidth - 10) {
        setAdjustedPosition('left');
      }
      // Check if tooltip overflows on the left
      else if (tooltipRect.left < 10) {
        setAdjustedPosition('right');
      }
      // Check if tooltip overflows on the bottom
      else if (tooltipRect.bottom > viewportHeight - 10) {
        setAdjustedPosition('top');
      }
      // Check if tooltip overflows on the top
      else if (tooltipRect.top < 10) {
        setAdjustedPosition('bottom');
      }
      // Use original position if no overflow
      else {
        setAdjustedPosition(position);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mouseenter', handleMouseEnter);
      return () => container.removeEventListener('mouseenter', handleMouseEnter);
    }
  }, [position]);

  // Don't show tooltip if text is empty
  if (!text) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex items-center group justify-center" ref={containerRef}>
      {children}
      <div
        ref={tooltipRef}
        className={`absolute ${positionClasses[adjustedPosition]} px-2 py-1 bg-future-panel border border-photonic-blue/20 text-future-light text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 max-w-[200px] whitespace-normal break-words`}
      >
        {text}
      </div>
    </div>
  );
};

export default Tooltip;
