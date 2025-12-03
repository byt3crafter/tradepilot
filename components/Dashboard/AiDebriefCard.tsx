import React, { useState } from 'react';
import Button from '../ui/Button';
import { useAccount } from '../../context/AccountContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Spinner from '../Spinner';
import Tooltip from '../ui/Tooltip';
import { SparklesIcon } from '../icons/SparklesIcon';
import Card from '../Card';

type DebriefType = 'daily' | 'weekly';

const AiDebriefCard: React.FC = () => {
    const { activeAccount, smartLimitsProgress } = useAccount();
    const { accessToken } = useAuth();

    const [debrief, setDebrief] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const today = new Date().getDay(); // 0=Sun, 5=Fri, 6=Sat
    const isWeeklyAvailable = today >= 5;
    const hasDailyTrades = (smartLimitsProgress?.tradesToday ?? 0) > 0;

    const handleGenerate = async (type: DebriefType) => {
        if (!activeAccount || !accessToken) return;
        setIsLoading(true);
        setError('');
        setDebrief(null);
        try {
            const response = type === 'daily'
                ? await api.getDailyDebrief(activeAccount.id, accessToken)
                : await api.getWeeklyDebrief(activeAccount.id, accessToken);
            setDebrief(response.debrief);
        } catch (err: any) {
            setError(err.message || 'Failed to generate debrief.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center text-center p-4 h-32">
                    <Spinner />
                    <p className="mt-2 text-sm text-future-gray">The AI is analyzing your performance...</p>
                </div>
            );
        }
        if (error) {
            return <p className="text-sm text-risk-high text-center p-4">{error}</p>;
        }
        if (debrief) {
            return (
                <div className="space-y-3 p-3 max-h-64 overflow-y-auto sidebar-scrollbar">
                    {debrief.split('\n').map((paragraph, index) => (
                        <p key={index} className="text-future-light text-xs leading-relaxed">{paragraph}</p>
                    ))}
                </div>
            );
        }
        // Initial state
        return <p className="text-xs text-center text-future-gray p-4">Select a debrief to generate.</p>;
    };

    return (
        <Card className="h-full flex flex-col overflow-hidden">
            <div className="p-2 mb-2 border-b border-white/5">
                <h3 className="text-secondary text-xs font-orbitron uppercase tracking-widest flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-photonic-blue" />
                    AI Performance Debriefs
                </h3>
            </div>

            <div className="flex-1 min-h-[8rem]">
                {renderContent()}
            </div>

            <div className="p-2 border-t border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                    <Tooltip text={!hasDailyTrades ? 'No closed trades today.' : ''} position="top">
                        <div className="flex-1">
                            <Button onClick={() => handleGenerate('daily')} disabled={!hasDailyTrades || isLoading} className="w-full text-xs py-1.5 flex items-center justify-center gap-1.5">
                                Daily
                            </Button>
                        </div>
                    </Tooltip>
                    <Tooltip text={!isWeeklyAvailable ? 'Available on Friday.' : ''} position="top">
                        <div className="flex-1">
                            <Button onClick={() => handleGenerate('weekly')} disabled={!isWeeklyAvailable || isLoading} className="w-full text-xs py-1.5 flex items-center justify-center gap-1.5">
                                Weekly
                            </Button>
                        </div>
                    </Tooltip>
                </div>
            </div>
        </Card>
    );
};

export default AiDebriefCard;
