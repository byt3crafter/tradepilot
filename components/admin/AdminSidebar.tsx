import React from 'react';
import AuthLogo from '../auth/AuthLogo';
import AuthMark from '../auth/AuthMark';
import { AdminIcon } from '../icons/AdminIcon';
import { UserIcon } from '../icons/UserIcon';
import { SettingsIcon } from '../icons/SettingsIcon';
import { PlaybookIcon } from '../icons/PlaybookIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CreditCardIcon } from '../icons/CreditCardIcon';

interface AdminSidebarProps {
    currentView: 'dashboard' | 'users' | 'templates' | 'playbooks' | 'referrals' | 'promo_codes' | 'pricing_plans';
    onNavigate: (view: 'dashboard' | 'users' | 'templates' | 'playbooks' | 'referrals' | 'promo_codes' | 'pricing_plans') => void;
    isCollapsed: boolean;
    isOpen?: boolean;
    onClose?: () => void;
}

const AdminNavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    isCollapsed: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, isCollapsed, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`relative flex items-center w-full px-3 py-2 rounded-jtp-md my-0.5 transition-all duration-150 group ${
                isActive
                    ? 'bg-jtp-blue/10 text-jtp-blue'
                    : 'text-jtp-textMuted hover:bg-jtp-hover hover:text-jtp-text'
            } ${isCollapsed ? 'justify-center px-2' : ''}`}
        >
            {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-jtp-blue rounded-r-full" />
            )}
            <span className={`flex-shrink-0 ${isActive ? 'text-jtp-blue' : 'text-jtp-textDim group-hover:text-jtp-textMuted'}`}>
                {icon}
            </span>
            {!isCollapsed && (
                <span className={`ml-3 text-jtp-sm font-medium tracking-tight ${isActive ? 'text-jtp-blue' : ''}`}>
                    {label}
                </span>
            )}
        </button>
    );
};

const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentView, onNavigate, isCollapsed, isOpen = false, onClose }) => {
    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            <aside
                className={`fixed top-0 left-0 h-full bg-jtp-shell border-r border-jtp-border flex-shrink-0 flex flex-col z-50 transition-all duration-300 overflow-y-auto
                ${isCollapsed ? 'md:w-16' : 'md:w-56'}
                w-56 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
            >
                {/* Brand */}
                <div className={`h-topbar flex items-center border-b border-jtp-border flex-shrink-0 ${isCollapsed ? 'justify-center px-2' : 'px-5'}`}>
                    <a href="/" className="hover:opacity-80 transition-opacity">
                        {isCollapsed ? <AuthMark size={18} /> : <AuthLogo />}
                    </a>
                </div>

                {/* Admin Badge */}
                <div className={`px-3 py-3 border-b border-jtp-border ${isCollapsed ? 'flex justify-center' : ''}`}>
                    <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : ''}`}>
                        <div className="w-7 h-7 rounded-jtp-md bg-jtp-blue/10 flex items-center justify-center border border-jtp-blue/20 flex-shrink-0">
                            <AdminIcon className="w-3.5 h-3.5 text-jtp-blue" />
                        </div>
                        {!isCollapsed && (
                            <div>
                                <p className="text-jtp-xs font-semibold text-jtp-blue uppercase tracking-wider leading-none">
                                    Admin Panel
                                </p>
                                <p className="text-jtp-xs text-jtp-textDim mt-0.5">System Management</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 flex flex-col px-2 py-3 gap-0.5">
                    <AdminNavItem
                        icon={<AdminIcon className="w-4 h-4" />}
                        label="Dashboard"
                        isActive={currentView === 'dashboard'}
                        onClick={() => { onNavigate('dashboard'); onClose?.(); }}
                        isCollapsed={isCollapsed}
                    />
                    <AdminNavItem
                        icon={<UserIcon className="w-4 h-4" />}
                        label="Users"
                        isActive={currentView === 'users'}
                        onClick={() => { onNavigate('users'); onClose?.(); }}
                        isCollapsed={isCollapsed}
                    />
                    <AdminNavItem
                        icon={<SettingsIcon className="w-4 h-4" />}
                        label="Templates"
                        isActive={currentView === 'templates'}
                        onClick={() => { onNavigate('templates'); onClose?.(); }}
                        isCollapsed={isCollapsed}
                    />
                    <AdminNavItem
                        icon={<PlaybookIcon className="w-4 h-4" />}
                        label="Playbooks"
                        isActive={currentView === 'playbooks'}
                        onClick={() => { onNavigate('playbooks'); onClose?.(); }}
                        isCollapsed={isCollapsed}
                    />
                    <AdminNavItem
                        icon={<CreditCardIcon className="w-4 h-4" />}
                        label="Pricing"
                        isActive={currentView === 'pricing_plans'}
                        onClick={() => { onNavigate('pricing_plans'); onClose?.(); }}
                        isCollapsed={isCollapsed}
                    />
                    <AdminNavItem
                        icon={<UsersIcon className="w-4 h-4" />}
                        label="Referrals"
                        isActive={currentView === 'referrals'}
                        onClick={() => { onNavigate('referrals'); onClose?.(); }}
                        isCollapsed={isCollapsed}
                    />
                    <AdminNavItem
                        icon={<SparklesIcon className="w-4 h-4" />}
                        label="Promo Codes"
                        isActive={currentView === 'promo_codes'}
                        onClick={() => { onNavigate('promo_codes'); onClose?.(); }}
                        isCollapsed={isCollapsed}
                    />
                </nav>
            </aside>
        </>
    );
};

export default AdminSidebar;
