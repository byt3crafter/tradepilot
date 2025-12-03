
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccount } from '../../context/AccountContext';
import SmartLimitsCard from './SmartLimitsCard';
import Tooltip from '../ui/Tooltip';
import { PlusIcon } from '../icons/PlusIcon';
import { useUI } from '../../context/UIContext';
import { useView } from '../../context/ViewContext';
import NotificationBell from '../notifications/NotificationBell';

const DashboardHeader: React.FC = () => {
    const { user } = useAuth();
    const { activeAccount, smartLimitsProgress } = useAccount();
    const { requestAddTradeModalOpen } = useUI();
    const { navigateTo } = useView();

    const handleQuickLogTrade = () => {
        requestAddTradeModalOpen();
        navigateTo('journal');
    };

    return (
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 mb-8 animate-slide-up">
            <div className="space-y-1">
                <h1 className="text-3xl text-white tracking-tight">
                    Good morning, <span className="font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">{user?.fullName.split(' ')[0]}</span>.
                </h1>
                <p className="text-secondary text-sm">
                    Trading Account: <span className="text-white font-medium">{activeAccount?.name || 'No Account Selected'}</span>
                </p>
            </div>

            <div className="flex items-center gap-2">
                {/* Smart Limits Mini-Display */}
                {activeAccount?.smartLimits?.isEnabled && smartLimitsProgress && (
                    <SmartLimitsCard progress={smartLimitsProgress} limits={activeAccount.smartLimits} />
                )}

                {/* Notifications */}
                {user?.featureFlags?.analysisTrackerEnabled && (
                    <div title="Notifications">
                        <NotificationBell />
                    </div>
                )}

                {/* Quick Log */}
                <Tooltip text="Log Trade" position="bottom">
                    <button
                        onClick={handleQuickLogTrade}
                        className="p-2.5 rounded-lg bg-white text-black hover:bg-gray-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all active:scale-95"
                    >
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};

export default DashboardHeader;
