import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { EllipsisVerticalIcon } from '../icons/EllipsisVerticalIcon';

interface DropdownContextType {
  onClose: () => void;
}

const DropdownContext = createContext<DropdownContextType | null>(null);

export const DropdownMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 144; // w-36 = 9rem = 144px
      const space = 4; // Space from the button

      let left = rect.right - menuWidth;
      if (left < 10) left = 10;

      let top = rect.bottom + space;
      
      // A simple check to open upwards if not enough space below
      // A more complex solution would calculate menu height dynamically
      if (top + 150 > window.innerHeight) {
        top = rect.top - (menuRef.current?.offsetHeight || 100) - space;
      }
       
      setMenuStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
      });
    }
    setIsOpen(!isOpen);
  };

  const contextValue = { onClose: () => setIsOpen(false) };

  const MenuContent = (
    <div
      ref={menuRef}
      style={menuStyle}
      className="w-36 bg-future-panel border border-photonic-blue/20 rounded-md shadow-lg p-1 z-50 animate-fade-in-up"
    >
      {children}
    </div>
  );

  return (
    <DropdownContext.Provider value={contextValue}>
      {/* This div is no longer relative, just a wrapper for the button */}
      <div>
        <button
          ref={buttonRef}
          onClick={toggle}
          className="p-1 rounded-full text-future-gray hover:bg-photonic-blue/10 hover:text-future-light transition-colors"
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <EllipsisVerticalIcon className="w-5 h-5" />
        </button>
        {isOpen && createPortal(MenuContent, document.body)}
      </div>
    </DropdownContext.Provider>
  );
};

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onSelect: () => void;
  className?: string;
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({ children, onSelect, className = '' }) => {
  const context = useContext(DropdownContext);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    context?.onClose();
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center w-full px-3 py-1.5 text-sm rounded-sm text-future-gray hover:bg-photonic-blue/10 hover:text-future-light transition-colors ${className}`}
    >
      {children}
    </button>
  );
};
