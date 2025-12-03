import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ children, text, position = 'right' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  // Don't show tooltip if text is empty
  if (!text) {
    return <>{children}</>;
  }

  const calculateTooltipPosition = () => {
    if (!containerRef.current || !tooltipRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportPadding = 10;
    const space = 8; // gap between trigger and tooltip

    let top = 0;
    let left = 0;
    let adjustedPosition = position;

    // Calculate initial position based on requested position
    switch (position) {
      case 'top':
        top = containerRect.top - tooltipRect.height - space;
        left = containerRect.left + containerRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'bottom':
        top = containerRect.bottom + space;
        left = containerRect.left + containerRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'left':
        top = containerRect.top + containerRect.height / 2 - tooltipRect.height / 2;
        left = containerRect.left - tooltipRect.width - space;
        break;
      case 'right':
        top = containerRect.top + containerRect.height / 2 - tooltipRect.height / 2;
        left = containerRect.right + space;
        break;
    }

    // Check and adjust for viewport overflow
    // Right overflow
    if (left + tooltipRect.width > window.innerWidth - viewportPadding) {
      left = window.innerWidth - tooltipRect.width - viewportPadding;
      // If right was the position, try left instead
      if (position === 'right' || position === 'bottom' || position === 'top') {
        adjustedPosition = 'left';
        left = containerRect.left - tooltipRect.width - space;
      }
    }

    // Left overflow
    if (left < viewportPadding) {
      left = viewportPadding;
      // If left was the position, try right instead
      if (position === 'left' || position === 'bottom' || position === 'top') {
        adjustedPosition = 'right';
        left = containerRect.right + space;
      }
    }

    // Bottom overflow
    if (top + tooltipRect.height > window.innerHeight - viewportPadding) {
      if (position === 'bottom') {
        adjustedPosition = 'top';
        top = containerRect.top - tooltipRect.height - space;
      } else {
        top = window.innerHeight - tooltipRect.height - viewportPadding;
      }
    }

    // Top overflow
    if (top < viewportPadding) {
      if (position === 'top') {
        adjustedPosition = 'bottom';
        top = containerRect.bottom + space;
      } else {
        top = viewportPadding;
      }
    }

    setTooltipStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 50,
    });
  };

  const handleMouseEnter = () => {
    setIsVisible(true);
    // Calculate position on next frame to ensure DOM is updated
    setTimeout(calculateTooltipPosition, 0);
  };

  const tooltipContent = (
    <div
      ref={tooltipRef}
      style={tooltipStyle}
      className="px-2 py-1 bg-future-panel border border-photonic-blue/20 text-future-light text-xs rounded-md pointer-events-none max-w-[200px] whitespace-normal break-words shadow-lg"
    >
      {text}
    </div>
  );

  return (
    <>
      <div
        ref={containerRef}
        className="relative flex items-center justify-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>

      {isVisible && createPortal(tooltipContent, document.body)}
    </>
  );
};

export default Tooltip;
