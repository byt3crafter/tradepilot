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
      className="fixed inset-0 bg-future-dark/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose} // Close on backdrop click
    >
      <div 
        className={`bg-future-panel border border-photonic-blue/20 rounded-lg shadow-lg w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col animate-fade-in-up`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <div className="flex items-center justify-between p-4 border-b border-photonic-blue/10 flex-shrink-0">
          <h2 id="modal-title" className="text-xl font-orbitron text-future-light">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-future-gray hover:text-future-light transition-colors"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto sidebar-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;