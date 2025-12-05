import React from 'react';
import AuthLogo from '../auth/AuthLogo';
import AuthMark from '../auth/AuthMark';
import { AdminIcon } from '../icons/AdminIcon';
import { UserIcon } from '../icons/UserIcon';
import { SettingsIcon } from '../icons/SettingsIcon';

interface AdminSidebarProps {
    currentView: 'dashboard' | 'users' | 'templates';
    onNavigate: (view: 'dashboard' | 'users' | 'templates') => void;
    isCollapsed: boolean;
}

const AdminNavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    isCollapsed: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, isCollapsed, onClick }) => {
    const navItemClasses = `relative flex items-center w-full px-4 py-2 my-0.5 transition-all duration-200 group ${isActive
        ? 'text-white bg-white/[0.03] border-r-2 border-white'
        : 'text-secondary hover:text-white hover:bg-white/[0.02]'
        } ${isCollapsed ? 'justify-center px-2' : ''}`;

    return (
        <button onClick={onClick} className={navItemClasses}>
            <div className={`flex-shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:opacity-80'}`}>
                {icon}
            </div>
            {!isCollapsed && (
                <span className="ml-3 text-xs font-normal uppercase tracking-widest">{label}</span>
            )}
        </button>
    );
};

const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentView, onNavigate, isCollapsed }) => {
    return (
        <aside
            className={`bg-[#08090A] border-r border-white/10 flex-shrink-0 flex flex-col z-40 transition-all duration-300 h-screen overflow-y-auto ${isCollapsed ? 'w-16' : 'w-64'
                }`}
        >
            {/* BRAND */}
            <div className={`h-16 flex items-center border-b border-white/10 ${isCollapsed ? 'justify-center' : 'px-6'}`}>
                {isCollapsed ? <AuthMark size={18} /> : <AuthLogo />}
            </div>

            {/* Admin Badge */}
            <div className="p-4 border-b border-white/10">
                <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="w-8 h-8 rounded bg-photonic-blue/10 flex items-center justify-center border border-photonic-blue/20">
                        <AdminIcon className="w-4 h-4 text-photonic-blue" />
                    </div>
                    {!isCollapsed && (
                        <div>
                            <p className="text-xs font-orbitron text-photonic-blue uppercase tracking-wider">Admin Panel</p>
                            <p className="text-[9px] text-secondary">System Management</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 flex flex-col py-4 gap-1">
                <AdminNavItem
                    icon={<AdminIcon className="w-4 h-4" />}
                    label="Dashboard"
                    isActive={currentView === 'dashboard'}
                    onClick={() => onNavigate('dashboard')}
                    isCollapsed={isCollapsed}
                />
                <AdminNavItem
                    icon={<UserIcon className="w-4 h-4" />}
                    label="Users"
                    isActive={currentView === 'users'}
                    onClick={() => onNavigate('users')}
                    isCollapsed={isCollapsed}
                />
                <AdminNavItem
                    icon={<SettingsIcon className="w-4 h-4" />}
                    label="Templates"
                    isActive={currentView === 'templates'}
                    onClick={() => onNavigate('templates')}
                    isCollapsed={isCollapsed}
                />
            </div>
        </aside>
    );
};

export default AdminSidebar;
