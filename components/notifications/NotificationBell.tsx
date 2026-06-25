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

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const calculatePosition = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      const dropdownWidth = 320;
      const dropdownHeight = 400;
      const space = 8;
      const viewportPadding = 16;

      let top = rect.bottom + space;
      let right = window.innerWidth - rect.right;

      if (top + dropdownHeight > window.innerHeight - viewportPadding) {
        top = rect.top - dropdownHeight - space;
      }

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

    calculatePosition();

    const handleScroll = () => calculatePosition();
    const handleResize = () => calculatePosition();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

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
      className="w-80 bg-jtp-panel border border-jtp-borderStrong rounded-jtp-panel shadow-jtp-drawer animate-fade-in-up"
    >
      <div className="px-4 py-3 border-b border-jtp-border">
        <h3 className="text-jtp-md font-semibold text-jtp-text">Notifications</h3>
      </div>
      <div className="max-h-80 overflow-y-auto sidebar-scrollbar">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : notifications.length === 0 ? (
          <p className="px-4 py-6 text-jtp-sm text-center text-jtp-textDim">No notifications.</p>
        ) : (
          <ul>
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`border-b border-jtp-border last:border-0 ${
                  !notification.isRead ? 'bg-jtp-raised' : ''
                }`}
              >
                <button
                  onClick={() => handleNotificationClick(notification.id, notification.analysisId)}
                  className="w-full text-left px-4 py-3 hover:bg-jtp-hover transition-colors"
                >
                  <p className={`text-jtp-sm ${notification.isRead ? 'text-jtp-textDim' : 'text-jtp-text'}`}>
                    {notification.message}
                  </p>
                  <p className="text-jtp-xs text-jtp-textFaint mt-0.5">
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
        className="relative p-2 rounded-jtp-md bg-jtp-control text-jtp-textDim hover:bg-jtp-hover hover:text-jtp-text transition-colors cursor-pointer"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <BellIcon className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-jtp-blue opacity-60"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-jtp-blue items-center justify-center text-[9px] font-bold text-white">
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
