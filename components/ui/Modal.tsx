import React from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl' | '4xl';
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children, size = 'lg' }) => {
  const sizeClasses = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '4xl': 'max-w-4xl',
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`bg-jtp-panel border border-jtp-borderStrong rounded-jtp-panel shadow-jtp-drawer w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col animate-fade-in-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-jtp-border flex-shrink-0">
          <h2 id="modal-title" className="text-jtp-lg font-semibold text-jtp-text tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="text-jtp-textDim hover:text-jtp-text transition-colors rounded-jtp-sm p-1"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto sidebar-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
