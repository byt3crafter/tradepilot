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

const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentView, onNavigate, isCollapsed, isOpen = false, onClose }) => {
    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            <aside
                className={`fixed top-0 left-0 h-full bg-[#08090A] border-r border-white/10 flex-shrink-0 flex flex-col z-50 transition-all duration-300 overflow-y-auto 
                ${isCollapsed ? 'md:w-16' : 'md:w-64'} 
                w-64 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
            >
                {/* BRAND */}
                <div className={`h-16 flex items-center border-b border-white/10 ${isCollapsed ? 'justify-center' : 'px-6'}`}>
                    <a href="/" className="hover:opacity-80 transition-opacity">
                        {isCollapsed ? <AuthMark size={18} /> : <AuthLogo />}
                    </a>
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
                        label="Referrals"
                        isActive={currentView === 'referrals'}
                        onClick={() => { onNavigate('referrals'); onClose?.(); }}
                        isCollapsed={isCollapsed}
                    />
                    <AdminNavItem
                        icon={<CreditCardIcon className="w-4 h-4" />}
                        label="Promo Codes"
                        isActive={currentView === 'promo_codes'}
                        onClick={() => { onNavigate('promo_codes'); onClose?.(); }}
                        isCollapsed={isCollapsed}
                    />
                </div>
            </aside>
        </>
    );
};

export default AdminSidebar;
