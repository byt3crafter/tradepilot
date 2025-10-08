import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { BellIcon } from '../icons/BellIcon';
import Spinner from '../Spinner';
import { useView } from '../../context/ViewContext';

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, isLoading, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { navigateTo } = useView();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notificationId: string, analysisId?: string | null) => {
    await markAsRead(notificationId);
    if (analysisId) {
      // Future enhancement: navigate to the specific analysis detail view
      navigateTo('analysis-tracker');
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg bg-future-panel/50 text-future-gray hover:bg-photonic-blue/10 hover:text-future-light transition-colors"
        aria-label="Toggle notifications"
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

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-future-panel border border-photonic-blue/20 rounded-lg shadow-lg z-20 animate-fade-in-up origin-top-right">
          <div className="p-3 border-b border-photonic-blue/10 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-future-light">Notifications</h3>
          </div>
          <div className="max-h-80 overflow-y-auto sidebar-scrollbar">
            {isLoading ? (
              <div className="flex justify-center p-8"><Spinner /></div>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-xs text-center text-future-gray">You have no notifications.</p>
            ) : (
              <ul>
                {notifications.map(notification => (
                  <li key={notification.id} className={`border-b border-future-panel/50 ${!notification.isRead ? 'bg-photonic-blue/5' : ''}`}>
                    <button
                      onClick={() => handleNotificationClick(notification.id, notification.analysisId)}
                      className="w-full text-left p-3 hover:bg-photonic-blue/10 transition-colors"
                    >
                      <p className={`text-xs ${notification.isRead ? 'text-future-gray' : 'text-future-light'}`}>
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
      )}
    </div>
  );
};

export default NotificationBell;
