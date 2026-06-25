import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** right-side panel width */
  width?: 'md' | 'lg' | 'xl';
  /** optional footer (e.g. Save/Cancel) pinned to the bottom */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const WIDTHS: Record<NonNullable<DrawerProps['width']>, string> = {
  md: 'max-w-[480px]',
  lg: 'max-w-[600px]',
  xl: 'max-w-[760px]',
};

/**
 * Right-side slide-in drawer — the standard container for rich create/edit flows
 * (Log Trade, Import, Close, Playbook builder). Full-height, spacious, scrollable,
 * jtp-styled. Replaces the old cramped centered modals.
 */
const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  width = 'lg',
  footer,
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      {/* panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative h-full w-full ${WIDTHS[width]} bg-jtp-panel border-l border-jtp-borderStrong shadow-jtp-drawer flex flex-col`}
        style={{ animation: 'jtpSlideIn .18s ease-out' }}
      >
        {/* header */}
        <div className="flex-shrink-0 flex items-start justify-between gap-4 px-6 h-[60px] border-b border-jtp-border">
          <div className="flex flex-col justify-center h-full min-w-0">
            {title && (
              <div className="text-jtp-lg font-semibold text-jtp-text truncate">{title}</div>
            )}
            {subtitle && (
              <div className="text-jtp-xs text-jtp-textDim truncate">{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="mt-3 text-jtp-textDim hover:text-jtp-text transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* footer */}
        {footer && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-jtp-border bg-jtp-shell/40">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default Drawer;
