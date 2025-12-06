
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccount } from '../../context/AccountContext';
import SmartLimitsCard from './SmartLimitsCard';
import Tooltip from '../ui/Tooltip';
import { PlusIcon } from '../icons/PlusIcon';
import { useUI } from '../../context/UIContext';
import { useView } from '../../context/ViewContext';
import NotificationBell from '../notifications/NotificationBell';
import Modal from '../ui/Modal';
import ComplianceReportModal from '../compliance/ComplianceReportModal';

const DashboardHeader: React.FC = () => {
    const { user } = useAuth();
    const { activeAccount, smartLimitsProgress } = useAccount();
    const { requestAddTradeModalOpen } = useUI();
    const { navigateTo } = useView();
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const handleQuickLogTrade = () => {
        requestAddTradeModalOpen();
        navigateTo('journal');
    };

    return (
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 mb-8 animate-slide-up">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl text-white tracking-tight">
                        Good morning, <span className="font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">{user?.fullName.split(' ')[0]}</span>.
                    </h1>
                    <span className="px-2 py-1 bg-photonic-blue/20 border border-photonic-blue/50 rounded text-xs font-bold text-photonic-blue uppercase tracking-wider h-fit">
                        BETA
                    </span>
                </div>
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

                {/* Export PDF (for prop firm accounts with objectives) */}
                {activeAccount?.type === 'PROP_FIRM' && activeAccount?.objectives?.isEnabled && (
                    <Tooltip text="Export Compliance Report" position="bottom">
                        <button
                            onClick={() => setIsExportModalOpen(true)}
                            className="p-2.5 rounded-lg bg-future-panel/50 border border-white/10 text-white hover:bg-white/5 transition-all active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                        </button>
                    </Tooltip>
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

            {/* Export Modal */}
            {isExportModalOpen && (
                <Modal title="Export Compliance Report" onClose={() => setIsExportModalOpen(false)}>
                    <ComplianceReportModal onClose={() => setIsExportModalOpen(false)} />
                </Modal>
            )}
        </div>
    );
};

export default DashboardHeader;
