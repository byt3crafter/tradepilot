import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useClerk } from '@clerk/clerk-react';
import { LogoutIcon } from '../icons/LogoutIcon';
import { UsersIcon } from '../icons/UsersIcon';

const MobileProfileMenu: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { user, logout } = useAuth();
    const { openUserProfile } = useClerk();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="hover:opacity-80 transition-opacity"
            >
                {user?.preferences?.useGravatar && user?.gravatarUrl ? (
                    <img
                        src={user.gravatarUrl}
                        alt={user.fullName}
                        className="w-8 h-8 rounded-full border border-white/10"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                            {user?.fullName?.substring(0, 2).toUpperCase()}
                        </span>
                    </div>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#08090A] border border-white/10 rounded-lg shadow-2xl py-1 z-50">
                    <button
                        onClick={() => {
                            openUserProfile();
                            setIsOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-secondary hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3"
                    >
                        <UsersIcon className="w-4 h-4" />
                        Manage Account
                    </button>
                    <div className="border-t border-white/10 my-1"></div>
                    <button
                        onClick={() => {
                            logout();
                            setIsOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-risk-high hover:bg-risk-high/10 transition-colors flex items-center gap-3"
                    >
                        <LogoutIcon className="w-4 h-4" />
                        Log Out
                    </button>
                </div>
            )}
        </div>
    );
};

export default MobileProfileMenu;
