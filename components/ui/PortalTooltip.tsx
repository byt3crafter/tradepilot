import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface PortalTooltipProps {
  children: React.ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const PortalTooltip: React.FC<PortalTooltipProps> = ({
  children,
  text,
  position = 'top',
  delay = 300,
}) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
  const delayTimeoutRef = useRef<NodeJS.Timeout>();

  // Don't show tooltip if text is empty
  if (!text) {
    return <>{children}</>;
  }

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportPadding = 12;
    const space = 10; // gap between trigger and tooltip
    const arrowSize = 6;

    let top = 0;
    let left = 0;
    let adjustedPosition = position;
    let arrowTop = 0;
    let arrowLeft = 0;

    // Calculate initial position based on requested position
    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - space;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        arrowTop = tooltipRect.height + space - arrowSize / 2;
        arrowLeft = tooltipRect.width / 2 - arrowSize / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + space;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        arrowTop = -arrowSize + 2;
        arrowLeft = tooltipRect.width / 2 - arrowSize / 2;
        break;
      case 'left':
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.left - tooltipRect.width - space;
        arrowLeft = tooltipRect.width + space - arrowSize / 2;
        arrowTop = tooltipRect.height / 2 - arrowSize / 2;
        break;
      case 'right':
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.right + space;
        arrowLeft = -arrowSize + 2;
        arrowTop = tooltipRect.height / 2 - arrowSize / 2;
        break;
    }

    // Check and adjust for viewport overflow
    // Right overflow
    if (left + tooltipRect.width > window.innerWidth - viewportPadding) {
      const maxLeft = window.innerWidth - tooltipRect.width - viewportPadding;
      left = maxLeft;

      // If right was the position, try left instead
      if (position === 'right' || position === 'top' || position === 'bottom') {
        adjustedPosition = 'left';
        left = triggerRect.left - tooltipRect.width - space;
      }
    }

    // Left overflow
    if (left < viewportPadding) {
      left = viewportPadding;

      // If left was the position, try right instead
      if (position === 'left' || position === 'top' || position === 'bottom') {
        adjustedPosition = 'right';
        left = triggerRect.right + space;
      }
    }

    // Bottom overflow
    if (top + tooltipRect.height > window.innerHeight - viewportPadding) {
      if (position === 'bottom') {
        adjustedPosition = 'top';
        top = triggerRect.top - tooltipRect.height - space;
      } else {
        top = window.innerHeight - tooltipRect.height - viewportPadding;
      }
    }

    // Top overflow
    if (top < viewportPadding) {
      if (position === 'top') {
        adjustedPosition = 'bottom';
        top = triggerRect.bottom + space;
      } else {
        top = viewportPadding;
      }
    }

    setTooltipStyle({
      position: 'fixed',
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      zIndex: 50,
    });

    setArrowStyle({
      position: 'absolute',
      top: `${Math.round(arrowTop)}px`,
      left: `${Math.round(arrowLeft)}px`,
    });
  };

  const handleMouseEnter = () => {
    // Clear any existing timeout
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
    }

    delayTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      // Calculate position on next frame to ensure DOM is updated
      setTimeout(calculatePosition, 0);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    // Recalculate on scroll
    if (!isVisible) return;

    const handleScroll = () => calculatePosition();
    const handleResize = () => calculatePosition();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isVisible]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
    };
  }, []);

  const tooltipContent = (
    <div
      ref={tooltipRef}
      style={tooltipStyle}
      className="px-3 py-2 bg-future-panel border border-photonic-blue/30 text-future-light text-xs rounded-md pointer-events-none max-w-xs whitespace-normal break-words shadow-lg"
    >
      {text}
      {/* Arrow indicator */}
      <div
        style={arrowStyle}
        className={`absolute w-0 h-0 border-4 border-transparent ${
          position === 'top' ? 'border-t-photonic-blue/30' :
          position === 'bottom' ? 'border-b-photonic-blue/30' :
          position === 'left' ? 'border-l-photonic-blue/30' :
          'border-r-photonic-blue/30'
        }`}
      />
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && createPortal(tooltipContent, document.body)}
    </>
  );
};

export default PortalTooltip;
