import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNotifications } from '../../context/NotificationContext';
import { BellIcon } from '../icons/BellIcon';
import Spinner from '../Spinner';
import { useView } from '../../context/ViewContext';

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, isLoading, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const { navigateTo } = useView();

  // Calculate dropdown position based on button position and viewport
  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const calculatePosition = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      const dropdownWidth = 320; // w-80 = 20rem = 320px
      const dropdownHeight = 400; // max-h-80 approximate
      const space = 8; // gap between button and dropdown
      const viewportPadding = 16; // 1rem padding from viewport edges

      let top = rect.bottom + space;
      let right = window.innerWidth - rect.right;

      // Check if dropdown would overflow bottom
      if (top + dropdownHeight > window.innerHeight - viewportPadding) {
        top = rect.top - dropdownHeight - space;
      }

      // Check if dropdown would overflow right
      if (window.innerWidth - right + dropdownWidth > window.innerWidth - viewportPadding) {
        right = viewportPadding;
      }

      setDropdownStyle({
        position: 'fixed',
        top: `${Math.max(viewportPadding, top)}px`,
        right: `${Math.max(viewportPadding, right)}px`,
        zIndex: 50,
      });
    };

    // Calculate position immediately
    calculatePosition();

    // Recalculate on scroll or resize
    const handleScroll = () => calculatePosition();
    const handleResize = () => calculatePosition();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
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

  const handleNotificationClick = async (notificationId: string, analysisId?: string | null) => {
    await markAsRead(notificationId);
    if (analysisId) {
      navigateTo('analysis-tracker');
    }
    setIsOpen(false);
  };

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const dropdownContent = (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="w-80 bg-[#0A0A0A] border border-white/10 rounded-lg shadow-2xl animate-fade-in-up"
    >
      <div className="p-3 border-b border-white/5">
        <h3 className="text-sm font-semibold text-future-light">Notifications</h3>
      </div>
      <div className="max-h-80 overflow-y-auto sidebar-scrollbar">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : notifications.length === 0 ? (
          <p className="p-4 text-xs text-center text-future-gray">You have no notifications.</p>
        ) : (
          <ul>
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`border-b border-white/5 last:border-0 ${
                  !notification.isRead ? 'bg-white/[0.02]' : ''
                }`}
              >
                <button
                  onClick={() => handleNotificationClick(notification.id, notification.analysisId)}
                  className="w-full text-left p-3 hover:bg-white/[0.03] transition-colors"
                >
                  <p
                    className={`text-xs ${
                      notification.isRead ? 'text-future-gray' : 'text-future-light'
                    }`}
                  >
                    {notification.message}
                  </p>
                  <p className="text-xs text-future-gray/70 mt-1">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        className="relative p-2 rounded-lg bg-future-panel/50 text-future-gray hover:bg-photonic-blue/10 hover:text-future-light transition-colors cursor-pointer"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-photonic-blue opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-photonic-blue items-center justify-center text-xs font-bold text-future-dark">
              {unreadCount}
            </span>
          </span>
        )}
      </button>

      {isOpen && createPortal(dropdownContent, document.body)}
    </>
  );
};

export default NotificationBell;
