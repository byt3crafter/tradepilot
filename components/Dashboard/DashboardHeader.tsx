import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccount } from '../../context/AccountContext';
import AccountStats from './AccountStats';
import SmartLimitsCard from './SmartLimitsCard';
import { SparklesIcon } from '../icons/SparklesIcon';
import AiDebriefPopover from './AiDebriefPopover';
import Tooltip from '../ui/Tooltip';
import { PlusIcon } from '../icons/PlusIcon';
import { useUI } from '../../context/UIContext';
import { useView } from '../../context/ViewContext';

const DashboardHeader: React.FC = () => {
    const { user } = useAuth();
    const { activeAccount, smartLimitsProgress } = useAccount();
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const { requestAddTradeModalOpen } = useUI();
    const { navigateTo } = useView();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsPopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleQuickLogTrade = () => {
      requestAddTradeModalOpen();
      navigateTo('journal');
    };

    return (
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
                <h1 className="text-3xl text-future-light">
                    Good morning, <span className="font-orbitron">{user?.fullName.split(' ')[0]}!</span>
                </h1>
                <p className="text-future-gray">Here's your mission overview for today.</p>
            </div>

            <div className="flex items-center gap-4">
                <AccountStats />
                {activeAccount?.smartLimits?.isEnabled && smartLimitsProgress && (
                    <SmartLimitsCard progress={smartLimitsProgress} limits={activeAccount.smartLimits} />
                )}
                 <div className="relative" ref={popoverRef}>
                    <Tooltip text="AI Debriefs">
                       <button
                           onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                           className="p-2 rounded-lg bg-future-panel/50 border border-photonic-blue/10 text-photonic-blue hover:bg-photonic-blue/10 transition-colors"
                       >
                           <SparklesIcon className="w-6 h-6" />
                       </button>
                    </Tooltip>
                    {isPopoverOpen && <AiDebriefPopover onClose={() => setIsPopoverOpen(false)} />}
                </div>
                <Tooltip text="Quick Log Trade">
                    <button
                        onClick={handleQuickLogTrade}
                        className="p-2 rounded-lg bg-future-panel/50 border border-photonic-blue/10 text-photonic-blue hover:bg-photonic-blue/10 transition-colors"
                    >
                        <PlusIcon className="w-6 h-6" />
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};

export default DashboardHeader;